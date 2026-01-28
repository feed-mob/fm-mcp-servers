#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { lookupIP, batchLookup, fraudCheck, batchFraudCheck, getUsageStats, refreshQuota } from "./api.js";

// Create server instance
const server = new McpServer({
  name: "iplocate",
  version: "0.0.1"
});

// Tool Definition for Single IP Lookup
server.tool(
  "lookup_ip",
  "Get geographic location information for a single IP address. If no IP is provided, uses the requester's IP address.",
  {
    ip: z.string().optional().describe("IP address to lookup. If not provided, uses requester's IP"),
  },
  async (params) => {
    try {
      const result = await lookupIP(params.ip);
      const formattedData = JSON.stringify(result, null, 2);
      return {
        content: [{
          type: "text",
          text: `IP lookup result:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while looking up IP.";
      console.error("Error in lookup_ip tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error looking up IP: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Batch IP Lookup
server.tool(
  "batch_lookup",
  "Get geographic location information for multiple IP addresses at once. Maximum 100 IPs per request.",
  {
    ips: z.array(z.string()).describe("Array of IP addresses to lookup (max 100)"),
  },
  async (params) => {
    try {
      if (params.ips.length > 100) {
        throw new Error("Maximum 100 IPs per request");
      }
      const result = await batchLookup(params.ips);
      const formattedData = JSON.stringify(result, null, 2);
      return {
        content: [{
          type: "text",
          text: `Batch IP lookup results:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while performing batch lookup.";
      console.error("Error in batch_lookup tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error in batch lookup: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Single IP Fraud Check
server.tool(
  "fraud_check",
  "Check the reputation and fraud risk level of a single IP address. Returns fraud score (0-100), proxy/VPN/Tor detection, and other security indicators. If no IP is provided, uses the requester's IP address.",
  {
    ip: z.string().optional().describe("IP address to check. If not provided, uses requester's IP"),
  },
  async (params) => {
    try {
      const result = await fraudCheck(params.ip);
      const formattedData = JSON.stringify(result, null, 2);

      // Add fraud score interpretation
      let interpretation = "";
      if (result.data && typeof result.data.fraud_score === 'number') {
        const score = result.data.fraud_score;
        if (score < 25) {
          interpretation = "\n\n**Risk Assessment**: Low Risk - Safe, allow";
        } else if (score < 50) {
          interpretation = "\n\n**Risk Assessment**: Medium-Low Risk - Generally safe, additional verification recommended";
        } else if (score < 75) {
          interpretation = "\n\n**Risk Assessment**: Medium-High Risk - Manual review required";
        } else if (score < 90) {
          interpretation = "\n\n**Risk Assessment**: High Risk - Recommend blocking";
        } else {
          interpretation = "\n\n**Risk Assessment**: Very High Risk - Strongly recommend blocking";
        }
      }

      return {
        content: [{
          type: "text",
          text: `IP fraud check result:\n\`\`\`json\n${formattedData}\n\`\`\`${interpretation}`,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while checking IP fraud.";
      console.error("Error in fraud_check tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error checking IP fraud: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Batch IP Fraud Check
server.tool(
  "batch_fraud_check",
  "Check reputation and fraud risk for multiple IP addresses at once. Maximum 50 IPs per request.",
  {
    ips: z.array(z.string()).describe("Array of IP addresses to check (max 50)"),
  },
  async (params) => {
    try {
      if (params.ips.length > 50) {
        throw new Error("Maximum 50 IPs per request for fraud check");
      }
      const result = await batchFraudCheck(params.ips);
      const formattedData = JSON.stringify(result, null, 2);
      return {
        content: [{
          type: "text",
          text: `Batch IP fraud check results:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while performing batch fraud check.";
      console.error("Error in batch_fraud_check tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error in batch fraud check: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Getting Usage Stats
server.tool(
  "get_usage_stats",
  "View current IPQualityScore API quota usage, including total credits, remaining credits, usage percentage, and reset date.",
  {},
  async () => {
    try {
      const result = await getUsageStats();
      const formattedData = JSON.stringify(result, null, 2);

      // Add usage summary
      let summary = "";
      if (result.data) {
        const data = result.data;
        summary = `\n\n**Usage Summary**:\n- Remaining: ${data.remaining_credits?.toLocaleString()} / ${data.total_credits?.toLocaleString()} credits (${data.remaining_percentage}%)\n- Status: ${data.below_threshold ? '⚠️ Below threshold' : '✓ Normal'}\n- Reset Date: ${data.reset_date}`;
      }

      return {
        content: [{
          type: "text",
          text: `API usage statistics:\n\`\`\`json\n${formattedData}\n\`\`\`${summary}`,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while getting usage stats.";
      console.error("Error in get_usage_stats tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error getting usage stats: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Tool Definition for Refreshing Quota Cache
server.tool(
  "refresh_quota",
  "Force refresh the quota cache to get the latest quota information from IPQualityScore.",
  {},
  async () => {
    try {
      const result = await refreshQuota();
      const formattedData = JSON.stringify(result, null, 2);

      // Add usage summary
      let summary = "";
      if (result.data) {
        const data = result.data;
        summary = `\n\n**Updated Usage**:\n- Remaining: ${data.remaining_credits?.toLocaleString()} / ${data.total_credits?.toLocaleString()} credits (${data.remaining_percentage}%)\n- Status: ${data.below_threshold ? '⚠️ Below threshold' : '✓ Normal'}`;
      }

      return {
        content: [{
          type: "text",
          text: `Quota cache refreshed:\n\`\`\`json\n${formattedData}\n\`\`\`${summary}`,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while refreshing quota.";
      console.error("Error in refresh_quota tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error refreshing quota: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// Run the Server
async function main() {
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    console.error("IPLocate MCP Server running on stdio...");
  } catch (error) {
    console.error("Failed to start IPLocate MCP Server:", error);
    process.exit(1);
  }
}

main();
