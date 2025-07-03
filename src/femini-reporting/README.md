# Feedmob Femini MCP Server

## Features

- 🔍 **Flexible Data Querying**: Supports various grouping methods and filtering conditions
- 📊 **Rich Metrics**: Includes key metrics such as spend, revenue, conversion rate, etc.
- 📚 **Detailed Documentation**: Built-in user manual and query templates
- 🚀 **Easy Integration**: Based on the FastMCP framework, supports multiple transport methods

## Installation and Setup

Visit femini dash specified page to get mcp server json configuration

## Tools

### 1. query_campaign_spends
The primary tool for querying ad campaign data.

**Parameters:**
- `guide`: Required, user manual URI (`campaign-spends-api-guide://usage`)
- `date_gteq`: Start date (YYYY-MM-DD)
- `date_lteq`: End date (YYYY-MM-DD)
- `groups`: Array of grouping methods (day/week/month/client/partner/campaign/click_url/country)
- `metrics`: Array of metrics (gross/net/revenue/impressions/clicks/installs/cvr/margin)
- `legacy_client_id_in`: Client ID filter
- `legacy_partner_id_in`: Partner ID filter
- `legacy_campaign_id_in`: Campaign ID filter
- `legacy_click_url_id_in`: Click URL ID filter

### 2. search_ids
Retrieves client, partner, and campaign ID information based on keywords.

**Parameters:**
- `keys`: List of keywords (array of strings)

## Resources

### 1. CampaignSpendsApiQuery User Manual
URI: `campaign-spends-api-guide://usage`

Detailed API parameter descriptions and usage guide.

## Development and Debugging

### Local Development
```bash
# Start development server
npm run dev

# Test with MCP CLI
npx fastmcp dev src/index.ts

# Debug with MCP Inspector
npx fastmcp inspect src/index.ts
```

### Type Checking
```bash
npx tsc --noEmit
```
## License

MIT License

## Contributions

Welcome to submit Issues and Pull Requests to improve this project.
# feedmob_femini_mcp_server
