import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface KayzenConfig {
  userName: string;
  password: string;
  basicAuthToken: string;
  baseUrl: string;
}

interface AuthResponse {
  access_token: string;
}

export class KayzenClient {
  private baseUrl: string;
  private username?: string;
  private password?: string;
  private basicAuth?: string;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.baseUrl = process.env.KAYZEN_BASE_URL || 'https://api.kayzen.io/v1';
    this.username = process.env.KAYZEN_USERNAME;
    this.password = process.env.KAYZEN_PASSWORD;
    this.basicAuth = process.env.KAYZEN_BASIC_AUTH;
  }

  private async getAuthToken(): Promise<string> {
    if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.authToken;
    }

    if (!this.username || !this.password || !this.basicAuth) {
      throw new Error('Authentication credentials required for this operation');
    }

    const url = `${this.baseUrl}/authentication/token`;
    const payload = {
      grant_type: 'password',
      username: this.username,
      password: this.password
    };
    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Basic ${this.basicAuth}`
    };

    try {
      const response = await axios.post<AuthResponse>(url, payload, { headers });
      this.authToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + 25 * 60 * 1000);
      return this.authToken;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }

  private async makeRequest<T>(method: string, endpoint: string, params: Record<string, unknown> = {}) {
    const token = await this.getAuthToken();
    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params
    };

    try {
      const response = await axios<T>(config);
      return response.data;
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  async listReports() {
    if (!this.username || !this.password || !this.basicAuth) {
      throw new Error('Authentication credentials required for this operation');
    }
    return this.makeRequest('GET', '/reports');
  }

  async getReportResults(reportId: string, startDate?: string, endDate?: string) {
    if (!this.username || !this.password || !this.basicAuth) {
      throw new Error('Authentication credentials required for this operation');
    }
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    return this.makeRequest('GET', `/reports/${reportId}/report_results`, params);
  }
}
