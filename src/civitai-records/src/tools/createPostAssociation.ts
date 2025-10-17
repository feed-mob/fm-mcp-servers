import type { ContentResult } from "fastmcp";
import { PrismaClient } from "../generated/prisma/index.js";
import { z } from "zod";

export const createPostAssociationParameters = z.object({
  post_id: z
    .string()
    .min(1)
    .describe("The ID of the Civitai post to associate. This should be the post_id returned from create_civitai_post."),
  association_id: z
    .string()
    .min(1)
    .describe("The ID of the item to associate with the post (either an asset_id or prompt_id depending on association_type)."),
  association_type: z
    .enum(["asset", "prompt"])
    .describe("The type of association: 'asset' to link an asset to this post, or 'prompt' to link a prompt to this post."),
});

export type CreatePostAssociationParameters = z.infer<typeof createPostAssociationParameters>;

const prisma = new PrismaClient();

export const createPostAssociationTool = {
  name: "create_post_association",
  description: "Create an association between a Civitai post and an asset or prompt. Use this to link multiple assets or prompts to a single post, tracking all related content.",
  parameters: createPostAssociationParameters,
  execute: async ({
    post_id,
    association_id,
    association_type,
  }: CreatePostAssociationParameters): Promise<ContentResult> => {
    let postIdBigInt: bigint;
    try {
      postIdBigInt = BigInt(post_id);
    } catch (error) {
      throw new Error("post_id must be a valid integer ID");
    }

    let associationIdBigInt: bigint;
    try {
      associationIdBigInt = BigInt(association_id);
    } catch (error) {
      throw new Error("association_id must be a valid integer ID");
    }

    const association = await prisma.civitai_post_associations.create({
      data: {
        post_id: postIdBigInt,
        association_id: associationIdBigInt,
        association_type,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            association_id: association.id.toString(),
            post_id: association.post_id.toString(),
            associated_item_id: association.association_id.toString(),
            association_type: association.association_type,
            created_at: association.created_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
