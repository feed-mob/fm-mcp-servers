#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

import { ConfigurationError, SensorTowerApiError } from "./errors.js";
import { SensorTowerHttpClient } from "./sensorTowerHttpClient.js";
import type { ApiUsageSummary } from "./types.js";

dotenv.config();

const server = new McpServer({
  name: "Sensor Tower Reporting MCP Server",
  version: "0.1.4"
});

const SENSOR_TOWER_BASE_URL = process.env.SENSOR_TOWER_BASE_URL || 'https://api.sensortower.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const SENSOR_TOWER_REQUESTS_PER_SECOND = Number.parseInt(process.env.SENSOR_TOWER_REQUESTS_PER_SECOND ?? "5", 10);
const SENSOR_TOWER_MONTHLY_LIMIT = Number.parseInt(process.env.SENSOR_TOWER_MONTHLY_LIMIT ?? "100000", 10);
const SENSOR_TOWER_USAGE_WARN_THRESHOLD = Number.parseFloat(process.env.SENSOR_TOWER_USAGE_WARN_THRESHOLD ?? "0.2");
const SENSOR_TOWER_USAGE_BLOCK_THRESHOLD = Number.parseFloat(process.env.SENSOR_TOWER_USAGE_BLOCK_THRESHOLD ?? "0.05");
const SENSOR_TOWER_MAX_RETRIES = Number.parseInt(process.env.SENSOR_TOWER_MAX_RETRIES ?? "3", 10);

/**
 * Utility functions
 */
function validateConfiguration(): void {
  if (!AUTH_TOKEN) {
    throw new ConfigurationError('AUTH_TOKEN environment variable is required');
  }

  if (!Number.isFinite(SENSOR_TOWER_REQUESTS_PER_SECOND) || SENSOR_TOWER_REQUESTS_PER_SECOND <= 0) {
    throw new ConfigurationError('SENSOR_TOWER_REQUESTS_PER_SECOND must be a positive integer');
  }

  if (!Number.isFinite(SENSOR_TOWER_MONTHLY_LIMIT) || SENSOR_TOWER_MONTHLY_LIMIT <= 0) {
    throw new ConfigurationError('SENSOR_TOWER_MONTHLY_LIMIT must be a positive integer');
  }

  if (!Number.isFinite(SENSOR_TOWER_USAGE_WARN_THRESHOLD) || SENSOR_TOWER_USAGE_WARN_THRESHOLD <= 0 || SENSOR_TOWER_USAGE_WARN_THRESHOLD >= 1) {
    throw new ConfigurationError('SENSOR_TOWER_USAGE_WARN_THRESHOLD must be a number between 0 and 1');
  }

  if (!Number.isFinite(SENSOR_TOWER_USAGE_BLOCK_THRESHOLD) || SENSOR_TOWER_USAGE_BLOCK_THRESHOLD <= 0 || SENSOR_TOWER_USAGE_BLOCK_THRESHOLD >= 1) {
    throw new ConfigurationError('SENSOR_TOWER_USAGE_BLOCK_THRESHOLD must be a number between 0 and 1');
  }

  if (SENSOR_TOWER_USAGE_BLOCK_THRESHOLD >= SENSOR_TOWER_USAGE_WARN_THRESHOLD) {
    throw new ConfigurationError('SENSOR_TOWER_USAGE_BLOCK_THRESHOLD must be lower than SENSOR_TOWER_USAGE_WARN_THRESHOLD');
  }

  if (!Number.isFinite(SENSOR_TOWER_MAX_RETRIES) || SENSOR_TOWER_MAX_RETRIES < 0) {
    throw new ConfigurationError('SENSOR_TOWER_MAX_RETRIES must be zero or a positive integer');
  }
}

/**
 * Sensor Tower API Service Class
 */
class SensorTowerApiService {
  private readonly client: SensorTowerHttpClient;

  constructor() {
    validateConfiguration();
    this.client = new SensorTowerHttpClient({
      baseUrl: SENSOR_TOWER_BASE_URL,
      authToken: AUTH_TOKEN!,
      requestsPerSecond: SENSOR_TOWER_REQUESTS_PER_SECOND,
      defaultMonthlyLimit: SENSOR_TOWER_MONTHLY_LIMIT,
      warnThresholdRatio: SENSOR_TOWER_USAGE_WARN_THRESHOLD,
      blockThresholdRatio: SENSOR_TOWER_USAGE_BLOCK_THRESHOLD,
      maxRetries: SENSOR_TOWER_MAX_RETRIES
    });
  }

  getUsageSummary(): ApiUsageSummary {
    return this.client.getUsageSummary();
  }

  /**
   * Fetch app metadata from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appIds Array of app IDs to fetch metadata for (limited to 100)
   * @param country Country code (defaults to 'US')
   * @returns App metadata
   */
  async fetchAppMetadata(
    os: string,
    appIds: string[],
    country: string = 'US'
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      if (appIds.length > 100) {
        throw new SensorTowerApiError('Maximum of 100 app IDs allowed per request.');
      }

      const appIdsParam = appIds.join(',');
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIdsParam);
      queryParams.append('country', country);

