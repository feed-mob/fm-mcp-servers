import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const civitaiMediaEngagementPrompt = {
  name: "civitai_media_engagement",
  description: "Guide for finding and analyzing Civitai media (videos and images) engagement metrics using find_asset, list_civitai_posts, and fetch_civitai_post_assets",
  load: async () => {
    const content = await fs.promises.readFile(
      path.join(__dirname, "civitai-media-engagement.md"),
      "utf-8"
    );
    return content;
  },
};
