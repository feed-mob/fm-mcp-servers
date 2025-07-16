#!/usr/bin/env node

import { FastMCP } from "fastmcp";
import { Schema, z } from "zod";
import jwt from 'jsonwebtoken';

// Create FastMCP server instance
const server = new FastMCP({
  name: "femini-reporting",
  version: "0.0.5",
  instructions: `
This is a customized MCP server for the Feedmob project, specifically for querying and analyzing ad spend data.

Key Features:
- Query ad spend data (Campaign Spends)
- Supports various grouping methods and metrics
- Provides flexible filtering conditions
`.trim(),
});

const FEMINI_API_URL = process.env.FEMINI_API_URL;
const FEMINI_API_TOKEN = process.env.FEMINI_API_TOKEN;
const FEEDMOB_API_BASE = process.env.FEEDMOB_API_BASE;
const FEEDMOB_KEY = process.env.FEEDMOB_KEY;
const FEEDMOB_SECRET = process.env.FEEDMOB_SECRET;

if (!FEEDMOB_KEY || !FEEDMOB_SECRET) {
  console.error("Error: FEEDMOB_KEY and FEEDMOB_SECRET environment variables must be set.");
  process.exit(1);
}

// Generate JWT token
function generateToken(key: string, secret: string): string {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now

  const payload = {
    key: key,
    expired_at: expirationDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
  };

  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

server.addTool({
  name: "query_admin_infomation",
  description: "Queries various metric data for client, campaign, partner, and click_url from the admin system, supporting multiple metrics and filtering conditions.",
  parameters: z.object({
    date_gteq: z.string().optional().describe("Start date (YYYY-MM-DD format), defaults to the first day of the previous month"),
    date_lteq: z.string().optional().describe("End date (YYYY-MM-DD format), defaults to yesterday"),
    metrics: z.array(z.enum([
        "direct_spends",
        "infomation",
        "direct_spend_with_change_logs",
        "infomation_with_change_logs",
        "price_rate_change_logs",
        "spend_requests",
        "spend_request_with_change_logs"
      ]))
      .optional()
      .default(["infomation"])
      .describe(`### infomation
        CAMPAIGN NAME,VENDOR NAME,TRACKER,LINK TYPE,MMP CLICK TRACKING LINK,MMP IMPRESSION TRACKING LINK,STATUS,START TIME,END TIME,DIRECT SPEND INPUT,NET CPI/CPA/CPM,GROSS UNIT PRICE,MARGIN,CLIENT PAID ACTION,VENDOR PAID ACTION,CAP ACTION,TARGET CAP,MAX CAP,DIRECT SPEND AUTOMATION SWITCH,CREATED AT,UPDATED AT
        ### direct_spends
        List of direct spends for the specified date range, including:
        - date
        - gross_spend
        - net_spend
        - margin
        - last_update_user
        ### direct_spend_with_change_logs
        List of direct spends for the specified date range, including:
        - date
        - gross_spend
        - net_spend
        - margin
        - last_update_user
        - change_logs (user_name, action, version, comment, created_at, audited_changes)
        ### infomation_with_change_logs
        Same as \`infomation\`, but additionally includes \`CHANGE LOGS\` (user_name, action, version, comment, created_at, audited_changes)
        ### price_rate_change_logs
        List of price change for the specified date range, including:
        - start_date
        - end_date
        - net_rate
        - gross_rate
        - margin
        - create_user
        ### spend_requests
        List of spend requests, including:
        - gross_spend_formula
        - net_spend_formula
        - margin_formula
        - gross_spend_source
        - net_spend_source
        - margin_source
        - github_ticket
        - having_client_report
        - margin_type
        - status
        - created_at
        - hubspot_ticket
        - client_paid_actions
        - vendor_paid_actions
        - automation_start_date
        ### spend_request_with_change_logs
        Same as \`spend_requests\`, but additionally includes \`change_logs\` (user_name, action, version, comment, created_at, audited_changes)
      `).describe(`Metrics for admin system data.`),
    legacy_client_id_in: z.array(z.string()).optional().describe("Client ID filter (array)"),
    legacy_partner_id_in: z.array(z.string()).optional().describe("Partner ID filter (array)"),
    legacy_campaign_id_in: z.array(z.string()).optional().describe("Campaign ID filter (array)"),
    legacy_click_url_id_in: z.array(z.string()).optional().describe("Click URL ID filter (array)"),
  }),
  execute: async (args, { log }) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (args.date_gteq) queryParams.append('date_gteq', args.date_gteq);
      if (args.date_lteq) queryParams.append('date_lteq', args.date_lteq);
      
      // Process array parameters
      if (args.metrics) {
        args.metrics.forEach(metric => queryParams.append('metrics[]', metric));
      }
      if (args.legacy_client_id_in) {
        args.legacy_client_id_in.forEach(id => queryParams.append('legacy_client_id_in[]', id));
      }
      if (args.legacy_partner_id_in) {
        args.legacy_partner_id_in.forEach(id => queryParams.append('legacy_partner_id_in[]', id));
      }
      if (args.legacy_campaign_id_in) {
        args.legacy_campaign_id_in.forEach(id => queryParams.append('legacy_campaign_id_in[]', id));
      }
      if (args.legacy_click_url_id_in) {
        args.legacy_click_url_id_in.forEach(id => queryParams.append('legacy_click_url_id_in[]', id));
      }

      const apiUrl = `${FEEDMOB_API_BASE}/ai/api/femini_mcp_reports?${queryParams.toString()}`;
      const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'FEEDMOB-KEY': FEEDMOB_KEY,
          'FEEDMOB-TOKEN': token
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `# Query Result
**Query Parameters:**
- Metrics: ${args.metrics?.join(', ')}
- Date Range: ${args.date_gteq || 'default'} to ${args.date_lteq || 'default'}
**Raw JSON Data:**
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
**Please further analyze and find the data required by the user based on the prompt, and return the data in a human-readable, formatted, and aesthetically pleasing manner.**
`,
          },
        ],
      };
    } catch (error: unknown) {
      throw new Error(`Failed to query admin infomation: ${(error as Error).message}`);
    }
  },
});

