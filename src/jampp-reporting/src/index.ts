#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "Jampp MCP Server",
  version: "0.1.6"
});

const AUTH_URL = "https://auth.jampp.com/v1/oauth/token";
const API_URL = "https://reporting-api.jampp.com/v1/graphql";

const CLIENT_ID = process.env.JAMPP_CLIENT_ID || '';
const CLIENT_SECRET = process.env.JAMPP_CLIENT_SECRET || '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing Jampp API credentials. Please set JAMPP_CLIENT_ID and JAMPP_CLIENT_SECRET environment variables.");
  process.exit(1);
}

// Token cache
let accessToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get valid Jampp API access token
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid token
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // Request new token
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;

  // Set expiry time with 5 minutes buffer
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  if (!accessToken) {
    throw new Error('Failed to get access token: Token is empty');
  }

  return accessToken;
}

/**
 * Execute GraphQL query
 */
async function executeQuery(query: string, variables: Record<string, any> = {}) {
  const token = await getAccessToken();

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Tool: Get campaign spend
server.tool("get_campaign_spend",
  "Get the spend per campaign for a particular time range from Jampp Reporting API",
  {
  from_date: z.string().describe("Start date in YYYY-MM-DD format"),
  to_date: z.string().describe("End date in YYYY-MM-DD format")
}, async ({ from_date, to_date }) => {
  try {
    // Add end of day time to to_date
    const endOfDay = to_date + "T23:59:59";

    let query = `
      query spendPerCampaign($from: DateTime!, $to: DateTime!) {
        spendPerCampaign: pivot(
          from: $from,
          to: $to
        ) {
          results {
            campaignId
            campaign
            impressions
            clicks
            installs
            spend
          }
        }
      }
    `;

    const variables: Record<string, any> = {
      from: from_date,
      to: endOfDay // Use the modified end date
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.spendPerCampaign.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting campaign spend: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Tool: Get campaign daily spend
server.tool("get_campaign_daily_spend",
  "Get the daily spend per campaign for a particular time range from Jampp Reporting API",
  {
  from_date: z.string().describe("Start date in YYYY-MM-DD format"),
  to_date: z.string().describe("End date in YYYY-MM-DD format"),
  campaign_id: z.number().describe("Campaign ID to filter by")
}, async ({ from_date, to_date, campaign_id }) => {
  try {

    // Add end of day time to to_date
    const endOfDay = to_date + "T23:59:59";

    const query = `
      query dailySpend($from: DateTime!, $to: DateTime!, $campaignId: Int!) {
        dailySpend: pivot(
          from: $from,
          to: $to,
          filter: {
            campaignId: {
              equals: $campaignId
            }
          }
        ) {
          results {
            date(granularity: DAILY)
            campaignId
            campaign
            impressions
            clicks
            installs
            spend
          }
        }
      }
    `;

    const variables = {
      from: from_date,
      to: endOfDay,
      campaignId: campaign_id
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.dailySpend.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting campaign daily spend: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jampp Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
