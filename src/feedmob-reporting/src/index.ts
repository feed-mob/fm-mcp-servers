#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchDirectSpendsData, getInmobiReportIds, checkInmobiReportStatus, getInmobiReports, createDirectSpend, getAppsflyerReports, getAdopsReports } from "./api.js";

// Create server instance
const server = new McpServer({
  name: "feedmob-reporting",
  version: "0.0.4",
  capabilities: {
    tools: {},
    prompts: {},
  },
});

// Tool Definition for Creating Direct Spend
server.tool(
  "create_direct_spend",
  "Create Or Update a direct spend via FeedMob API.",
  {
    net_spend: z.number().describe("Net spend amount"),
    click_url_id: z.number().describe("Click URL ID"),
    spend_date: z.string().describe("Spend date in YYYY-MM-DD format"),
  },
  async (params) => {
    try {
      const result = await createDirectSpend(
        params.net_spend,
        params.click_url_id,
        params.spend_date
      );
      const formattedData = JSON.stringify(result, null, 2);
      return {
        content: [{
          type: "text",
          text: `Direct spend created successfully:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while creating direct spend.";
      console.error("Error in create_direct_spend tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error creating direct spend: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Direct Spends
server.tool(
  "get_direct_spends",
  "Get direct spends data via FeedMob API.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
    click_url_ids: z.array(z.string()).describe("Array of click URL IDs"),
  },
  async (params) => {
    try {
      const spendData = await fetchDirectSpendsData(
        params.start_date,
        params.end_date,
        params.click_url_ids
      );
      const formattedData = JSON.stringify(spendData, null, 2);
      return {
        content: [{
          type: "text",
          text: `Direct spends data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching direct spends data.";
      console.error("Error in get_direct_spends tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching direct spends data: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Inmobi Report IDs
server.tool(
  "get_inmobi_report_ids",
  "Get Inmobi report IDs for a date range. next step must use tool check_inmobi_report_id_status to check skan_report_id and non_skan_report_id available",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async (params) => {
    try {
      const data = await getInmobiReportIds(params.start_date, params.end_date);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Inmobi report IDs:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching Inmobi report IDs.";
      console.error("Error in get_inmobi_report_ids tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching Inmobi report IDs: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Checking Report Status
server.tool(
  "check_inmobi_report_status",
  "Check the status of an Inmobi report.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
    report_id: z.string().describe("Report ID to check status for"),
  },
  async (params) => {
    try {
      const data = await checkInmobiReportStatus(params.start_date, params.end_date, params.report_id);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Inmobi report status:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while checking Inmobi report status.";
      console.error("Error in check_inmobi_report_status tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error checking Inmobi report status: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Reports
server.tool(
  "get_inmobi_reports",
  "Get Inmobi reports data. next step should check direct spend from feedmob",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
    skan_report_id: z.string().describe("SKAN report ID"),
    non_skan_report_id: z.string().describe("Non-SKAN report ID"),
  },
  async (params) => {
    try {
      const data = await getInmobiReports(
        params.start_date,
        params.end_date,
        params.skan_report_id,
        params.non_skan_report_id
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Inmobi reports data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching Inmobi reports.";
      console.error("Error in get_inmobi_reports tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching Inmobi reports: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting AppsFlyer Reports
server.tool(
  "get_appsflyer_reports",
  "Get AppsFlyer reports data via FeedMob API.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
    click_url_ids: z.array(z.string()).optional().describe("Array of click URL IDs (optional)"),
    af_app_ids: z.array(z.string()).optional().describe("Array of AppsFlyer app IDs (optional)"),
  },
  async (params) => {
    try {
      const data = await getAppsflyerReports(
        params.start_date,
        params.end_date,
        params.click_url_ids,
        params.af_app_ids
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `AppsFlyer reports data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching AppsFlyer reports.";
      console.error("Error in get_appsflyer_reports tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching AppsFlyer reports: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting AdOps Reports
server.tool(
  "get_adops_reports",
  "Get AdOps reports data via FeedMob API.",
  {
    month: z.string().describe("Month in YYYY-MM format"),
  },
  async (params) => {
    try {
      const data = await getAdopsReports(params.month);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `AdOps reports data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching AdOps reports.";
      console.error("Error in get_adops_reports tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching AdOps reports: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);


// Prompt Definition
server.prompt(
  "get_inmobi_reports",
  {},
  () => {
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "next step should check direct spend from feedmob",
        }
      }],
    };
  }
);

// Run the Server
async function main() {
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    console.error("FeedMob Spend MCP Server running on stdio...");
  } catch (error) {
    console.error("Failed to start FeedMob Spend MCP Server:", error);
    process.exit(1);
  }
}

main();
