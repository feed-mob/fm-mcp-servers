#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import { z } from "zod";
import fs from "fs";
import path from "path";

const RAILS_BASE =
  process.env.RAILS_BASE_URL || "https://insights-mcp.feedmob.com";
const ACCESS_TOKEN = process.env.FEEDMOB_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("Error: FEEDMOB_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

// Types
interface AiVideoReference {
  id?: number;
  title?: string;
  url?: string;
  source_kind?: string;
  notes?: string;
  position?: number;
}

interface AiVideo {
  id: number;
  title: string;
  client_name: string;
  status: string;
  creator: string;
  creator_id: number;
  duration_seconds?: number;
  published_on?: string;
  source_research_markdown?: string;
  design_rationale_markdown?: string;
  production_notes_markdown?: string;
  reference_count: number;
  created_at: string;
  updated_at: string;
  references: AiVideoReference[];
}

interface ListVideosResponse {
  count: number;
  videos: AiVideo[];
}

interface UploadResponse {
  filename: string;
  key: string;
  byte_size: number;
  content_type: string;
}

// Helper function to call Rails API
async function callRailsApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${RAILS_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Rails API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

// Upload file to Rails API
async function uploadFile(filePath: string): Promise<UploadResponse> {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  const fileName = path.basename(resolvedPath);

  // Determine content type
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".gif": "image/gif",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  };
  const contentType = contentTypes[ext] || "application/octet-stream";

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: contentType });
  formData.append("file", blob, fileName);

  const url = `${RAILS_BASE}/ai-video-hub/api/videos/upload`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<UploadResponse>;
}

// Create MCP Server
const server = new FastMCP({
  name: "feedmob-ai-video-hub",
  version: "1.0.1",
});

