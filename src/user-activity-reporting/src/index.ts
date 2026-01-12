#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import * as api from './api.js';

dotenv.config();

const server = new McpServer({ name: 'user-activity-reporting', version: '0.0.4' });

const errMsg = (e: unknown) => e instanceof Error ? e.message : 'Unknown error';
const errResp = (msg: string) => ({ content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true });
const textResp = (text: string) => ({ content: [{ type: 'text' as const, text }] });

server.tool('get_all_client_contacts', 'Query all client contacts with team members (POD, AA, AM, AE, PM, PA, AO).', {
  month: z.string().optional().describe('Month in YYYY-MM format'),
}, async (args) => {
  try {
    const d = await api.getAllContacts(args.month);
    const preview = d.clients.slice(0, 20);
    const more = d.total > 20 ? `\n... and ${d.total - 20} more` : '';
    return textResp(`# All Client Contacts\n\nMonth: ${d.month} | Total: ${d.total}\n\n\`\`\`json\n${JSON.stringify(preview, null, 2)}\n\`\`\`${more}`);
  } catch (e) { return errResp(errMsg(e)); }
});

server.tool('get_client_team_members', 'Query team members for a client. Returns POD, AA, AM, AE, PM, PA, AO.', {
  client_name: z.string().describe('Client name (fuzzy match)'),
  month: z.string().optional().describe('Month in YYYY-MM format'),
}, async (args) => {
  try {
    const d = await api.getContactByClient(args.client_name, args.month);
    const team = { POD: d.pod || 'N/A', AA: d.aa || 'N/A', AM: d.am || 'N/A', AE: d.ae || 'N/A', PM: d.pm || 'N/A', PA: d.pa || 'N/A', AO: d.ao || 'N/A' };
    return textResp(`# Team for "${d.client_name}"\n\n\`\`\`json\n${JSON.stringify({ client_id: d.client_id, client_name: d.client_name, month: d.month, team }, null, 2)}\n\`\`\``);
  } catch (e) { return errResp(errMsg(e)); }
});

server.tool('get_clients_by_pod', 'Query clients in a POD team (AllyPod/KeyPod/Seapod). Returns full client info with all team members.', {
  pod: z.string().describe('POD name (AllyPod/KeyPod/Seapod)'),
  month: z.string().optional().describe('Month in YYYY-MM format'),
}, async (args) => {
  try {
    const d = await api.getClientsByPod(args.pod, args.month);
    const clients = d.clients || [];
    const total = d.total || clients.length;
    if (total === 0 && d.note) {
      return textResp(`# Clients in POD: ${d.pod}\n\nRequested month: ${d.requested_month}\n\n${d.note}`);
    }
    if (total === 0) {
      return textResp(`# Clients in POD: ${d.pod}\n\nNo clients found for month: ${d.month || args.month || 'latest'}`);
    }
    const preview = clients.slice(0, 15);
    const more = total > 15 ? `\n... and ${total - 15} more clients` : '';
    return textResp(`# Clients in POD: ${d.pod}\n\nMonth: ${d.month} | Total: ${total}\n\n\`\`\`json\n${JSON.stringify(preview, null, 2)}\n\`\`\`${more}`);
  } catch (e) { return errResp(errMsg(e)); }
});

server.tool('get_clients_by_name', 'Query clients managed by a person. Can filter by role.', {
  name: z.string().describe('Person name'),
  role: z.enum(['aa', 'am', 'ae', 'pm', 'pa', 'ao']).optional().describe('Role filter'),
  month: z.string().optional().describe('Month in YYYY-MM format'),
}, async (args) => {
  try {
    if (args.role) {
      const d = await api.getClientsByRole(args.role, args.name, args.month);
      return textResp(`# Clients for ${d.role.toUpperCase()}: ${d.name}\n\nMonth: ${d.month} | Count: ${d.count}\n\n${d.client_names.map(c => `- ${c}`).join('\n')}`);
    }
    const d = await api.getClientsByName(args.name, args.month);
    const lines = Object.entries(d.results).map(([r, cs]) => `**${r}:** ${cs.join(', ')}`);
    return textResp(`# Clients for "${d.name}"\n\nMonth: ${d.month}\n\n${lines.join('\n') || 'No clients found'}`);
  } catch (e) { return errResp(errMsg(e)); }
});