// Query femini data
server.addTool({
  name: "query_campaign_spends",
  description: "Queries ad spend data from the femoni system, supporting various grouping methods and filtering conditions. After obtaining the results, further analyze and summarize the returned data, such as calculating total gross spend, total net spend, and identifying clients with the highest spend.",
  parameters: z.object({
    guide: z.string().describe("get from system resources campaign-spends-api-guide://usage"),
    date_gteq: z.string().optional().describe("Start date (YYYY-MM-DD format), defaults to the first day of the previous month"),
    date_lteq: z.string().optional().describe("End date (YYYY-MM-DD format), defaults to yesterday"),
    groups: z.array(z.enum(["day", "week", "month", "client", "partner", "campaign", "click_url", "country"]))
      .optional()
      .default(['campaign', 'partner'])
      .describe("Grouping methods: day, week, month, client, partner, campaign, click_url, country"),
    metrics: z.array(z.enum(["gross", "net", "revenue", "impressions", "clicks", "installs", "cvr", "margin"]))
      .optional()
      .default(["gross", "net"])
      .describe("Metrics to return: gross, net, revenue, impressions, clicks, installs, cvr, margin"),
    legacy_client_id_in: z.array(z.string()).optional().describe("Client ID filter (array)"),
    legacy_partner_id_in: z.array(z.string()).optional().describe("Partner ID filter (array)"),
    legacy_campaign_id_in: z.array(z.string()).optional().describe("Campaign ID filter (array)"),
    legacy_click_url_id_in: z.array(z.string()).optional().describe("Click URL ID filter (array)"),
  }),
  annotations: {
    title: "Ad Spend Data Query Tool",
    readOnlyHint: true,
    openWorldHint: true,
  },
  execute: async (args, { log }) => {
    try {
      log.info("Querying ad spend data", { 
        groups: args.groups, 
        metrics: args.metrics,
        date_range: `${args.date_gteq || 'default'} to ${args.date_lteq || 'default'}`
      });

      // Construct query parameters
      const queryParams = new URLSearchParams();
      
      if (args.date_gteq) queryParams.append('date_gteq', args.date_gteq);
      if (args.date_lteq) queryParams.append('date_lteq', args.date_lteq);
      
      // Process array parameters
      if (args.metrics) {
        args.metrics.forEach(metric => queryParams.append('metrics[]', metric));
      }
      if (args.groups) {
        args.groups.forEach(group => queryParams.append('groups[]', group));
      }
      if (args.legacy_client_id_in) {
        args.legacy_client_id_in.forEach(id => queryParams.append('legacy_client_id_in[]', id));
      }
      if (args.legacy_partner_id_in) {
        args.legacy_partner_id_in.forEach(id => queryParams.append('legacy_partner_id_in[]', id));
      }
      if (args.legacy_campaign_id_in) {
        args.legacy_campaign_id_in.forEach(id => queryParams.append('legacy_campaign_id_in[]', id));
      }
      if (args.legacy_click_url_id_in) {
        args.legacy_click_url_id_in.forEach(id => queryParams.append('legacy_click_url_id_in[]', id));
      }

      // Construct full API URL
      const apiUrl = `${FEMINI_API_URL}/api/unstable/mcp/campaign_spends?${queryParams.toString()}`;
      
      log.info("Sending API request", { url: apiUrl });

      // Send HTTP request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + FEMINI_API_TOKEN
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      log.info("API request successful", { resultCount: Object.keys(data).length });

      return {
        content: [
          {
            type: "text",
            text: `# Ad Spend Data Query Result
**Query Parameters:**
- Grouping Method: ${args.groups}
- Metrics: ${args.metrics?.join(', ')}
- Date Range: ${args.date_gteq || 'default'} to ${args.date_lteq || 'default'}
**Raw JSON Data:**
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
**Please further analyze and summarize the JSON array data based on the prompt, for example, calculate total gross spend, total net spend, and identify clients with the highest spend. Return the data in a formatted and aesthetically pleasing manner.**
**For table data, please generate plain text tables that are easy for humans to read.**
`,
          },
        ],
      };
    } catch (error: unknown) {
      log.error("Failed to query ad spend data", { error: (error as Error).message });
      throw new Error(`Failed to query ad spend data: ${(error as Error).message}`);
    }
  },
});

