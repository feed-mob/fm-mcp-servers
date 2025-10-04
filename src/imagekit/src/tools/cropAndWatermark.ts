import { z } from "zod";

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
}

export async function cropAndWatermarkImage({
  imageUrl,
  aspectRatio,
  watermarkText = "",
  apiKey,
  apiBaseUrl,
  modelId = DEFAULT_MODEL_ID,
}: CropAndWatermarkOptions): Promise<string> {
  const size = aspectRatioSizes[aspectRatio];
  const promptParts = [
    `Crop the image to a ${aspectRatio} aspect ratio while keeping the main subject centered and intact.`,
  ];

  const trimmedWatermark = watermarkText.trim();
  if (trimmedWatermark) {
    promptParts.push(
      `Add a subtle, semi-transparent watermark reading "${trimmedWatermark}" in the bottom-right corner. Ensure every other part of the image remains unchanged.`,
    );
  }

  const payload = {
    model: modelId,
    prompt: promptParts.join(" "),
    image: imageUrl,
    sequential_image_generation: "disabled",
    response_format: "url",
    size,
    stream: false,
    watermark: false,
  } as const;

  const normalizedBaseUrl = (apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const endpoint = `${normalizedBaseUrl}${GENERATION_PATH}`;

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

  const data = (await response.json()) as {
    data?: Array<{ url?: string }>;
  };

  const url = data?.data?.[0]?.url;

  if (!url) {
    throw new Error("Image generation API response did not include an image URL");
  }

  return url;
}

export const defaultImageApiBaseUrl = DEFAULT_API_BASE_URL;
export const defaultImageModelId = DEFAULT_MODEL_ID;