server.tool('get_user_slack_history', 'Search Slack messages from a user.', {
  user_name: z.string().describe('User name'),
  query: z.string().optional().describe('Keyword filter'),
  limit: z.number().optional().default(20).describe('Max results'),
}, async (args) => {
  try {
    const msgs = await api.searchSlackMsgs(args.user_name, args.query, args.limit || 20);
    if (!msgs.length) return textResp(`No Slack messages found for: ${args.user_name}`);
    const fmt = msgs.map(m => ({ channel: m.channel, text: m.text.slice(0, 200) + (m.text.length > 200 ? '...' : ''), ts: new Date(parseFloat(m.ts) * 1000).toISOString(), link: m.permalink }));
    return textResp(`# Slack Messages from ${args.user_name}\n\nFound ${msgs.length}\n\n\`\`\`json\n${JSON.stringify(fmt, null, 2)}\n\`\`\``);
  } catch (e) { return errResp(errMsg(e)); }
});

server.tool('get_hubspot_tickets', 'Query HubSpot tickets.', {
  status: z.string().optional().describe('Status filter'),
  start_date: z.string().optional().describe('Start date YYYY-MM-DD'),
  end_date: z.string().optional().describe('End date YYYY-MM-DD'),
  limit: z.number().optional().default(50).describe('Max results'),
}, async (args) => {
  try {
    const tickets = await api.getTickets({ status: args.status, startDate: args.start_date, endDate: args.end_date, limit: args.limit });
    if (!tickets.length) return textResp('No HubSpot tickets found');
    const fmt = tickets.map(t => ({ id: t.id, subject: t.subject, status: t.status, priority: t.priority || 'N/A', created: t.createdAt }));
    return textResp(`# HubSpot Tickets\n\nFound ${tickets.length}\n\n\`\`\`json\n${JSON.stringify(fmt, null, 2)}\n\`\`\``);
  } catch (e) { return errResp(errMsg(e)); }
});

server.tool('get_hubspot_ticket_detail', 'Get HubSpot ticket details.', {
  ticket_id: z.string().describe('Ticket ID'),
}, async (args) => {
  try {
    const t = await api.getTicketById(args.ticket_id);
    if (!t) return textResp(`Ticket not found: ${args.ticket_id}`);
    return textResp(`# ${t.subject}\n\n**ID:** ${t.id}\n**Status:** ${t.status}\n**Priority:** ${t.priority || 'N/A'}\n**Created:** ${t.createdAt}\n\n## Description\n\n${t.content || 'No content'}`);
  } catch (e) { return errResp(errMsg(e)); }
});

server.tool('get_hubspot_tickets_by_user', 'Query HubSpot tickets by user.', {
  user_name: z.string().optional().describe('User name'),
  email: z.string().optional().describe('Email'),
  limit: z.number().optional().default(50).describe('Max results'),
}, async (args) => {
  try {
    if (!args.user_name && !args.email) return errResp('Provide user_name or email');
    const tickets = await api.getTicketsByUser({ userName: args.user_name, email: args.email, limit: args.limit });
    if (!tickets.length) return textResp(`No tickets found for: ${args.user_name || args.email}`);
    const fmt = tickets.map(t => ({ id: t.id, subject: t.subject, status: t.status, created: t.createdAt }));
    return textResp(`# Tickets for "${args.user_name || args.email}"\n\nFound ${tickets.length}\n\n\`\`\`json\n${JSON.stringify(fmt, null, 2)}\n\`\`\``);
  } catch (e) { return errResp(errMsg(e)); }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('User Activity Reporting MCP Server running...');
}

main();
