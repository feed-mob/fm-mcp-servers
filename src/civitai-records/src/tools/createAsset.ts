import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sha256 } from "../lib/sha256.js";
import { detectRemoteAssetType, type RemoteAssetTypeResult } from "../lib/detectRemoteAssetType.js";
import { handleDatabaseError } from "../lib/handleDatabaseError.js";

const metadataSchema = z.record(z.any()).nullable().default(null);

/**
 * Validate that the provided asset type matches the detected type.
 * Throws an error with a helpful message if there's a mismatch.
 */
function validateAssetType(
  providedType: "image" | "video",
  detectionResult: RemoteAssetTypeResult,
  url: string
): void {
  const { assetType: detectedType, mime, from: detectionMethod } = detectionResult;
  
  if (!detectedType) {
    // Unable to detect, allow the provided type
    console.warn(`Unable to detect asset type for URL: ${url}. Accepting provided type: ${providedType}`);
    return;
  }
  
  if (detectedType === providedType) {
    console.log(`Asset type '${providedType}' confirmed via ${detectionMethod}`);
    return;
  }
  
  // Mismatch detected - throw error with helpful message
  const errorDetails = mime 
    ? `Detected type: '${detectedType}' (MIME: ${mime}, via ${detectionMethod})`
    : `Detected type: '${detectedType}' (via ${detectionMethod})`;
  
  throw new Error(
    `Asset type mismatch for URL: ${url}\n` +
    `Provided: '${providedType}'\n` +
    `${errorDetails}\n` +
    `Please update the asset_type parameter to '${detectedType}' and try again.`
  );
}

/**
 * Parse and validate an ID string parameter to BigInt.
 * Returns null if the input is null/empty.
 */
function parseIdParameter(id: string | null, parameterName: string): bigint | null {
  if (!id) {
    return null;
  }
  
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  
  try {
    return BigInt(trimmed);
  } catch (error) {
    throw new Error(`Invalid ${parameterName}: must be a valid integer ID`);
  }
}

/**
 * Parse and validate an array of ID strings to BigInt array.
 * Returns null if the input is null/empty.
 */
function parseIdArrayParameter(ids: string[] | null, parameterName: string): bigint[] | null {
  if (!ids || ids.length === 0) {
    return null;
  }
  
  try {
    return ids.map((id, index) => {
      const trimmed = id.trim();
      if (!trimmed) {
        throw new Error(`Empty ID at index ${index}`);
      }
      return BigInt(trimmed);
    });
  } catch (error) {
    throw new Error(`Invalid ${parameterName}: ${error instanceof Error ? error.message : 'must contain valid integer IDs'}`);
  }
}

export const createAssetParameters = z.object({
  asset_url: z
    .string()
    .min(1)
    .describe("The actual resource storage URL. Can be from original source or Civitai CDN. Example: 'https://image.civitai.com/.../video.mp4' or 'https://storage.example.com/image.png'"),
  asset_type: z
    .enum(["image", "video"])
    .describe("The type of media asset. Choose 'image' or 'video' based on the content type."),
  asset_source: z
    .enum(["generated", "upload"])
    .describe("How this asset was created. Use 'generated' for AI-generated content or 'upload' for user-uploaded files."),
  input_prompt_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of the prompt that was used to generate this asset. If you generated content from a prompt, first call create_prompt to save the prompt and get its ID, then use that ID here to link the asset to its source prompt. Leave empty for uploaded assets or content not generated from a prompt."),
  output_prompt_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of a prompt that was derived from or describes this asset. For example, if you used an LLM to caption this image or extract a description from the generated content, save that caption/description as a prompt using create_prompt and link it here."),
  civitai_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The Civitai image ID for this asset if it has been uploaded to Civitai. Extract from the Civitai URL, e.g., for 'https://civitai.com/images/106432973' the ID is '106432973'."),
  civitai_url: z
    .string()
    .nullable()
    .default(null)
    .describe("The Civitai page URL for this asset if it has been uploaded to Civitai. Example: 'https://civitai.com/images/106432973'."),
  post_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID from the civitai_posts table that this asset is associated with. Use create_civitai_post tool to create a post first if needed."),
  input_asset_ids: z
    .array(z.string())
    .nullable()
    .default(null)
    .describe("Array of asset IDs that were used as inputs to generate this asset. For example, if this is a video generated from multiple images, list those image asset IDs here. Leave empty for assets that weren't generated from other assets."),
  metadata: metadataSchema.describe("Additional information about this asset in JSON format. Can include technical details (resolution, duration, file size), generation parameters, quality scores, or any custom data relevant to this asset."),
  on_behalf_of: z
    .string()
    .nullable()
    .default(null)
    .describe("The user account this action is being performed on behalf of. If not provided, defaults to the authenticated database user and can be updated later."),
});

export type CreateAssetParameters = z.infer<typeof createAssetParameters>;

export const createAssetTool = {
  name: "create_asset",
  description: "Save a generated or uploaded media asset (video, image) to the database. Use this after creating content to track what was generated, where it's stored, and link it back to the original prompt that created it. IMPORTANT: The asset_type parameter is validated against the actual file content by checking HTTP headers, content sniffing, and URL patterns. If there's a mismatch (e.g., you specify 'video' but the URL is an image), the tool will return an error telling you the correct type to use.",
  parameters: createAssetParameters,
  execute: async ({ asset_url, asset_type, asset_source, input_prompt_id, output_prompt_id, civitai_id, civitai_url, post_id, input_asset_ids, metadata, on_behalf_of }: CreateAssetParameters): Promise<ContentResult> => {
    // Detect and validate asset type
    const detectionResult = await detectRemoteAssetType(asset_url, { skipRemote: false, timeout: 5000 });
    validateAssetType(asset_type, detectionResult, asset_url);
    
    // Parse ID parameters
    const inputPromptId = parseIdParameter(input_prompt_id, 'input_prompt_id');
    const outputPromptId = parseIdParameter(output_prompt_id, 'output_prompt_id');
    const postIdBigInt = parseIdParameter(post_id, 'post_id');
    const inputAssetIds = parseIdArrayParameter(input_asset_ids, 'input_asset_ids');

    const sha256sum = await sha256(asset_url);

    const asset = await prisma.assets.create({
      data: {
        uri: asset_url,
        sha256sum,
        asset_type: asset_type,
        asset_source,
        input_prompt_id: inputPromptId,
        output_prompt_id: outputPromptId,
        civitai_id: civitai_id?.trim() || null,
        civitai_url: civitai_url?.trim() || null,
        post_id: postIdBigInt,
        input_asset_ids: inputAssetIds ?? undefined,
        metadata: metadata ?? undefined,
        on_behalf_of: on_behalf_of ?? undefined,
      },
    }).catch(error => handleDatabaseError(error, `URL: ${asset_url}`));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            asset_id: asset.id.toString(),
            asset_type: asset.asset_type,
            asset_source: asset.asset_source,
            uri: asset.uri,
            sha256sum: asset.sha256sum,
            civitai_id: asset.civitai_id,
            civitai_url: asset.civitai_url,
            post_id: asset.post_id?.toString() ?? null,
            input_prompt_id: asset.input_prompt_id?.toString() ?? null,
            output_prompt_id: asset.output_prompt_id?.toString() ?? null,
            input_asset_ids: asset.input_asset_ids.map((id: bigint) => id.toString()),
            on_behalf_of: asset.on_behalf_of,
            created_at: asset.created_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
