import { z } from "zod";

const civitaiImageStatsSchema = z
  .object({
    cryCountAllTime: z.number().int().nonnegative().optional(),
    laughCountAllTime: z.number().int().nonnegative().optional(),
    likeCountAllTime: z.number().int().nonnegative().optional(),
    dislikeCountAllTime: z.number().int().nonnegative().optional(),
    heartCountAllTime: z.number().int().nonnegative().optional(),
    commentCountAllTime: z.number().int().nonnegative().optional(),
  })
  .partial()
  .optional();

const civitaiImageItemSchema = z.object({
  id: z.number(),
  stats: civitaiImageStatsSchema,
  createdAt: z.string().optional(),
  user: z.object({ username: z.string().optional() }).optional(),
});

const civitaiTrpcResponseSchema = z.object({
  result: z.object({
    data: z.object({
      json: z.object({
        nextCursor: z.union([z.number(), z.string()]).nullable().optional(),
        items: z.array(civitaiImageItemSchema),
      }),
    }),
  }),
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
  let nextCursor: number | string | null | undefined = undefined;
  let isFirstPage = true;

  while (isFirstPage || nextCursor) {
    const input: any = {
      json: {
        postId: parseInt(postId),
        pending: false,
        browsingLevel: null,
        withMeta: false,
        include: [],
        excludedTagIds: [],
        disablePoi: true,
        disableMinor: false,
        cursor: nextCursor ?? null,
      },
      meta: {
        values: {
          browsingLevel: ["undefined"],
          cursor: ["undefined"],
        },
      },
    };

    if (nextCursor) {
      delete input.meta.values.cursor;
    }

    const url = new URL("https://civitai.com/api/trpc/image.getInfinite");
    url.searchParams.set("input", JSON.stringify(input));

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch post images from Civitai TRPC (status ${response.status} ${response.statusText})`
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new Error("Civitai response was not valid JSON");
    }

    const parsed = civitaiTrpcResponseSchema.parse(json);
    const items = parsed.result.data.json.items;

    for (const item of items) {
      const stats = item.stats ?? {};
      allStats.push({
        civitai_id: item.id.toString(),
        cry_count: stats.cryCountAllTime ?? 0,
        laugh_count: stats.laughCountAllTime ?? 0,
        like_count: stats.likeCountAllTime ?? 0,
        dislike_count: stats.dislikeCountAllTime ?? 0,
        heart_count: stats.heartCountAllTime ?? 0,
        comment_count: stats.commentCountAllTime ?? 0,
        civitai_created_at: item.createdAt ?? null,
        civitai_account: item.user?.username ?? null,
      });
    }

    nextCursor = parsed.result.data.json.nextCursor;
    isFirstPage = false;
  }

  return allStats;
}
