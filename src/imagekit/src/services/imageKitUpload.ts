import { z } from "zod";

import type {
  ImageUploadRequest,
  ImageUploadResult,
  ImageUploader,
} from "./imageUploader.js";

const baseRequestSchema = z.object({
  file: z
    .string()
    .trim()
    .min(1, { message: "file is required" })
    .describe(
      "File contents to upload. Provide a base64 string, binary buffer encoded as base64, or a publicly accessible URL.",
    ),
  fileName: z
    .string()
    .trim()
    .min(1, { message: "fileName is required" })
    .describe("Target filename to assign in ImageKit"),
  folder: z
    .string()
    .trim()
    .min(1, { message: "folder must be at least 1 character" })
    .optional()
    .describe("Optional folder path such as /marketing/banners"),
  tags: z
    .array(z.string().trim().min(1, { message: "tags cannot be empty" }))
    .max(30, { message: "Up to 30 tags are supported by ImageKit" })
    .optional()
    .describe("Optional tags to attach to the asset."),
});

const imageKitOptionsSchema = z.object({
  useUniqueFileName: z
    .boolean()
    .optional()
    .describe("When true, ImageKit appends a unique suffix to avoid collisions."),
  isPrivateFile: z
    .boolean()
    .optional()
    .describe("Mark the file as private to require signed URLs."),
  responseFields: z
    .array(z.string().trim().min(1))
    .max(20)
    .optional()
    .describe("Restrict the upload response to the supplied fields."),
  customMetadata: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe(
      "Custom metadata defined in the ImageKit dashboard. Values must be string, number, or boolean.",
    ),
});

export const imageKitUploadParametersSchema = baseRequestSchema.extend({
  options: imageKitOptionsSchema.optional(),
});

export type ImageKitUploadOptions = z.infer<typeof imageKitOptionsSchema>;
export type ImageKitUploadRequest = ImageUploadRequest<ImageKitUploadOptions>;
export type ImageKitUploadParameters = z.infer<typeof imageKitUploadParametersSchema>;

export interface ImageKitUploadResponse {
  fileId?: string;
  name?: string;
  url?: string;
  thumbnailUrl?: string;
  filePath?: string;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  fileType?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

const DEFAULT_UPLOAD_ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";

export interface ImageKitUploaderConfig {
  privateKey: string;
  uploadEndpoint?: string;
}

export class ImageKitUploader
  implements ImageUploader<
    ImageKitUploadRequest,
    ImageUploadResult<ImageKitUploadResponse>
  >
{
  private readonly privateKey: string;
  private readonly uploadEndpoint: string;

  constructor(config: ImageKitUploaderConfig) {
    if (!config.privateKey?.trim()) {
      throw new Error("ImageKit private key is required to initialize the uploader");
    }

    this.privateKey = config.privateKey.trim();
    this.uploadEndpoint = (config.uploadEndpoint ?? DEFAULT_UPLOAD_ENDPOINT).replace(/\/$/, "");
  }

  async upload(
    request: ImageKitUploadRequest,
    signal?: AbortSignal,
  ): Promise<ImageUploadResult<ImageKitUploadResponse>> {
    const form = new FormData();

    form.set("file", request.file);
    form.set("fileName", request.fileName);

    if (request.folder) {
      form.set("folder", request.folder);
    }

    if (request.tags?.length) {
      form.set("tags", request.tags.join(","));
    }

    const options = request.options ?? {};

    if (typeof options.useUniqueFileName === "boolean") {
      form.set("useUniqueFileName", String(options.useUniqueFileName));
    }

    if (typeof options.isPrivateFile === "boolean") {
      form.set("isPrivateFile", String(options.isPrivateFile));
    }

    if (options.responseFields?.length) {
      form.set("responseFields", options.responseFields.join(","));
    }

    if (options.customMetadata && Object.keys(options.customMetadata).length > 0) {
      form.set("customMetadata", JSON.stringify(options.customMetadata));
    }

    const authHeader = Buffer.from(`${this.privateKey}:`).toString("base64");

    const response = await fetch(this.uploadEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
      body: form,
      signal,
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const errorBody = (await response.json()) as { message?: string; help?: string };
        const details = [errorBody.message, errorBody.help]
          .filter((value) => typeof value === "string" && value.trim().length > 0)
          .join(" | ");
        throw new Error(
          details
            ? `ImageKit upload failed with status ${response.status}: ${details}`
            : `ImageKit upload failed with status ${response.status}`,
        );
      }

      const errorText = await response.text();
      throw new Error(
        errorText.trim()
          ? `ImageKit upload failed with status ${response.status}: ${errorText}`
          : `ImageKit upload failed with status ${response.status}`,
      );
    }

    const raw = (await response.json()) as ImageKitUploadResponse;

    const result: ImageUploadResult<ImageKitUploadResponse> = {
      id: typeof raw.fileId === "string" ? raw.fileId : undefined,
      url: typeof raw.url === "string" ? raw.url : undefined,
      name: typeof raw.name === "string" ? raw.name : undefined,
      metadata:
        raw.metadata && typeof raw.metadata === "object"
          ? (raw.metadata as Record<string, unknown>)
          : undefined,
      providerData: raw,
    };

    return result;
  }
}

export async function uploadImageWithImageKit(
  config: ImageKitUploaderConfig,
  request: ImageKitUploadRequest,
  signal?: AbortSignal,
): Promise<ImageUploadResult<ImageKitUploadResponse>> {
  const uploader = new ImageKitUploader(config);
  return uploader.upload(request, signal);
}