      console.error(`Fetching app metadata for ${os}, app IDs: ${appIdsParam}, country: ${country}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/apps`,
        queryParams,
        'app metadata'
      );
    } catch (error: any) {
      console.error('Error fetching app metadata:', error);
      throw new SensorTowerApiError(`Failed to fetch app metadata: ${error.message}`);
    }
  }

  /**
   * Fetch top in-app purchases for iOS apps
   * @param appIds Array of app IDs to fetch top in-app purchases for (limited to 100)
   * @param country Country code (defaults to 'US')
   * @returns Top in-app purchases data
   */
  async fetchTopInAppPurchases(
    appIds: string[],
    country: string = 'US'
  ): Promise<any> {
    try {
      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      if (appIds.length > 100) {
        throw new SensorTowerApiError('Maximum of 100 app IDs allowed per request.');
      }

      const appIdsParam = appIds.join(',');
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIdsParam);
      queryParams.append('country', country);

      console.error(`Fetching top in-app purchases for app IDs: ${appIdsParam}, country: ${country}`);

      return await this.client.getJson<any>(
        '/v1/ios/apps/top_in_app_purchases',
        queryParams,
        'top in-app purchases'
      );
    } catch (error: any) {
      console.error('Error fetching top in-app purchases:', error);
      throw new SensorTowerApiError(`Failed to fetch top in-app purchases: ${error.message}`);
    }
  }
  /**
   * Fetch compact sales report estimates from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @param appIds Optional array of app IDs
   * @param publisherIds Optional array of publisher IDs
   * @param unifiedAppIds Optional array of unified app IDs
   * @param unifiedPublisherIds Optional array of unified publisher IDs
   * @param categories Optional array of categories
   * @param dateGranularity Optional date granularity for aggregation
   * @param dataModel Optional data model specification
   * @returns Compact sales report estimates
   */
  async fetchCompactSalesReportEstimates(
    os: string,
    startDate: string,
    endDate: string,
    appIds?: string[],
    publisherIds?: string[],
    unifiedAppIds?: string[],
    unifiedPublisherIds?: string[],
    categories?: string[],
    dateGranularity?: string,
    dataModel?: string
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      // Validate dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('Dates must be in YYYY-MM-DD format.');
      }

      // Validate that at least one of app_ids, publisher_ids, unified_app_ids, unified_publisher_ids, or categories is provided
      if (
        (!appIds || appIds.length === 0) &&
        (!publisherIds || publisherIds.length === 0) &&
        (!unifiedAppIds || unifiedAppIds.length === 0) &&
        (!unifiedPublisherIds || unifiedPublisherIds.length === 0) &&
        (!categories || categories.length === 0)
      ) {
        throw new SensorTowerApiError('At least one of App ID, Publisher ID, Unified App ID, Unified Publisher ID, or Category is required.');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('start_date', startDate);
      queryParams.append('end_date', endDate);

      // Add optional parameters if provided
      if (appIds && appIds.length > 0) {
        queryParams.append('app_ids', appIds.join(','));
      }

      if (publisherIds && publisherIds.length > 0) {
        publisherIds.forEach(id => {
          queryParams.append('publisher_ids[]', id);
        });
      }

      if (unifiedAppIds && unifiedAppIds.length > 0) {
        queryParams.append('unified_app_ids', unifiedAppIds.join(','));
      }

      if (unifiedPublisherIds && unifiedPublisherIds.length > 0) {
        queryParams.append('unified_publisher_ids', unifiedPublisherIds.join(','));
      }

      if (categories && categories.length > 0) {
        queryParams.append('categories', categories.join(','));
      }

      if (dateGranularity) {
        queryParams.append('date_granularity', dateGranularity);
      }

      if (dataModel) {
        queryParams.append('data_model', dataModel);
      }

      console.error(`Fetching compact sales report estimates for ${os}, start date: ${startDate}, end date: ${endDate}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/compact_sales_report_estimates`,
        queryParams,
        'compact sales report estimates'
      );
    } catch (error: any) {
      console.error('Error fetching compact sales report estimates:', error);
      throw new SensorTowerApiError(`Failed to fetch compact sales report estimates: ${error.message}`);
    }
  }

  /**
   * Fetch active user estimates from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appIds Array of app IDs (maximum 500)
   * @param timePeriod Time period for aggregation ('day', 'week', or 'month')
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @param countries Optional array of country codes
   * @param dataModel Optional data model specification
   * @returns Active user estimates
   */
  async fetchActiveUsers(
    os: string,
    appIds: string[],
    timePeriod: string,
    startDate: string,
    endDate: string,
    countries?: string[],
    dataModel?: string
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      if (appIds.length > 500) {
        throw new SensorTowerApiError('Maximum of 500 app IDs allowed per request.');
      }

      if (!['day', 'week', 'month'].includes(timePeriod.toLowerCase())) {
        throw new SensorTowerApiError('Invalid time period. Must be "day", "week", or "month".');
      }

      // Validate dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('Dates must be in YYYY-MM-DD format.');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIds.join(','));
      queryParams.append('time_period', timePeriod);
      queryParams.append('start_date', startDate);
      queryParams.append('end_date', endDate);

      // Add optional parameters if provided
      if (countries && countries.length > 0) {
        queryParams.append('countries', countries.join(','));
      }

      if (dataModel) {
        queryParams.append('data_model', dataModel);
      }

      console.error(`Fetching active users for ${os}, app IDs: ${appIds.join(',')}, time period: ${timePeriod}, start date: ${startDate}, end date: ${endDate}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/usage/active_users`,
        queryParams,
        'active users'
      );
    } catch (error: any) {
      console.error('Error fetching active users:', error);
      throw new SensorTowerApiError(`Failed to fetch active users: ${error.message}`);
    }
  }

  /**
   * Fetch category ranking history from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appIds Array of app IDs
   * @param category Category ID
   * @param chartTypeIds Array of chart type IDs
   * @param countries Array of country codes
   * @param startDate Optional start date in YYYY-MM-DD format (defaults to 90 days ago)
   * @param endDate Optional end date in YYYY-MM-DD format (defaults to today)
   * @param isHourly Optional boolean for hourly rankings (only for iOS)
   * @returns Category ranking history
   */
  async fetchCategoryHistory(
    os: string,
    appIds: string[],
    category: string,
    chartTypeIds: string[],
    countries: string[],
    startDate?: string,
    endDate?: string,
    isHourly?: boolean
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      if (!category) {
        throw new SensorTowerApiError('Category ID is required.');
      }

      if (!chartTypeIds || chartTypeIds.length === 0) {
        throw new SensorTowerApiError('At least one chart type ID is required.');
      }

      if (!countries || countries.length === 0) {
        throw new SensorTowerApiError('At least one country code is required.');
      }

      // Validate dates if provided
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (startDate && !dateRegex.test(startDate)) {
        throw new SensorTowerApiError('Start date must be in YYYY-MM-DD format.');
      }
      if (endDate && !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('End date must be in YYYY-MM-DD format.');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIds.join(','));
      queryParams.append('category', category);
      queryParams.append('chart_type_ids', chartTypeIds.join(','));
      queryParams.append('countries', countries.join(','));

      // Add optional parameters if provided
      if (startDate) {
        queryParams.append('start_date', startDate);
      }

      if (endDate) {
        queryParams.append('end_date', endDate);
      }

      if (isHourly !== undefined) {
        queryParams.append('is_hourly', isHourly.toString());
      }

      console.error(`Fetching category history for ${os}, app IDs: ${appIds.join(',')}, category: ${category}, chart types: ${chartTypeIds.join(',')}, countries: ${countries.join(',')}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/category/category_history`,
        queryParams,
        'category history'
      );
    } catch (error: any) {
      console.error('Error fetching category history:', error);
      throw new SensorTowerApiError(`Failed to fetch category history: ${error.message}`);
    }
  }

  /**
   * Fetch category ranking summary from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appId App ID
   * @param country Country code
   * @returns Category ranking summary
   */
  async fetchCategoryRankingSummary(
    os: string,
    appId: string,
    country: string
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appId) {
        throw new SensorTowerApiError('App ID is required.');
      }

      if (!country) {
        throw new SensorTowerApiError('Country code is required.');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('app_id', appId);
      queryParams.append('country', country);

      console.error(`Fetching category ranking summary for ${os}, app ID: ${appId}, country: ${country}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/category/category_ranking_summary`,
        queryParams,
        'category ranking summary'
      );
    } catch (error: any) {
      console.error('Error fetching category ranking summary:', error);
      throw new SensorTowerApiError(`Failed to fetch category ranking summary: ${error.message}`);
    }
  }

  /**
   * Fetch network analysis (impressions share of voice) from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appIds Array of app IDs to fetch SOV for
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @param period Time period to calculate Share of Voice for ('day')
   * @param networks Optional array of networks to return results for
   * @param countries Optional array of country codes to return results for
   * @returns Network analysis data
   */
  async fetchNetworkAnalysis(
    os: string,
    appIds: string[],
    startDate: string,
    endDate: string,
    period: string,
    networks?: string[],
    countries?: string[]
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      // Validate dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('Dates must be in YYYY-MM-DD format.');
      }

      // Validate period
      if (period !== 'day') {
        throw new SensorTowerApiError('Period must be "day".');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIds.join(','));
      queryParams.append('start_date', startDate);
      queryParams.append('end_date', endDate);
      queryParams.append('period', period);

      // Add optional parameters if provided
      if (networks && networks.length > 0) {
        queryParams.append('networks', networks.join(','));
      }

      if (countries && countries.length > 0) {
        queryParams.append('countries', countries.join(','));
      }

      console.error(`Fetching network analysis for ${os}, app IDs: ${appIds.join(',')}, start date: ${startDate}, end date: ${endDate}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/ad_intel/network_analysis`,
        queryParams,
        'network analysis'
      );
    } catch (error: any) {
      console.error('Error fetching network analysis:', error);
      throw new SensorTowerApiError(`Failed to fetch network analysis: ${error.message}`);
    }
  }

  /**
   * Fetch network analysis rank data from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appIds Array of app IDs to fetch ranks for
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @param period Time period to calculate ranks for ('day')
   * @param networks Optional array of networks to return results for
   * @param countries Optional array of country codes to return results for
   * @returns Network analysis rank data
   */
  async fetchNetworkAnalysisRank(
    os: string,
    appIds: string[],
    startDate: string,
    endDate: string,
    period: string,
    networks?: string[],
    countries?: string[]
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      // Validate dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('Dates must be in YYYY-MM-DD format.');
      }

      // Validate period
      if (period !== 'day') {
        throw new SensorTowerApiError('Period must be "day".');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIds.join(','));
      queryParams.append('start_date', startDate);
      queryParams.append('end_date', endDate);
      queryParams.append('period', period);

      // Add optional parameters if provided
      if (networks && networks.length > 0) {
        queryParams.append('networks', networks.join(','));
      }

      if (countries && countries.length > 0) {
        queryParams.append('countries', countries.join(','));
      }

      console.error(`Fetching network analysis rank for ${os}, app IDs: ${appIds.join(',')}, start date: ${startDate}, end date: ${endDate}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/ad_intel/network_analysis/rank`,
        queryParams,
        'network analysis rank'
      );
    } catch (error: any) {
      console.error('Error fetching network analysis rank:', error);
      throw new SensorTowerApiError(`Failed to fetch network analysis rank: ${error.message}`);
    }
  }

  /**
   * Fetch retention data for apps from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appIds Array of app IDs (maximum 500)
   * @param dateGranularity Aggregate estimates by granularity ('all_time' or 'quarterly')
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate Optional end date in YYYY-MM-DD format
   * @param country Optional country code (defaults to Worldwide)
   * @returns Retention data for apps
   */
  async fetchRetention(
    os: string,
    appIds: string[],
    dateGranularity: string,
    startDate: string,
    endDate?: string,
    country?: string
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      if (appIds.length > 500) {
        throw new SensorTowerApiError('Maximum of 500 app IDs allowed per request.');
      }

      if (!['all_time', 'quarterly'].includes(dateGranularity)) {
        throw new SensorTowerApiError('Invalid date granularity. Must be "all_time" or "quarterly".');
      }

      // Validate dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate)) {
        throw new SensorTowerApiError('Start date must be in YYYY-MM-DD format.');
      }

      if (endDate && !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('End date must be in YYYY-MM-DD format.');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIds.join(','));
      queryParams.append('date_granularity', dateGranularity);
      queryParams.append('start_date', startDate);

      // Add optional parameters if provided
      if (endDate) {
        queryParams.append('end_date', endDate);
      }

      if (country) {
        queryParams.append('country', country);
      }

      console.error(`Fetching retention data for ${os}, app IDs: ${appIds.join(',')}, date granularity: ${dateGranularity}, start date: ${startDate}${endDate ? `, end date: ${endDate}` : ''}${country ? `, country: ${country}` : ''}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/usage/retention`,
        queryParams,
        'retention data'
      );
    } catch (error: any) {
      console.error('Error fetching retention data:', error);
      throw new SensorTowerApiError(`Failed to fetch retention data: ${error.message}`);
    }
  }

  /**
   * Fetch app downloads by sources from Sensor Tower API
   * @param os Operating system ('ios' or 'android')
   * @param appIds Array of unified app IDs
   * @param countries Array of country codes
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @param dateGranularity Optional date granularity for aggregation ('daily' or 'monthly')
   * @returns Downloads by sources data
   */
  async fetchDownloadsBySources(
    os: string,
    appIds: string[],
    countries: string[],
    startDate: string,
    endDate: string,
    dateGranularity?: string
  ): Promise<any> {
    try {
      if (!['ios', 'android'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios" or "android".');
      }

      if (!appIds || appIds.length === 0) {
        throw new SensorTowerApiError('At least one app ID is required.');
      }

      if (!countries || countries.length === 0) {
        throw new SensorTowerApiError('At least one country code is required.');
      }

      // Validate dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('Dates must be in YYYY-MM-DD format.');
      }

      // Validate date granularity if provided
      if (dateGranularity && !['daily', 'monthly'].includes(dateGranularity)) {
        throw new SensorTowerApiError('Date granularity must be "daily" or "monthly".');
      }

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('app_ids', appIds.join(','));
      queryParams.append('countries', countries.join(','));
      queryParams.append('start_date', startDate);
      queryParams.append('end_date', endDate);

      // Add optional parameters if provided
      if (dateGranularity) {
        queryParams.append('date_granularity', dateGranularity);
      }

      console.error(`Fetching downloads by sources for ${os}, app IDs: ${appIds.join(',')}, countries: ${countries.join(',')}, start date: ${startDate}, end date: ${endDate}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/downloads_by_sources`,
        queryParams,
        'downloads by sources'
      );
    } catch (error: any) {
      console.error('Error fetching downloads by sources:', error);
      throw new SensorTowerApiError(`Failed to fetch downloads by sources: ${error.message}`);
    }
  }

  /**
   * Fetch top apps by download or revenue estimates
   * Uses the sales_report_estimates_comparison_attributes endpoint
   */
  async fetchTopAndTrendingApps(
    os: string,
    comparisonAttribute: string,
    timeRange: string,
    measure: string,
    category: string,
    date: string,
    deviceType?: string,
    endDate?: string,
    regions?: string[],
    limit?: number,
    dataModel?: string
  ): Promise<any> {
    try {
      if (!['ios', 'android', 'unified'].includes(os.toLowerCase())) {
        throw new SensorTowerApiError('Invalid OS. Must be "ios", "android", or "unified".');
      }

      if (!['absolute', 'delta', 'transformed_delta'].includes(comparisonAttribute)) {
        throw new SensorTowerApiError('Invalid comparison_attribute. Must be "absolute", "delta", or "transformed_delta".');
      }

      if (!['day', 'week', 'month', 'quarter', 'year'].includes(timeRange)) {
        throw new SensorTowerApiError('Invalid time_range. Must be "day", "week", "month", "quarter", or "year".');
      }

      if (!['units', 'revenue'].includes(measure)) {
        throw new SensorTowerApiError('Invalid measure. Must be "units" or "revenue".');
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new SensorTowerApiError('Date must be in YYYY-MM-DD format.');
      }
      if (endDate && !dateRegex.test(endDate)) {
        throw new SensorTowerApiError('end_date must be in YYYY-MM-DD format.');
      }

      const queryParams = new URLSearchParams();
      queryParams.append('comparison_attribute', comparisonAttribute);
      queryParams.append('time_range', timeRange);
      queryParams.append('measure', measure);
      queryParams.append('category', category);
      queryParams.append('date', date);
      queryParams.append('limit', String(limit ?? 2000));

      if (deviceType) {
        queryParams.append('device_type', deviceType);
      }
      if (endDate) {
        queryParams.append('end_date', endDate);
      }
      if (regions && regions.length > 0) {
        regions.forEach(r => queryParams.append('regions[]', r));
      }
      if (dataModel) {
        queryParams.append('data_model', dataModel);
      }

      console.error(`Fetching top and trending apps for ${os}, time_range: ${timeRange}, measure: ${measure}, category: ${category}, date: ${date}`);

      return await this.client.getJson<any>(
        `/v1/${os.toLowerCase()}/sales_report_estimates_comparison_attributes`,
        queryParams,
        'top and trending apps'
      );
    } catch (error: any) {
      console.error('Error fetching top and trending apps:', error);
      throw new SensorTowerApiError(`Failed to fetch top and trending apps: ${error.message}`);
    }
  }
}