// Tool: list_ai_videos
server.addTool({
  name: "list_ai_videos",
  description:
    "List AI video entries with optional filters for client, creator, status, and title.",
  parameters: z.object({
    client_name: z.string().optional().describe("Filter by exact client name"),
    creator_id: z.number().optional().describe("Filter by creator user id"),
    status: z
      .enum(["draft", "reviewing", "ready", "archived"])
      .optional()
      .describe("Filter by workflow status"),
    title_query: z
      .string()
      .optional()
      .describe("Case-insensitive title search"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Max number of videos to return"),
  }),
  execute: async (args) => {
    const params = new URLSearchParams();
    if (args.client_name) params.set("client_name", args.client_name);
    if (args.creator_id) params.set("creator_id", String(args.creator_id));
    if (args.status) params.set("status", args.status);
    if (args.title_query) params.set("title_query", args.title_query);
    if (args.limit) params.set("limit", String(args.limit));

    const data = await callRailsApi<ListVideosResponse>(
      `/ai-video-hub/api/videos?${params.toString()}`
    );
    return JSON.stringify(data, null, 2);
  },
});

// Tool: get_ai_video
server.addTool({
  name: "get_ai_video",
  description:
    "Fetch a single AI video entry with markdown notes and structured references.",
  parameters: z.object({
    id: z.number().describe("AI video id"),
  }),
  execute: async (args) => {
    const data = await callRailsApi<AiVideo>(
      `/ai-video-hub/api/videos/${args.id}`
    );
    return JSON.stringify(data, null, 2);
  },
});

// Tool: create_ai_video
server.addTool({
  name: "create_ai_video",
  description:
    "Create a new AI video entry with metadata, markdown notes, and structured references. Optionally upload a video file from local filesystem.",
  parameters: z.object({
    title: z.string().describe("Video title"),
    client_name: z.string().describe("Client name"),
    status: z
      .enum(["draft", "reviewing", "ready", "archived"])
      .describe("Workflow status"),
    duration_seconds: z.number().optional().describe("Duration in seconds"),
    published_on: z.string().optional().describe("ISO date"),
    source_research_markdown: z
      .string()
      .optional()
      .describe("Markdown source notes"),
    design_rationale_markdown: z
      .string()
      .optional()
      .describe("Markdown design rationale"),
    production_notes_markdown: z
      .string()
      .optional()
      .describe("Markdown production notes"),
    references: z
      .array(
        z.object({
          title: z.string().optional(),
          url: z.string().optional(),
          source_kind: z.string().optional(),
          notes: z.string().optional(),
          position: z.number().optional(),
        })
      )
      .optional()
      .describe("Structured references"),
    video_path: z
      .string()
      .optional()
      .describe("Local path to video file to upload"),
  }),
  execute: async (args) => {
    let videoBlobKey: string | undefined;

    // Upload file if path provided
    if (args.video_path) {
      console.error(`Uploading file: ${args.video_path}`);
      const uploadResult = await uploadFile(args.video_path);
      videoBlobKey = uploadResult.key;
      console.error(`Uploaded: ${uploadResult.filename} (key: ${uploadResult.key})`);
    }

    const { video_path, ...videoData } = args;

    const data = await callRailsApi<AiVideo>("/ai-video-hub/api/videos", {
      method: "POST",
      body: JSON.stringify({
        ai_video: {
          title: videoData.title,
          client_name: videoData.client_name,
          status: videoData.status,
          duration_seconds: videoData.duration_seconds,
          published_on: videoData.published_on,
          source_research_markdown: videoData.source_research_markdown,
          design_rationale_markdown: videoData.design_rationale_markdown,
          production_notes_markdown: videoData.production_notes_markdown,
          ai_video_references_attributes: videoData.references,
        },
        video_blob_key: videoBlobKey,
      }),
    });
    return JSON.stringify(data, null, 2);
  },
});

// Tool: update_ai_videos
server.addTool({
  name: "update_ai_videos",
  description: "Update one or more AI video entries in bulk. Optionally upload a new video file.",
  parameters: z.object({
    ids: z.array(z.number()).describe("AI video ids to update"),
    status: z
      .enum(["draft", "reviewing", "ready", "archived"])
      .optional()
      .describe("New workflow status"),
    client_name: z.string().optional().describe("New client name"),
    published_on: z.string().optional().describe("ISO date"),
    source_research_markdown: z
      .string()
      .optional()
      .describe("Markdown source notes"),
    design_rationale_markdown: z
      .string()
      .optional()
      .describe("Markdown design rationale"),
    production_notes_markdown: z
      .string()
      .optional()
      .describe("Markdown production notes"),
    video_path: z
      .string()
      .optional()
      .describe("Local path to video file to upload"),
  }),
  execute: async (args) => {
    const { ids, video_path, ...updates } = args;

    if (ids.length === 0) {
      return JSON.stringify({ error: "Provide at least one id." });
    }

    const hasUpdates =
      Object.values(updates).some((v) => v !== undefined) ||
      video_path !== undefined;
    if (!hasUpdates) {
      return JSON.stringify({
        error: "Provide at least one attribute to update.",
      });
    }

    let videoBlobKey: string | undefined;

    // Upload file if path provided
    if (video_path) {
      console.error(`Uploading file: ${video_path}`);
      const uploadResult = await uploadFile(video_path);
      videoBlobKey = uploadResult.key;
      console.error(`Uploaded: ${uploadResult.filename} (key: ${uploadResult.key})`);
    }

    const data = await callRailsApi<{ updated_count: number; ids: number[] }>(
      "/ai-video-hub/api/videos/bulk_update",
      {
        method: "PATCH",
        body: JSON.stringify({
          ids,
          updates: {
            status: updates.status,
            client_name: updates.client_name,
            published_on: updates.published_on,
            source_research_markdown: updates.source_research_markdown,
            design_rationale_markdown: updates.design_rationale_markdown,
            production_notes_markdown: updates.production_notes_markdown,
          },
          video_blob_key: videoBlobKey,
        }),
      }
    );
    return JSON.stringify(data, null, 2);
  },
});

// Tool: delete_ai_videos
server.addTool({
  name: "delete_ai_videos",
  description: "Delete one or more AI video entries.",
  parameters: z.object({
    ids: z.array(z.number()).describe("AI video ids to delete"),
  }),
  execute: async (args) => {
    if (args.ids.length === 0) {
      return JSON.stringify({ error: "Provide at least one id." });
    }

    const data = await callRailsApi<{
      deleted_count: number;
      ids: number[];
    }>("/ai-video-hub/api/videos/bulk_destroy", {
      method: "DELETE",
      body: JSON.stringify({ ids: args.ids }),
    });
    return JSON.stringify(data, null, 2);
  },
});

// Start the server
server.start({
  transportType: "stdio",
});
