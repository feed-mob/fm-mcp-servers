# IPLocate MCP Server

MCP Server for the IPLocate API, providing IP geolocation and fraud detection capabilities through Claude and other MCP-compatible clients.

## Features

This MCP server provides access to the following IPLocate API capabilities:

### GeoIP Geolocation
- **Single IP Lookup**: Get geographic location for a single IP address
- **Batch Lookup**: Query up to 100 IP addresses at once

### IP Reputation Check
- **Single Fraud Check**: Check reputation and risk level of an IP address
- **Batch Fraud Check**: Check up to 50 IP addresses at once
- **Usage Stats**: View API quota usage and remaining credits
- **Refresh Quota**: Force refresh quota cache for latest information

## Installation

### From NPM (once published)
```bash
npm install -g @feedmob/iplocate
```

### From Source
```bash
cd src/iplocate
npm install
npm run build
```

## Configuration

Set the following environment variables:

```bash
# Required
IPLOCATE_API_KEY=your_api_key_here

# Optional (defaults to https://iplocate.feedmob.ai)
IPLOCATE_API_BASE=https://iplocate.feedmob.ai
```

### Using with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iplocate": {
      "command": "npx",
      "args": ["-y", "@feedmob/iplocate"],
      "env": {
        "IPLOCATE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Or if using from source:

```json
{
  "mcpServers": {
    "iplocate": {
      "command": "node",
      "args": ["/absolute/path/to/fm-mcp-servers/src/iplocate/dist/index.js"],
      "env": {
        "IPLOCATE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

### lookup_ip
Get geographic location information for a single IP address.

**Parameters:**
- `ip` (optional): IP address to lookup. If not provided, uses requester's IP

**Example:**
```
lookup_ip with ip="8.8.8.8"
```

### batch_lookup
Get geographic location information for multiple IP addresses at once.

**Parameters:**
- `ips` (required): Array of IP addresses to lookup (max 100)

**Example:**
```
batch_lookup with ips=["8.8.8.8", "1.1.1.1", "208.67.222.222"]
```

### fraud_check
Check the reputation and fraud risk level of a single IP address.

**Parameters:**
- `ip` (optional): IP address to check. If not provided, uses requester's IP

**Returns:**
- Fraud score (0-100, higher = more risky)
- Proxy/VPN/Tor detection
- ISP and organization info
- Abuse indicators
- Connection type
- Risk assessment interpretation

**Example:**
```
fraud_check with ip="8.8.8.8"
```

### batch_fraud_check
Check reputation and fraud risk for multiple IP addresses at once.

**Parameters:**
- `ips` (required): Array of IP addresses to check (max 50)

**Example:**
```
batch_fraud_check with ips=["8.8.8.8", "1.1.1.1", "9.9.9.9"]
```

### get_usage_stats
View current IPQualityScore API quota usage.

**Parameters:** None

**Returns:**
- Total credits
- Remaining credits
- Usage percentage
- Reset date
- Below threshold status

**Example:**
```
get_usage_stats
```

### refresh_quota
Force refresh the quota cache to get the latest quota information.

**Parameters:** None

**Example:**
```
refresh_quota
```

## Fraud Score Interpretation

| Score Range | Risk Level | Recommendation |
|-------------|------------|----------------|
| 0-24 | Low Risk | Safe, allow |
| 25-49 | Medium-Low Risk | Generally safe, additional verification recommended |
| 50-74 | Medium-High Risk | Manual review required |
| 75-89 | High Risk | Recommend blocking |
| 90-100 | Very High Risk | Strongly recommend blocking |

## Rate Limits and Quotas

- **GeoIP Lookup**: Maximum 100 IPs per batch request, no rate limiting
- **Fraud Check**: Maximum 50 IPs per batch request, subject to quota limits
- **Quota Protection**: System automatically blocks new fraud check requests when remaining quota < 20%
- **Cache**:
  - GeoIP lookups: No cache (real-time)
  - Fraud checks: 24-hour cache
  - Quota status: 5-minute cache

## API Documentation

Full API documentation is available at:
`/Users/mandywang/work/iplocate-api/API_DOCUMENTATION.md`

## Support

For issues or questions:
- GitHub Issues: https://github.com/feed-mob/fm-mcp-servers/issues

## License

MIT
