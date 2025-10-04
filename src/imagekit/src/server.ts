#!/usr/bin/env node

import "dotenv/config";
import { FastMCP, type ContentResult } from "fastmcp";
import { z } from "zod";

import {
  aspectRatioSchema,
  cropAndWatermarkImage,
} from "./tools/cropAndWatermark.js";
import {
  ImageKitUploader,
  imageKitUploadParametersSchema,
  type ImageKitUploadRequest,
  type ImageKitUploadResponse,
} from "./services/imageKitUpload.js";

const server = new FastMCP({
  name: "feedmob-imagekit",
  version: "1.0.0",
});

const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;

const uploadFileParametersSchema = imageKitUploadParametersSchema.extend({
  provider: z.literal("imagekit").default("imagekit"),
});

type UploadFileParameters = z.infer<typeof uploadFileParametersSchema>;

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

server.addTool({
  name: "upload_file",
  description:
    "Upload an asset to the configured media provider. Defaults to ImageKit and accepts base64 content or a remote URL.",
  parameters: uploadFileParametersSchema,
  execute: async (params: UploadFileParameters): Promise<ContentResult> => {
    if (params.provider !== "imagekit") {
      throw new Error(`Unsupported provider: ${params.provider}`);
    }

    const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!imageKitPrivateKey) {
      throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");
    }

    const uploader = new ImageKitUploader({
      privateKey: imageKitPrivateKey,
    });

    const { provider, ...request } = params;
    const uploadRequest = request as ImageKitUploadRequest;
    const result = await uploader.upload(uploadRequest);

    const providerData: ImageKitUploadResponse =
      (result.providerData as ImageKitUploadResponse | undefined) ?? {};
    const displayName = result.name ?? uploadRequest.fileName;

    const summary = {
      provider,
      id: result.id ?? providerData.fileId,
      name: displayName,
      url: result.url ?? providerData.url,
      thumbnailUrl: providerData.thumbnailUrl,
    };

    const content: ContentResult = {
      content: [
        {
          type: "text",
          text: JSON.stringify({ summary, providerData }, null, 2),
        },
      ],
    };

    return content;
  },
});

server.start({ transportType: "stdio" });
