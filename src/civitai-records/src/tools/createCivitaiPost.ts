import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { handleDatabaseError } from "../lib/handleDatabaseError.js";

const metadataSchema = z.record(z.any()).nullable().default(null);

export const createCivitaiPostParameters = z.object({
  civitai_id: z
    .string()
    .min(1)
    .describe("The numeric post ID from the Civitai post URL. Extract this from URLs like https://civitai.com/posts/23602354 where the ID is 23602354."),
  civitai_url: z
    .string()
    .min(1)
    .describe("The full public URL where this publication can be viewed on Civitai (e.g., 'https://civitai.com/posts/12345678')."),
  status: z
    .enum(["pending", "published", "failed"])
    .default("published")
    .describe("The publication status. Use 'published' for successful posts, 'pending' for scheduled posts, or 'failed' for unsuccessful attempts."),
  title: z
    .string()
    .nullable()
    .default(null)
    .describe("The title of the publication as it appears on Civitai."),
  description: z
    .string()
    .nullable()
    .default(null)
    .describe("The description or caption of the publication as posted to Civitai."),
  metadata: metadataSchema.describe("Additional structured data about this post in JSON format. Can include Civitai API response, engagement metrics (views, likes, comments), tags, categories, workflow details, or any custom fields relevant to tracking this post."),
  on_behalf_of: z
    .string()
    .nullable()
    .default(null)
    .describe("The user account this action is being performed on behalf of. If not provided, defaults to the authenticated database user and can be modified later if needed."),
});

export type CreateCivitaiPostParameters = z.infer<typeof createCivitaiPostParameters>;

export const createCivitaiPostTool = {
  name: "create_civitai_post",
  description: "Record a publication to Civitai.com. Use this after publishing content to Civitai to track the publication in the database. Note: To link an asset to this post, update the asset's post_id field using the update_asset tool.",
  parameters: createCivitaiPostParameters,
  execute: async ({
    civitai_id,
    civitai_url,
    status,
    title,
    description,
    metadata,
    on_behalf_of,
  }: CreateCivitaiPostParameters): Promise<ContentResult> => {
    const accountValue = process.env.CIVITAI_ACCOUNT ?? "c29";
    
    const post = await prisma.civitai_posts.create({
      data: {
        civitai_id,
        civitai_url,
        civitai_account: accountValue,
        status,
        title: title ?? undefined,
        description: description ?? undefined,
        metadata: metadata ?? undefined,
        on_behalf_of: on_behalf_of ?? undefined,
      },
    }).catch(error => handleDatabaseError(error, `Civitai ID: ${civitai_id}`));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            post_id: post.id.toString(),
            civitai_id: post.civitai_id,
            civitai_url: post.civitai_url,
            civitai_account: post.civitai_account,
            status: post.status,
            title: post.title,
            description: post.description,
            on_behalf_of: post.on_behalf_of,
            created_at: post.created_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
