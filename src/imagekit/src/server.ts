
import "dotenv/config";
import { FastMCP } from "fastmcp";
import { z } from "zod";

import {
  aspectRatioSchema,
  cropAndWatermarkImage,
} from "./tools/cropAndWatermark.js";

const server = new FastMCP({
  name: "feedmob-imagekit",
  version: "1.0.0",
});

server.addTool({
  name: "crop_and_watermark_image",
  description:
    "Crop an image to a target aspect ratio and optionally add a watermark via the Comet API.",
  parameters: z.object({
    imageUrl: z.string().url(),
    aspectRatio: aspectRatioSchema,
    watermarkText: z
      .string()
      .trim()
      .max(200)
      .optional()
      .default(""),
  }),
  execute: async ({ imageUrl, aspectRatio, watermarkText }) => {
    const apiKey = process.env.IMAGE_TOOL_API_KEY;
    const apiHost = process.env.IMAGE_TOOL_API_HOST;

    if (!apiKey) {
      throw new Error("IMAGE_TOOL_API_KEY is not configured");
    }

    return cropAndWatermarkImage({
      imageUrl,
      aspectRatio,
      watermarkText,
      apiKey,
      apiHost,
    });
  },
});

server.start({ transportType: "stdio" });
