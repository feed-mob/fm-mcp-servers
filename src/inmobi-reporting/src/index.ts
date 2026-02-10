#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "Inmobi Reporting MCP Server",
  version: "0.0.3"
});

const INMOBI_AUTH_URL = process.env.INMOBI_AUTH_URL || "";
const INMOBI_SKAN_REPORT_URL = process.env.INMOBI_SKAN_REPORT_URL || "";
const INMOBI_NON_SKAN_REPORT_URL = process.env.INMOBI_NON_SKAN_REPORT_URL || "";
const INMOBI_REPORT_BASE_URL = process.env.INMOBI_REPORT_BASE_URL || "";
const INMOBI_CLIENT_ID = process.env.INMOBI_CLIENT_ID || "";
const INMOBI_CLIENT_SECRET = process.env.INMOBI_CLIENT_SECRET || "";

const LOOP_COUNT = 24;

let authToken = '';
let tokenExpirationTime = 0;

if (!INMOBI_CLIENT_ID || !INMOBI_CLIENT_SECRET) {
  console.error("Missing Inmobi API credentials. Please set INMOBI_CLIENT_ID and INMOBI_CLIENT_SECRET environment variables.");
  process.exit(1);
}

/**
 * Get a valid auth token for Inmobi API
 */
async function getInmobiAuthToken(): Promise<string> {
  // Check if token is still valid
  const now = Math.floor(Date.now() / 1000);
  if (authToken && tokenExpirationTime > now + 300) {
    return authToken;
  }

  try {
    console.error('Fetching new Inmobi auth token');
    const requestBody = {
      clientId: INMOBI_CLIENT_ID,
      clientSecret: INMOBI_CLIENT_SECRET
    };

    const response = await fetch(INMOBI_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Inmobi Auth Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    authToken = data?.data?.token;

    if (!authToken) {
      throw new Error('No token returned from Inmobi API');
    }

    // Set expiration time (60 minutes from now, to be safe)
    tokenExpirationTime = now + 3600;

    console.error('Successfully obtained Inmobi auth token');
    return authToken;
  } catch (error: any) {
    console.error('Error obtaining Inmobi auth token:', error);
    throw new Error(`Failed to get authentication token: ${error.message}`);
  }
}

/**
 * Generate a report request payload
 */
function generatePayload(startDate: string, endDate: string, os: string): string {
  return JSON.stringify({
    startDate: startDate,
    endDate: endDate,
    filters: {
      os: [os]
    },
    dimensions: [
      "date",
      "campaign_id",
      "campaign_name",
      "os"
    ]
  });
}

/**
 * Generate a SKAN report (iOS)
 */
async function getSkanReportId(startDate: string, endDate: string): Promise<string> {
  try {
    const token = await getInmobiAuthToken();
    const payload = generatePayload(startDate, endDate, 'iOS');

    const response = await fetch(INMOBI_SKAN_REPORT_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: payload
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Inmobi SKAN Report Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`SKAN Report generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reportId = data?.data?.reportId;

    if (!reportId) {
      throw new Error('No reportId returned from Inmobi API');
    }

    return reportId;
  } catch (error: any) {
    console.error('Error generating SKAN report:', error);
    throw new Error(`Failed to generate SKAN report: ${error.message}`);
  }
}

/**
 * Generate a non-SKAN report (Android)
 */
async function getNonSkanReportId(startDate: string, endDate: string): Promise<string> {
  try {
    const token = await getInmobiAuthToken();
    const payload = generatePayload(startDate, endDate, 'Android');

    const response = await fetch(INMOBI_NON_SKAN_REPORT_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: payload
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Inmobi non-SKAN Report Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Non-SKAN Report generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reportId = data?.data?.reportId;

    if (!reportId) {
      throw new Error('No reportId returned from Inmobi API');
    }

    return reportId;
  } catch (error: any) {
    console.error('Error generating non-SKAN report:', error);
    throw new Error(`Failed to generate non-SKAN report: ${error.message}`);
  }
}

/**
 * Check the status of a report
 */
async function getReportStatus(reportId: string): Promise<string | null> {
  try {
    if (!reportId) return null;

    const token = await getInmobiAuthToken();
    const url = `${INMOBI_REPORT_BASE_URL}/${reportId}/status`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Inmobi Report Status Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Report status check failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.data?.reportStatus || null;
  } catch (error: any) {
    console.error('Error checking report status:', error);
    throw new Error(`Failed to check report status: ${error.message}`);
  }
}

/**
 * Wait for a report to be ready
 */
async function checkReportStatus(reportId: string): Promise<boolean> {
  let count = 0;
  let reportAvailable = false;

  while (count < LOOP_COUNT) {
    const status = await getReportStatus(reportId);

    if (status === 'report.status.available') {
      reportAvailable = true;
      break;
    }

    count++;
    // Wait 5 seconds between status checks
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  if (!reportAvailable) {
    console.error(`Check report status timeout for report ID: ${reportId}`);
  }

  return reportAvailable;
}

/**
 * Download report data
 */
async function fetchReportData(reportId: string): Promise<any[]> {
  try {
    if (!reportId) return [];

    const token = await getInmobiAuthToken();
    const url = `${INMOBI_REPORT_BASE_URL}/${reportId}/download`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Inmobi Report Download Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Report download failed: ${response.status} ${response.statusText}`);
    }

    const csvData = await response.text();

    // Parse CSV data
    // This is a simple parsing approach - you might need a more robust CSV parser
    const rows = csvData.split('\n');
    const headers = rows[0].split(',');

    return rows.slice(1).filter(row => row.trim()).map(row => {
      const values = row.split(',');
      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });

      return obj;
    });
  } catch (error: any) {
    console.error('Error fetching report data:', error);
    throw new Error(`Failed to fetch report data: ${error.message}`);
  }
}

// Tool: Generate report IDs
server.tool("generate_inmobi_report_ids",
  "Generate Inmobi report IDs for SKAN (iOS) and non-SKAN (Android) reports.",
  {
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)"),
  }, async ({ startDate, endDate }) => {
  try {
    // Validate date range logic
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date.");
    }

    const skanReportId = await getSkanReportId(startDate, endDate);
    const nonSkanReportId = await getNonSkanReportId(startDate, endDate);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            skanReportId,
            nonSkanReportId
          }, null, 2)
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error generating Inmobi report IDs: ${error.message}`;

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

// Tool: Fetch report data
server.tool("fetch_inmobi_report_data",
  "Fetch data from Inmobi reports using report IDs.",
  {
    skanReportId: z.string().describe("SKAN report ID obtained from generate_inmobi_report_ids"),
    nonSkanReportId: z.string().describe("Non-SKAN report ID obtained from generate_inmobi_report_ids"),
  }, async ({ skanReportId, nonSkanReportId }) => {
  try {
    let allData: any[] = [];

    // Check SKAN report status and fetch data if available
    const skanReportAvailable = await checkReportStatus(skanReportId);
    if (skanReportAvailable) {
      const skanData = await fetchReportData(skanReportId);
      allData = allData.concat(skanData);
    }

    // Check non-SKAN report status and fetch data if available
    const nonSkanReportAvailable = await checkReportStatus(nonSkanReportId);
    if (nonSkanReportAvailable) {
      const nonSkanData = await fetchReportData(nonSkanReportId);
      allData = allData.concat(nonSkanData);
    }

    if (allData.length === 0) {
      throw new Error("No data available from either report.");
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(allData, null, 2)
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error fetching Inmobi report data: ${error.message}`;

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
  console.error("Inmobi Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
