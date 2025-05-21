#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "Smadex Reporting MCP Server",
  version: "0.0.1"
});

const SMADEX_API_BASE_URL = process.env.SMADEX_API_BASE_URL || '';
const SMADEX_EMAIL = process.env.SMADEX_EMAIL || '';
const SMADEX_PASSWORD = process.env.SMADEX_PASSWORD || '';

let accessToken = '';
let tokenExpirationTime = 0;

if (!SMADEX_EMAIL || !SMADEX_PASSWORD) {
  console.error("Missing Smadex API credentials. Please set SMADEX_EMAIL and SMADEX_PASSWORD environment variables.");
  process.exit(1);
}

/**
 * Get a valid access token for Smadex API
 */
async function getSmadexAccessToken(): Promise<string> {
  // Check if token is still valid (with 5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (accessToken && tokenExpirationTime > now + 300) {
    return accessToken;
  }

  try {
    console.error('Fetching new Smadex access token');
    const response = await fetch(`${SMADEX_API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: SMADEX_EMAIL,
        password: SMADEX_PASSWORD
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Smadex Auth Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.accessToken;

    if (!accessToken) {
      throw new Error('Access Token is empty');
    }

    // Set expiration time (30 minutes from now)
    tokenExpirationTime = now + 30 * 60;

    console.error('Successfully obtained Smadex access token');
    return accessToken;
  } catch (error: any) {
    console.error('Error obtaining Smadex access token:', error);
    throw new Error(`Failed to get authentication token: ${error.message}`);
  }
}

/**
 * Create an asynchronous report request and get the report ID
 */
async function createReportRequest(params: any): Promise<string> {
  // Get a valid token
  const token = await getSmadexAccessToken();

  try {
    console.error(`Creating Smadex report request with params: ${JSON.stringify(params)}`);
    const response = await fetch(`${SMADEX_API_BASE_URL}/analytics/reports/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Smadex API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reportId = data.id;

    if (!reportId) {
      throw new Error('Report ID is empty');
    }

    return reportId;
  } catch (error: any) {
     console.error(`Error creating Smadex report:`, error);
     throw new Error(`Failed to create Smadex report: ${error.message}`);
  }
}

/**
 * Check the status of an asynchronous report and get the download URL when complete
 */
async function getReportDownloadUrl(reportId: string): Promise<string> {
  // Get a valid token
  const token = await getSmadexAccessToken();

  try {
    console.error(`Checking status of Smadex report: ${reportId}`);

    // Implement polling mechanism for report status
    let downloadUrl = null;
    let attempts = 0;
    const maxAttempts = 20; // Maximum number of attempts (10 min total with 30s intervals)

    while (!downloadUrl && attempts < maxAttempts) {
      const response = await fetch(`${SMADEX_API_BASE_URL}/analytics/reports/async/${reportId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Smadex API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'COMPLETED') {
        downloadUrl = data.downloadUrl;
        console.error('Report completed. Download URL available.');
      } else {
        console.error(`Report status: ${data.status}, waiting 30 seconds...`);
        // Wait 30 seconds before the next check
        await new Promise(resolve => setTimeout(resolve, 30000));
        attempts++;
      }
    }

    if (!downloadUrl) {
      throw new Error('Download URL is empty or report generation timed out');
    }

    return downloadUrl;
  } catch (error: any) {
     console.error(`Error getting report download URL:`, error);
     throw new Error(`Failed to get download URL: ${error.message}`);
  }
}

/**
 * Download the report CSV data
 */
async function downloadReport(url: string): Promise<string> {
  try {
    console.error(`Downloading report from URL: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Smadex Download Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.text();

    if (!data) {
      throw new Error('Downloaded data is empty');
    }

    // Remove quotes from CSV data (as in the Ruby example)
    const cleanedData = data.replace(/"/g, '');
    return cleanedData;
  } catch (error: any) {
     console.error(`Error downloading report:`, error);
     throw new Error(`Failed to download report: ${error.message}`);
  }
}

// Tool: Get Smadex Report ID
server.tool("get_smadex_report_id",
  "Create a Smadex report request and get the report ID.",
  {
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)"),
}, async ({ startDate, endDate }) => {
  try {
    // Validate date range logic
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date.");
    }

    // Build report request parameters
    const reportParams = {
      dimensions: ['account_name', 'campaign_name', 'country'],
      startDate: startDate,
      endDate: endDate,
      format: 'csv',
      metrics: ['media_spend'],
      rollUp: 'day'
    };

    // Create a report request and get the report ID
    console.error('Creating report request');
    const reportId = await createReportRequest(reportParams);
    console.error(`Report ID: ${reportId}`);

    return {
      content: [
        {
          type: "text",
          text: reportId
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error creating Smadex report request: ${error.message}`;
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

// Tool: Get Smadex Report Download URL
server.tool("get_smadex_report_download_url",
  "Get the download URL for a Smadex report by its ID until the report is completed.",
  {
    reportId: z.string().describe("The report ID returned from get_smadex_report_id")
  }, async ({ reportId }) => {
  try {
    console.error(`Getting download URL for report ID: ${reportId}`);
    const downloadUrl = await getReportDownloadUrl(reportId);
    console.error(`Download URL: ${downloadUrl}`);

    return {
      content: [
        {
          type: "text",
          text: downloadUrl
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error getting download URL: ${error.message}`;
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

// Tool: Get Smadex Report Data
server.tool("get_smadex_report",
  "Download and return report data from a Smadex report download URL.",
  {
    downloadUrl: z.string().describe("The download URL for the report")
  }, async ({ downloadUrl }) => {
  try {
    console.error(`Downloading report from URL: ${downloadUrl}`);
    const reportData = await downloadReport(downloadUrl);

    return {
      content: [
        {
          type: "text",
          text: reportData
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error downloading report: ${error.message}`;
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
  console.error("Smadex Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
