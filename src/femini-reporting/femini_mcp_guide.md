# Femini Postgres Database Guide

This guide documents the Femini Postgres database schema and provides example queries for accessing campaign spend data via MCP (Model Context Protocol).

## MCP Server Configuration

The Femini Postgres database is accessible via an MCP server with the following configuration:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres",
    "postgres://mcp_read:gL%218iujL%29l2kKrY9Hn%24kjIow@pg-femini-for-mcp.cgb5t3jqdx7r.us-east-1.rds.amazonaws.com/femini"
  ]
}
```

## Database Schema

### Main Tables

#### campaign_spends
The primary table containing campaign spend data.

| Column | Data Type | Description |
|--------|-----------|-------------|
| id | bigint | Primary key |
| date | date | Date of the spend |
| spend | numeric | Amount spent |
| click_url_id | bigint | Reference to click_urls table |
| partner_id | bigint | Reference to partners table |
| client_id | bigint | Reference to clients table |
| spend_type | character varying | Type of spend (client or partner) |
| calculation_source | character varying | Source of calculation (imported or event_aggregate) |
| calculation_metadata | json | Additional metadata in JSON format |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

#### campaigns
Contains information about marketing campaigns.

| Column | Data Type | Description |
|--------|-----------|-------------|
| id | bigint | Primary key |
| client_id | bigint | Reference to clients table |
| name | character varying | Campaign name |
| status | character varying | Campaign status |
| country_code | character varying | Country code for the campaign |
| mobile_app_id | bigint | Reference to mobile_apps table |
| legacy_id | bigint | Legacy ID reference |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

#### clients
Contains information about clients.

| Column | Data Type | Description |
|--------|-----------|-------------|
| id | bigint | Primary key |
| name | character varying | Client name |
| website | character varying | Client website |
| is_test | boolean | Whether this is a test client |
| legacy_id | bigint | Legacy ID reference |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

#### partners
Contains information about partners.

| Column | Data Type | Description |
|--------|-----------|-------------|
| id | bigint | Primary key |
| name | character varying | Partner name |
| email | character varying | Partner email |
| website | character varying | Partner website |
| description | text | Partner description |
| status | character varying | Partner status |
| is_test | boolean | Whether this is a test partner |
| legacy_id | bigint | Legacy ID reference |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

#### click_urls
Contains information about click URLs.

| Column | Data Type | Description |
|--------|-----------|-------------|
| id | bigint | Primary key |
| campaign_id | bigint | Reference to campaigns table |
| partner_id | bigint | Reference to partners table |
| track_party_id | bigint | Reference to track_parties table |
| status | character varying | Click URL status |
| link_type | character varying | Type of link |
| external_track_party_campaign_id | character varying | External track party campaign ID |
| external_partner_campaign_id | character varying | External partner campaign ID |
| legacy_id | bigint | Legacy ID reference |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

### Relationships

- `campaign_spends.client_id` → `clients.id`
- `campaign_spends.partner_id` → `partners.id`
- `campaign_spends.click_url_id` → `click_urls.id`
- `click_urls.campaign_id` → `campaigns.id`
- `click_urls.partner_id` → `partners.id`
- `campaigns.client_id` → `clients.id`

## Example Queries

### 1. List All Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. Explore Table Structure

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaign_spends' 
ORDER BY ordinal_position;
```

### 3. Basic Campaign Spend Data

```sql
SELECT cs.id, cs.date, cs.spend, cs.spend_type, 
       c.name as client_name, p.name as partner_name 
FROM campaign_spends cs
JOIN clients c ON cs.client_id = c.id
JOIN partners p ON cs.partner_id = p.id
ORDER BY cs.date DESC
LIMIT 10;
```

### 4. Campaign Spend with Campaign Information

```sql
SELECT cs.id, cs.date, cs.spend, cs.spend_type, 
       c.name as client_name, p.name as partner_name,
       cam.name as campaign_name, cam.country_code
FROM campaign_spends cs
JOIN clients c ON cs.client_id = c.id
JOIN partners p ON cs.partner_id = p.id
LEFT JOIN click_urls cu ON cs.click_url_id = cu.id
LEFT JOIN campaigns cam ON cu.campaign_id = cam.id
ORDER BY cs.date DESC
LIMIT 10;
```

### 5. Aggregate Spend by Client and Partner

```sql
SELECT c.name as client_name, p.name as partner_name, 
       cs.spend_type, SUM(cs.spend) as total_spend 
FROM campaign_spends cs
JOIN clients c ON cs.client_id = c.id
JOIN partners p ON cs.partner_id = p.id
WHERE cs.date >= '2025-04-01' AND cs.date <= '2025-04-30'
GROUP BY c.name, p.name, cs.spend_type
ORDER BY total_spend DESC
LIMIT 20;
```

### 6. Daily Spend Trends

```sql
SELECT date, SUM(spend) as total_spend, COUNT(*) as transaction_count 
FROM campaign_spends 
WHERE date >= '2025-04-01' AND date <= '2025-04-30'
GROUP BY date 
ORDER BY date;
```

### 7. Spend by Country

```sql
SELECT cam.country_code, SUM(cs.spend) as total_spend 
FROM campaign_spends cs
JOIN click_urls cu ON cs.click_url_id = cu.id
JOIN campaigns cam ON cu.campaign_id = cam.id
WHERE cs.date >= '2025-04-01' AND cs.date <= '2025-04-30'
GROUP BY cam.country_code
ORDER BY total_spend DESC;
```

### 8. Spend by Type

```sql
SELECT spend_type, SUM(spend) as total_spend 
FROM campaign_spends 
WHERE date >= '2025-04-01' AND date <= '2025-04-30'
GROUP BY spend_type 
ORDER BY total_spend DESC;
```

### 9. Spend by Calculation Source

```sql
SELECT calculation_source, COUNT(*) as count, SUM(spend) as total_spend 
FROM campaign_spends 
WHERE date >= '2025-04-01' AND date <= '2025-04-30'
GROUP BY calculation_source 
ORDER BY total_spend DESC;
```

## Using MCP to Query the Database

To query the Femini Postgres database using MCP in code:

```javascript
<use_mcp_tool>
<server_name>postgres</server_name>
<tool_name>query</tool_name>
<arguments>
{
  "sql": "YOUR SQL QUERY HERE"
}
</arguments>
</use_mcp_tool>
```

## Query Optimization Tips

1. **Use specific date ranges** to limit the amount of data processed
2. **Include appropriate JOINs** only when needed
3. **Use aggregation** (GROUP BY) for summary data
4. **Limit results** when retrieving large datasets
5. **Order results** only when necessary
6. **Select only needed columns** instead of using SELECT *

## Common Analysis Tasks

1. **Monthly spend analysis**: Filter by date range and group by client, partner, or campaign
2. **Geographic performance**: Group by country_code to analyze regional performance
3. **Client/Partner comparison**: Compare spend and performance across different clients or partners
4. **Trend analysis**: Group by date to analyze spend trends over time
5. **Spend type analysis**: Compare client vs. partner spend
