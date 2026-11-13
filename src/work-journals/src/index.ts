#!/usr/bin/env node

import { FastMCPSession, type Tool, type ToolParameters, type Resource } from "fastmcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { UsageRelay } from "./usage-relay.js";
import { UsageTransport } from "./usage-transport.js";
import { z } from "zod";
import { subDays, format } from 'date-fns';

const API_URL = process.env.API_URL;
const API_TOKEN = process.env.API_TOKEN;

if (!API_URL || !API_TOKEN) {
  console.error("Error: API_URL, API_TOKEN environment variables must be set.");
  process.exit(1);
}

function defineTool<Params extends ToolParameters>(tool: Tool<undefined, Params>): Tool<undefined> {
  return tool as unknown as Tool<undefined>;
}

const queryJournals = defineTool({
  name: "query_journals",
  annotations: { readOnlyHint: true },
  description: "Queries work journals, supporting filtering by date range, user ID, and team ID.",
  parameters: z.object({
    scheam: z.string().describe("get from system resources time-off-api-scheam://usage"),
    start_date: z.string().default(format(subDays(new Date(), 7), 'yyyy-MM-dd')).describe("Start date (YYYY-MM-DD format), defaults to 7 days before today"),
    end_date: z.string().default(format(new Date(), 'yyyy-MM-dd')).describe("End date (YYYY-MM-DD format), defaults to today"),
    current_user_only: z.boolean().optional().describe("Whether to query only the current user's work journals (true/false)"),
    user_ids: z.array(z.string()).optional().describe("List of user IDs (array)"),
    team_ids: z.array(z.string()).optional().describe("List of team IDs (array)"),

  }),
  execute: async (args, { log }) => {
    try {
      const queryParams = new URLSearchParams();

      if (args.start_date) queryParams.append('start_date', args.start_date);
      if (args.end_date) queryParams.append('end_date', args.end_date);
      if (args.current_user_only !== undefined) queryParams.append('current_user_only', String(args.current_user_only));
      if (args.user_ids) {
        args.user_ids.forEach(id => queryParams.append('user_ids[]', id));
      }
      if (args.team_ids) {
        args.team_ids.forEach(id => queryParams.append('team_ids[]', id));
      }

      const apiUrl = `${API_URL}/journals?${queryParams.toString()}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `# Work Journal Query Result
**Query Parameters:**
- Start Date: ${args.start_date || 'default'}
- End Date: ${args.end_date || 'default'}
- Current User Only: ${args.current_user_only !== undefined ? args.current_user_only : 'default'}
- User IDs: ${args.user_ids?.join(', ') || 'None'}
- Team IDs: ${args.team_ids?.join(', ') || 'None'}
**Raw JSON Data:**
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`,
          },
        ],
      };
    } catch (error: unknown) {
      throw new Error(`Failed to query work journals: ${(error as Error).message}`);
    }
  },
});

const createOrUpdateJournal = defineTool({
  name: "create_or_update_journal",
  annotations: { readOnlyHint: false },
  description: "Creates or updates a work journal.",
  parameters: z.object({
    date: z.string().describe("Journal date (YYYY-MM-DD format)"),
    content: z.string().describe("Journal content"),
  }),
  execute: async (args, { log }) => {
    try {
      const apiUrl = `${API_URL}/journals/create_or_update`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          date: args.date,
          content: args.content
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `# Work Journal Create/Update Result
**Date:** ${args.date}
**Content:** ${args.content}
**Response Information:**
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`,
          },
        ],
      };
    } catch (error: unknown) {
      throw new Error(`Failed to create or update work journal: ${(error as Error).message}`);
    }
  },
});

const schemaResource: Resource<undefined> = {
  uri: "time-off-api-scheam://usage",
  name: "Time Off API Scheam, include Teams, Users Infomation",
  mimeType: "text/json",
  async load() {
    const url = `${API_URL}/schema`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + API_TOKEN
        },
      });

      const text = await response.text();
      return {
        text: text,
      };
    } catch (error) {
      console.error("Error loading resource from URL:", error);
      throw new Error(`Failed to load resource from URL: ${(error as Error).message}`);
    }
  },
};

const tools = [queryJournals, createOrUpdateJournal];
const server = new FastMCPSession({
  name: "work-journals",
  version: "0.0.3",
  instructions: "This is an MCP server for querying and managing work journals.",
  tools,
  resources: [schemaResource],
  resourcesTemplates: [],
  prompts: [],
  transportType: "stdio",
});

let relay: UsageRelay | undefined;
if (process.env.AI_USAGE_ENABLED === "true") {
  try {
    relay = new UsageRelay(API_URL, API_TOKEN);
  } catch {
    console.error("[work-journals usage] invalid relay configuration; capture disabled");
  }
}
const stdio = new StdioServerTransport();
const accessModes = new Map(tools.map((tool) => [
  tool.name,
  tool.annotations?.readOnlyHint === true ? "read" as const :
    tool.annotations?.readOnlyHint === false ? "write" as const : "unknown" as const,
]));
const transport = relay ? new UsageTransport(stdio, relay, accessModes) : stdio;
let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await server.close();
  await relay?.close();
  process.exit(0);
}
process.stdin.once("end", () => void shutdown());
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

await server.connect(transport);
