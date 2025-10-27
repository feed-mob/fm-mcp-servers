import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { handleDatabaseError } from "../lib/handleDatabaseError.js";

/**
 * Parse and validate an ID string parameter to BigInt.
 * Returns null if the input is null/empty.
 */
function parseIdParameter(id: string | null | undefined, parameterName: string): bigint | null | undefined {
  if (id === undefined) return undefined;
  if (id === null || id.trim() === "") return null;
  
  try {
    return BigInt(id.trim());
  } catch (error) {
    throw new Error(`Invalid ${parameterName}: must be a valid integer ID`);
  }
}

/**
 * Parse and validate an array of ID strings to BigInt array.
 * Returns null if the input is null/empty, undefined if not provided.
 */
function parseIdArrayParameter(ids: string[] | null | undefined, parameterName: string): bigint[] | null | undefined {
  if (ids === undefined) return undefined;
  if (ids === null || ids.length === 0) return [];
  
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

export const updateAssetParameters = z.object({
  asset_id: z
    .string()
    .min(1)
    .describe("The ID of the asset to update. This should be the asset_id returned from a previous create_asset call."),
  input_prompt_id: z
    .string()
    .nullable()
    .optional()
    .describe("The ID of the prompt that generated this asset. Set to null to remove the association. Leave undefined to keep current value."),
  output_prompt_id: z
    .string()
    .nullable()
    .optional()
    .describe("The ID of the prompt that was derived from this asset. Set to null to remove the association. Leave undefined to keep current value."),
  civitai_id: z
    .string()
    .nullable()
    .optional()
    .describe("The Civitai image ID. Extract from URL (e.g., '106432973' from 'https://civitai.com/images/106432973'). Set to null to remove. Leave undefined to keep current value."),
  civitai_url: z
    .string()
    .nullable()
    .optional()
    .describe("The full Civitai page URL (e.g., 'https://civitai.com/images/106432973'). Set to null to remove. Leave undefined to keep current value."),
  on_behalf_of: z
    .string()
    .nullable()
    .optional()
    .describe("The user account this action is being performed on behalf of. Set to null to clear the value. Leave undefined to keep current value."),
  post_id: z
    .string()
    .nullable()
    .optional()
    .describe("The ID of the Civitai post this asset belongs to. References civitai_posts table. Set to null to remove the association. Leave undefined to keep current value."),
  input_asset_ids: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Array of asset IDs that were used as inputs to generate this asset. Set to empty array [] or null to clear. Leave undefined to keep current value."),
});

export type UpdateAssetParameters = z.infer<typeof updateAssetParameters>;

export const updateAssetTool = {
  name: "update_asset",
  description: "Update an existing asset's optional fields including prompt associations (input_prompt_id, output_prompt_id), Civitai metadata (civitai_id, civitai_url), post association (post_id), account attribution (on_behalf_of), and input assets (input_asset_ids). Only provided fields will be updated; undefined fields keep their current values.",
  parameters: updateAssetParameters,
  execute: async ({
    asset_id,
    input_prompt_id,
    output_prompt_id,
    civitai_id,
    civitai_url,
    on_behalf_of,
    post_id,
    input_asset_ids,
  }: UpdateAssetParameters): Promise<ContentResult> => {
    // Parse and validate asset ID
    const assetIdBigInt = parseIdParameter(asset_id, 'asset_id');
    if (!assetIdBigInt) {
      throw new Error("asset_id is required and must be a valid integer ID");
    }

    // Build update data object with only provided fields
    const data: any = {};

    const inputPromptId = parseIdParameter(input_prompt_id, 'input_prompt_id');
    if (inputPromptId !== undefined) {
      data.input_prompt_id = inputPromptId;
    }

    const outputPromptId = parseIdParameter(output_prompt_id, 'output_prompt_id');
    if (outputPromptId !== undefined) {
      data.output_prompt_id = outputPromptId;
    }

    if (civitai_id !== undefined) {
      data.civitai_id = civitai_id === null || civitai_id.trim() === "" ? null : civitai_id.trim();
    }

    if (civitai_url !== undefined) {
      data.civitai_url = civitai_url === null || civitai_url.trim() === "" ? null : civitai_url.trim();
    }

    if (on_behalf_of !== undefined) {
      data.on_behalf_of = on_behalf_of === null || on_behalf_of.trim() === "" ? null : on_behalf_of.trim();
    }

    const postIdBigInt = parseIdParameter(post_id, 'post_id');
    if (postIdBigInt !== undefined) {
      data.post_id = postIdBigInt;
    }

    const inputAssetIds = parseIdArrayParameter(input_asset_ids, 'input_asset_ids');
    if (inputAssetIds !== undefined) {
      data.input_asset_ids = inputAssetIds;
    }

    const asset = await prisma.assets.update({
      where: {
        id: assetIdBigInt,
      },
      data,
    }).catch(error => handleDatabaseError(error, `Asset ID: ${asset_id}`));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            asset_id: asset.id.toString(),
            asset_type: asset.asset_type,
            asset_source: asset.asset_source,
            asset_url: asset.uri,
            sha256sum: asset.sha256sum,
            input_prompt_id: asset.input_prompt_id?.toString() ?? null,
            output_prompt_id: asset.output_prompt_id?.toString() ?? null,
            civitai_id: asset.civitai_id,
            civitai_url: asset.civitai_url,
            on_behalf_of: asset.on_behalf_of,
            post_id: asset.post_id?.toString() ?? null,
            input_asset_ids: asset.input_asset_ids.map((id: bigint) => id.toString()),
            metadata: asset.metadata,
            updated_at: asset.updated_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
