import type { ContentResult } from "fastmcp";
import { PrismaClient } from "../generated/prisma/index.js";
import { z } from "zod";

const metadataSchema = z.record(z.any()).nullable().default(null);

export const createAssetParameters = z.object({
  asset_url: z
    .string()
    .min(1)
    .describe("The full URL or storage path where the asset file is located. This should be a valid, accessible URL pointing to the actual media file (e.g., 's3://bucket/path/file.mp4', 'https://storage.example.com/video.mp4')."),
  asset_type: z
    .enum(["image", "video"])
    .describe("The type of media asset. Choose 'image' or 'video' based on the content type."),
  asset_source: z
    .enum(["generated", "upload"])
    .describe("How this asset was created. Use 'generated' for AI-generated content or 'upload' for user-uploaded files."),
  input_prompt_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of the prompt that was used to generate this asset. If you generated content from a prompt, first call create_prompt to save the prompt and get its ID, then use that ID here to link the asset to its source prompt. Leave empty for uploaded assets or content not generated from a prompt."),
  output_prompt_id: z
    .string()
    .nullable()
    .default(null)
    .describe("The ID of a prompt that was derived from or describes this asset. For example, if you used an LLM to caption this image or extract a description from the generated content, save that caption/description as a prompt using create_prompt and link it here."),
  metadata: metadataSchema.describe("Additional information about this asset in JSON format. Can include technical details (resolution, duration, file size), generation parameters, quality scores, or any custom data relevant to this asset."),
});

export type CreateAssetParameters = z.infer<typeof createAssetParameters>;

const prisma = new PrismaClient();

export const createAssetTool = {
  name: "create_asset",
  description: "Save a generated or uploaded media asset (video, image) to the database. Use this after creating content to track what was generated, where it's stored, and link it back to the original prompt that created it.",
  parameters: createAssetParameters,
  execute: async ({ asset_url, asset_type, asset_source, input_prompt_id, output_prompt_id, metadata }: CreateAssetParameters): Promise<ContentResult> => {
    let inputPromptId: bigint | null = null;
    if (input_prompt_id) {
      const trimmed = input_prompt_id.trim();
      if (trimmed) {
        try {
          inputPromptId = BigInt(trimmed);
        } catch (error) {
          throw new Error(`Invalid input_prompt_id: must be a valid integer ID`);
        }
      }
    }

    let outputPromptId: bigint | null = null;
    if (output_prompt_id) {
      const trimmed = output_prompt_id.trim();
      if (trimmed) {
        try {
          outputPromptId = BigInt(trimmed);
        } catch (error) {
          throw new Error(`Invalid output_prompt_id: must be a valid integer ID`);
        }
      }
    }

    const asset = await prisma.assets.create({
      data: {
        uri: asset_url,
        asset_type,
        asset_source,
        input_prompt_id: inputPromptId,
        output_prompt_id: outputPromptId,
        metadata: metadata ?? undefined,
        created_by: "",
        updated_by: "",
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            asset_id: asset.id.toString(),
            asset_type: asset.asset_type,
            asset_source: asset.asset_source,
            uri: asset.uri,
            input_prompt_id: asset.input_prompt_id?.toString() ?? null,
            output_prompt_id: asset.output_prompt_id?.toString() ?? null,
            created_at: asset.created_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
