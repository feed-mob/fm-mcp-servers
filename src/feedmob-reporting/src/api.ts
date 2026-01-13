import axios from "axios";
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

const FEEDMOB_API_BASE = process.env.FEEDMOB_API_BASE;
const FEEDMOB_KEY = process.env.FEEDMOB_KEY;
const FEEDMOB_SECRET = process.env.FEEDMOB_SECRET;

if (!FEEDMOB_KEY || !FEEDMOB_SECRET) {
  console.error("Error: FEEDMOB_KEY and FEEDMOB_SECRET environment variables must be set.");
  process.exit(1);
}

// Generate JWT token
function generateToken(key: string, secret: string): string {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now

  const payload = {
    key: key,
    expired_at: expirationDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
  };

  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

// Helper Function for API Call
export async function fetchDirectSpendsData(
  start_date: string,
  end_date: string,
  click_url_ids: string[]
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/direct_spends`);

  // Add query parameters
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);
  click_url_ids.forEach(id => {
    urlObj.searchParams.append('click_url_ids[]', id);
  });

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching direct spends data from FeedMob API:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch direct spends data from FeedMob API');
  }
}

export async function getAgencyConversionMetrics(
  click_url_ids: number[],
  date?: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/agency_conversion_metrics`);
  click_url_ids.forEach((id) => urlObj.searchParams.append('click_url_ids[]', String(id)));
  if (date) {
    urlObj.searchParams.append('date', date);
  }

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token,
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching agency conversion metrics:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch agency conversion metrics');
  }
}

export async function getClickUrlHistories(
  click_url_ids: number[],
  date?: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/click_url_histories`);
  click_url_ids.forEach((id) => urlObj.searchParams.append('click_url_ids[]', String(id)));
  if (date) {
    urlObj.searchParams.append('date', date);
  }

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token,
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching click URL histories:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch click URL histories');
  }
}

export async function getInmobiReportIds(
  start_date: string,
  end_date: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/inmobi_api_reports/get_inmobi_report_ids`);
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching Inmobi report IDs:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch Inmobi report IDs');
  }
}

export async function checkInmobiReportStatus(
  start_date: string,
  end_date: string,
  report_id: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/inmobi_api_reports/check_inmobi_report_id_status`);
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);
  urlObj.searchParams.append('report_id', report_id);

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error checking Inmobi report status:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to check Inmobi report status');
  }
}

export async function createDirectSpend(
  click_url_id: number,
  spend_date: string,
  net_spend?: number,
  gross_spend?: number,
  partner_paid_action_count?: number,
  client_paid_action_count?: number
): Promise<any> {
  // Validate at least one spend metric is provided
  if (!net_spend && !gross_spend && !partner_paid_action_count && !client_paid_action_count) {
    throw new Error('必须提供至少一个支出指标：net_spend, gross_spend, partner_paid_action_count 或 client_paid_action_count');
  }

  const url = `${FEEDMOB_API_BASE}/ai/api/direct_spends`;

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.post(url, {
      click_url_id,
      spend_date,
      net_spend,
      gross_spend,
      partner_paid_action_count,
      client_paid_action_count
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error creating direct spend:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to create direct spend');
  }
}

export async function getInmobiReports(
  start_date: string,
  end_date: string,
  skan_report_id: string,
  non_skan_report_id: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/inmobi_api_reports`);
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);
  urlObj.searchParams.append('skan_report_id', skan_report_id);
  urlObj.searchParams.append('non_skan_report_id', non_skan_report_id);

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching Inmobi reports:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch Inmobi reports');
  }
}

export async function getAppsflyerReports(
  start_date: string,
  end_date: string,
  click_url_ids?: string[],
  af_app_ids?: string[]
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/appsflyer_reports`);

  // Add required parameters
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);

  // Add optional parameters
  if (click_url_ids && click_url_ids.length > 0) {
    click_url_ids.forEach(id => {
      urlObj.searchParams.append('click_url_ids[]', id);
    });
  }

  if (af_app_ids && af_app_ids.length > 0) {
    af_app_ids.forEach(id => {
      urlObj.searchParams.append('af_app_ids[]', id);
    });
  }

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching AppsFlyer reports:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch AppsFlyer reports');
  }
}

export async function getAdopsReports(
  month: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/adops_reports`);

  // Add month parameter
  urlObj.searchParams.append('month', month);

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching AdOps reports:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch AdOps reports');
  }
}

export async function getPossibleFinanceSingularReports(
  start_date: string,
  end_date: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/possible_finance_singular_api_reports`);

  // Add required parameters
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching Possible Finance Singular reports:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch Possible Finance Singular reports');
  }
}

export async function getUserInfos(): Promise<any> {
  const url = `${FEEDMOB_API_BASE}/ai/api/user_infos`;

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching user_infos:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch user_infos');
  }
}

export async function searchUserInfos(username: string): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/user_infos/search`);
  urlObj.searchParams.append('username', username);
  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error searching user_infos:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to search user_infos');
  }
}

export async function getDirectSpendRequests(
  feedmob_user_id?: number,
  client_id?: number,
  vendor_id?: number,
  click_url_id?: number,
  start_date?: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/direct_spend_requests`);

  // Add query parameters if provided
  if (feedmob_user_id !== undefined) {
    urlObj.searchParams.append('feedmob_user_id', String(feedmob_user_id));
  }
  if (client_id !== undefined) {
    urlObj.searchParams.append('client_id', String(client_id));
  }
  if (vendor_id !== undefined) {
    urlObj.searchParams.append('vendor_id', String(vendor_id));
  }
  if (click_url_id !== undefined) {
    urlObj.searchParams.append('click_url_id', String(click_url_id));
  }
  if (start_date !== undefined) {
    urlObj.searchParams.append('start_date', start_date);
  }

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching direct spend requests:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch direct spend requests');
  }
}

export async function getHubspotTickets(
  hubspot_user_id?: number,
  createdate_start?: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/hubspot_tickets`);

  // Add query parameters if provided
  if (hubspot_user_id !== undefined) {
    urlObj.searchParams.append('hubspot_user_id', String(hubspot_user_id));
  }
  if (createdate_start !== undefined) {
    urlObj.searchParams.append('createdate_start', createdate_start);
  }

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching HubSpot tickets:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch HubSpot tickets');
  }
}

export async function getPrivacyHawkSingularReports(
  start_date: string,
  end_date: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/privacy_hawk_singular_api_reports`);

  // Add required parameters
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching Privacy Hawk Singular reports:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch Privacy Hawk Singular reports');
  }
}

export async function getTextnowAdjustReports(
  start_date: string,
  end_date: string
): Promise<any> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/textnow_adjust_reports`);

  // Add required parameters
  urlObj.searchParams.append('start_date', start_date);
  urlObj.searchParams.append('end_date', end_date);

  const url = urlObj.toString();

  try {
    const token = generateToken(FEEDMOB_KEY as string, FEEDMOB_SECRET as string);
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FEEDMOB-KEY': FEEDMOB_KEY,
        'FEEDMOB-TOKEN': token
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching TextNow Adjust reports:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch TextNow Adjust reports');
  }
}
