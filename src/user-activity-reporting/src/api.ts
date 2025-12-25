import dotenv from 'dotenv';

dotenv.config();

const FEMINI_API_BASE = process.env.FEMINI_API_BASE;
const FEMINI_BEARER_TOKEN = process.env.FEMINI_BEARER_TOKEN;

if (!FEMINI_BEARER_TOKEN) {
  console.error("Error: FEMINI_BEARER_TOKEN environment variable must be set.");
  process.exit(1);
}

// ============ User Pod Relationships API ============

export interface PodUser {
  id: number;
  name: string;
  email: string;
  role: string;
  pod_id: number;
}

export interface PodClient {
  id: number;
  legacy_id: number;
  name: string;
  active: boolean;
}

export interface Pod {
  id: number;
  name: string;
}

export interface UserQueryResult {
  user: PodUser;
  pod: Pod;
  clients: PodClient[];
}

export interface ClientQueryResult {
  client: PodClient;
  pod: Pod;
  users: PodUser[];
}

export interface UserQueryParams {
  id?: number;
  email?: string;
  name?: string;
}

export interface ClientQueryParams {
  id?: number;
  name?: string;
}

async function podRelationshipsApi(params: Record<string, string>): Promise<any> {
  const urlObj = new URL(`${FEMINI_API_BASE}/api/unstable/user_pod_relationships`);
  Object.entries(params).forEach(([k, v]) => urlObj.searchParams.append(k, v));

  const response = await fetch(urlObj.toString(), {
    headers: {
      'Authorization': `Bearer ${FEMINI_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getUserPodRelationships(params: UserQueryParams): Promise<UserQueryResult> {
  const queryParams: Record<string, string> = { type: 'user' };
  
  if (params.id) queryParams.id = String(params.id);
  if (params.email) queryParams.email = params.email;
  if (params.name) queryParams.name = params.name;

  return podRelationshipsApi(queryParams);
}

export async function getClientPodRelationships(params: ClientQueryParams): Promise<ClientQueryResult> {
  const queryParams: Record<string, string> = { type: 'client' };
  
  if (params.id) queryParams.id = String(params.id);
  if (params.name) queryParams.name = params.name;

  return podRelationshipsApi(queryParams);
}


// ============ Slack API ============

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// ============ HubSpot API ============

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export interface HubSpotTicket {
  id: string;
  subject: string;
  content?: string;
  status: string;
  priority?: string;
  priorityAdvanced?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  ticketOwner?: string;
  createdBy?: string;
  aoRequestType?: string;
  partnersRequestType?: string;
}

export interface HubSpotTicketsParams {
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

async function hubspotApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!HUBSPOT_ACCESS_TOKEN) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is not set');
  }

  const response = await fetch(`https://api.hubapi.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getHubSpotTickets(params: HubSpotTicketsParams): Promise<HubSpotTicket[]> {
  // Build search filters for date range
  const filters: any[] = [];

  if (params.start_date) {
    filters.push({
      propertyName: 'createdate',
      operator: 'GTE',
      value: new Date(params.start_date).getTime()
    });
  }

  if (params.end_date) {
    filters.push({
      propertyName: 'createdate',
      operator: 'LTE',
      value: new Date(params.end_date).getTime()
    });
  }

  if (params.status) {
    filters.push({
      propertyName: 'hs_pipeline_stage',
      operator: 'EQ',
      value: params.status
    });
  }

  const searchBody: any = {
    properties: ['subject', 'content', 'hs_pipeline_stage', 'hs_ticket_priority', 'createdate', 'hs_lastmodifieddate', 'hs_created_by_user_id'],
    limit: params.limit || 50,
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }]
  };

  if (filters.length > 0) {
    searchBody.filterGroups = [{ filters }];
  }

  const data = await hubspotApi('/crm/v3/objects/tickets/search', {
    method: 'POST',
    body: JSON.stringify(searchBody)
  });

  return (data.results || []).map((t: any) => ({
    id: t.id,
    subject: t.properties.subject || 'No Subject',
    content: t.properties.content,
    status: t.properties.hs_pipeline_stage || 'unknown',
    priority: t.properties.hs_ticket_priority,
    createdAt: t.properties.createdate,
    updatedAt: t.properties.hs_lastmodifieddate,
    createdBy: t.properties.hs_created_by_user_id
  }));
}

export interface HubSpotTicketsByUserParams {
  user_name?: string;
  email?: string;
  limit?: number;
}

export async function getHubSpotTicketsByUser(params: HubSpotTicketsByUserParams): Promise<HubSpotTicket[]> {
  // First, get all HubSpot owners to find matching user
  const ownersData = await hubspotApi('/crm/v3/owners');
  const owners = ownersData.results || [];
  
  const searchTerm = (params.user_name || params.email || '').toLowerCase();
  
  // Find matching owner(s) by name or email
  const matchingOwners = owners.filter((owner: any) => {
    const firstName = (owner.firstName || '').toLowerCase();
    const lastName = (owner.lastName || '').toLowerCase();
    const email = (owner.email || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    
    return firstName.includes(searchTerm) ||
           lastName.includes(searchTerm) ||
           fullName.includes(searchTerm) ||
           email.includes(searchTerm);
  });

  if (matchingOwners.length === 0) {
    return [];
  }

  // Search tickets owned by or created by these users
  const ownerIds = matchingOwners.map((o: any) => o.id);
  
  const searchBody: any = {
    properties: ['subject', 'content', 'hs_pipeline_stage', 'hs_ticket_priority', 'createdate', 'hs_lastmodifieddate', 'hs_created_by_user_id', 'hubspot_owner_id'],
    limit: params.limit || 50,
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
    filterGroups: [{
      filters: [{
        propertyName: 'hubspot_owner_id',
        operator: 'IN',
        values: ownerIds
      }]
    }]
  };

  const data = await hubspotApi('/crm/v3/objects/tickets/search', {
    method: 'POST',
    body: JSON.stringify(searchBody)
  });

  // Map owner IDs to names for display
  const ownerMap = new Map(owners.map((o: any) => [o.id, `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email]));

  return (data.results || []).map((t: any) => ({
    id: t.id,
    subject: t.properties.subject || 'No Subject',
    content: t.properties.content,
    status: t.properties.hs_pipeline_stage || 'unknown',
    priority: t.properties.hs_ticket_priority,
    createdAt: t.properties.createdate,
    updatedAt: t.properties.hs_lastmodifieddate,
    createdBy: t.properties.hs_created_by_user_id,
    ticketOwner: ownerMap.get(t.properties.hubspot_owner_id) || t.properties.hubspot_owner_id
  }));
}

export async function getHubSpotTicketById(ticketId: string): Promise<HubSpotTicket | null> {
  const properties = [
    'subject', 'content', 'hs_pipeline_stage', 'hs_ticket_priority',
    'createdate', 'hs_lastmodifieddate', 'hs_created_by_user_id',
    'hubspot_owner_id', 'hs_ticket_priority_advanced', 'hs_due_date',
    'ao_request_type', 'partners_request_type'
  ].join(',');
  
  const data = await hubspotApi(`/crm/v3/objects/tickets/${ticketId}?properties=${properties}`);
  
  if (!data) return null;

  return {
    id: data.id,
    subject: data.properties.subject || 'No Subject',
    content: data.properties.content,
    status: data.properties.hs_pipeline_stage || 'unknown',
    priority: data.properties.hs_ticket_priority,
    priorityAdvanced: data.properties.hs_ticket_priority_advanced,
    createdAt: data.properties.createdate,
    updatedAt: data.properties.hs_lastmodifieddate,
    dueDate: data.properties.hs_due_date,
    ticketOwner: data.properties.hubspot_owner_id,
    createdBy: data.properties.hs_created_by_user_id,
    aoRequestType: data.properties.ao_request_type,
    partnersRequestType: data.properties.partners_request_type
  };
}

export interface SlackMessage {
  ts: string;
  text: string;
  user: string;
  channel: string;
  permalink?: string;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
}

async function slackApi(method: string, params: Record<string, string> = {}): Promise<any> {
  if (!SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN environment variable is not set');
  }

  const url = new URL(`https://slack.com/api/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  return data;
}

export async function findSlackUserByName(name: string): Promise<SlackUser | null> {
  const data = await slackApi('users.list');
  const users = data.members || [];
  
  const lowerName = name.toLowerCase();
  const user = users.find((u: any) => 
    u.real_name?.toLowerCase().includes(lowerName) ||
    u.name?.toLowerCase().includes(lowerName) ||
    u.profile?.display_name?.toLowerCase().includes(lowerName)
  );

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    real_name: user.real_name || user.name,
    email: user.profile?.email
  };
}

export async function searchSlackMessages(
  userName: string,
  query?: string,
  limit: number = 20
): Promise<SlackMessage[]> {
  // First find the user
  const user = await findSlackUserByName(userName);
  if (!user) {
    throw new Error(`Slack user not found: ${userName}`);
  }

  // Search messages from this user
  const searchQuery = query 
    ? `from:${user.name} ${query}`
    : `from:${user.name}`;

  const data = await slackApi('search.messages', {
    query: searchQuery,
    count: String(limit),
    sort: 'timestamp',
    sort_dir: 'desc'
  });

  const matches = data.messages?.matches || [];
  return matches.map((m: any) => ({
    ts: m.ts,
    text: m.text,
    user: m.username || user.name,
    channel: m.channel?.name || m.channel?.id || 'unknown',
    permalink: m.permalink
  }));
}