let sensorTowerService: SensorTowerApiService | null = null;

function getSensorTowerService(): SensorTowerApiService {
  if (!sensorTowerService) {
    sensorTowerService = new SensorTowerApiService();
  }

  return sensorTowerService;
}

function getApiUsageSummary(): ApiUsageSummary | undefined {
  return sensorTowerService?.getUsageSummary();
}

// Input validation schemas
const osSchema = z.string()
  .refine(val => ['ios', 'android'].includes(val.toLowerCase()), "OS must be 'ios' or 'android'")
  .describe("Operating System ('ios' or 'android')");

const appIdsSchema = z.string()
  .describe("App IDs of apps, separated by commas (limited to 100)")
  .refine(val => val.split(',').length <= 100, "Maximum of 100 app IDs allowed");

const countrySchema = z.string().optional().default('US')
  .describe("Country Code (defaults to 'US')");

// Schemas for compact sales report estimates
const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .describe("Date in YYYY-MM-DD format");

const appIdsOptionalSchema = z.string().optional()
  .describe("IDs of apps, separated by commas (limited to 100)");

const publisherIdsSchema = z.array(z.string()).optional()
  .describe("Publisher IDs of apps");

const unifiedAppIdsSchema = z.string().optional()
  .describe("IDs of unified apps, separated by commas");

