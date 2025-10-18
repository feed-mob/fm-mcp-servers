import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { sha256 } from "../lib/sha256.js";

export const calculateSha256Parameters = z.object({
  path: z
    .string()
    .describe("The file path (local file system path) or URL (http/https) to calculate SHA-256 hash for."),
});

export type CalculateSha256Parameters = z.infer<typeof calculateSha256Parameters>;

export const calculateSha256Tool = {
  name: "calculate_sha256",
  description: "Calculate SHA-256 hash for a file from a local path or URL.",
  parameters: calculateSha256Parameters,
  execute: async ({ path }: CalculateSha256Parameters): Promise<ContentResult> => {
    try {
      const trimmedPath = path.trim();
      const sha256sum = await sha256(trimmedPath);
      
      const sourceType = trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")
        ? "url"
        : "file";

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              path: trimmedPath,
              source_type: sourceType,
              sha256sum,
            }, null, 2),
          },
        ],
      } satisfies ContentResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              path: path.trim(),
              error: errorMessage,
            }, null, 2),
          },
        ],
      } satisfies ContentResult;
    }
  },
};
