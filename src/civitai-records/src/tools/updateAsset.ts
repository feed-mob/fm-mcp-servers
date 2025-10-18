import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

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
  post_id: z
    .string()
    .nullable()
    .optional()
    .describe("The ID of the Civitai post this asset belongs to. References civitai_posts table. Set to null to remove the association. Leave undefined to keep current value."),
});

export type UpdateAssetParameters = z.infer<typeof updateAssetParameters>;

export const updateAssetTool = {
  name: "update_asset",
  description: "Update an existing asset's optional fields including prompt associations (input_prompt_id, output_prompt_id), Civitai metadata (civitai_id, civitai_url), and post association (post_id). Only provided fields will be updated; undefined fields keep their current values.",
  parameters: updateAssetParameters,
  execute: async ({
    asset_id,
    input_prompt_id,
    output_prompt_id,
    civitai_id,
    civitai_url,
    post_id,
  }: UpdateAssetParameters): Promise<ContentResult> => {
    let assetIdBigInt: bigint;
    try {
      assetIdBigInt = BigInt(asset_id);
    } catch (error) {
      throw new Error("asset_id must be a valid integer ID");
    }

    const data: any = {};

    if (input_prompt_id !== undefined) {
      if (input_prompt_id === null || input_prompt_id.trim() === "") {
        data.input_prompt_id = null;
      } else {
        try {
          data.input_prompt_id = BigInt(input_prompt_id);
        } catch (error) {
          throw new Error("input_prompt_id must be a valid integer ID");
        }
      }
    }

    if (output_prompt_id !== undefined) {
      if (output_prompt_id === null || output_prompt_id.trim() === "") {
        data.output_prompt_id = null;
      } else {
        try {
          data.output_prompt_id = BigInt(output_prompt_id);
        } catch (error) {
          throw new Error("output_prompt_id must be a valid integer ID");
        }
      }
    }

    if (civitai_id !== undefined) {
      data.civitai_id = civitai_id === null || civitai_id.trim() === "" ? null : civitai_id;
    }

    if (civitai_url !== undefined) {
      data.civitai_url = civitai_url === null || civitai_url.trim() === "" ? null : civitai_url;
    }

    if (post_id !== undefined) {
      if (post_id === null || post_id.trim() === "") {
        data.post_id = null;
      } else {
        try {
          data.post_id = BigInt(post_id);
        } catch (error) {
          throw new Error("post_id must be a valid integer ID");
        }
      }
    }

    const asset = await prisma.assets.update({
      where: {
        id: assetIdBigInt,
      },
      data,
    });

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
            post_id: asset.post_id?.toString() ?? null,
            metadata: asset.metadata,
            updated_at: asset.updated_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
