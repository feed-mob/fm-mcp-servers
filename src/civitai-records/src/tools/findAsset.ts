import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const findAssetParameters = z.object({
  asset_id: z
    .string()
    .optional()
    .describe("The ID of the asset to find. Must be a valid integer ID."),
  sha256sum: z
    .string()
    .optional()
    .describe("The SHA-256 hash of the asset to find. Use this to check if an asset with this hash already exists in the database."),
}).refine(
  (data) => data.asset_id || data.sha256sum,
  {
    message: "At least one of asset_id or sha256sum must be provided",
  }
);

export type FindAssetParameters = z.infer<typeof findAssetParameters>;

export const findAssetTool = {
  name: "find_asset",
  description: "Find an asset by its ID or SHA-256 hash. Use this to check if an asset already exists in the database before creating a duplicate, or to retrieve full asset details including prompt and post associations.",
  parameters: findAssetParameters,
  execute: async ({ asset_id, sha256sum }: FindAssetParameters): Promise<ContentResult> => {
    let assetIdBigInt: bigint | undefined;
    if (asset_id) {
      const trimmed = asset_id.trim();
      if (trimmed) {
        try {
          assetIdBigInt = BigInt(trimmed);
        } catch (error) {
          throw new Error("asset_id must be a valid integer ID");
        }
      }
    }

    const whereClause: {
      id?: bigint;
      sha256sum?: string;
    } = {};

    if (assetIdBigInt !== undefined) {
      whereClause.id = assetIdBigInt;
    }

    if (sha256sum) {
      whereClause.sha256sum = sha256sum.trim();
    }

    const asset: any = await (prisma.assets.findFirst as any)({
      where: whereClause,
      include: {
        prompts_assets_input_prompt_idToprompts: true,
        prompts_assets_output_prompt_idToprompts: true,
        civitai_posts: true,
      },
    });

    if (!asset) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              found: false,
              message: "No asset found matching the provided criteria",
            }, null, 2),
          },
        ],
      } satisfies ContentResult;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            found: true,
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
            metadata: asset.metadata,
            created_at: asset.created_at.toISOString(),
            updated_at: asset.updated_at.toISOString(),
            input_prompt: asset.prompts_assets_input_prompt_idToprompts ? {
              prompt_id: asset.prompts_assets_input_prompt_idToprompts.id.toString(),
              prompt_text: asset.prompts_assets_input_prompt_idToprompts.content,
              llm_model_provider: asset.prompts_assets_input_prompt_idToprompts.llm_model_provider,
              llm_model: asset.prompts_assets_input_prompt_idToprompts.llm_model,
              purpose: asset.prompts_assets_input_prompt_idToprompts.purpose,
            } : null,
            output_prompt: asset.prompts_assets_output_prompt_idToprompts ? {
              prompt_id: asset.prompts_assets_output_prompt_idToprompts.id.toString(),
              prompt_text: asset.prompts_assets_output_prompt_idToprompts.content,
              llm_model_provider: asset.prompts_assets_output_prompt_idToprompts.llm_model_provider,
              llm_model: asset.prompts_assets_output_prompt_idToprompts.llm_model,
              purpose: asset.prompts_assets_output_prompt_idToprompts.purpose,
            } : null,
            post: asset.civitai_posts ? {
              post_id: asset.civitai_posts.id.toString(),
              civitai_id: asset.civitai_posts.civitai_id,
              civitai_url: asset.civitai_posts.civitai_url,
              title: asset.civitai_posts.title,
              description: asset.civitai_posts.description,
              status: asset.civitai_posts.status,
            } : null,
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
