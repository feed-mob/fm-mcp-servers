import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.FEEDMOB_API_BASE;
const API_KEY = process.env.FEEDMOB_KEY;
const API_SECRET = process.env.FEEDMOB_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error("Error: FEEDMOB_KEY and FEEDMOB_SECRET must be set.");
  process.exit(1);
}

function genToken(): string {
  const exp = new Date();
  exp.setDate(exp.getDate() + 7);
  return jwt.sign({ key: API_KEY, expired_at: exp.toISOString().split('T')[0] }, API_SECRET!, { algorithm: 'HS256' });
}

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  return url.toString();
}

async function apiGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const res = await fetch(buildUrl(path, params), {
    headers: {
      'Content-Type': 'application/json', 'Accept': 'application/json',
      'FEEDMOB-KEY': API_KEY!, 'FEEDMOB-TOKEN': genToken()
    },
    signal: AbortSignal.timeout(30000)
  });

  if (res.status === 401) throw new Error('Unauthorized: Invalid API Key or Token');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  const r = await res.json();
  if (r.status === 404) throw new Error(r.error || 'Not found');
  if (r.status === 400) throw new Error(r.error || 'Bad request');
  return r.data;
}

export type ValidRole = 'aa' | 'am' | 'ae' | 'pm' | 'pa' | 'ao';

export interface ClientContact {
  client_id: number;
  client_name: string;
  month?: string;
  pod?: string;
  aa?: string;
  am?: string;
  ae?: string;
  pm?: string;
  pa?: string;
  ao?: string;
}

export interface ListResult { month: string; total: number; clients: ClientContact[]; }
export interface PodResult { pod: string; month: string; count: number; client_names: string[]; }
export interface RoleResult { role: string; name: string; month: string; count: number; client_names: string[]; }
export interface NameResult { name: string; month: string; results: Record<string, string[]>; }

export async function getAllContacts(month?: string): Promise<ListResult> {
  return apiGet('/ai/api/client_contacts', month ? { month } : {});
}

export async function getContactByClient(name: string, month?: string): Promise<ClientContact> {
  const p: Record<string, string> = { client_name: name };
  if (month) p.month = month;
  return apiGet('/ai/api/client_contacts', p);
}

export async function getClientsByPod(pod: string, month?: string): Promise<PodResult> {
  const p: Record<string, string> = { pod };
  if (month) p.month = month;
  return apiGet('/ai/api/client_contacts', p);
}

export async function getClientsByRole(role: ValidRole, name: string, month?: string): Promise<RoleResult> {
  const p: Record<string, string> = { role, name };
  if (month) p.month = month;
  return apiGet('/ai/api/client_contacts', p);
}

export async function getClientsByName(name: string, month?: string): Promise<NameResult> {
  const p: Record<string, string> = { name };
  if (month) p.month = month;
  return apiGet('/ai/api/client_contacts', p);
}

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export interface SlackMsg { ts: string; text: string; user: string; channel: string; permalink?: string; }
export interface SlackUser { id: string; name: string; real_name: string; email?: string; }

