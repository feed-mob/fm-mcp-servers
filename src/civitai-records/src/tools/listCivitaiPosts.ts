import type { ContentResult } from "fastmcp";
import { PrismaClient } from "../generated/prisma/index.js";
import { z } from "zod";

export const listCivitaiPostsParameters = z.object({
  civitai_id: z
    .string()
    .nullable()
    .default(null)
    .describe("Filter posts by Civitai ID (the ID assigned by Civitai platform)."),
  asset_id: z
    .string()
    .nullable()
    .default(null)
    .describe("Filter posts by asset ID. Shows all posts associated with a specific asset."),
  asset_type: z
    .enum(["image", "video"])
    .nullable()
    .default(null)
    .describe("Filter posts by asset type: 'image' or 'video'."),
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

const prisma = new PrismaClient();

interface WhereClauseParams {
  civitai_id: string | null;
  asset_id: string | null;
  asset_type: "image" | "video" | null;
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

  if (params.asset_id) {
    try {
      where.asset_id = BigInt(params.asset_id);
    } catch (error) {
      throw new Error("asset_id must be a valid integer ID");
    }
  }

  if (params.asset_type) {
    where.asset_type = params.asset_type;
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

function serializeAsset(asset: any): any {
  const result: any = {
    asset_id: asset.id.toString(),
    asset_type: asset.asset_type,
    asset_source: asset.asset_source,
    uri: asset.uri,
    metadata: asset.metadata,
    created_at: asset.created_at.toISOString(),
    updated_at: asset.updated_at.toISOString(),
  };

  if (asset.prompts_assets_input_prompt_idToprompts) {
    const prompt = asset.prompts_assets_input_prompt_idToprompts;
    result.input_prompt = {
      prompt_id: prompt.id.toString(),
      content: prompt.content,
      llm_model_provider: prompt.llm_model_provider,
      llm_model: prompt.llm_model,
      purpose: prompt.purpose,
      metadata: prompt.metadata,
      created_at: prompt.created_at.toISOString(),
      updated_at: prompt.updated_at.toISOString(),
    };
  }

  if (asset.prompts_assets_output_prompt_idToprompts) {
    const prompt = asset.prompts_assets_output_prompt_idToprompts;
    result.output_prompt = {
      prompt_id: prompt.id.toString(),
      content: prompt.content,
      llm_model_provider: prompt.llm_model_provider,
      llm_model: prompt.llm_model,
      purpose: prompt.purpose,
      metadata: prompt.metadata,
      created_at: prompt.created_at.toISOString(),
      updated_at: prompt.updated_at.toISOString(),
    };
  }

  return result;
}

function serializeAssociations(associations: any[]): any[] {
  return associations.map((assoc: any) => ({
    association_id: assoc.id.toString(),
    associated_item_id: assoc.association_id.toString(),
    association_type: assoc.association_type,
    created_at: assoc.created_at.toISOString(),
  }));
}

function serializePost(post: any, include_details: boolean): any {
  const result: any = {
    post_id: post.id.toString(),
    civitai_id: post.civitai_id,
    civitai_url: post.civitai_url,
    status: post.status,
    asset_id: post.asset_id?.toString() ?? null,
    asset_type: post.asset_type,
    title: post.title,
    description: post.description,
    created_by: post.created_by,
    metadata: post.metadata,
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
  };

  if (include_details && post.assets) {
    result.asset = serializeAsset(post.assets);
  }

  if (include_details && post.civitai_post_associations) {
    result.associations = serializeAssociations(post.civitai_post_associations);
  }

  return result;
}

export const listCivitaiPostsTool = {
  name: "list_civitai_posts",
  description: "Get a list of Civitai posts with optional filtering. Can filter by civitai_id, asset_id, asset_type, status, created_by, or time range. Supports pagination with limit and offset. Use include_details to get asset and prompt information.",
  parameters: listCivitaiPostsParameters,
  execute: async ({
    civitai_id,
    asset_id,
    asset_type,
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
      asset_id,
      asset_type,
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
        civitai_post_associations: true,
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
