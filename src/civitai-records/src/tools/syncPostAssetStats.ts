import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { fetchCivitaiPostImageStats } from "../lib/civitaiApi.js";
import { handleDatabaseError } from "../lib/handleDatabaseError.js";

const prisma = new PrismaClient();

export const syncPostAssetStatsParameters = z.object({
  civitai_post_id: z
    .string()
    .min(1)
    .describe("The Civitai post ID to sync all image stats for."),
});

export type SyncPostAssetStatsParameters = z.infer<
  typeof syncPostAssetStatsParameters
>;

export const syncPostAssetStatsTool = {
  name: "sync_post_asset_stats",
  description:
    "Batch sync engagement statistics for all images in a Civitai post. Fetches stats for all images from the post's public API and updates or creates corresponding records in the asset_stats table. Only processes images that exist in the assets table (matched by civitai_id).",
  parameters: syncPostAssetStatsParameters,
  execute: async ({
    civitai_post_id,
  }: SyncPostAssetStatsParameters): Promise<ContentResult> => {
    const allStats = await fetchCivitaiPostImageStats(civitai_post_id);

    if (allStats.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                civitai_post_id,
                message: "No images found for this post",
                synced_count: 0,
                skipped_count: 0,
                failed: [],
              },
              null,
              2
            ),
          },
        ],
      } satisfies ContentResult;
    }

    const civitaiIds = allStats.map((s) => s.civitai_id);
    const assets = await prisma.assets.findMany({
      where: { civitai_id: { in: civitaiIds } },
      select: { id: true, civitai_id: true, uri: true, post_id: true, on_behalf_of: true },
    });

    const assetMap = new Map(assets.map((a) => [a.civitai_id, a]));

    let syncedCount = 0;
    let skippedCount = 0;
    const failed: Array<{ civitai_id: string; error: string }> = [];

    for (const stats of allStats) {
      const asset = assetMap.get(stats.civitai_id);

      if (!asset) {
        skippedCount++;
        continue;
      }

      try {
        await prisma.asset_stats.upsert({
          where: { asset_id: asset.id },
          update: {
            cry_count: BigInt(stats.cry_count),
            laugh_count: BigInt(stats.laugh_count),
            like_count: BigInt(stats.like_count),
            dislike_count: BigInt(stats.dislike_count),
            heart_count: BigInt(stats.heart_count),
            comment_count: BigInt(stats.comment_count),
            civitai_created_at: stats.civitai_created_at ? new Date(stats.civitai_created_at) : null,
            civitai_account: stats.civitai_account,
            post_id: asset.post_id,
            on_behalf_of: asset.on_behalf_of,
            updated_at: new Date(),
          },
          create: {
            asset_id: asset.id,
            cry_count: BigInt(stats.cry_count),
            laugh_count: BigInt(stats.laugh_count),
            like_count: BigInt(stats.like_count),
            dislike_count: BigInt(stats.dislike_count),
            heart_count: BigInt(stats.heart_count),
            comment_count: BigInt(stats.comment_count),
            civitai_created_at: stats.civitai_created_at ? new Date(stats.civitai_created_at) : null,
            civitai_account: stats.civitai_account,
            post_id: asset.post_id,
            on_behalf_of: asset.on_behalf_of,
          },
        });

        syncedCount++;
      } catch (error) {
        try {
          handleDatabaseError(error, `Civitai ID: ${stats.civitai_id}`);
        } catch (handledError) {
          failed.push({
            civitai_id: stats.civitai_id,
            error: handledError instanceof Error ? handledError.message : String(handledError),
          });
        }
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              civitai_post_id,
              total_images_fetched: allStats.length,
              synced_count: syncedCount,
              skipped_count: skippedCount,
              failed_count: failed.length,
              ...(failed.length > 0 && { failed }),
            },
            null,
            2
          ),
        },
      ],
    } satisfies ContentResult;
  },
};
