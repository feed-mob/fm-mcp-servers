#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchDirectSpendsData, getInmobiReportIds, checkInmobiReportStatus, getInmobiReports, createDirectSpend, getAppsflyerReports, getAdopsReports, getAgencyConversionMetrics, getClickUrlHistories, getPossibleFinanceSingularReports, getUserInfos, searchUserInfos, getDirectSpendRequests, getHubspotTickets, getPrivacyHawkSingularReports, getTextnowAdjustReports, getClients, getCampaigns, getVendors, getJamppReports, getDirectSpendJobStats } from "./api.js";

// Create server instance
const server = new McpServer({
  name: "feedmob-reporting",
  version: "0.0.11",
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
    click_url_id: z.number().describe("Click URL ID"),
    spend_date: z.string().describe("Spend date in YYYY-MM-DD format"),
    net_spend: z.number().optional().describe("Net spend amount"),
    gross_spend: z.number().optional().describe("Gross spend amount"),
    partner_paid_action_count: z.number().optional().describe("Partner paid action count"),
    client_paid_action_count: z.number().optional().describe("Client paid action count"),
  },
  async (params) => {
    try {
      if (!params.net_spend && !params.gross_spend && !params.partner_paid_action_count && !params.client_paid_action_count) {
        throw new Error("必须提供至少一个支出指标：net_spend, gross_spend, partner_paid_action_count 或 client_paid_action_count");
      }

      const result = await createDirectSpend(
        params.click_url_id,
        params.spend_date,
        params.net_spend,
        params.gross_spend,
        params.partner_paid_action_count,
        params.client_paid_action_count
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
  "Get direct spends data via FeedMob API. ⚠️ Use 'feedmob-reporting-skills' skill for spend comparison workflows.",
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

// Tool Definition for Agency Conversion Metrics
server.tool(
  "get_agency_conversion_metrics",
  "Get agency_conversion_records metrics for one or more click URL IDs. ⚠️ Use 'feedmob-reporting-skills' skill for conversion analysis workflows.",
  {
    click_url_ids: z.array(z.number()).describe("Array of click URL IDs"),
    date: z.string().optional().describe("Optional date in YYYY-MM-DD format"),
  },
  async (params) => {
    try {
      const data = await getAgencyConversionMetrics(params.click_url_ids, params.date);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Agency conversion metrics data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching agency conversion metrics.";
      console.error("Error in get_agency_conversion_metrics tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching agency conversion metrics: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Click URL Histories
server.tool(
  "get_click_url_histories",
  "Get historical CPI/gross rates for click URL IDs. ⚠️ CRITICAL: Use 'feedmob-reporting-skills' skill - this data is required to calculate expected gross spend.",
  {
    click_url_ids: z.array(z.number()).describe("Array of click URL IDs"),
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async (params) => {
    try {
      const data = await getClickUrlHistories(params.click_url_ids, params.start_date, params.end_date);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Click URL histories data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching click URL histories.";
      console.error("Error in get_click_url_histories tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching click URL histories: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Inmobi Report IDs
server.tool(
  "get_inmobi_report_ids",
  "Get Inmobi report IDs for a date range. ⚠️ Use 'feedmob-reporting-skills' skill for complete InMobi workflow. Next: check_inmobi_report_status → get_inmobi_reports → get_direct_spends.",
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
  "Check the status of an Inmobi report. ⚠️ Use 'feedmob-reporting-skills' skill for proper InMobi workflow sequence.",
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
  "Get Inmobi reports data. ⚠️ Use 'feedmob-reporting-skills' skill for complete analysis. Next: compare with get_direct_spends.",
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
  "Get AppsFlyer reports data via FeedMob API. ⚠️ Use 'feedmob-reporting-skills' skill for cross-platform analysis workflows.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
    click_url_ids: z.array(z.string()).optional().describe("Array of click URL IDs (optional)"),
    af_app_ids: z.array(z.string()).optional().describe("Array of AppsFlyer app IDs (optional)"),
    client_ids: z.array(z.string()).optional().describe("Array of client IDs (optional)"),
    campaign_ids: z.array(z.string()).optional().describe("Array of campaign IDs (optional)"),
  },
  async (params) => {
    try {
      const data = await getAppsflyerReports(
        params.start_date,
        params.end_date,
        params.click_url_ids,
        params.af_app_ids,
        params.client_ids,
        params.campaign_ids
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

// Tool Definition for Getting Possible Finance Singular Reports
server.tool(
  "get_possible_finance_singular_reports",
  "Get Possible Finance Singular API reports. ⚠️ IMPORTANT: Use 'feedmob-reporting-skills' skill for structured workflows - this is part of a 5-step spend verification process.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async (params) => {
    try {
      const data = await getPossibleFinanceSingularReports(
        params.start_date,
        params.end_date
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Possible Finance Singular reports data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching Possible Finance Singular reports.";
      console.error("Error in get_possible_finance_singular_reports tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching Possible Finance Singular reports: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting User Infos
server.tool(
  "get_user_infos",
  "Get all user_infos information via FeedMob API. Returns user information including: email, feedmob_user_id, feedmob_username, hubspot_user_id, hubspot_firstname, hubspot_lastname, github_name, github_username, slack_user_id, slack_username, slack_user_realname.",
  {},
  async () =>
  {
    try {
      const data = await getUserInfos();
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `User infos data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching user_infos.";
      console.error("Error in get_user_infos tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching user_infos: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Searching User Infos
server.tool(
  "search_user_infos",
  "Search user_infos by username via FeedMob API. Returns user information including: email, feedmob_user_id, feedmob_username, hubspot_user_id, hubspot_firstname, hubspot_lastname, github_name, github_username, slack_user_id, slack_username, slack_user_realname.",
  {
    username: z.string().describe("Username to search for"),
  },
  async (params) =>
  {
    try {
      const data = await searchUserInfos(params.username);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `User info search results for username '${params.username}':\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while searching user_infos.";
      console.error("Error in search_user_infos tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error searching user_infos: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Direct Spend Requests
server.tool(
  "get_direct_spend_requests",
  "Get direct spend requests via FeedMob API. At least one of the following parameters must be provided: feedmob_user_id, client_id, vendor_id, or click_url_id.",
  {
    feedmob_user_id: z.number().optional().describe("FeedMob user ID"),
    client_id: z.number().optional().describe("Client ID"),
    vendor_id: z.number().optional().describe("Vendor ID"),
    click_url_id: z.number().optional().describe("Click URL ID"),
    start_date: z.string().optional().describe("Start date in YYYY-MM-DD format"),
  },
  async (params) =>
  {
    try {
      // Validate at least one parameter is provided
      if (params.feedmob_user_id === undefined &&
          params.client_id === undefined &&
          params.vendor_id === undefined &&
          params.click_url_id === undefined) {
        throw new Error("至少需要提供一个参数：feedmob_user_id, client_id, vendor_id 或 click_url_id");
      }

      const data = await getDirectSpendRequests(
        params.feedmob_user_id,
        params.client_id,
        params.vendor_id,
        params.click_url_id,
        params.start_date
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Direct spend requests data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching direct spend requests.";
      console.error("Error in get_direct_spend_requests tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching direct spend requests: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting HubSpot Tickets
server.tool(
  "get_hubspot_tickets",
  "Get HubSpot tickets via FeedMob API. Can filter by hubspot_user_id and/or createdate_start. At least one parameter must be provided.",
  {
    hubspot_user_id: z.number().optional().describe("HubSpot user ID"),
    createdate_start: z.string().optional().describe("Creation date start in YYYY-MM-DD format"),
  },
  async (params) =>
  {
    try {
      // Validate at least one parameter is provided
      if (params.hubspot_user_id === undefined && params.createdate_start === undefined) {
        throw new Error("至少需要提供一个参数：hubspot_user_id 或 createdate_start");
      }

      const data = await getHubspotTickets(
        params.hubspot_user_id,
        params.createdate_start
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `HubSpot tickets data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching HubSpot tickets.";
      console.error("Error in get_hubspot_tickets tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching HubSpot tickets: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Privacy Hawk Singular Reports
server.tool(
  "get_privacy_hawk_singular_reports",
  "Get Privacy Hawk Singular API reports data via FeedMob API. ⚠️ Use 'feedmob-reporting-skills' skill for cross-platform analysis workflows.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async (params) => {
    try {
      const data = await getPrivacyHawkSingularReports(
        params.start_date,
        params.end_date
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Privacy Hawk Singular reports data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching Privacy Hawk Singular reports.";
      console.error("Error in get_privacy_hawk_singular_reports tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching Privacy Hawk Singular reports: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting TextNow Adjust Reports
server.tool(
  "get_textnow_adjust_reports",
  "Get TextNow Adjust reports data via FeedMob API. ⚠️ Use 'feedmob-reporting-skills' skill for cross-platform analysis workflows.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async (params) => {
    try {
      const data = await getTextnowAdjustReports(
        params.start_date,
        params.end_date
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `TextNow Adjust reports data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching TextNow Adjust reports.";
      console.error("Error in get_textnow_adjust_reports tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching TextNow Adjust reports: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Clients
server.tool(
  "get_clients",
  "Get clients information via FeedMob API. Can filter by client_name (optional).",
  {
    client_name: z.string().optional().describe("Client name to search for (optional)"),
  },
  async (params) => {
    try {
      const data = await getClients(params.client_name);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Clients data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching clients.";
      console.error("Error in get_clients tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching clients: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Campaigns
server.tool(
  "get_campaigns",
  "Get campaigns information via FeedMob API. Can filter by client_id (optional).",
  {
    client_id: z.number().optional().describe("Client ID to filter campaigns (optional)"),
  },
  async (params) => {
    try {
      const data = await getCampaigns(params.client_id);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Campaigns data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching campaigns.";
      console.error("Error in get_campaigns tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching campaigns: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Vendors
server.tool(
  "get_vendors",
  "Get vendors information via FeedMob API. Can filter by vendor_name (optional).",
  {
    vendor_name: z.string().optional().describe("Vendor name to search for (optional)"),
  },
  async (params) => {
    try {
      const data = await getVendors(params.vendor_name);
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Vendors data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching vendors.";
      console.error("Error in get_vendors tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching vendors: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Jampp Reports
server.tool(
  "get_jampp_reports",
  "Get Jampp reports data via FeedMob API. ⚠️ Use 'feedmob-reporting-skills' skill for cross-platform analysis workflows.",
  {
    client_id: z.number().describe("Client ID (required)"),
    start_date: z.string().describe("Start date in YYYY-MM-DD format (required)"),
    end_date: z.string().describe("End date in YYYY-MM-DD format (required)"),
  },
  async (params) => {
    try {
      const data = await getJamppReports(
        params.client_id,
        params.start_date,
        params.end_date
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Jampp reports data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching Jampp reports.";
      console.error("Error in get_jampp_reports tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching Jampp reports: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Direct Spend Job Stats
server.tool(
  "get_direct_spend_job_stats",
  "Get direct spend job stats via FeedMob API. At least one of the following parameters must be provided: client_id, vendor_id, or click_url_id.",
  {
    client_id: z.number().optional().describe("Client ID"),
    vendor_id: z.number().optional().describe("Vendor ID"),
    click_url_id: z.number().optional().describe("Click URL ID"),
  },
  async (params) => {
    try {
      // Validate at least one parameter is provided
      if (params.client_id === undefined &&
          params.vendor_id === undefined &&
          params.click_url_id === undefined) {
        throw new Error("至少需要提供一个参数：client_id, vendor_id 或 click_url_id");
      }

      const data = await getDirectSpendJobStats(
        params.client_id,
        params.vendor_id,
        params.click_url_id
      );
      const formattedData = JSON.stringify(data, null, 2);
      return {
        content: [{
          type: "text",
          text: `Direct spend job stats data:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching direct spend job stats.";
      console.error("Error in get_direct_spend_job_stats tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching direct spend job stats: ${errorMessage}` }],
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
