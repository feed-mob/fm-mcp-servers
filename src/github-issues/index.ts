#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fetch, { Request, Response } from 'node-fetch';

import * as issues from './operations/issues.js';
import * as search from './operations/search.js';
import {
  GitHubError,
  GitHubValidationError,
  GitHubResourceNotFoundError,
  GitHubAuthenticationError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubConflictError,
  isGitHubError,
} from './common/errors.js';
import { VERSION } from "./common/version.js";

// If fetch doesn't exist in global scope, add it
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof global.fetch;
}

// Default values from environment variables
const DEFAULT_OWNER = process.env.GITHUB_DEFAULT_OWNER || '';
const DEFAULT_REPO = process.env.GITHUB_DEFAULT_REPO || '';

const server = new Server(
  {
    name: "github-mcp-server",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function formatGitHubError(error: GitHubError): string {
  let message = `GitHub API Error: ${error.message}`;

  if (error instanceof GitHubValidationError) {
    message = `Validation Error: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GitHubResourceNotFoundError) {
    message = `Not Found: ${error.message}`;
  } else if (error instanceof GitHubAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GitHubPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GitHubRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}\nResets at: ${error.resetAt.toISOString()}`;
  } else if (error instanceof GitHubConflictError) {
    message = `Conflict: ${error.message}`;
  }

  return message;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_issue",
        description: "Create a new issue in a GitHub repository",
        inputSchema: zodToJsonSchema(issues.CreateIssueSchema),
      },
      {
        name: "list_issues",
        description: "List issues in a GitHub repository with filtering options",
        inputSchema: zodToJsonSchema(issues.ListIssuesOptionsSchema)
      },
      {
        name: "update_issue",
        description: "Update an existing issue in a GitHub repository",
        inputSchema: zodToJsonSchema(issues.UpdateIssueOptionsSchema)
      },
      {
        name: "search_issues",
        description: "Search for issues and pull requests across GitHub repositories",
        inputSchema: zodToJsonSchema(search.SearchIssuesSchema),
      },
      {
        name: "get_issue",
        description: "Get details of a specific issue in a GitHub repository.",
        inputSchema: zodToJsonSchema(issues.GetIssueSchema)
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "create_issue": {
        const args = issues.CreateIssueSchema.parse(request.params.arguments);
        // Use default values from environment variables if not provided
        const owner = args.owner || DEFAULT_OWNER;
        const repo = args.repo || DEFAULT_REPO;
        const { ...options } = args;

        if (!owner || !repo) {
          throw new Error("Repository owner and name are required. Either provide them directly or set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO environment variables.");
        }

        try {
          console.error(`[DEBUG] Attempting to create issue in ${owner}/${repo}`);
          console.error(`[DEBUG] Issue options:`, JSON.stringify(options, null, 2));

          const issue = await issues.createIssue(owner, repo, options);

          console.error(`[DEBUG] Issue created successfully`);
          return {
            content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
          };
        } catch (err) {
          // Type guard for Error objects
          const error = err instanceof Error ? err : new Error(String(err));

          console.error(`[ERROR] Failed to create issue:`, error);

          if (error instanceof GitHubResourceNotFoundError) {
            throw new Error(
              `Repository '${owner}/${repo}' not found. Please verify:\n` +
              `1. The repository exists\n` +
              `2. You have correct access permissions\n` +
              `3. The owner and repository names are spelled correctly`
            );
          }

          // Safely access error properties
          throw new Error(
            `Failed to create issue: ${error.message}${
              error.stack ? `\nStack: ${error.stack}` : ''
            }`
          );
        }
      }

      case "search_issues": {
        const args = search.SearchIssuesSchema.parse(request.params.arguments);
        const results = await search.searchIssues(args);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "list_issues": {
        const args = issues.ListIssuesOptionsSchema.parse(request.params.arguments);
        // Use default values from environment variables if not provided
        const owner = args.owner || DEFAULT_OWNER;
        const repo = args.repo || DEFAULT_REPO;
        const { ...options } = args;

        if (!owner || !repo) {
          throw new Error("Repository owner and name are required. Either provide them directly or set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO environment variables.");
        }

        const result = await issues.listIssues(owner, repo, options);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "update_issue": {
        const args = issues.UpdateIssueOptionsSchema.parse(request.params.arguments);
        // Use default values from environment variables if not provided
        const owner = args.owner || DEFAULT_OWNER;
        const repo = args.repo || DEFAULT_REPO;
        const { issue_number, ...options } = args;

        if (!owner || !repo) {
          throw new Error("Repository owner and name are required. Either provide them directly or set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO environment variables.");
        }

        const result = await issues.updateIssue(owner, repo, issue_number, options);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_issue": {
        const args = issues.GetIssueSchema.parse(request.params.arguments);
        // Use default values from environment variables if not provided
        const owner = args.owner || DEFAULT_OWNER;
        const repo = args.repo || DEFAULT_REPO;
        const { issue_number } = args;

        if (!owner || !repo) {
          throw new Error("Repository owner and name are required. Either provide them directly or set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO environment variables.");
        }

        const issue = await issues.getIssue(owner, repo, issue_number);
        return {
          content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (isGitHubError(error)) {
      throw new Error(formatGitHubError(error));
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub MCP Server running on stdio");

  if (DEFAULT_OWNER && DEFAULT_REPO) {
    console.error(`Using default repository: ${DEFAULT_OWNER}/${DEFAULT_REPO}`);
  }
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
