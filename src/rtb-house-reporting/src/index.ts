#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { Buffer } from 'buffer';

dotenv.config();

const server = new McpServer({
  name: "RTB House Reporting MCP Server",
  version: "0.0.3"
});

// --- RTB House Configuration ---
const RTB_HOUSE_API_URL = 'https://api.panel.rtbhouse.com/v5/advertisers';

const RTB_HOUSE_USER = process.env.RTB_HOUSE_USER || '';
const RTB_HOUSE_PASSWORD = process.env.RTB_HOUSE_PASSWORD || '';

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function validateRtbHouseConfig(): void {
  if (!RTB_HOUSE_USER || !RTB_HOUSE_PASSWORD) {
    throw new ConfigurationError('RTB_HOUSE_USER and RTB_HOUSE_PASSWORD environment variables are required');
  }
}

// 通过 API 获取广告主列表
async function fetchRtbHouseAdvertisersFromApi(): Promise<{ name: string, hash: string }[]> {
  validateRtbHouseConfig();
  const url = `${RTB_HOUSE_API_URL}?fields=name,hash`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${RTB_HOUSE_USER}:${RTB_HOUSE_PASSWORD}`).toString('base64'),
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch advertisers: HTTP ${response.status}: ${errorBody}`);
  }
  const res = await response.json();
  // 兼容返回格式
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  throw new Error('Unexpected advertisers API response');
}

/**
 * Fetch RTB House data for a given date range, returns mapping of app -> full API data array
 */
async function fetchRtbHouseData(dateFrom: string, dateTo: string, app?: string, maxRetries = 3): Promise<Record<string, any[]>> {
  validateRtbHouseConfig();
  const result: Record<string, any[]> = {};
  const paramsBase = {
    dayFrom: dateFrom,
    dayTo: dateTo,
    groupBy: 'day-subcampaign',
    metrics: 'campaignCost-impsCount-clicksCount',
  };
  // 动态获取广告主列表
  const advertisersList = await fetchRtbHouseAdvertisersFromApi();
  let advertisers: { name: string, hash: string }[];
  if (app) {
    advertisers = advertisersList.filter(a => a.name.toLowerCase() === app.toLowerCase());
  } else {
    advertisers = advertisersList;
  }
  if (advertisers.length === 0) {
    throw new ConfigurationError(`App '${app}' not found in RTB House advertisers`);
  }
  for (const adv of advertisers) {
    let lastError: any = null;
    let data: any[] = [];
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const params = new URLSearchParams(paramsBase as any).toString();
        const url = `${RTB_HOUSE_API_URL}/${adv.hash}/rtb-stats?${params}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${RTB_HOUSE_USER}:${RTB_HOUSE_PASSWORD}`).toString('base64'),
            'Accept': 'application/json',
          },
        });
        if (!response.ok) {
          const errorBody = await response.text();
          lastError = new Error(`HTTP ${response.status}: ${errorBody}`);
          if (response.status >= 500 || response.status === 429 || response.status === 408) {
            if (attempt === maxRetries) throw lastError;
            await new Promise(res => setTimeout(res, 1000 * attempt));
            continue;
          } else {
            throw lastError;
          }
        }
        const res: any = await response.json();
        data = (res.data || []); // 不再过滤单一天
        break; // success, break retry loop
      } catch (err: any) {
        lastError = err;
        if (attempt === maxRetries) {
          data = [];
          console.error(`Failed to fetch RTB House data for app ${adv.name}: ${err.message}`);
        }
      }
    }
    result[adv.name] = data;
  }
  return result;
}

// --- RTB House Data Tool Registration ---
const rtbHouseDateSchema = z.string()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => !isNaN(Date.parse(date)), 'Invalid date');

server.tool(
  'get_rtb_house_data',
  'Fetch RTB House full API data for a given date range.',
  {
    dateFrom: rtbHouseDateSchema.describe('Start date for the report (YYYY-MM-DD)'),
    dateTo: rtbHouseDateSchema.describe('End date for the report (YYYY-MM-DD)'),
    app: z.string().optional().describe('Optional app name to filter results. If not provided, returns data for all apps.'),
    maxRetries: z.number().int().min(1).max(10).optional().default(3).describe('Maximum number of retry attempts (default: 3)'),
  },
  async ({ dateFrom, dateTo, app, maxRetries = 3 }) => {
    try {
      const data = await fetchRtbHouseData(dateFrom, dateTo, app, maxRetries);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ dateFrom, dateTo, app: app || 'all', data }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message, dateFrom, dateTo, app: app || 'all' }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Start server
async function runServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("RTB House Reporting MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
