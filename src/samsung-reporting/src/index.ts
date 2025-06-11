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
  version: "0.0.6"
});

// Configuration constants
const SAMSUNG_BASE_URL = process.env.SAMSUNG_BASE_URL || 'https://devapi.samsungapps.com';
const SAMSUNG_ISS = process.env.SAMSUNG_ISS || '';
const SAMSUNG_PRIVATE_KEY = process.env.SAMSUNG_PRIVATE_KEY || '';
const SAMSUNG_SCOPES = ['publishing', 'gss'] as const;
const JWT_EXPIRY_MINUTES = 20;
const TOKEN_BUFFER_MINUTES = 2; // Refresh token 2 minutes before expiry

// Type definitions
interface ContentApp {
  app: string;
  contentId: string;
}

interface MetricResult {
  contentId: string;
  metrics?: any[];
  error?: string;
}

interface TokenInfo {
  token: string;
  expiresAt: number;
}

// Default metric IDs
const DEFAULT_METRIC_IDS = [
  'total_unique_installs_filter',
  'revenue_total',
  'revenue_iap_order_count',
  'daily_rat_score',
  'daily_rat_volumne'
] as const;

const SAMSUNG_CONTENT_IDS: ContentApp[] = [
  { app: 'Lyft', contentId: '000007874233' },
  { app: 'Self Financial', contentId: '000008094857' },
  { app: 'Chime', contentId: '000008223186' },
  { app: 'ZipRecruiter', contentId: '000008182313' },
  { app: 'Upside', contentId: '000008222297' }
];

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

class ConfigurationError extends CapturedError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Utility functions
 */
function validateConfiguration(): void {
  if (!SAMSUNG_ISS) {
    throw new ConfigurationError('SAMSUNG_ISS environment variable is required');
  }
  if (!SAMSUNG_PRIVATE_KEY) {
    throw new ConfigurationError('SAMSUNG_PRIVATE_KEY environment variable is required');
  }
}

function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidDateRange(startDate: string, endDate: string): boolean {
  return new Date(startDate) <= new Date(endDate);
}

/**
 * Get available app names for validation
 */
function getAvailableAppNames(): string[] {
  return SAMSUNG_CONTENT_IDS.map(app => app.app);
}

/**
 * Find app by name (case-insensitive)
 */
function findAppByName(appName: string): ContentApp | undefined {
  return SAMSUNG_CONTENT_IDS.find(app =>
    app.app.toLowerCase() === appName.toLowerCase()
  );
}

/**
 * Filter apps by name
 */
function filterAppsByName(appName?: string): ContentApp[] {
  if (!appName) {
    return SAMSUNG_CONTENT_IDS;
  }

  const foundApp = findAppByName(appName);
  if (!foundApp) {
    throw new SamsungApiError(
      `App "${appName}" not found. Available apps: ${getAvailableAppNames().join(', ')}`
    );
  }

  return [foundApp];
}

/**
 * Samsung API Service Class
 */
class SamsungApiService {
  private readonly startDate: string;
  private readonly endDate: string;
  private tokenInfo: TokenInfo | null = null;

  constructor(startDate: string, endDate: string) {
    validateConfiguration();

    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      throw new SamsungApiError('Invalid date format. Use YYYY-MM-DD format.');
    }

    if (!isValidDateRange(startDate, endDate)) {
      throw new SamsungApiError('Start date cannot be after end date.');
    }

