import type { ContentResult } from "fastmcp";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getMediaEngagementGuideParameters = z.object({});

export type GetMediaEngagementGuideParameters = z.infer<
  typeof getMediaEngagementGuideParameters
>;

export const getMediaEngagementGuideTool = {
  name: "get_media_engagement_guide",
  description:
    "Get the comprehensive guide for finding and analyzing Civitai media (videos and images) engagement metrics. This guide explains how to use find_asset, list_civitai_posts, and fetch_civitai_post_assets to retrieve engagement data like likes, hearts, comments, and other reactions for videos and images on Civitai.",
  parameters: getMediaEngagementGuideParameters,
  execute: async (
    _params: GetMediaEngagementGuideParameters
  ): Promise<ContentResult> => {
    const guidePath = path.join(
      __dirname,
      "..",
      "prompts",
      "civitai-media-engagement.md"
    );
    const content = await fs.promises.readFile(guidePath, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    } satisfies ContentResult;
  },
};