server.addTool({
  name: "search_ids",
  description: "Retrieves a list of client, partner, and campaign ID information based on keywords. Note: 'femini', 'assistant', and 'feedmob' are existing system keywords and do not require ID queries.",
  parameters: z.object({
    keys: z.array(z.string()).optional().describe("List of keywords to get client, partner, campaign ID"),
  }),
  execute: async (args, { log }) => {
    try {
      const q = args.keys?.join(',') || '';
      const apiUrl = `${FEMINI_API_URL}/api/unstable/entities/search?q=${q}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + FEMINI_API_TOKEN
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error: unknown) {
      log.error("Failed to get IDs", { error: (error as Error).message });
      throw new Error(`Failed to get IDs: ${(error as Error).message}`);
    }
  },
});

// Add CampaignSpendsApiQuery User Manual resource
server.addResource({
  uri: "campaign-spends-api-guide://usage",
  name: "CampaignSpendsApiQuery User Manual",
  mimeType: "text/markdown",
  async load() {
    const guideUrl = `${FEMINI_API_URL}/mcp/campaign-spends-api-guide.en.md`;
    const response = await fetch(guideUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + FEMINI_API_TOKEN
      },
    });
   
    try {
      const response = await fetch(guideUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch guide: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      return {
        text: text,
      };
    } catch (error) {
      console.error("Error loading resource from URL:", error);
      throw new Error(`Failed to load resource from URL: ${(error as Error).message}`);
    }
  },
});

server.start({
  transportType: "stdio"
});
