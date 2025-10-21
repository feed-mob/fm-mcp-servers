import type { ContentResult } from "fastmcp";
import { z } from "zod";

const civitaiImageStatsSchema = z
  .object({
    cryCount: z.number().int().nonnegative().optional(),
    laughCount: z.number().int().nonnegative().optional(),
    likeCount: z.number().int().nonnegative().optional(),
    dislikeCount: z.number().int().nonnegative().optional(),
    heartCount: z.number().int().nonnegative().optional(),
    commentCount: z.number().int().nonnegative().optional(),
  })
  .partial()
  .optional();

const civitaiImageItemSchema = z.object({
  id: z.number(),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  nsfwLevel: z.string().nullable().optional(),
  type: z.string().min(1),
  nsfw: z.boolean().optional(),
  browsingLevel: z.number().int().optional(),
  createdAt: z.string().optional(),
  postId: z.number().optional(),
  stats: civitaiImageStatsSchema,
  meta: z.record(z.any()).nullable().optional(),
  username: z.string().nullable().optional(),
  baseModel: z.string().nullable().optional(),
  modelVersionIds: z.array(z.number()).optional(),
});

const civitaiImagesResponseSchema = z.object({
  items: z.array(civitaiImageItemSchema),
  metadata: z.record(z.any()).optional(),
});

export const fetchCivitaiPostAssetsParameters = z.object({
  post_id: z
    .string()
    .min(1)
    .describe(
      "Numeric post ID from the Civitai post URL. Example: '23683656' extracted from https://civitai.com/posts/23683656."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum number of assets to fetch per page. Civitai caps this at 100."),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number for pagination. Starts at 1."),
});

export type FetchCivitaiPostAssetsParameters = z.infer<
  typeof fetchCivitaiPostAssetsParameters
>;

function normalizeItem(item: z.infer<typeof civitaiImageItemSchema>) {
  const stats = item.stats ?? {};
  return {
    civitai_image_id: item.id.toString(),
    civitai_post_id: item.postId?.toString() ?? null,
    asset_url: item.url,
    type: item.type,
    dimensions: {
      width: item.width ?? null,
      height: item.height ?? null,
    },
    nsfw: item.nsfw ?? false,
    nsfw_level: item.nsfwLevel ?? null,
    browsing_level: item.browsingLevel ?? null,
    created_at: item.createdAt ?? null,
    username: item.username ?? null,
    base_model: item.baseModel ?? null,
    model_version_ids: item.modelVersionIds?.map(String) ?? [],
    engagement_stats: {
      cry: stats.cryCount ?? 0,
      laugh: stats.laughCount ?? 0,
      like: stats.likeCount ?? 0,
      dislike: stats.dislikeCount ?? 0,
      heart: stats.heartCount ?? 0,
      comment: stats.commentCount ?? 0,
    },
    metadata: item.meta ?? null,
  };
}

export const fetchCivitaiPostAssetsTool = {
  name: "fetch_civitai_post_assets",
  description:
    "Fetch media assets for a specific Civitai post directly from the public Civitai Images API, including per-asset engagement stats like likes, hearts, and comments. Use this to inspect performance or get the Civitai media assets (Civitai images) from the given post.",
  parameters: fetchCivitaiPostAssetsParameters,
  execute: async ({
    post_id,
    limit,
    page,
  }: FetchCivitaiPostAssetsParameters): Promise<ContentResult> => {
    const trimmedPostId = post_id.trim();
    if (!/^[0-9]+$/.test(trimmedPostId)) {
      throw new Error("post_id must be a numeric string");
    }

    const url = new URL("https://civitai.com/api/v1/images");
    url.searchParams.set("postId", trimmedPostId);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("page", page.toString());

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch assets from Civitai (status ${response.status} ${response.statusText})`
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new Error("Civitai response was not valid JSON");
    }

    const parsed = civitaiImagesResponseSchema.parse(json);
    const assets = parsed.items.map(normalizeItem);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              post_id: trimmedPostId,
              page,
              limit,
              asset_count: assets.length,
              assets,
              metadata: parsed.metadata ?? null,
            },
            null,
            2
          ),
        },
      ],
    } satisfies ContentResult;
  },
};