const unifiedPublisherIdsSchema = z.string().optional()
  .describe("IDs of unified publishers, separated by commas");

const categoriesSchema = z.string().optional()
  .describe("Categories, separated by commas, see Category IDs");

const dateGranularitySchema = z.string().optional()
  .describe("Aggregate estimates by granularity");

const dataModelSchema = z.string().optional()
  .describe("Specify the data model used to generate estimates");

// Schemas for active users
const timePeriodSchema = z.string()
  .refine(val => ['day', 'week', 'month'].includes(val.toLowerCase()), "Time period must be 'day', 'week', or 'month'")
  .describe("Aggregate estimates by time period ('day' for DAU, 'week' for WAU, 'month' for MAU)");

const appIdsRequiredSchema = z.string()
  .describe("IDs of apps, separated by commas (maximum 500)")
  .refine(val => val.split(',').length <= 500, "Maximum of 500 app IDs allowed");

const countriesSchema = z.string().optional()
  .describe("Countries to return results for, separated by commas, Country Codes");

// Schemas for downloads by sources
const unifiedAppIdsRequiredSchema = z.string()
  .describe("Unified app IDs, separated by commas");

const countriesRequiredForDownloadsSchema = z.string()
  .describe("Country codes, separated by commas. For worldwide data, use 'WW'.");

