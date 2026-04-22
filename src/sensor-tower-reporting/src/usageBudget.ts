import type { Headers } from "node-fetch";

import { SensorTowerApiError } from "./errors.js";
import type { ApiUsageSummary } from "./types.js";

interface UsageBudgetOptions {
  defaultMonthlyLimit: number;
  warnThresholdRatio: number;
  blockThresholdRatio: number;
}

export class UsageBudget {
  private monthlyLimit: number | null;
  private monthlyUsed: number | null = null;
  private lastUpdatedAt: string | undefined;

  constructor(private readonly options: UsageBudgetOptions) {
    this.monthlyLimit = options.defaultMonthlyLimit;
  }

  assertRequestAllowed(operation: string): void {
    const remaining = this.getRemaining();
    const limit = this.monthlyLimit;

    if (remaining === null || limit === null) {
      return;
    }

    if (remaining <= Math.max(Math.floor(limit * this.options.blockThresholdRatio), 1)) {
      throw new SensorTowerApiError(
        `Blocked Sensor Tower request for ${operation}: monthly quota is nearly exhausted (${remaining} requests remaining).`
      );
    }
  }

  updateFromHeaders(headers: Headers): void {
    const limitHeader = headers.get("x-api-usage-limit");
    const usedHeader = headers.get("x-api-usage-count");

    const parsedLimit = limitHeader ? Number.parseInt(limitHeader, 10) : Number.NaN;
    const parsedUsed = usedHeader ? Number.parseInt(usedHeader, 10) : Number.NaN;

    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      this.monthlyLimit = parsedLimit;
    }

    if (Number.isFinite(parsedUsed) && parsedUsed >= 0) {
      this.monthlyUsed = parsedUsed;
    }

    if ((Number.isFinite(parsedLimit) && parsedLimit > 0) || (Number.isFinite(parsedUsed) && parsedUsed >= 0)) {
      this.lastUpdatedAt = new Date().toISOString();
    }
  }

  getSummary(): ApiUsageSummary {
    const limit = this.monthlyLimit;
    const used = this.monthlyUsed;
    const remaining = this.getRemaining();

    let warning: string | undefined;
    if (limit !== null && remaining !== null) {
      const warnRemaining = Math.ceil(limit * this.options.warnThresholdRatio);
      if (remaining <= warnRemaining) {
        warning = `Sensor Tower monthly quota is low: ${remaining} requests remaining out of ${limit}.`;
      }
    }

    return {
      limit,
      used,
      remaining,
      warnThresholdRatio: this.options.warnThresholdRatio,
      blockThresholdRatio: this.options.blockThresholdRatio,
      warning,
      lastUpdatedAt: this.lastUpdatedAt
    };
  }

  private getRemaining(): number | null {
    if (this.monthlyLimit === null || this.monthlyUsed === null) {
      return null;
    }

    return Math.max(this.monthlyLimit - this.monthlyUsed, 0);
  }
}
