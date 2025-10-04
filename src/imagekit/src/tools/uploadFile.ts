import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ContentResult } from "fastmcp";
import { z } from "zod";

import {
  ImageKitUploader,
  imageKitUploadParametersSchema,
  type ImageKitUploadRequest,
  type ImageKitUploadResponse,
} from "../services/imageKitUpload.js";

export const uploadFileParametersSchema = imageKitUploadParametersSchema.extend({
  provider: z.literal("imagekit").default("imagekit"),
});

export type UploadFileParameters = z.infer<typeof uploadFileParametersSchema>;

export interface UploadFileToolConfig {
  imageKitPrivateKey?: string;
}

function isRemoteUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

function isDataUrl(input: string): boolean {
  return input.startsWith("data:");
}

async function resolveFileInput(file: string): Promise<string> {
  if (isRemoteUrl(file) || isDataUrl(file)) {
    return file;
  }

  const resolvedPath = resolve(file);

  try {
    await access(resolvedPath);
  } catch {
    return file;
  }

  try {
    const fileBuffer = await readFile(resolvedPath);
    return fileBuffer.toString("base64");
  } catch (error) {
    const reason =
      error && typeof error === "object" && "message" in error
        ? (error as Error).message
        : String(error);

    throw new Error(`Unable to read local file at ${resolvedPath}: ${reason}`);
  }
}

export async function executeUploadFile(
  params: UploadFileParameters,
  privateKey: string,
): Promise<ContentResult> {
  if (params.provider !== "imagekit") {
    throw new Error(`Unsupported provider: ${params.provider}`);
  }

  const uploader = new ImageKitUploader({
    privateKey,
  });

  const { provider, file, ...request } = params;
  const resolvedFile = await resolveFileInput(file);

  const uploadRequest: ImageKitUploadRequest = {
    ...request,
    file: resolvedFile,
  };
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

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ summary, providerData }, null, 2),
      },
    ],
  } satisfies ContentResult;
}

export function createUploadFileTool(config: UploadFileToolConfig) {
  return {
    name: "upload_file",
    description:
      "Upload an asset to the configured media provider. Defaults to ImageKit and accepts base64 content, a local file path, or a remote URL.",
    parameters: uploadFileParametersSchema,
    execute: async (params: UploadFileParameters): Promise<ContentResult> => {
      const privateKey = config.imageKitPrivateKey;

      if (!privateKey) {
        throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");
      }

      return executeUploadFile(params, privateKey);
    },
  };
}
