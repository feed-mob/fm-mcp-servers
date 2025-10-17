import type { ContentResult } from "fastmcp";
import { PrismaClient } from "../generated/prisma/index.js";
import { z } from "zod";

export const updateCivitaiPostAssetParameters = z.object({
  post_id: z
    .string()
    .min(1)
    .describe("The ID of the Civitai post to update. This should be the post_id returned from a previous create_civitai_post call."),
  asset_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of the asset to associate with this post. Set to null or empty string to remove the asset association."),
  asset_type: z
    .enum(["image", "video"])
    .nullable()
    .default(null)
    .describe("The type of asset being published. If not provided and asset_id is set, the asset's original type will be used."),
});

export type UpdateCivitaiPostAssetParameters = z.infer<typeof updateCivitaiPostAssetParameters>;

const prisma = new PrismaClient();

export const updateCivitaiPostAssetTool = {
  name: "update_civitai_post_asset",
  description: "Update the asset_id and asset_type for an existing Civitai post. Use this when you need to link a post to a different asset or correct an asset association.",
  parameters: updateCivitaiPostAssetParameters,
  execute: async ({
    post_id,
    asset_id,
    asset_type,
  }: UpdateCivitaiPostAssetParameters): Promise<ContentResult> => {
    let postIdBigInt: bigint;
    try {
      postIdBigInt = BigInt(post_id);
    } catch (error) {
      throw new Error("post_id must be a valid integer ID");
    }

    let assetIdBigInt: bigint | null = null;
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

    const post = await prisma.civitai_posts.update({
      where: {
        id: postIdBigInt,
      },
      data: {
        asset_id: assetIdBigInt,
        asset_type: asset_type ?? undefined,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            post_id: post.id.toString(),
            civitai_id: post.civitai_id,
            civitai_url: post.civitai_url,
            status: post.status,
            asset_id: post.asset_id?.toString() ?? null,
            asset_type: post.asset_type,
            title: post.title,
            description: post.description,
            updated_at: post.updated_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