async function slackGet(method: string, params: Record<string, string> = {}): Promise<any> {
  if (!SLACK_TOKEN) throw new Error('SLACK_BOT_TOKEN not set');
  const url = new URL(`https://slack.com/api/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const r = await (await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${SLACK_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  })).json();
  if (!r.ok) throw new Error(`Slack error: ${r.error}`);
  return r;
}

export async function findSlackUser(name: string): Promise<SlackUser | null> {
  const { members = [] } = await slackGet('users.list');
  const n = name.toLowerCase();
  const u = members.find((m: any) =>
    m.real_name?.toLowerCase().includes(n) || m.name?.toLowerCase().includes(n) || m.profile?.display_name?.toLowerCase().includes(n)
  );
  return u ? { id: u.id, name: u.name, real_name: u.real_name || u.name, email: u.profile?.email } : null;
}

export async function searchSlackMsgs(userName: string, query?: string, limit = 20): Promise<SlackMsg[]> {
  const user = await findSlackUser(userName);
  if (!user) throw new Error(`Slack user not found: ${userName}`);
  const q = query ? `from:${user.name} ${query}` : `from:${user.name}`;
  const { messages } = await slackGet('search.messages', { query: q, count: String(limit), sort: 'timestamp', sort_dir: 'desc' });
  return (messages?.matches || []).map((m: any) => ({
    ts: m.ts, text: m.text, user: m.username || user.name,
    channel: m.channel?.name || m.channel?.id || 'unknown', permalink: m.permalink
  }));
}

export interface Ticket {
  id: string; subject: string; content?: string; status: string;
  priority?: string; createdAt: string; updatedAt: string; owner?: string;
}

async function hsPost(endpoint: string, body: any): Promise<any> {
  if (!HUBSPOT_TOKEN) throw new Error('HUBSPOT_ACCESS_TOKEN not set');
  const res = await fetch(`https://api.hubapi.com${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HubSpot error: ${res.status} - ${await res.text()}`);
  return res.json();
}

async function hsGet(endpoint: string): Promise<any> {
  if (!HUBSPOT_TOKEN) throw new Error('HUBSPOT_ACCESS_TOKEN not set');
  const res = await fetch(`https://api.hubapi.com${endpoint}`, {
    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`HubSpot error: ${res.status} - ${await res.text()}`);
  return res.json();
}

function mapTicket(t: any): Ticket {
  const p = t.properties;
  return {
    id: t.id, subject: p.subject || 'No Subject', content: p.content,
    status: p.hs_pipeline_stage || 'unknown', priority: p.hs_ticket_priority,
    createdAt: p.createdate, updatedAt: p.hs_lastmodifieddate, owner: p.hubspot_owner_id
  };
}

export async function getTickets(opts: { status?: string; startDate?: string; endDate?: string; limit?: number } = {}): Promise<Ticket[]> {
  const filters: any[] = [];
  if (opts.startDate) filters.push({ propertyName: 'createdate', operator: 'GTE', value: new Date(opts.startDate).getTime() });
  if (opts.endDate) filters.push({ propertyName: 'createdate', operator: 'LTE', value: new Date(opts.endDate).getTime() });
  if (opts.status) filters.push({ propertyName: 'hs_pipeline_stage', operator: 'EQ', value: opts.status });

  const body: any = {
    properties: ['subject', 'content', 'hs_pipeline_stage', 'hs_ticket_priority', 'createdate', 'hs_lastmodifieddate'],
    limit: opts.limit || 50, sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }]
  };
  if (filters.length) body.filterGroups = [{ filters }];

  const { results = [] } = await hsPost('/crm/v3/objects/tickets/search', body);
  return results.map(mapTicket);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const props = 'subject,content,hs_pipeline_stage,hs_ticket_priority,createdate,hs_lastmodifieddate';
  const data = await hsGet(`/crm/v3/objects/tickets/${id}?properties=${props}`);
  return data ? mapTicket(data) : null;
}

export async function getTicketsByUser(opts: { userName?: string; email?: string; limit?: number }): Promise<Ticket[]> {
  const { results: owners = [] } = await hsGet('/crm/v3/owners');
  const term = (opts.userName || opts.email || '').toLowerCase();
  const matched = owners.filter((o: any) => {
    const fn = (o.firstName || '').toLowerCase(), ln = (o.lastName || '').toLowerCase();
    return fn.includes(term) || ln.includes(term) || `${fn} ${ln}`.includes(term) || (o.email || '').toLowerCase().includes(term);
  });
  if (!matched.length) return [];

  const body = {
    properties: ['subject', 'content', 'hs_pipeline_stage', 'hs_ticket_priority', 'createdate', 'hs_lastmodifieddate', 'hubspot_owner_id'],
    limit: opts.limit || 50, sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
    filterGroups: [{ filters: [{ propertyName: 'hubspot_owner_id', operator: 'IN', values: matched.map((o: any) => o.id) }] }]
  };
  const { results = [] } = await hsPost('/crm/v3/objects/tickets/search', body);
  const ownerMap = new Map(owners.map((o: any) => [o.id, `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email]));
  return results.map((t: any) => ({ ...mapTicket(t), owner: ownerMap.get(t.properties.hubspot_owner_id) }));
}
