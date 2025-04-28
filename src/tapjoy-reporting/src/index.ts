#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "Tapjoy GraphQL Reporting MCP Server",
  version: "1.0.0"
});

const TAPJOY_API_BASE_URL = "https://api.tapjoy.com";
const TAPJOY_API_KEY = process.env.TAPJOY_API_KEY || '';

if (!TAPJOY_API_KEY) {
  console.error("Missing Tapjoy API credentials. Please set TAPJOY_API_KEY environment variable.");
  process.exit(1);
}

// Token cache
let accessToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get valid Tapjoy API access token using the API Key
 */
async function getTapjoyAccessToken(): Promise<string> {
  // Check if we have a valid token
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // Request new token
  const authUrl = `${TAPJOY_API_BASE_URL}/v1/oauth2/token`;
  const credentials = Buffer.from(TAPJOY_API_KEY).toString('base64');

  try {
    console.error("Requesting new Tapjoy access token...");
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json; */*'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Tapjoy Authentication Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    if (!data.access_token) {
       console.error("Tapjoy Authentication Response missing access_token:", data);
       throw new Error('Failed to get access token: Token is empty in response');
    }

    accessToken = data.access_token;
    // Set expiry time with 1 minute buffer (tokens last 1 hour = 3600s)
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    console.error("Successfully obtained new Tapjoy access token.");

    return accessToken;
  } catch (error: any) {
     console.error("Error fetching Tapjoy access token:", error);
     // Reset token info on failure
     accessToken = null;
     tokenExpiry = 0;
     throw new Error(`Failed to get Tapjoy access token: ${error.message}`);
  }
}

/**
 * Generates the GraphQL query string for advertiser ad set spend.
 */
function getAdvertiserAdSetSpendQuery(startDate: string, endDate: string): string {
  // Add 1 day to end date for the 'until' parameter as per Ruby example
  const untilDate = new Date(endDate);
  untilDate.setDate(untilDate.getDate() + 1);
  const untilDateString = untilDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  // Ensure Z(ulu) timezone indicator for UTC
  const startTime = `${startDate}T00:00:00Z`;
  const untilTime = `${untilDateString}T00:00:00Z`;

  return `
    query {
      advertiser {
        adSets(configuredStatus: ACTIVE, first: 50) {
          nodes {
            campaign {
              name
            }
            insights(timeRange: {from: "${startTime}", until: "${untilTime}"}) {
              reports {
                spend
              }
            }
          }
        }
      }
    }
  `;
}

/**
 * Make authenticated GraphQL request to Tapjoy API
 */
async function makeTapjoyGraphqlRequest(query: string) {
  const token = await getTapjoyAccessToken();
  const graphqlUrl = `${TAPJOY_API_BASE_URL}/graphql`;

  try {
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json; */*'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      // Handle specific Tapjoy error codes if needed, e.g., 401 for expired token
      if (response.status === 401) {
         console.warn("Tapjoy token likely expired or invalid, attempting to refresh...");
         accessToken = null; // Force token refresh on next call
         throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} (Unauthorized - check API key or token may have expired)`);
      }
      const errorBody = await response.text();
      console.error(`Tapjoy GraphQL API Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    // Check for GraphQL errors within the response body
    if (responseData.errors && responseData.errors.length > 0) {
      console.error("Tapjoy GraphQL Query Errors:", JSON.stringify(responseData.errors, null, 2));
      throw new Error(`GraphQL query failed: ${responseData.errors.map((e: any) => e.message).join(', ')}`);
    }

    return responseData.data; // Return the actual data part
  } catch (error: any) {
     console.error(`Error making Tapjoy GraphQL request to ${graphqlUrl}:`, error);
     // If it's an auth error, reset token
     if (error.message.includes("401")) {
         accessToken = null;
         tokenExpiry = 0;
     }
     throw error; // Re-throw the error to be caught by the tool handler
  }
}

// Tool: Get Advertiser Ad Set Spend using GraphQL API
server.tool("get_advertiser_adset_spend",
  "Get spend for active advertiser ad sets within a date range using the Tapjoy GraphQL API.",
  {
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)")
}, async ({ start_date, end_date }) => {
  try {
    // Validate date range logic if necessary (e.g., start_date <= end_date)
    if (new Date(start_date) > new Date(end_date)) {
        throw new Error("Start date cannot be after end date.");
    }

    const query = getAdvertiserAdSetSpendQuery(start_date, end_date);
    console.log("Executing Tapjoy GraphQL Query:", query);
    const data = await makeTapjoyGraphqlRequest(query);

    // Extract the relevant nodes as per Ruby example
    const adSetNodes = data?.advertiser?.adSets?.nodes;

    if (!adSetNodes) {
        console.warn("Tapjoy GraphQL response structure might have changed or no data found. Full data:", JSON.stringify(data, null, 2));
        // Return empty array or specific message? Let's return what we have, might be null.
    }

    return {
      content: [
        {
          type: "text",
          // Return the extracted nodes or the full data if nodes are not found
          text: JSON.stringify(adSetNodes ?? data ?? {}, null, 2)
        }
      ]
    };
  } catch (error: any) {
    let errorMessage = `Error getting Tapjoy advertiser ad set spend: ${error.message}`;
    if (error.message.includes("401")) {
        errorMessage += ". Please check if the TAPJOY_API_KEY is correct and has the necessary permissions.";
    } else if (error.message.includes("GraphQL query failed")) {
        // GraphQL specific errors are already in the message
    } else if (error.message.includes("Failed to get Tapjoy access token")) {
        // Auth errors are already specific
    }

    return {
      content: [
        {
          type: "text",
          text: errorMessage
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
  console.error("Tapjoy GraphQL Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
