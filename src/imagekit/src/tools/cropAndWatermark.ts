import { z } from "zod";

import type { ImageUploadResult } from "../services/imageUploader.js";
import {
  uploadImageWithImageKit,
  type ImageKitUploadOptions,
  type ImageKitUploadRequest,
  type ImageKitUploaderConfig,
  type ImageKitUploadResponse,
} from "../services/imageKitUpload.js";

const aspectRatioValues = [
  "1:1",
  "4:3",
  "3:4",
  "9:16",
  "16:9",
  "3:2",
  "2:3",
  "21:9",
] as const;

export type ImageAspectRatio = (typeof aspectRatioValues)[number];

export const aspectRatioSchema = z.enum(aspectRatioValues);

const aspectRatioSizes: Record<ImageAspectRatio, string> = {
  "1:1": "2048x2048",
  "4:3": "2304x1728",
  "3:4": "1728x2304",
  "9:16": "1440x2560",
  "16:9": "2560x1440",
  "3:2": "2496x1664",
  "2:3": "1664x2496",
  "21:9": "3024x1296",
};

const DEFAULT_API_BASE_URL = "https://api.cometapi.com/v1";
const GENERATION_PATH = "/images/generations";

const DEFAULT_MODEL_ID = "bytedance-seedream-4-0-250828";

export interface CropAndWatermarkOptions {
  imageUrl: string;
  aspectRatio: ImageAspectRatio;
  watermarkText?: string;
  apiKey: string;
  apiBaseUrl?: string;
  modelId?: string;
  imageKit?: ImageKitPostUploadConfig;
}

export interface ImageKitPostUploadConfig {
  config: ImageKitUploaderConfig;
  fileName?: string;
  folder?: string;
  tags?: string[];
  options?: ImageKitUploadOptions;
}

export async function cropAndWatermarkImage({
  imageUrl,
  aspectRatio,
  watermarkText = "",
  apiKey,
  apiBaseUrl,
  modelId = DEFAULT_MODEL_ID,
  imageKit,
}: CropAndWatermarkOptions): Promise<string> {
  const payload = createGenerationPayload({
    aspectRatio,
    imageUrl,
    modelId,
    watermarkText,
  });

  const endpoint = resolveGenerationEndpoint(apiBaseUrl);
  const generatedUrl = await requestGeneratedImage({
    apiKey,
    endpoint,
    payload,
  });

  if (!imageKit) {
    return generatedUrl;
  }

  const uploadedUrl = await uploadGeneratedImage({
    generatedUrl,
    imageKit,
  });

  return uploadedUrl ?? generatedUrl;
}

export const defaultImageApiBaseUrl = DEFAULT_API_BASE_URL;
export const defaultImageModelId = DEFAULT_MODEL_ID;

function deriveFileNameFromUrl(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    if (lastSegment) {
      return sanitizeFileName(`cropped-${lastSegment}`);
    }
  } catch {
    // ignore URL parsing errors and fall back to timestamped name
  }

  return `cropped-${Date.now()}.jpg`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_");
}

function getUrlFromProviderData(
  result: ImageUploadResult<ImageKitUploadResponse>,
): string | undefined {
  const providerUrl = result.providerData?.url;
  return typeof providerUrl === "string" && providerUrl.trim().length > 0
    ? providerUrl
    : undefined;
}

type GenerationPayload = ReturnType<typeof createGenerationPayload>;

function createGenerationPayload({
  aspectRatio,
  imageUrl,
  modelId,
  watermarkText,
}: {
  aspectRatio: ImageAspectRatio;
  imageUrl: string;
  modelId: string;
  watermarkText?: string;
}) {
  return {
    model: modelId,
    prompt: buildGenerationPrompt(aspectRatio, watermarkText),
    image: imageUrl,
    sequential_image_generation: "disabled",
    response_format: "url",
    size: aspectRatioSizes[aspectRatio],
    stream: false,
    watermark: false,
  } as const;
}

function buildGenerationPrompt(
  aspectRatio: ImageAspectRatio,
  watermarkText?: string,
) {
  const promptParts = [
    `Crop the image to a ${aspectRatio} aspect ratio while keeping the main subject centered and intact.`,
  ];

  const trimmedWatermark = watermarkText?.trim();
  if (trimmedWatermark) {
    promptParts.push(
      `Add a subtle, semi-transparent watermark reading "${trimmedWatermark}" in the bottom-right corner. Ensure every other part of the image remains unchanged.`,
    );
  }

  return promptParts.join(" ");
}

function resolveGenerationEndpoint(apiBaseUrl?: string): string {
  const normalizedBaseUrl = (apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
  return `${normalizedBaseUrl}${GENERATION_PATH}`;
}

async function requestGeneratedImage({
  apiKey,
  endpoint,
  payload,
}: {
  apiKey: string;
  endpoint: string;
  payload: GenerationPayload;
}): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Image generation API request failed with status ${response.status}: ${errorBody}`,
    );
  }

  const data = (await response.json()) as GenerationResponse;
  const url = data?.data?.[0]?.url;

  if (!url) {
    throw new Error("Image generation API response did not include an image URL");
  }

  return url;
}

async function uploadGeneratedImage({
  generatedUrl,
  imageKit,
}: {
  generatedUrl: string;
  imageKit: ImageKitPostUploadConfig;
}): Promise<string | undefined> {
  const uploadRequest: ImageKitUploadRequest = {
    file: generatedUrl,
    fileName: imageKit.fileName ?? deriveFileNameFromUrl(generatedUrl),
    folder: imageKit.folder,
    tags: imageKit.tags,
    options: imageKit.options,
  };

  const uploadResult = await uploadImageWithImageKit(imageKit.config, uploadRequest);
  return uploadResult.url ?? getUrlFromProviderData(uploadResult);
}

type GenerationResponse = {
  data?: Array<{ url?: string }>;
};
