#!/usr/bin/env node

import { FastMCP } from "fastmcp";
import { z } from 'zod';
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
const DEFAULT_OWNER = process.env.GITHUB_DEFAULT_OWNER;
const AI_API_URL = process.env.AI_API_URL;
const AI_API_TOKEN = process.env.AI_API_TOKEN;
const server = new FastMCP({
  name: "feedmob-github-mcp-server",
  version: VERSION
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
  name: "search issues schema",
  mimeType: "text/markdown",
  async load() {
    const response = await fetch(AI_API_URL + "/issues/scheam", {
      method: 'GET',
      headers: {
        'Authorization': "Bearer " + AI_API_TOKEN,
      }
    });

    return {
      text: await response.text(),
    };
  },
});

server.addTool({
  name: "search_issues",
  description: "Search GitHub Issues",
  parameters: issues.FeedmobSearchOptions,
  execute: async (args: z.infer<typeof issues.FeedmobSearchOptions>) => {
    try {
      let params = new URLSearchParams();
      params.set('start_date', args.start_date);
      params.set('end_date', args.end_date);
      args.fields.forEach(field => params.append('fields[]', field));

      if (args.status !== undefined) {
        params.set('status', args.status);
      }
      if (args.repo !== undefined) {
        params.set('repo', args.repo);
      }
      if (args.users !== undefined) {
        args.users.forEach(user => params.append('users[]', user));
      }
      if (args.team !== undefined) {
        params.set('team', args.team);
      }
      if (args.title !== undefined) {
        params.set('title', args.title);
      }
      if (args.labels !== undefined) {
        args.labels.forEach(label => params.append('labels[]', label));
      }

      const response = await fetch(`${AI_API_URL}/issues?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': "Bearer " + AI_API_TOKEN
        }
      });

      const data = await response.text();

      return {
        content: [
          {
            type: "text",
            text: `# Github Issue Query Result
**Raw JSON Data:**
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
**Please further analyze and find the data required by the user based on the prompt, and return the data in a human-readable, formatted, and aesthetically pleasing manner.**
`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `API ERROR: ${error instanceof Error ? error.message : String(error)}` }],
      };
    }
  }
});

server.addTool({
  name: "create_issue",
  description: "Create a new issue in a GitHub repository",
  parameters: issues.CreateIssueSchema,
  execute: async (args: z.infer<typeof issues.CreateIssueSchema>) => {
    const owner = args.owner || DEFAULT_OWNER;
    const repo = args.repo;
    const { ...options } = args;

    if (!owner || !repo) {
      throw new Error("Repository owner and name are required. Either provide them directly or set GITHUB_DEFAULT_OWNER environment variables.");
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
    const repo = args.repo;
    const { issue_number, ...options } = args;

    if (!owner || !repo) {
      throw new Error("Repository owner and name are required. Either provide them directly or set GITHUB_DEFAULT_OWNER environment variables.");
    }

    const result = await issues.updateIssue(owner, repo, issue_number, options);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

server.addTool({
  name: "get_issues",
  description: "Get comments for multiple issues in bulk",
  parameters: issues.GetIssueSchema,
  execute: async (args: z.infer<typeof issues.GetIssueSchema>) => {
    try {
      const response = await fetch(`${AI_API_URL}/issues/get_comments`, {
        method: 'POST',
        headers: {
          'Authorization': "Bearer " + AI_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repo_issues: args.repo_issues,
          comment_count: args.comment_count
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `# Github Issue Comments
**Raw JSON Data:**
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
**Please format the above data beautifully, refer to the following markdown example for the converted format and return the corresponding data.**
### title
repo: repo
issue_number: issue_number
------- Comment 1: user create_at -------
comment body(Original text, no need to convert to md)
`,
          },
        ],
      };
    } catch (error) {
      console.error(`[ERROR] Failed to get issue comments:`, error);
      return {
        content: [{ type: "text", text: `Failed to get issue comments: ${error instanceof Error ? error.message : String(error)}` }],
      };
    }
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

server.addTool({
  name: "sync_latest_issues",
  description: "sync latest issues from Api",
  execute: async () => {
    try {
      const response = await fetch(AI_API_URL + "/issues/sync_latest", {
        method: 'GET',
        headers: {
          'Authorization': "Bearer " + AI_API_TOKEN,
        }
      });

      return {
        content: [{ type: "text", text: await response.text() }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `API ERROR: ${error instanceof Error ? error.message : String(error)}` }],
      };
    }
  },
});

server.start({
  transportType: "stdio"
});
