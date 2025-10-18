import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sha256 } from "../lib/sha256.js";

const metadataSchema = z.record(z.any()).nullable().default(null);

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
  metadata: metadataSchema.describe("Additional information about this asset in JSON format. Can include technical details (resolution, duration, file size), generation parameters, quality scores, or any custom data relevant to this asset."),
});

export type CreateAssetParameters = z.infer<typeof createAssetParameters>;

export const createAssetTool = {
  name: "create_asset",
  description: "Save a generated or uploaded media asset (video, image) to the database. Use this after creating content to track what was generated, where it's stored, and link it back to the original prompt that created it.",
  parameters: createAssetParameters,
  execute: async ({ asset_url, asset_type, asset_source, input_prompt_id, output_prompt_id, civitai_id, civitai_url, post_id, metadata }: CreateAssetParameters): Promise<ContentResult> => {
    let inputPromptId: bigint | null = null;
    if (input_prompt_id) {
      const trimmed = input_prompt_id.trim();
      if (trimmed) {
        try {
          inputPromptId = BigInt(trimmed);
        } catch (error) {
          throw new Error(`Invalid input_prompt_id: must be a valid integer ID`);
        }
      }
    }

    let outputPromptId: bigint | null = null;
    if (output_prompt_id) {
      const trimmed = output_prompt_id.trim();
      if (trimmed) {
        try {
          outputPromptId = BigInt(trimmed);
        } catch (error) {
          throw new Error(`Invalid output_prompt_id: must be a valid integer ID`);
        }
      }
    }

    let postIdBigInt: bigint | null = null;
    if (post_id) {
      const trimmed = post_id.trim();
      if (trimmed) {
        try {
          postIdBigInt = BigInt(trimmed);
        } catch (error) {
          throw new Error(`Invalid post_id: must be a valid integer ID`);
        }
      }
    }

    const sha256sum = await sha256(asset_url);

    const asset = await prisma.assets.create({
      data: {
        uri: asset_url,
        sha256sum,
        asset_type,
        asset_source,
        input_prompt_id: inputPromptId,
        output_prompt_id: outputPromptId,
        civitai_id: civitai_id?.trim() || null,
        civitai_url: civitai_url?.trim() || null,
        post_id: postIdBigInt,
        metadata: metadata ?? undefined,
      },
    });

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
            created_at: asset.created_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
