#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { getUserPodRelationships, getClientPodRelationships, PodUser, PodClient, searchSlackMessages, SlackMessage, getHubSpotTickets, getHubSpotTicketById, getHubSpotTicketsByUser, HubSpotTicket } from './api.js';

dotenv.config();

const server = new McpServer({
  name: 'user-activity-reporting',
  version: '0.0.1',
});

// Tool 1: 反向查询 - 通过客户名称查询负责团队
server.tool(
  'get_client_team_members',
  'Query team members responsible for a specific client. Returns all users in the pod assigned to the client.',
  {
    client_name: z.string().optional().describe('Client name to search for (fuzzy match, e.g., "Acme")'),
    client_id: z.number().optional().describe('Client ID to search for'),
  },
  async (args) => {
    try {
      if (!args.client_name && !args.client_id) {
        return {
          content: [{ type: 'text', text: 'Error: Please provide either client_name or client_id' }],
          isError: true
        };
      }

      const data = await getClientPodRelationships({
        name: args.client_name,
        id: args.client_id
      });

      const result = {
        client: {
          id: data.client.id,
          name: data.client.name,
          active: data.client.active
        },
        pod: data.pod,
        team_members: data.users.map((u: PodUser) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role
        }))
      };

      return {
        content: [{
          type: 'text',
          text: `# Team Members for "${data.client.name}"\n\nPod: ${data.pod.name}\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`
        }]
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true
      };
    }
  }
);

// Tool 2: 正向查询 - 通过用户名称查询负责的客户
server.tool(
  'get_user_pod_clients',
  'Query all clients managed by a specific user. Supports querying by user name, email, or ID.',
  {
    user_name: z.string().optional().describe('User name to search for (fuzzy match, e.g., "tony")'),
    user_email: z.string().optional().describe('User email to search for (e.g., "tony@example.com")'),
    user_id: z.number().optional().describe('User ID to search for'),
  },
  async (args) => {
    try {
      if (!args.user_name && !args.user_email && !args.user_id) {
        return {
          content: [{ type: 'text', text: 'Error: Please provide user_name, user_email, or user_id' }],
          isError: true
        };
      }

      const data = await getUserPodRelationships({
        name: args.user_name,
        email: args.user_email,
        id: args.user_id
      });

      const result = {
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role
        },
        pod: data.pod,
        clients: data.clients.map((c: PodClient) => ({
          id: c.id,
          name: c.name,
          active: c.active
        }))
      };

      const activeCount = data.clients.filter((c: PodClient) => c.active).length;

      return {
        content: [{
          type: 'text',
          text: `# Clients managed by ${data.user.name}\n\nPod: ${data.pod.name} | Role: ${data.user.role}\nTotal: ${data.clients.length} clients (${activeCount} active)\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`
        }]
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true
      };
    }
  }
);

// Tool 3: 获取用户的 Slack 消息历史
server.tool(
  'get_user_slack_history',
  'Search Slack messages sent by a specific user. Can optionally filter by keyword.',
  {
    user_name: z.string().describe('User name to search for (e.g., "Liwei", "Yi")'),
    query: z.string().optional().describe('Optional keyword to filter messages'),
    limit: z.number().optional().default(20).describe('Maximum number of messages to return (default: 20)'),
  },
  async (args) => {
    try {
      const messages = await searchSlackMessages(
        args.user_name,
        args.query,
        args.limit || 20
      );

      if (!messages || messages.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No Slack messages found for user: ${args.user_name}${args.query ? ` with query "${args.query}"` : ''}`
          }]
        };
      }

      const formatted = messages.map((m: SlackMessage) => ({
        channel: m.channel,
        text: m.text.substring(0, 200) + (m.text.length > 200 ? '...' : ''),
        timestamp: new Date(parseFloat(m.ts) * 1000).toISOString(),
        permalink: m.permalink
      }));

      return {
        content: [{
          type: 'text',
          text: `# Slack Messages from ${args.user_name}\n\nFound ${messages.length} messages${args.query ? ` matching "${args.query}"` : ''}\n\n\`\`\`json\n${JSON.stringify(formatted, null, 2)}\n\`\`\`\n`
        }]
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true
      };
    }
  }
);

