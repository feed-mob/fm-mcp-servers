#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Pool } from 'pg';

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fetch, { Request, Response } from 'node-fetch';
import fs from 'fs';

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
const pool = new Pool({
  connectionString: process.env.SCORE_DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const server = new Server(
  {
    name: "github-mcp-server",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
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

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "issues/search_schema",
        description: "Schema information for searching issues.",
        name: 'schema required before search issues',
      },
      {
        uri: "issues/users",
        description: "issues all users. include pa/pm/dev users information",
        name: 'issues users',
      },
    ],
  };
});

// 添加资源访问处理程序
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "issues/search_schema") {
    try {
      // 读取github_issues_schema.md文件
      const schemaFilePath = '/Users/kaiji/Desktop/feedmob/fm-mcp-servers/src/github-issues/github_issues_schema.md'
      const schemaContent = fs.readFileSync(schemaFilePath, 'utf8');
      
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/markdown",
            text: schemaContent,
          },
        ],
      };
    } catch (error) {
      console.error('读取schema文件错误:', error);
      throw new Error(`无法读取schema文件: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  if (request.params.uri === "issues/users") {
    let md = `
      ### Deverloper Users
      - dev_users: clark, kun, kaiji, ava, victor, yibin, rhyme, fleming, steven, roofeel, vincent, jacob, mandy, tao, eric, jason, circle, miles, decks, bran, edward, ergo, lucien, wesson, richard, mike_dev, javen, bran, sylor, lee, mason, ian
      ### PM Users
      - pm_users: rao, ashley, dora, yi
      ### Pa Users
      - pa_users: vicky,olive,nancy,feedmob-deploy,holly,emma,lunar,summer,windy,esther,christina,feedmob-qa,zhangyechen,lainey
    `
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/markdown",
          text: md,
        },
      ],
    };
  }
  
  throw new Error(`Resource not found: ${request.params.uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_issue",
        description: "Create a new issue in a GitHub repository",
        inputSchema: zodToJsonSchema(issues.CreateIssueSchema),
      },
      {
        name: "update_issue",
        description: "Update an existing issue in a GitHub repository",
        inputSchema: zodToJsonSchema(issues.UpdateIssueOptionsSchema)
      },
      {
        name: "search_issues",
        description: "Search GitHub Issues(resouce: issues/search_schema must be called before use)",
        inputSchema: zodToJsonSchema(search.FeedmobSearchOptions),
      },
      {
        name: "get_issue",
        description: "Get details of a specific issue in a GitHub repository.",
        inputSchema: zodToJsonSchema(issues.GetIssueSchema)
      },
      {
        name: "add_issue_comment",
        description: "Add a comment to an existing issue",
        inputSchema: zodToJsonSchema(issues.IssueCommentSchema)
      },
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
        const args = search.FeedmobSearchOptions.parse(request.params.arguments);
        try {
          // 构建 SQL 查询，根据参数过滤结果
          let queryConditions = ['status = $1', 'issue_created_at >= $2::timestamp'];
          let queryParams = [args.status, args.created_at];
          let paramCounter = 3;
          
          // 添加可选过滤条件
          if (args.repo) {
            queryConditions.push(`repo = $${paramCounter}`);
            queryParams.push(args.repo);
            paramCounter++;
          }
          
          if (args.create_user) {
            queryConditions.push(`create_user = $${paramCounter}`);
            queryParams.push(args.create_user);
            paramCounter++;
          }
          
          if (args.assign_users) {
            queryConditions.push(`$${paramCounter} = ANY(assign_users)`);
            queryParams.push(args.assign_users);
            paramCounter++;
          }
          
          if (args.team) {
            queryConditions.push(`lower(team) = lower($${paramCounter})`);
            queryParams.push(args.team);
            paramCounter++;
          }
          
          const query = `
            SELECT
            issue_id, repo, title, issue_created_at, closed_at, hubspot_ticket_link, create_user, assign_users, status, current_labels, process_time_seconds, developers, code_reviewers, publishers, qa_members, pm_qa_user, team
            FROM mcp_server_issues 
            WHERE ${queryConditions.join(' AND ')}
            ORDER BY issue_created_at DESC
          `;
          
          // 执行查询
          const result = await pool.query(query, queryParams);
          
          // 返回查询结果
          return {
            content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
          };
        } catch (error) {
          console.error('数据库查询错误:', error);
          return {
            content: [{ type: "text", text: `查询错误: ${error instanceof Error ? error.message : String(error)}` }],
          };
        }
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

      case "add_issue_comment": {
        const args = issues.IssueCommentSchema.parse(request.params.arguments);
        const { owner, repo, issue_number, body } = args;
        const result = await issues.addIssueComment(owner, repo, issue_number, body);
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
