export interface ApiUsageSummary {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  warnThresholdRatio: number;
  blockThresholdRatio: number;
  warning?: string;
  lastUpdatedAt?: string;
}