    this.startDate = startDate;
    this.endDate = endDate;
  }

  /**
   * Generate JWT token for Samsung API authentication
   */
  private generateJwt(): string {
    try {
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + (JWT_EXPIRY_MINUTES * 60);

      const payload = {
        iss: SAMSUNG_ISS,
        scopes: SAMSUNG_SCOPES,
        exp,
        iat
      };

      return jwt.sign(payload, SAMSUNG_PRIVATE_KEY, { algorithm: 'RS256' });
    } catch (error: any) {
      console.error('Error generating JWT:', error);
      throw new SamsungApiError(`Failed to generate JWT: ${error.message}`);
    }
  }

  /**
   * Check if current token is valid and not expired
   */
  private isTokenValid(): boolean {
    if (!this.tokenInfo) {
      return false;
    }

    const now = Date.now();
    const bufferTime = TOKEN_BUFFER_MINUTES * 60 * 1000;
    return now < (this.tokenInfo.expiresAt - bufferTime);
  }

  /**
   * Fetch access token using JWT with caching
   */
  private async fetchAccessToken(): Promise<void> {
    if (this.isTokenValid()) {
      return;
    }

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

      const data = await response.json() as any;
      const accessToken = data.createdItem?.accessToken;

      if (!accessToken) {
        throw new Error('Access token not found in response');
      }

      // Cache token with expiry time
      this.tokenInfo = {
        token: accessToken,
        expiresAt: Date.now() + (JWT_EXPIRY_MINUTES * 60 * 1000)
      };

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
    metricIds: string[] = [...DEFAULT_METRIC_IDS]
  ): Promise<any[]> {
    try {
      await this.fetchAccessToken();

      if (!this.tokenInfo) {
        throw new Error('No valid access token available');
      }

      const requestBody = {
        contentId,
        periods: [{
          startDate: this.startDate,
          endDate: this.endDate
        }],
        getDailyMetrics: false,
        noContentMetadata: true,
        noBreakdown: false,
        metricIds,
        filters: {},
        trendAggregation: 'day'
      };

      console.error(`Fetching content metrics for content ID: ${contentId}`);

      const response = await fetch(`${SAMSUNG_BASE_URL}/gss/query/contentMetric`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tokenInfo.token}`,
          'service-account-id': SAMSUNG_ISS
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as any;
      return data.data?.periods || [];
    } catch (error: any) {
      console.error(`Error fetching content metric for ${contentId}:`, error);
      throw new SamsungApiError(`Failed to fetch content metric for ${contentId}: ${error.message}`);
    }
  }

  /**
   * Fetch content metrics for specified apps with parallel processing
   */
  async fetchContentMetrics(
    apps: ContentApp[],
    metricIds: string[] = [...DEFAULT_METRIC_IDS]
  ): Promise<Record<string, MetricResult>> {
    try {
      // Pre-fetch access token to avoid multiple token requests
      await this.fetchAccessToken();

      // Process specified apps in parallel for better performance
      const promises = apps.map(async ({ app, contentId }): Promise<[string, MetricResult]> => {
        try {
          console.error(`Fetching metrics for ${app} (${contentId})`);
          const metrics = await this.fetchContentMetric(contentId, metricIds);
          return [app, { contentId, metrics }];
        } catch (error: any) {
          console.error(`Error fetching metrics for ${app}: ${error.message}`);
          return [app, { contentId, error: error.message }];
        }
      });

      const results = await Promise.all(promises);
      return Object.fromEntries(results);
    } catch (error: any) {
      console.error('Error fetching content metrics:', error);
      throw new SamsungApiError(`Failed to fetch content metrics: ${error.message}`);
    }
  }
}

// Input validation schemas
const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => !isNaN(Date.parse(date)), "Invalid date");

const metricIdsSchema = z.array(z.string()).optional()
  .describe("Optional array of metric IDs to fetch. Defaults to standard metrics if not provided.");

const appNameSchema = z.string().optional()
  .describe(`Optional app name to filter results. Available apps: ${getAvailableAppNames().join(', ')}. If not provided, returns data for all apps.`);

// Tool: Get Samsung Content Metrics
server.tool("get_samsung_content_metrics",
  "Fetch content metrics from Samsung API for a specific date range. Optionally filter by app name.",
  {
    startDate: dateSchema.describe("Start date for the report (YYYY-MM-DD)"),
    endDate: dateSchema.describe("End date for the report (YYYY-MM-DD)"),
    appName: appNameSchema,
    metricIds: metricIdsSchema
  },
  async ({ startDate, endDate, appName, metricIds }) => {
    try {
      const logMessage = appName
        ? `Fetching Samsung content metrics for ${appName}, date range: ${startDate} to ${endDate}`
        : `Fetching Samsung content metrics for all apps, date range: ${startDate} to ${endDate}`;

      console.error(logMessage);

      // Filter apps based on appName parameter
      const appsToFetch = filterAppsByName(appName);

      const samsungService = new SamsungApiService(startDate, endDate);
      const allMetrics = await samsungService.fetchContentMetrics(appsToFetch, metricIds);

      // Format response with better structure
      const response = {
        dateRange: { startDate, endDate },
        requestedApp: appName || 'all',
        availableApps: getAvailableAppNames(),
        totalApps: Object.keys(allMetrics).length,
        successfulApps: Object.values(allMetrics).filter(result => !result.error).length,
        failedApps: Object.values(allMetrics).filter(result => result.error).length,
        data: allMetrics
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2)
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
            text: JSON.stringify({
              error: errorMessage,
              dateRange: { startDate, endDate },
              requestedApp: appName || 'all',
              availableApps: getAvailableAppNames(),
              timestamp: new Date().toISOString()
            }, null, 2)
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
    console.error("Samsung Reporting MCP Server running on stdio");
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
