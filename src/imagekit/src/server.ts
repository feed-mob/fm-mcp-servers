#!/usr/bin/env node

import "dotenv/config";
import { FastMCP } from "fastmcp";
import { z } from "zod";

import {
  aspectRatioSchema,
  cropAndWatermarkImage,
} from "./tools/cropAndWatermark.js";
import { createUploadFileTool } from "./tools/uploadFile.js";

const server = new FastMCP({
  name: "feedmob-imagekit",
  version: "1.0.3",
});

const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;

server.addTool({
  name: "crop_and_watermark_image",
  description:
    "Crop an image to a target aspect ratio, optionally add a watermark, and upload to ImageKit when configured.",
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
    const apiBaseUrl = process.env.IMAGE_TOOL_BASE_URL;
    const modelId = process.env.IMAGE_TOOL_MODEL_ID;

    if (!apiKey) {
      throw new Error("IMAGE_TOOL_API_KEY is not configured");
    }

    const generatedUrl = await cropAndWatermarkImage({
      imageUrl,
      aspectRatio,
      watermarkText,
      apiKey,
      apiBaseUrl,
      modelId,
      imageKit: imageKitPrivateKey
        ? {
            config: { privateKey: imageKitPrivateKey },
          }
        : undefined,
    });

    return generatedUrl;
  },
});

server.addTool(createUploadFileTool({ imageKitPrivateKey }));

server.start({ transportType: "stdio" });