const dateGranularityDownloadsSchema = z.string().optional()
  .describe("Aggregate estimates by granularity (use 'daily' or 'monthly'). Defaults to 'monthly'.");

// Schemas for category history
const categorySchema = z.string()
  .describe("Category ID. Use '0' for all categories on iOS, 'all' for all categories on Android. See data/category_ids.json for specific category IDs.");

const chartTypeIdsSchema = z.string()
  .describe("IDs of the Chart Type, separated by commas");

const countriesRequiredSchema = z.string()
  .describe("Countries to return results for, separated by commas, Country Codes");

const isHourlySchema = z.boolean().optional()
  .describe("Hourly rankings (only for iOS)");

// Schemas for category ranking summary
const appIdSchema = z.string()
  .describe("ID of App");

const countryRequiredSchema = z.string()
  .describe("Country code to return results for");

// Schemas for network analysis
const networkAnalysisPeriodSchema = z.string()
  .refine(val => val === 'day', "Period must be 'day'")
  .describe("Time period to calculate Share of Voice for");

const networksSchema = z.string().optional()
  .describe("Networks to return results for, separated by commas (Networks)");

// Schemas for retention data
const retentionDateGranularitySchema = z.string()
  .refine(val => ['all_time', 'quarterly'].includes(val), "Date granularity must be 'all_time' or 'quarterly'")
  .describe("Aggregate estimates by granularity (use 'all_time', or 'quarterly')");

// Schemas for find_apps_by_metric_threshold
const osWithUnifiedSchema = z.string()
  .refine(val => ['ios', 'android', 'unified'].includes(val.toLowerCase()), "OS must be 'ios', 'android', or 'unified'")
  .describe("Operating System ('ios', 'android', or 'unified')");

const comparisonAttributeSchema = z.string()
  .refine(val => ['absolute', 'delta', 'transformed_delta'].includes(val), "Must be 'absolute', 'delta', or 'transformed_delta'")
  .default('absolute')
  .describe("Comparison attribute: 'absolute' (total), 'delta' (growth), or 'transformed_delta' (growth ratio). Defaults to 'absolute'.");

const timeRangeSchema = z.string()
  .refine(val => ['day', 'week', 'month', 'quarter', 'year'].includes(val), "Must be 'day', 'week', 'month', 'quarter', or 'year'")
  .describe("Time range: 'day', 'week', 'month', 'quarter', or 'year'");

const measureSchema = z.string()
  .refine(val => ['units', 'revenue'].includes(val), "Must be 'units' or 'revenue'")
  .describe("Metric: 'units' (downloads) or 'revenue' (in cents)");

const minValueSchema = z.number().optional()
  .describe("Minimum threshold for the metric. Apps below this value are excluded. E.g. 7000 to find apps with at least 7,000 downloads.");

const limitLargeSchema = z.number().min(1).max(2000).optional().default(100)
  .describe("Max number of apps to fetch from the API (1–2000). Defaults to 100. Use higher values with min_value to filter large result sets.");

