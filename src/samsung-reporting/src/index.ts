#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const server = new McpServer({
  name: "Samsung Reporting MCP Server",
  version: "0.0.2"
});

const SAMSUNG_BASE_URL = process.env.SAMSUNG_BASE_URL || 'https://devapi.samsungapps.com';
const SAMSUNG_ISS = process.env.SAMSUNG_ISS || '';
const SAMSUNG_PRIVATE_KEY = process.env.SAMSUNG_PRIVATE_KEY || '';
const SAMSUNG_CONTENT_ID = process.env.SAMSUNG_CONTENT_ID || '';
const SAMSUNG_SCOPES = ['publishing', 'gss'];

/**
 * Custom error classes
 */
class CapturedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapturedError';
  }
}

class SamsungApiError extends CapturedError {
  constructor(message: string) {
    super(message);
    this.name = 'SamsungApiError';
  }
}

/**
 * Samsung API Service Class
 */
class SamsungApiService {
  private startDate: string;
  private endDate: string;
  private accessToken: string | null = null;

  constructor(startDate: string, endDate: string) {
    this.startDate = startDate;
    this.endDate = endDate;
  }

  /**
   * Generate JWT token for Samsung API authentication
   */
  private generateJwt(): string {
    try {
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + 1200; // 20 minutes

      const payload = {
        iss: SAMSUNG_ISS,
        scopes: SAMSUNG_SCOPES,
        exp: exp,
        iat: iat
      };

      const privateKey = SAMSUNG_PRIVATE_KEY;

      return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    } catch (error: any) {
      console.error('Error generating JWT:', error);
      throw new SamsungApiError(`Failed to generate JWT: ${error.message}`);
    }
  }

  /**
   * Fetch access token using JWT
   */
  private async fetchAccessToken(): Promise<void> {
    try {
      const jwtToken = this.generateJwt();

      const response = await fetch(`${SAMSUNG_BASE_URL}/auth/accessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      this.accessToken = data.createdItem?.accessToken;

      if (!this.accessToken) {
        throw new Error('Access token not found in response');
      }

      console.error('Successfully obtained Samsung access token');
    } catch (error: any) {
      console.error('Error fetching access token:', error);
      throw new SamsungApiError(`Failed to fetch access token: ${error.message}`);
    }
  }

  /**
   * Fetch content metrics for a given content ID
   */
  async fetchContentMetric(
    contentId: string,
    metricIds: string[] = [
      'total_unique_installs_filter',
      'revenue_total',
      'revenue_iap_order_count',
      'daily_rat_score',
      'daily_rat_volumne'
    ]
  ): Promise<any> {
    try {
      // Ensure we have a valid access token
      if (!this.accessToken) {
        await this.fetchAccessToken();
      }

      const requestBody = {
        contentId: contentId,
        periods: [{
          startDate: this.startDate,
          endDate: this.endDate
        }],
        noBreakdown: true,
        metricIds: metricIds,
        filters: {},
        trendAggregation: 'day'
      };

      console.error(`Fetching content metrics for content ID: ${contentId}`);

      const response = await fetch(`${SAMSUNG_BASE_URL}/gss/query/contentMetric`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'service-account-id': SAMSUNG_ISS
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      return data.data?.periods || [];
    } catch (error: any) {
      console.error('Error fetching content metric:', error);
      throw new SamsungApiError(`Failed to fetch content metric: ${error.message}`);
    }
  }
}

// Tool: Get Samsung Content Metrics
server.tool("get_samsung_content_metrics",
  "Fetch content metrics from Samsung API for a specific date range.",
  {
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)"),
    metricIds: z.array(z.string()).optional().describe("Optional array of metric IDs to fetch. Defaults to standard metrics if not provided.")
  }, async ({ startDate, endDate, metricIds }) => {
  try {
    // Get contentId from environment variable
    const contentId = SAMSUNG_CONTENT_ID;
    if (!contentId) {
      throw new Error("SAMSUNG_CONTENT_ID environment variable is not set");
    }

    // Validate date range logic
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date.");
    }

    console.error(`Fetching Samsung content metrics for content ID: ${contentId}, date range: ${startDate} to ${endDate}`);

    const samsungService = new SamsungApiService(startDate, endDate);
    const metrics = await samsungService.fetchContentMetric(contentId, metricIds);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(metrics, null, 2)
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error fetching Samsung content metrics: ${error.message}`;
    console.error(errorMessage);
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
  console.error("Samsung Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
