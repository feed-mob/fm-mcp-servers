import fetch from "node-fetch";

import { SensorTowerApiError } from "./errors.js";
import { RateLimiter } from "./rateLimiter.js";
import type { ApiUsageSummary } from "./types.js";
import { UsageBudget } from "./usageBudget.js";

interface SensorTowerHttpClientOptions {
  baseUrl: string;
  authToken: string;
  requestsPerSecond: number;
  defaultMonthlyLimit: number;
  warnThresholdRatio: number;
  blockThresholdRatio: number;
  maxRetries: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class SensorTowerHttpClient {
  private readonly rateLimiter: RateLimiter;
  private readonly usageBudget: UsageBudget;

  constructor(private readonly options: SensorTowerHttpClientOptions) {
    this.rateLimiter = new RateLimiter(options.requestsPerSecond);
    this.usageBudget = new UsageBudget({
      defaultMonthlyLimit: options.defaultMonthlyLimit,
      warnThresholdRatio: options.warnThresholdRatio,
      blockThresholdRatio: options.blockThresholdRatio
    });
  }

  async getJson<T>(path: string, queryParams: URLSearchParams, operation: string): Promise<T> {
    queryParams.set("auth_token", this.options.authToken);
    const url = `${this.options.baseUrl}${path}?${queryParams.toString()}`;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      this.usageBudget.assertRequestAllowed(operation);
      await this.rateLimiter.waitForTurn();

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });

      this.usageBudget.updateFromHeaders(response.headers);

      if (response.ok) {
        return await response.json() as T;
      }

      const errorBody = await response.text();
      if (attempt < this.options.maxRetries && this.shouldRetry(response.status)) {
        const retryDelayMs = this.getRetryDelayMs(response.headers.get("retry-after"), attempt);
        console.error(
          `Sensor Tower request failed for ${operation} with HTTP ${response.status}; retrying in ${retryDelayMs}ms (attempt ${attempt + 1}/${this.options.maxRetries}).`
        );
        await sleep(retryDelayMs);
        continue;
      }

      throw new SensorTowerApiError(
        `Failed to fetch ${operation}: HTTP ${response.status}: ${errorBody || "Empty response body"}`
      );
    }

    throw new SensorTowerApiError(`Failed to fetch ${operation}: retry budget exhausted.`);
  }

  getUsageSummary(): ApiUsageSummary {
    return this.usageBudget.getSummary();
  }

  private shouldRetry(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  private getRetryDelayMs(retryAfterHeader: string | null, attempt: number): number {
    if (retryAfterHeader) {
      const seconds = Number.parseFloat(retryAfterHeader);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.ceil(seconds * 1000);
      }

      const retryAt = Date.parse(retryAfterHeader);
      if (Number.isFinite(retryAt)) {
        return Math.max(retryAt - Date.now(), 0);
      }
    }

    const baseDelayMs = 500;
    const jitterMs = Math.floor(Math.random() * 250);
    return (baseDelayMs * (2 ** attempt)) + jitterMs;
  }
}