// Tool: Get App Metadata
server.tool("get_app_metadata",
  "Fetch app metadata from Sensor Tower API, such as app name, publisher, categories, description, screenshots, rating, etc.",
  {
    os: osSchema,
    appIds: appIdsSchema,
    country: countrySchema
  },
  async ({ os, appIds, country = 'US' }) => {
    try {
      console.error(`Fetching app metadata for ${os}, app IDs: ${appIds}, country: ${country}`);

      const appIdsArray = appIds.split(',').map(id => id.trim());
      const sensorTowerService = getSensorTowerService();
      const metadata = await sensorTowerService.fetchAppMetadata(os, appIdsArray, country);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              country,
              appIds: appIdsArray,
              api_usage: getApiUsageSummary(),
              data: metadata
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching app metadata: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              country,
              appIds: appIds.split(',').map(id => id.trim()),
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Top In-App Purchases
server.tool("get_top_in_app_purchases",
  "Fetches the top in-app purchases for particular iOS apps",
  {
    appIds: appIdsSchema,
    country: countrySchema
  },
  async ({ appIds, country = 'US' }) => {
    try {
      console.error(`Fetching top in-app purchases for app IDs: ${appIds}, country: ${country}`);

      const appIdsArray = appIds.split(',').map(id => id.trim());
      const sensorTowerService = getSensorTowerService();
      const inAppPurchasesData = await sensorTowerService.fetchTopInAppPurchases(appIdsArray, country);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              country,
              appIds: appIdsArray,
              api_usage: getApiUsageSummary(),
              data: inAppPurchasesData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching top in-app purchases: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              country,
              appIds: appIds.split(',').map(id => id.trim()),
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Compact Sales Report Estimates
server.tool("get_compact_sales_report_estimates",
  "Fetches download and revenue estimates of apps and publishers in compact format. All revenues are returned in cents.",
  {
    os: osSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    appIds: appIdsOptionalSchema,
    publisherIds: publisherIdsSchema,
    unifiedAppIds: unifiedAppIdsSchema,
    unifiedPublisherIds: unifiedPublisherIdsSchema,
    categories: categoriesSchema,
    dateGranularity: dateGranularitySchema,
    dataModel: dataModelSchema
  },
  async ({ os, startDate, endDate, appIds, publisherIds, unifiedAppIds, unifiedPublisherIds, categories, dateGranularity, dataModel }) => {
    try {
      console.error(`Fetching compact sales report estimates for ${os}, start date: ${startDate}, end date: ${endDate}`);

      // Process string inputs into arrays
      const appIdsArray = appIds ? appIds.split(',').map(id => id.trim()) : undefined;
      const unifiedAppIdsArray = unifiedAppIds ? unifiedAppIds.split(',').map(id => id.trim()) : undefined;
      const unifiedPublisherIdsArray = unifiedPublisherIds ? unifiedPublisherIds.split(',').map(id => id.trim()) : undefined;
      const categoriesArray = categories ? categories.split(',').map(category => category.trim()) : undefined;

      const sensorTowerService = getSensorTowerService();
      const reportData = await sensorTowerService.fetchCompactSalesReportEstimates(
        os,
        startDate,
        endDate,
        appIdsArray,
        publisherIds,
        unifiedAppIdsArray,
        unifiedPublisherIdsArray,
        categoriesArray,
        dateGranularity,
        dataModel
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              startDate,
              endDate,
              appIds: appIdsArray,
              publisherIds,
              unifiedAppIds: unifiedAppIdsArray,
              unifiedPublisherIds: unifiedPublisherIdsArray,
              categories: categoriesArray,
              dateGranularity,
              dataModel,
              api_usage: getApiUsageSummary(),
              data: reportData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching compact sales report estimates: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              startDate,
              endDate,
              appIds: appIds ? appIds.split(',').map(id => id.trim()) : undefined,
              publisherIds,
              unifiedAppIds: unifiedAppIds ? unifiedAppIds.split(',').map(id => id.trim()) : undefined,
              unifiedPublisherIds: unifiedPublisherIds ? unifiedPublisherIds.split(',').map(id => id.trim()) : undefined,
              categories: categories ? categories.split(',').map(category => category.trim()) : undefined,
              dateGranularity,
              dataModel,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Active Users
server.tool("get_active_users",
  "Fetches active user estimates of apps per country by date and time period.",
  {
    os: osSchema,
    appIds: appIdsRequiredSchema,
    timePeriod: timePeriodSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    countries: countriesSchema,
    dataModel: dataModelSchema
  },
  async ({ os, appIds, timePeriod, startDate, endDate, countries, dataModel }) => {
    try {
      console.error(`Fetching active users for ${os}, app IDs: ${appIds}, time period: ${timePeriod}, start date: ${startDate}, end date: ${endDate}`);

      // Process string inputs into arrays
      const appIdsArray = appIds.split(',').map(id => id.trim());
      const countriesArray = countries ? countries.split(',').map(country => country.trim()) : undefined;

      const sensorTowerService = getSensorTowerService();
      const activeUsersData = await sensorTowerService.fetchActiveUsers(
        os,
        appIdsArray,
        timePeriod,
        startDate,
        endDate,
        countriesArray,
        dataModel
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              appIds: appIdsArray,
              timePeriod,
              startDate,
              endDate,
              countries: countriesArray,
              dataModel,
              api_usage: getApiUsageSummary(),
              data: activeUsersData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching active users: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              appIds: appIds.split(',').map(id => id.trim()),
              timePeriod,
              startDate,
              endDate,
              countries: countries ? countries.split(',').map(country => country.trim()) : undefined,
              dataModel,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Category History
server.tool("get_category_history",
  "Fetches detailed category ranking history of a particular app, category, and chart type.",
  {
    os: osSchema,
    appIds: appIdsRequiredSchema,
    category: categorySchema,
    chartTypeIds: chartTypeIdsSchema,
    countries: countriesRequiredSchema,
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    isHourly: isHourlySchema
  },
  async ({ os, appIds, category, chartTypeIds, countries, startDate, endDate, isHourly }) => {
    try {
      console.error(`Fetching category history for ${os}, app IDs: ${appIds}, category: ${category}, chart types: ${chartTypeIds}, countries: ${countries}`);

      // Process string inputs into arrays
      const appIdsArray = appIds.split(',').map(id => id.trim());
      const chartTypeIdsArray = chartTypeIds.split(',').map(id => id.trim());
      const countriesArray = countries.split(',').map(country => country.trim());

      const sensorTowerService = getSensorTowerService();
      const categoryHistoryData = await sensorTowerService.fetchCategoryHistory(
        os,
        appIdsArray,
        category,
        chartTypeIdsArray,
        countriesArray,
        startDate,
        endDate,
        isHourly
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              appIds: appIdsArray,
              category,
              chartTypeIds: chartTypeIdsArray,
              countries: countriesArray,
              startDate,
              endDate,
              isHourly,
              api_usage: getApiUsageSummary(),
              data: categoryHistoryData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching category history: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              appIds: appIds.split(',').map(id => id.trim()),
              category,
              chartTypeIds: chartTypeIds.split(',').map(id => id.trim()),
              countries: countries.split(',').map(country => country.trim()),
              startDate,
              endDate,
              isHourly,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Category Ranking Summary
server.tool("get_category_ranking_summary",
  "Fetches today's category ranking summary of a particular app with data on chart type, category, and rank.",
  {
    os: osSchema,
    appId: appIdSchema,
    country: countryRequiredSchema
  },
  async ({ os, appId, country }) => {
    try {
      console.error(`Fetching category ranking summary for ${os}, app ID: ${appId}, country: ${country}`);

      const sensorTowerService = getSensorTowerService();
      const rankingSummaryData = await sensorTowerService.fetchCategoryRankingSummary(
        os,
        appId,
        country
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              appId,
              country,
              api_usage: getApiUsageSummary(),
              data: rankingSummaryData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching category ranking summary: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              appId,
              country,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Network Analysis
server.tool("get_network_analysis",
  "Fetches the impressions share of voice (SOV) time series of the requested apps.",
  {
    os: osSchema,
    appIds: appIdsRequiredSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    period: networkAnalysisPeriodSchema,
    networks: networksSchema,
    countries: countriesSchema
  },
  async ({ os, appIds, startDate, endDate, period, networks, countries }) => {
    try {
      console.error(`Fetching network analysis for ${os}, app IDs: ${appIds}, start date: ${startDate}, end date: ${endDate}`);

      // Process string inputs into arrays
      const appIdsArray = appIds.split(',').map(id => id.trim());
      const networksArray = networks ? networks.split(',').map(network => network.trim()) : undefined;
      const countriesArray = countries ? countries.split(',').map(country => country.trim()) : undefined;

      const sensorTowerService = getSensorTowerService();
      const networkAnalysisData = await sensorTowerService.fetchNetworkAnalysis(
        os,
        appIdsArray,
        startDate,
        endDate,
        period,
        networksArray,
        countriesArray
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              appIds: appIdsArray,
              startDate,
              endDate,
              period,
              networks: networksArray,
              countries: countriesArray,
              api_usage: getApiUsageSummary(),
              data: networkAnalysisData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching network analysis: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              appIds: appIds.split(',').map(id => id.trim()),
              startDate,
              endDate,
              period,
              networks: networks ? networks.split(',').map(network => network.trim()) : undefined,
              countries: countries ? countries.split(',').map(country => country.trim()) : undefined,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Network Analysis Rank
server.tool("get_network_analysis_rank",
  "Fetches the ranks for the countries, networks and dates of the requested apps.",
  {
    os: osSchema,
    appIds: appIdsRequiredSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    period: networkAnalysisPeriodSchema,
    networks: networksSchema,
    countries: countriesSchema
  },
  async ({ os, appIds, startDate, endDate, period, networks, countries }) => {
    try {
      console.error(`Fetching network analysis rank for ${os}, app IDs: ${appIds}, start date: ${startDate}, end date: ${endDate}`);

      // Process string inputs into arrays
      const appIdsArray = appIds.split(',').map(id => id.trim());
      const networksArray = networks ? networks.split(',').map(network => network.trim()) : undefined;
      const countriesArray = countries ? countries.split(',').map(country => country.trim()) : undefined;

      const sensorTowerService = getSensorTowerService();
      const networkAnalysisRankData = await sensorTowerService.fetchNetworkAnalysisRank(
        os,
        appIdsArray,
        startDate,
        endDate,
        period,
        networksArray,
        countriesArray
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              appIds: appIdsArray,
              startDate,
              endDate,
              period,
              networks: networksArray,
              countries: countriesArray,
              api_usage: getApiUsageSummary(),
              data: networkAnalysisRankData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching network analysis rank: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              appIds: appIds.split(',').map(id => id.trim()),
              startDate,
              endDate,
              period,
              networks: networks ? networks.split(',').map(network => network.trim()) : undefined,
              countries: countries ? countries.split(',').map(country => country.trim()) : undefined,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Retention
server.tool("get_retention",
  "Fetches retention of apps (from day 1 to day 90), along with the baseline retention.",
  {
    os: osSchema,
    appIds: appIdsRequiredSchema,
    date_granularity: retentionDateGranularitySchema,
    start_date: dateSchema,
    end_date: dateSchema.optional(),
    country: countrySchema.optional()
  },
  async ({ os, appIds, date_granularity, start_date, end_date, country }) => {
    try {
      console.error(`Fetching retention data for ${os}, app IDs: ${appIds}, date granularity: ${date_granularity}, start date: ${start_date}${end_date ? `, end date: ${end_date}` : ''}${country ? `, country: ${country}` : ''}`);

      // Process string inputs into arrays
      const appIdsArray = appIds.split(',').map(id => id.trim());

      const sensorTowerService = getSensorTowerService();
      const retentionData = await sensorTowerService.fetchRetention(
        os,
        appIdsArray,
        date_granularity,
        start_date,
        end_date,
        country
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              appIds: appIdsArray,
              date_granularity,
              start_date,
              end_date,
              country,
              api_usage: getApiUsageSummary(),
              data: retentionData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching retention data: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              appIds: appIds.split(',').map(id => id.trim()),
              date_granularity,
              start_date,
              end_date,
              country,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get Downloads By Sources
server.tool("get_downloads_by_sources",
  "Fetches app downloads by sources (organic, paid, and browser) with percentages and absolute values.",
  {
    os: osSchema,
    app_ids: unifiedAppIdsRequiredSchema,
    countries: countriesRequiredForDownloadsSchema,
    start_date: dateSchema,
    end_date: dateSchema,
    date_granularity: dateGranularityDownloadsSchema
  },
  async ({ os, app_ids, countries, start_date, end_date, date_granularity }) => {
    try {
      console.error(`Fetching downloads by sources for ${os}, app IDs: ${app_ids}, countries: ${countries}, start date: ${start_date}, end date: ${end_date}`);

      // Process string inputs into arrays
      const appIdsArray = app_ids.split(',').map(id => id.trim());
      const countriesArray = countries.split(',').map(country => country.trim());

      const sensorTowerService = getSensorTowerService();
      const downloadsBySourcesData = await sensorTowerService.fetchDownloadsBySources(
        os,
        appIdsArray,
        countriesArray,
        start_date,
        end_date,
        date_granularity
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              os,
              app_ids: appIdsArray,
              countries: countriesArray,
              start_date,
              end_date,
              date_granularity,
              api_usage: getApiUsageSummary(),
              data: downloadsBySourcesData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error fetching downloads by sources: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              app_ids: app_ids.split(',').map(id => id.trim()),
              countries: countries.split(',').map(country => country.trim()),
              start_date,
              end_date,
              date_granularity,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Find Apps by Metric Threshold
server.tool("find_apps_by_metric_threshold",
  "Discovers apps that meet or exceed a download or revenue threshold over a given time period and geography. " +
  "Ideal for market research questions like 'What apps have over 7,000 downloads daily in the US?' " +
  "Use measure='units' for downloads and measure='revenue' for revenue (in cents). " +
  "Set category='0' for all categories if ios. " +
  "Set category='all' for all categories if android.",
  {
    os: osSchema.optional().describe("Operating System ('ios' or 'android'). Defaults to 'ios' if not provided."),
    time_range: timeRangeSchema,
    measure: measureSchema,
    category: categorySchema,
    date: dateSchema,
    comparison_attribute: comparisonAttributeSchema,
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional()
      .describe("Optional end date (YYYY-MM-DD) for multi-period aggregation."),
    countries: countriesSchema,
    device_type: z.string().optional()
      .describe("Device type for iOS only: 'iphone', 'ipad', or 'total'. Leave blank for Android."),
    min_value: minValueSchema,
    limit: limitLargeSchema,
    data_model: dataModelSchema
  },
  async ({ os: rawOs, time_range, measure, category, date, comparison_attribute, end_date, countries, device_type, min_value, limit, data_model }) => {
    const osDefaulted = !rawOs;
    const os = rawOs ?? 'ios';
    try {
      console.error(`Finding apps by metric threshold: os=${os}${osDefaulted ? ' (defaulted)' : ''}, time_range=${time_range}, measure=${measure}, category=${category}, date=${date}, min_value=${min_value}`);

      const regionsArray = countries ? countries.split(',').map(c => c.trim()).filter(Boolean) : undefined;

      const sensorTowerService = getSensorTowerService();
      const rawData: any[] = await sensorTowerService.fetchTopAndTrendingApps(
        os,
        comparison_attribute,
        time_range,
        measure,
        category,
        date,
        device_type,
        end_date,
        regionsArray,
        limit,
        data_model
      );

      const metricField = measure === 'units' ? 'units_absolute' : 'revenue_absolute';
      const filteredData = min_value !== undefined
        ? rawData.filter(app => (app[metricField] ?? 0) >= min_value)
        : rawData;

      // Project only essential fields to keep response size manageable for LLM context
      const compactData = filteredData.map(app => ({
        app_id: app.app_id,
        name: app.name,
        publisher_name: app.publisher_name,
        publisher_id: app.publisher_id,
        icon_url: app.icon_url,
        os: app.os,
        category: app.category,
        units_absolute: app.units_absolute,
        units_delta: app.units_delta,
        revenue_absolute: app.revenue_absolute,
        revenue_delta: app.revenue_delta,
        date: app.date,
      }));

      // Cap output at 200 records to prevent exceeding LLM context limits
      const maxOutput = 200;
      const truncated = compactData.length > maxOutput;
      const outputData = truncated ? compactData.slice(0, maxOutput) : compactData;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ...(osDefaulted ? { notice: "No OS specified; defaulted to 'ios'. Set os='android' if you need Android data." } : {}),
              query: {
                os,
                time_range,
                measure,
                category,
                date,
                comparison_attribute,
                end_date,
                countries: regionsArray,
                device_type,
                min_value,
                limit
              },
              total_fetched: rawData.length,
              total_matching: filteredData.length,
              total_returned: outputData.length,
              truncated,
              api_usage: getApiUsageSummary(),
              data: outputData
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error finding apps by metric threshold: ${error.message}`;
      console.error(errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
              os,
              time_range,
              measure,
              category,
              date,
              min_value,
              api_usage: getApiUsageSummary(),
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

async function runServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Sensor Tower Reporting MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
