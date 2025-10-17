import type { ContentResult } from "fastmcp";
import { PrismaClient } from "../generated/prisma/index.js";
import { z } from "zod";

const metadataSchema = z.record(z.any()).nullable().default(null);

export const createCivitaiPostParameters = z.object({
  civitai_id: z
    .string()
    .min(1)
    .describe("The unique publication ID returned by Civitai after successfully posting content. This is Civitai's identifier for this specific publication (e.g., '12345678')."),
  civitai_url: z
    .string()
    .min(1)
    .describe("The full public URL where this publication can be viewed on Civitai (e.g., 'https://civitai.com/posts/12345678')."),
  status: z
    .enum(["pending", "published", "failed"])
    .default("published")
    .describe("The publication status. Use 'published' for successful posts, 'pending' for scheduled posts, or 'failed' for unsuccessful attempts."),
  asset_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of the asset that was published to Civitai. If you published an asset that was previously saved using create_asset, provide that asset_id here to maintain the relationship."),
  asset_type: z
    .enum(["image", "video"])
    .nullable()
    .default(null)
    .describe("Override the asset type for this publication if different from the stored asset. Leave empty to use the asset's original type."),
  title: z
    .string()
    .nullable()
    .default(null)
    .describe("The title of the publication as it appears on Civitai."),
  description: z
    .string()
    .nullable()
    .default(null)
    .describe("The description or caption of the publication as posted to Civitai."),
  metadata: metadataSchema.describe("Complete response metadata from Civitai's API as a JSON object. Store the full API response here to preserve all platform-specific details like creation timestamp, stats, tags, etc."),
});

export type CreateCivitaiPostParameters = z.infer<typeof createCivitaiPostParameters>;

const prisma = new PrismaClient();

export const createCivitaiPostTool = {
  name: "create_civitai_post",
  description: "Record a publication to Civitai.com. Use this after publishing content to Civitai to track the publication in the database, linking it to the source asset and storing platform-specific metadata.",
  parameters: createCivitaiPostParameters,
  execute: async ({
    civitai_id,
    civitai_url,
    status,
    asset_id,
    asset_type,
    title,
    description,
    metadata,
  }: CreateCivitaiPostParameters): Promise<ContentResult> => {
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

    const post = await prisma.civitai_posts.create({
      data: {
        civitai_id,
        civitai_url,
        status,
        asset_id: assetIdBigInt,
        asset_type: asset_type ?? undefined,
        title: title ?? undefined,
        description: description ?? undefined,
        metadata: metadata ?? undefined,
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
            created_at: post.created_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
