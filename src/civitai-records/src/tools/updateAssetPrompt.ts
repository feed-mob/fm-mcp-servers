import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const updateAssetPromptParameters = z.object({
  asset_id: z
    .string()
    .min(1)
    .describe("The ID of the asset to update. This should be the asset_id returned from a previous create_asset call."),
  input_prompt_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of the prompt that generated this asset. Set to null or empty string to remove the association."),
  output_prompt_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of the prompt that was derived from this asset. Set to null or empty string to remove the association."),
});

export type UpdateAssetPromptParameters = z.infer<typeof updateAssetPromptParameters>;

export const updateAssetPromptTool = {
  name: "update_asset_prompt",
  description: "Update an existing asset's prompt associations. Use this to link or unlink input prompts (that generated the asset) or output prompts (derived from the asset).",
  parameters: updateAssetPromptParameters,
  execute: async ({ asset_id, input_prompt_id, output_prompt_id }: UpdateAssetPromptParameters): Promise<ContentResult> => {
    let assetIdBigInt: bigint;
    try {
      assetIdBigInt = BigInt(asset_id);
    } catch (error) {
      throw new Error("asset_id must be a valid integer ID");
    }

    let inputPromptId: bigint | null = null;
    if (input_prompt_id) {
      const trimmed = input_prompt_id.trim();
      if (trimmed) {
        try {
          inputPromptId = BigInt(trimmed);
        } catch (error) {
          throw new Error("input_prompt_id must be a valid integer ID");
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
          throw new Error("output_prompt_id must be a valid integer ID");
        }
      }
    }

    const asset = await prisma.assets.update({
      where: {
        id: assetIdBigInt,
      },
      data: {
        input_prompt_id: inputPromptId,
        output_prompt_id: outputPromptId,
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
            input_prompt_id: asset.input_prompt_id?.toString() ?? null,
            output_prompt_id: asset.output_prompt_id?.toString() ?? null,
            updated_at: asset.updated_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
