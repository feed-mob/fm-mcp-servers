import { z } from "zod";

import ImageKit, { APIError, ImageKitError } from "@imagekit/nodejs";
import type {
  FileUploadParams,
  FileUploadResponse,
} from "@imagekit/nodejs/resources/files/files.js";

import type {
  ImageUploadRequest,
  ImageUploadResult,
  ImageUploader,
} from "./imageUploader.js";

const DEFAULT_FOLDER = "upload/";
const DEFAULT_TAGS = ["upload"] as const;
const DEFAULT_BASE_URL = "https://upload.imagekit.io";

const baseRequestSchema = z.object({
  file: z
    .string()
    .trim()
    .min(1, { message: "file must be at least 1 character" })
    .describe(
      "File contents to upload. Provide a base64 string, binary buffer encoded as base64, a publicly accessible URL, or a local file path.",
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
    .default(DEFAULT_FOLDER)
    .describe("Optional folder path such as /marketing/banners"),
  tags: z
    .array(z.string().trim().min(1, { message: "tags cannot be empty" }))
    .max(30, { message: "Up to 30 tags are supported by ImageKit" })
    .optional()
    .default([...DEFAULT_TAGS])
    .describe("Optional tags to attach to the asset."),
});

const imageKitOptionsSchema = z.object({
  useUniqueFileName: z
    .boolean()
    .default(true)
    .optional()
    .describe("When true, ImageKit appends a unique suffix to avoid collisions."),
  isPrivateFile: z
    .boolean()
    .default(false)
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

export const imageKitUploadBaseSchema = baseRequestSchema;

export const imageKitUploadParametersSchema = imageKitUploadBaseSchema.extend({
  options: imageKitOptionsSchema.optional(),
});

export type ImageKitUploadOptions = z.infer<typeof imageKitOptionsSchema>;
export type ImageKitUploadRequest = ImageUploadRequest<ImageKitUploadOptions>;
export type ImageKitUploadParameters = z.infer<typeof imageKitUploadParametersSchema>;
export type ImageKitUploadResponse = FileUploadResponse & Record<string, unknown>;

export interface ImageKitUploaderConfig {
  privateKey: string;
  baseURL?: string;
  uploadEndpoint?: string;
}

export class ImageKitUploader
  implements ImageUploader<
    ImageKitUploadRequest,
    ImageUploadResult<ImageKitUploadResponse>
  >
{
  private readonly client: ImageKit;

  constructor(config: ImageKitUploaderConfig) {
    if (!config.privateKey?.trim()) {
      throw new Error("ImageKit private key is required to initialize the uploader");
    }

    const baseURL = config.baseURL ?? config.uploadEndpoint ?? DEFAULT_BASE_URL;

    this.client = new ImageKit({
      privateKey: config.privateKey.trim(),
      baseURL,
    });
  }

  async upload(
    request: ImageKitUploadRequest,
    signal?: AbortSignal,
  ): Promise<ImageUploadResult<ImageKitUploadResponse>> {
    const responseFields = request.options?.responseFields as
      | FileUploadParams["responseFields"]
      | undefined;

    const params: FileUploadParams = {
      file: request.file,
      fileName: request.fileName,
      folder: request.folder ?? DEFAULT_FOLDER,
      tags: request.tags?.length ? request.tags : [...DEFAULT_TAGS],
      useUniqueFileName:
        request.options?.useUniqueFileName ?? true,
      isPrivateFile: request.options?.isPrivateFile ?? false,
      responseFields,
      customMetadata: request.options?.customMetadata,
    };

    try {
      const providerData = (await this.client.files.upload(params, {
        signal,
      })) as ImageKitUploadResponse;

      const metadata = providerData.metadata;
      const normalizedMetadata =
        metadata && typeof metadata === "object"
          ? (metadata as Record<string, unknown>)
          : undefined;

      return {
        id: providerData.fileId,
        url: providerData.url,
        name: providerData.name,
        metadata: normalizedMetadata,
        providerData,
      } satisfies ImageUploadResult<ImageKitUploadResponse>;
    } catch (error) {
      if (error instanceof APIError || error instanceof ImageKitError) {
        const status =
          typeof (error as APIError).status === "number" ? (error as APIError).status : undefined;
        const message = error.message ?? "ImageKit upload failed";
        throw new Error(
          status
            ? `ImageKit upload failed with status ${status}: ${message}`
            : `ImageKit upload failed: ${message}`,
        );
      }

      throw error;
    }
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
