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
  stats: civitaiImageStatsSchema,
  createdAt: z.string().optional(),
  username: z.string().optional(),
});

const civitaiMetadataSchema = z.object({
  nextCursor: z.number().optional(),
  currentPage: z.number().optional(),
  pageSize: z.number().optional(),
  nextPage: z.string().optional(),
});

const civitaiImagesResponseSchema = z.object({
  items: z.array(civitaiImageItemSchema),
  metadata: civitaiMetadataSchema.optional(),
});

export type CivitaiImageStats = {
  civitai_id: string;
  cry_count: number;
  laugh_count: number;
  like_count: number;
  dislike_count: number;
  heart_count: number;
  comment_count: number;
  civitai_created_at: string | null;
  civitai_account: string | null;
};

export async function fetchCivitaiPostImageStats(
  postId: string
): Promise<CivitaiImageStats[]> {
  const allStats: CivitaiImageStats[] = [];
  let nextPage: string | undefined = undefined;
  let isFirstPage = true;

  while (isFirstPage || nextPage) {
    const url = nextPage
      ? new URL(nextPage)
      : new URL("https://civitai.com/api/v1/images");

    if (!nextPage) {
      url.searchParams.set("postId", postId);
      url.searchParams.set("limit", "200");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch post images from Civitai (status ${response.status} ${response.statusText})`
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new Error("Civitai response was not valid JSON");
    }

    const parsed = civitaiImagesResponseSchema.parse(json);

    for (const item of parsed.items) {
      const stats = item.stats ?? {};
      allStats.push({
        civitai_id: item.id.toString(),
        cry_count: stats.cryCount ?? 0,
        laugh_count: stats.laughCount ?? 0,
        like_count: stats.likeCount ?? 0,
        dislike_count: stats.dislikeCount ?? 0,
        heart_count: stats.heartCount ?? 0,
        comment_count: stats.commentCount ?? 0,
        civitai_created_at: item.createdAt ?? null,
        civitai_account: item.username ?? null,
      });
    }

    nextPage = parsed.metadata?.nextPage;
    isFirstPage = false;
  }

  return allStats;
}