// Tool 4: 获取 HubSpot Tickets（按时间段）
server.tool(
  'get_hubspot_tickets',
  'Query HubSpot tickets. Supports filtering by status and date range.',
  {
    status: z.string().optional().describe('Ticket status/pipeline stage to filter (e.g., "1" for new, "2" for waiting, "3" for closed)'),
    start_date: z.string().optional().describe('Start date filter in YYYY-MM-DD format'),
    end_date: z.string().optional().describe('End date filter in YYYY-MM-DD format'),
    limit: z.number().optional().default(50).describe('Maximum number of tickets to return (default: 50)'),
  },
  async (args) => {
    try {
      const tickets = await getHubSpotTickets({
        status: args.status,
        start_date: args.start_date,
        end_date: args.end_date,
        limit: args.limit
      });

      if (!tickets || tickets.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No HubSpot tickets found for the specified criteria'
          }]
        };
      }

      const formatted = tickets.map((t: HubSpotTicket) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority || 'N/A',
        created: t.createdAt,
        updated: t.updatedAt,
        created_by: t.createdBy || 'N/A'
      }));

      const dateRange = args.start_date || args.end_date 
        ? ` (${args.start_date || 'any'} to ${args.end_date || 'now'})`
        : '';

      return {
        content: [{
          type: 'text',
          text: `# HubSpot Tickets${dateRange}\n\nFound ${tickets.length} tickets\n\n\`\`\`json\n${JSON.stringify(formatted, null, 2)}\n\`\`\`\n`
        }]
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true
      };
    }
  }
);

// Tool 5: 获取单个 HubSpot Ticket 详情
server.tool(
  'get_hubspot_ticket_detail',
  'Get detailed content of a specific HubSpot ticket by ID.',
  {
    ticket_id: z.string().describe('HubSpot ticket ID (e.g., "37857387907")'),
  },
  async (args) => {
    try {
      const ticket = await getHubSpotTicketById(args.ticket_id);

      if (!ticket) {
        return {
          content: [{
            type: 'text',
            text: `Ticket not found: ${args.ticket_id}`
          }]
        };
      }

      const details = [
        `# Ticket: ${ticket.subject}`,
        '',
        `**ID:** ${ticket.id}`,
        `**Status:** ${ticket.status}`,
        `**Priority:** ${ticket.priority || 'N/A'}`,
        `**Priority (Advanced):** ${ticket.priorityAdvanced || 'N/A'}`,
        `**Due Date:** ${ticket.dueDate || 'N/A'}`,
        `**Ticket Owner:** ${ticket.ticketOwner || 'N/A'}`,
        `**Created By:** ${ticket.createdBy || 'N/A'}`,
        `**Created:** ${ticket.createdAt}`,
        `**Updated:** ${ticket.updatedAt}`,
        `**AO Request Type:** ${ticket.aoRequestType || 'N/A'}`,
        `**Partners Request Type:** ${ticket.partnersRequestType || 'N/A'}`,
        '',
        '## Ticket Description',
        '',
        ticket.content || 'No content'
      ].join('\n');

      return {
        content: [{
          type: 'text',
          text: details
        }]
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true
      };
    }
  }
);

// Tool 6: 根据用户名或 email 查询 HubSpot Tickets
server.tool(
  'get_hubspot_tickets_by_user',
  'Query HubSpot tickets by user name or email address. Returns tickets owned by the specified user.',
  {
    user_name: z.string().optional().describe('User name to search for (e.g., "John", "Yi")'),
    email: z.string().optional().describe('Email address to search for (e.g., "john@example.com")'),
    limit: z.number().optional().default(50).describe('Maximum number of tickets to return (default: 50)'),
  },
  async (args) => {
    try {
      if (!args.user_name && !args.email) {
        return {
          content: [{
            type: 'text',
            text: 'Error: Please provide either user_name or email to search'
          }],
          isError: true
        };
      }

      const tickets = await getHubSpotTicketsByUser({
        user_name: args.user_name,
        email: args.email,
        limit: args.limit
      });

      if (!tickets || tickets.length === 0) {
        const searchTerm = args.user_name || args.email;
        return {
          content: [{
            type: 'text',
            text: `No HubSpot tickets found for user: ${searchTerm}`
          }]
        };
      }

      const formatted = tickets.map((t: HubSpotTicket) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority || 'N/A',
        owner: t.ticketOwner || 'N/A',
        created: t.createdAt,
        updated: t.updatedAt
      }));

      const searchTerm = args.user_name || args.email;

      return {
        content: [{
          type: 'text',
          text: `# HubSpot Tickets for "${searchTerm}"\n\nFound ${tickets.length} tickets\n\n\`\`\`json\n${JSON.stringify(formatted, null, 2)}\n\`\`\`\n`
        }]
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('User Activity Reporting MCP Server running on stdio...');
}

main();
