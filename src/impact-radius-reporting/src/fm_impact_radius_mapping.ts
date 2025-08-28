import axios from "axios";
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

// TypeScript interfaces for API response structure
export interface ImpactCampaignMapping {
  id: number;
  impact_brand: string;
  impact_ad: string;
  impact_event_type: string;
  click_url_id: number;
  vendor_name: string | null;
  campaign_name: string | null;
  client_name: string | null;
}

export interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
}

export interface ImpactCampaignMappingResponse {
  status: number;
  data: ImpactCampaignMapping[];
  pagination: PaginationInfo;
}

export interface ImpactCampaignMappingErrorResponse {
  status: number;
  error: string;
  message: string;
}

export interface FetchImpactRadiusCampaignMappingParams {
  click_url_id?: number;
  impact_brand?: string;
  impact_ad?: string;
  impact_event_type?: string;
  page?: number;
  per_page?: number;
}

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
export async function fetchImpactRaidusCampaignMapping(
  params: FetchImpactRadiusCampaignMappingParams
): Promise<ImpactCampaignMappingResponse> {
  const urlObj = new URL(`${FEEDMOB_API_BASE}/ai/api/impact_campaign_mappings`);

  // Add filtering parameters if provided
  if (params.click_url_id !== undefined) {
    urlObj.searchParams.set('click_url_id', params.click_url_id.toString());
  }
  if (params.impact_brand) {
    urlObj.searchParams.set('impact_brand', params.impact_brand);
  }
  if (params.impact_ad) {
    urlObj.searchParams.set('impact_ad', params.impact_ad);
  }
  if (params.impact_event_type) {
    urlObj.searchParams.set('impact_event_type', params.impact_event_type);
  }

  // Add pagination parameters if provided
  if (params.page !== undefined) {
    urlObj.searchParams.set('page', params.page.toString());
  }
  if (params.per_page !== undefined) {
    urlObj.searchParams.set('per_page', params.per_page.toString());
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
    return response.data as ImpactCampaignMappingResponse;
  } catch (error: unknown) {
    console.error("Error fetching impact campaign mappings from FeedMob API:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, any>;
      const status = err.response?.status;
      const errorData = err.response?.data as ImpactCampaignMappingErrorResponse;

      if (status === 401) {
        throw new Error('FeedMob API request failed: Unauthorized (Invalid API Key or Token)');
      } else if (status === 400) {
        throw new Error('FeedMob API request failed: Bad Request');
      } else if (status === 404) {
        throw new Error('FeedMob API request failed: Not Found');
      } else if (status === 500 && errorData) {
        throw new Error(`FeedMob API request failed: ${errorData.error} - ${errorData.message}`);
      } else {
        throw new Error(`FeedMob API request failed: ${status || 'Unknown error'}`);
      }
    }
    throw new Error('Failed to fetch impact campaign mappings from FeedMob API');
  }
}
