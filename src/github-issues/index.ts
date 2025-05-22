#!/usr/bin/env node

import { FastMCP } from "fastmcp";
import { Pool } from 'pg';
import { z } from 'zod';
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

const server = new FastMCP({
  name: "github-mcp-server",
  version: VERSION,
  async authenticate(request) {
    const apiKey = request.headers["x-api-key"];

    // if (apiKey !== "123") {
    //   throw new Response(null, {
    //     status: 401,
    //     statusText: "Unauthorized",
    //   });
    // }

    // Whatever you return here will be accessible in the `context.session` object.
    return {
      id: 1,
    };
  },
});


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

server.addResource({
  uri: "issues/search_schema",
  name: "schema required before search issues",
  mimeType: "text/markdown",
  async load() {
    const schemaFilePath = '/Users/kaiji/Desktop/feedmob/fm-mcp-servers/src/github-issues/github_issues_schema.md'
    const schemaContent = fs.readFileSync(schemaFilePath, 'utf8');
    return {
      text: await schemaContent,
    };
  },
});

server.addResource({
  uri: "issues/users",
  name: "issues all users. include pa/pm/dev users information",
  mimeType: "text/markdown",
  async load() {
    let md = `
      ### Deverloper Users
      - dev_users: clark, kun, kaiji, ava, victor, yibin, rhyme, fleming, steven, roofeel, vincent, jacob, mandy, tao, eric, jason, circle, miles, decks, bran, edward, ergo, lucien, wesson, richard, mike_dev, javen, bran, sylor, lee, mason, ian
      ### PM Users
      - pm_users: rao, ashley, dora, yi
      ### Pa Users
      - pa_users: vicky,olive,nancy,feedmob-deploy,holly,emma,lunar,summer,windy,esther,christina,feedmob-qa,zhangyechen,lainey
    `
    return {
      text: await md,
    };
  },
});

server.addTool({
  name: "create_issue",
  description: "Create a new issue in a GitHub repository",
  parameters: issues.CreateIssueSchema,
  execute: async (args: z.infer<typeof issues.CreateIssueSchema>) => {
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
        `Failed to create issue: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''
        }`
      );
    }
  },
});

server.addTool({
  name: "update_issue",
  description: "Update an existing issue in a GitHub repository",
  parameters: issues.UpdateIssueOptionsSchema,
  execute: async (args: z.infer<typeof issues.UpdateIssueOptionsSchema>) => {
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
  },
});

server.addTool({
  name: "search_issues",
  description: "Search GitHub Issues(resouce: issues/search_schema must be called before use)",
  parameters: issues.FeedmobSearchOptions,
  execute: async (args: z.infer<typeof issues.FeedmobSearchOptions>) => {
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
  },
});

server.addTool({
  name: "get_issue",
  description: "Get details of a specific issue in a GitHub repository.",
  parameters: issues.GetIssueSchema,
  execute: async (args: z.infer<typeof issues.GetIssueSchema>) => {
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
  },
});

server.addTool({
  name: "add_issue_comment",
  description: "Add a comment to an existing issue",
  parameters: issues.IssueCommentSchema,
  execute: async (args: z.infer<typeof issues.IssueCommentSchema>) => {
    const { owner, repo, issue_number, body } = args;
    const result = await issues.addIssueComment(owner, repo, issue_number, body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// server.start({
//   transportType: "stdio",
// });

server.start({
  transportType: "httpStream",
  httpStream: {
    port: 3002,
  },
});
