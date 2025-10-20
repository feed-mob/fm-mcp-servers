import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const listCivitaiPostsParameters = z.object({
  civitai_id: z
    .string()
    .nullable()
    .default(null)
    .describe("Filter posts by Civitai ID (the ID assigned by Civitai platform)."),
  status: z
    .enum(["pending", "published", "failed"])
    .nullable()
    .default(null)
    .describe("Filter posts by status: 'pending', 'published', or 'failed'."),
  created_by: z
    .string()
    .nullable()
    .default(null)
    .transform((val) => val?.toLowerCase() ?? null)
    .describe("Filter posts by creator name. Default is null to load records created by all users."),
  start_time: z
    .string()
    .nullable()
    .default(null)
    .describe("Filter posts created on or after this timestamp. Provide as ISO 8601 format (e.g., '2025-01-15T10:00:00Z')."),
  end_time: z
    .string()
    .nullable()
    .default(null)
    .describe("Filter posts created on or before this timestamp. Provide as ISO 8601 format (e.g., '2025-01-15T23:59:59Z')."),
  include_details: z
    .boolean()
    .default(false)
    .describe("If true, include related asset and prompt details in the response. Default is false for lightweight responses."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum number of posts to return. Default is 50, maximum is 100."),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of posts to skip for pagination. Default is 0."),
});

export type ListCivitaiPostsParameters = z.infer<typeof listCivitaiPostsParameters>;

interface WhereClauseParams {
  civitai_id: string | null;
  status: "pending" | "published" | "failed" | null;
  created_by: string | null;
  start_time: string | null;
  end_time: string | null;
}

function buildWhereClause(params: WhereClauseParams): any {
  const where: any = {};

  if (params.civitai_id) {
    where.civitai_id = params.civitai_id;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.created_by) {
    where.created_by = params.created_by;
  }

  if (params.start_time || params.end_time) {
    where.created_at = {};
    if (params.start_time) {
      try {
        where.created_at.gte = new Date(params.start_time);
      } catch (error) {
        throw new Error("Invalid start_time format. Use ISO 8601 format (e.g., '2025-01-15T10:00:00Z').");
      }
    }
    if (params.end_time) {
      try {
        where.created_at.lte = new Date(params.end_time);
      } catch (error) {
        throw new Error("Invalid end_time format. Use ISO 8601 format (e.g., '2025-01-15T23:59:59Z').");
      }
    }
  }

  return where;
}



function serializePost(post: any, include_details: boolean): any {
  const result: any = {
    post_id: post.id.toString(),
    civitai_id: post.civitai_id,
    civitai_url: post.civitai_url,
    status: post.status,
    title: post.title,
    description: post.description,
    created_by: post.created_by,
    metadata: post.metadata,
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
  };

  if (include_details && post.assets && post.assets.length > 0) {
    result.assets = post.assets.map((asset: any) => ({
      asset_id: asset.id.toString(),
      asset_type: asset.asset_type,
      asset_source: asset.asset_source,
      asset_url: asset.uri,
      sha256sum: asset.sha256sum,
      civitai_id: asset.civitai_id,
      civitai_url: asset.civitai_url,
      created_by: asset.created_by,
      metadata: asset.metadata,
      created_at: asset.created_at.toISOString(),
      updated_at: asset.updated_at.toISOString(),
      input_prompt: asset.prompts_assets_input_prompt_idToprompts ? {
        prompt_id: asset.prompts_assets_input_prompt_idToprompts.id.toString(),
        content: asset.prompts_assets_input_prompt_idToprompts.content,
        llm_model_provider: asset.prompts_assets_input_prompt_idToprompts.llm_model_provider,
        llm_model: asset.prompts_assets_input_prompt_idToprompts.llm_model,
        purpose: asset.prompts_assets_input_prompt_idToprompts.purpose,
        metadata: asset.prompts_assets_input_prompt_idToprompts.metadata,
        created_by: asset.prompts_assets_input_prompt_idToprompts.created_by,
        created_at: asset.prompts_assets_input_prompt_idToprompts.created_at.toISOString(),
        updated_at: asset.prompts_assets_input_prompt_idToprompts.updated_at.toISOString(),
      } : null,
      output_prompt: asset.prompts_assets_output_prompt_idToprompts ? {
        prompt_id: asset.prompts_assets_output_prompt_idToprompts.id.toString(),
        content: asset.prompts_assets_output_prompt_idToprompts.content,
        llm_model_provider: asset.prompts_assets_output_prompt_idToprompts.llm_model_provider,
        llm_model: asset.prompts_assets_output_prompt_idToprompts.llm_model,
        purpose: asset.prompts_assets_output_prompt_idToprompts.purpose,
        metadata: asset.prompts_assets_output_prompt_idToprompts.metadata,
        created_by: asset.prompts_assets_output_prompt_idToprompts.created_by,
        created_at: asset.prompts_assets_output_prompt_idToprompts.created_at.toISOString(),
        updated_at: asset.prompts_assets_output_prompt_idToprompts.updated_at.toISOString(),
      } : null,
    }));
  }

  return result;
}

export const listCivitaiPostsTool = {
  name: "list_civitai_posts",
  description: "Get a list of Civitai posts with optional filtering. Can filter by civitai_id, status, created_by, or time range. Supports pagination with limit and offset. Use include_details to get linked asset information.",
  parameters: listCivitaiPostsParameters,
  execute: async ({
    civitai_id,
    status,
    created_by,
    start_time,
    end_time,
    include_details,
    limit,
    offset,
  }: ListCivitaiPostsParameters): Promise<ContentResult> => {
    const where = buildWhereClause({
      civitai_id,
      status,
      created_by,
      start_time,
      end_time,
    });

    const posts = await prisma.civitai_posts.findMany({
      where,
      include: include_details ? {
        assets: {
          include: {
            prompts_assets_input_prompt_idToprompts: true,
            prompts_assets_output_prompt_idToprompts: true,
          },
        },
      } : undefined,
      take: limit,
      skip: offset,
      orderBy: {
        created_at: 'desc',
      },
    });

    const serializedPosts = posts.map((post: any) => serializePost(post, include_details));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            posts: serializedPosts,
            count: posts.length,
            limit,
            offset,
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
