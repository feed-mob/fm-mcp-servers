import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const IPLOCATE_API_BASE = process.env.IPLOCATE_API_BASE || "https://iplocate.feedmob.ai";
const IPLOCATE_API_KEY = process.env.IPLOCATE_API_KEY;

if (!IPLOCATE_API_KEY) {
  console.error("Error: IPLOCATE_API_KEY environment variable must be set.");
  process.exit(1);
}

// Helper function to create headers with Bearer token
function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${IPLOCATE_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// Single IP Lookup
export async function lookupIP(ip?: string): Promise<any> {
  const url = new URL(`${IPLOCATE_API_BASE}/api/v1/ip/lookup`);
  if (ip) {
    url.searchParams.append('ip', ip);
  }

  try {
    const response = await axios.get(url.toString(), {
      headers: getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error looking up IP:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('IPLocate API request failed: Unauthorized (Invalid API Key)');
      } else if (status === 422) {
        throw new Error('IPLocate API request failed: Invalid IP address format');
      } else {
        throw new Error(`IPLocate API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to lookup IP address');
  }
}

// Batch IP Lookup
export async function batchLookup(ips: string[]): Promise<any> {
  const url = `${IPLOCATE_API_BASE}/api/v1/ip/batch`;

  try {
    const response = await axios.post(url, { ips }, {
      headers: getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error in batch IP lookup:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('IPLocate API request failed: Unauthorized (Invalid API Key)');
      } else if (status === 400) {
        throw new Error('IPLocate API request failed: Bad Request (check IP array format or size)');
      } else {
        throw new Error(`IPLocate API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to perform batch IP lookup');
  }
}

// Single IP Fraud Check
export async function fraudCheck(ip?: string): Promise<any> {
  const url = new URL(`${IPLOCATE_API_BASE}/api/v1/ip/fraud_check`);
  if (ip) {
    url.searchParams.append('ip', ip);
  }

  try {
    const response = await axios.get(url.toString(), {
      headers: getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error checking IP fraud:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('IPLocate API request failed: Unauthorized (Invalid API Key)');
      } else if (status === 422) {
        throw new Error('IPLocate API request failed: Invalid IP address format');
      } else if (status === 429) {
        throw new Error('IPLocate API request failed: Quota insufficient or rate limit exceeded');
      } else {
        throw new Error(`IPLocate API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to check IP fraud');
  }
}

// Batch IP Fraud Check
export async function batchFraudCheck(ips: string[]): Promise<any> {
  const url = `${IPLOCATE_API_BASE}/api/v1/ip/batch_fraud_check`;

  try {
    const response = await axios.post(url, { ips }, {
      headers: getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error in batch IP fraud check:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('IPLocate API request failed: Unauthorized (Invalid API Key)');
      } else if (status === 400) {
        throw new Error('IPLocate API request failed: Bad Request (check IP array format or size)');
      } else if (status === 429) {
        throw new Error('IPLocate API request failed: Quota insufficient or rate limit exceeded');
      } else {
        throw new Error(`IPLocate API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to perform batch IP fraud check');
  }
}

// View Quota Usage
export async function getUsageStats(): Promise<any> {
  const url = `${IPLOCATE_API_BASE}/api/v1/ip/usage_stats`;

  try {
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error getting usage stats:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('IPLocate API request failed: Unauthorized (Invalid API Key)');
      } else {
        throw new Error(`IPLocate API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to get usage stats');
  }
}

// Refresh Quota Cache
export async function refreshQuota(): Promise<any> {
  const url = `${IPLOCATE_API_BASE}/api/v1/ip/refresh_quota`;

  try {
    const response = await axios.post(url, {}, {
      headers: getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error refreshing quota:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('IPLocate API request failed: Unauthorized (Invalid API Key)');
      } else {
        throw new Error(`IPLocate API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to refresh quota');
  }
}
