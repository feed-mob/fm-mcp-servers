import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

declare const fetch: any;

type SensorTowerCredentials = {
  baseUrl: string;
  authToken: string;
};

export class SensorTower implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sensor Tower',
    name: 'sensorTower',
    icon: 'file:logo.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Sensor Tower Reporting via MCP-equivalent REST',
    defaults: { name: 'Sensor Tower' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      { name: 'sensorTowerApi', required: true },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Get App Metadata', value: 'get_app_metadata', action: 'Get app metadata' },
          { name: 'Get Top In-App Purchases', value: 'get_top_in_app_purchases', action: 'Get top in-app purchases' },
          { name: 'Get Compact Sales Report Estimates', value: 'get_compact_sales_report_estimates', action: 'Get compact sales report estimates' },
          { name: 'Get Active Users', value: 'get_active_users', action: 'Get active users' },
          { name: 'Get Category History', value: 'get_category_history', action: 'Get category history' },
          { name: 'Get Category Ranking Summary', value: 'get_category_ranking_summary', action: 'Get category ranking summary' },
          { name: 'Get Network Analysis', value: 'get_network_analysis', action: 'Get network analysis' },
          { name: 'Get Network Analysis Rank', value: 'get_network_analysis_rank', action: 'Get network analysis rank' },
          { name: 'Get Retention', value: 'get_retention', action: 'Get retention' },
          { name: 'Get Downloads By Sources', value: 'get_downloads_by_sources', action: 'Get downloads by sources' },
        ],
        default: 'get_app_metadata',
      },

      // Shared fields
      { displayName: 'OS', name: 'os', type: 'options', options: [ { name: 'iOS', value: 'ios' }, { name: 'Android', value: 'android' } ], default: 'ios', displayOptions: { show: { operation: ['get_app_metadata','get_compact_sales_report_estimates','get_active_users','get_category_history','get_category_ranking_summary','get_network_analysis','get_network_analysis_rank','get_retention','get_downloads_by_sources'] } } },

      // get_app_metadata
      { displayName: 'App IDs (comma-separated)', name: 'appIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_app_metadata'] } } },
      { displayName: 'Country', name: 'country', type: 'string', default: 'US', displayOptions: { show: { operation: ['get_app_metadata'] } } },

      // get_top_in_app_purchases (iOS only)
      { displayName: 'App IDs (comma-separated)', name: 'iapAppIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_top_in_app_purchases'] } } },
      { displayName: 'Country', name: 'iapCountry', type: 'string', default: 'US', displayOptions: { show: { operation: ['get_top_in_app_purchases'] } } },

      // get_compact_sales_report_estimates
      { displayName: 'Start Date (YYYY-MM-DD)', name: 'csrStartDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'End Date (YYYY-MM-DD)', name: 'csrEndDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'App IDs (comma-separated)', name: 'csrAppIds', type: 'string', default: '', displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'Publisher IDs (multiple allowed)', name: 'csrPublisherIds', type: 'string', default: '', description: 'Comma-separated', displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'Unified App IDs', name: 'csrUnifiedAppIds', type: 'string', default: '', displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'Unified Publisher IDs', name: 'csrUnifiedPublisherIds', type: 'string', default: '', displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'Categories', name: 'csrCategories', type: 'string', default: '', displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'Date Granularity', name: 'csrDateGranularity', type: 'string', default: '', displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },
      { displayName: 'Data Model', name: 'csrDataModel', type: 'string', default: '', displayOptions: { show: { operation: ['get_compact_sales_report_estimates'] } } },

      // get_active_users
      { displayName: 'App IDs (comma-separated)', name: 'auAppIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_active_users'] } } },
      { displayName: 'Time Period', name: 'auTimePeriod', type: 'options', options: [ { name: 'day', value: 'day' }, { name: 'week', value: 'week' }, { name: 'month', value: 'month' } ], default: 'day', displayOptions: { show: { operation: ['get_active_users'] } } },
      { displayName: 'Start Date (YYYY-MM-DD)', name: 'auStartDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_active_users'] } } },
      { displayName: 'End Date (YYYY-MM-DD)', name: 'auEndDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_active_users'] } } },
      { displayName: 'Countries (comma-separated)', name: 'auCountries', type: 'string', default: '', displayOptions: { show: { operation: ['get_active_users'] } } },
      { displayName: 'Data Model', name: 'auDataModel', type: 'string', default: '', displayOptions: { show: { operation: ['get_active_users'] } } },

      // get_category_history
      { displayName: 'App IDs (comma-separated)', name: 'chAppIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_category_history'] } } },
      { displayName: 'Category', name: 'chCategory', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_category_history'] } } },
      { displayName: 'Chart Type IDs (comma-separated)', name: 'chChartTypeIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_category_history'] } } },
      { displayName: 'Countries (comma-separated)', name: 'chCountries', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_category_history'] } } },
      { displayName: 'Start Date (YYYY-MM-DD)', name: 'chStartDate', type: 'string', default: '', displayOptions: { show: { operation: ['get_category_history'] } } },
      { displayName: 'End Date (YYYY-MM-DD)', name: 'chEndDate', type: 'string', default: '', displayOptions: { show: { operation: ['get_category_history'] } } },
      { displayName: 'Is Hourly', name: 'chIsHourly', type: 'boolean', default: false, displayOptions: { show: { operation: ['get_category_history'] } } },

      // get_category_ranking_summary
      { displayName: 'App ID', name: 'crsAppId', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_category_ranking_summary'] } } },
      { displayName: 'Country', name: 'crsCountry', type: 'string', default: 'US', required: true, displayOptions: { show: { operation: ['get_category_ranking_summary'] } } },

      // get_network_analysis
      { displayName: 'App IDs (comma-separated)', name: 'naAppIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_network_analysis'] } } },
      { displayName: 'Start Date (YYYY-MM-DD)', name: 'naStartDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_network_analysis'] } } },
      { displayName: 'End Date (YYYY-MM-DD)', name: 'naEndDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_network_analysis'] } } },
      { displayName: 'Period', name: 'naPeriod', type: 'options', options: [ { name: 'day', value: 'day' } ], default: 'day', required: true, displayOptions: { show: { operation: ['get_network_analysis'] } } },
      { displayName: 'Networks (comma-separated)', name: 'naNetworks', type: 'string', default: '', displayOptions: { show: { operation: ['get_network_analysis'] } } },
      { displayName: 'Countries (comma-separated)', name: 'naCountries', type: 'string', default: '', displayOptions: { show: { operation: ['get_network_analysis'] } } },

      // get_network_analysis_rank
      { displayName: 'App IDs (comma-separated)', name: 'narAppIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_network_analysis_rank'] } } },
      { displayName: 'Start Date (YYYY-MM-DD)', name: 'narStartDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_network_analysis_rank'] } } },
      { displayName: 'End Date (YYYY-MM-DD)', name: 'narEndDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_network_analysis_rank'] } } },
      { displayName: 'Period', name: 'narPeriod', type: 'options', options: [ { name: 'day', value: 'day' } ], default: 'day', required: true, displayOptions: { show: { operation: ['get_network_analysis_rank'] } } },
      { displayName: 'Networks (comma-separated)', name: 'narNetworks', type: 'string', default: '', displayOptions: { show: { operation: ['get_network_analysis_rank'] } } },
      { displayName: 'Countries (comma-separated)', name: 'narCountries', type: 'string', default: '', displayOptions: { show: { operation: ['get_network_analysis_rank'] } } },

      // get_retention
      { displayName: 'App IDs (comma-separated)', name: 'retAppIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_retention'] } } },
      { displayName: 'Date Granularity', name: 'retDateGranularity', type: 'options', options: [ { name: 'all_time', value: 'all_time' }, { name: 'quarterly', value: 'quarterly' } ], default: 'all_time', required: true, displayOptions: { show: { operation: ['get_retention'] } } },
      { displayName: 'Start Date (YYYY-MM-DD)', name: 'retStartDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_retention'] } } },
      { displayName: 'End Date (YYYY-MM-DD)', name: 'retEndDate', type: 'string', default: '', displayOptions: { show: { operation: ['get_retention'] } } },
      { displayName: 'Country', name: 'retCountry', type: 'string', default: '', displayOptions: { show: { operation: ['get_retention'] } } },

      // get_downloads_by_sources
      { displayName: 'App IDs (comma-separated; unified IDs)', name: 'dbsAppIds', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_downloads_by_sources'] } } },
      { displayName: 'Countries (comma-separated)', name: 'dbsCountries', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_downloads_by_sources'] } } },
      { displayName: 'Start Date (YYYY-MM-DD)', name: 'dbsStartDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_downloads_by_sources'] } } },
      { displayName: 'End Date (YYYY-MM-DD)', name: 'dbsEndDate', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['get_downloads_by_sources'] } } },
      { displayName: 'Date Granularity', name: 'dbsDateGranularity', type: 'options', options: [ { name: 'monthly', value: 'monthly' }, { name: 'daily', value: 'daily' } ], default: 'monthly', displayOptions: { show: { operation: ['get_downloads_by_sources'] } } },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnItems: INodeExecutionData[] = [];

    const credentials = (await this.getCredentials('sensorTowerApi')) as unknown as SensorTowerCredentials;
    const baseUrl = credentials.baseUrl || 'https://api.sensortower.com';
    const auth = credentials.authToken;

    const buildQuery = (params: Record<string, unknown>): string => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
          value.forEach((v) => qs.append(key, String(v)));
        } else if (typeof value === 'string' && key.endsWith('[]')) {
          value.split(',').map((s) => s.trim()).filter(Boolean).forEach((v) => qs.append(key, v));
        } else {
          qs.append(key, String(value));
        }
      });
      return qs.toString();
    };

    const request = async (endpoint: string, params: Record<string, unknown> = {}) => {
      const query = buildQuery({ ...params, auth_token: auth as string });
      const res = await fetch(`${baseUrl}${endpoint}?${query}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return await res.json();
    };

    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      if (operation === 'get_app_metadata') {
        const os = this.getNodeParameter('os', i) as string;
        const appIds = this.getNodeParameter('appIds', i) as string;
        const country = this.getNodeParameter('country', i, 'US') as string;
        const data = await request(`/v1/${os}/apps`, { app_ids: appIds, country });
        returnItems.push({ json: data });
      } else if (operation === 'get_top_in_app_purchases') {
        const appIds = this.getNodeParameter('iapAppIds', i) as string;
        const country = this.getNodeParameter('iapCountry', i, 'US') as string;
        const data = await request('/v1/ios/apps/top_in_app_purchases', { app_ids: appIds, country });
        returnItems.push({ json: data });
      } else if (operation === 'get_compact_sales_report_estimates') {
        const os = this.getNodeParameter('os', i) as string;
        const startDate = this.getNodeParameter('csrStartDate', i) as string;
        const endDate = this.getNodeParameter('csrEndDate', i) as string;
        const appIds = this.getNodeParameter('csrAppIds', i, '') as string;
        const publisherIds = this.getNodeParameter('csrPublisherIds', i, '') as string;
        const unifiedAppIds = this.getNodeParameter('csrUnifiedAppIds', i, '') as string;
        const unifiedPublisherIds = this.getNodeParameter('csrUnifiedPublisherIds', i, '') as string;
        const categories = this.getNodeParameter('csrCategories', i, '') as string;
        const dateGranularity = this.getNodeParameter('csrDateGranularity', i, '') as string;
        const dataModel = this.getNodeParameter('csrDataModel', i, '') as string;

        const params: Record<string, unknown> = { start_date: startDate, end_date: endDate };
        if (appIds) params.app_ids = appIds;
        if (publisherIds) params['publisher_ids[]'] = publisherIds.split(',').map((s) => s.trim()).filter(Boolean);
        if (unifiedAppIds) params.unified_app_ids = unifiedAppIds;
        if (unifiedPublisherIds) params.unified_publisher_ids = unifiedPublisherIds;
        if (categories) params.categories = categories;
        if (dateGranularity) params.date_granularity = dateGranularity;
        if (dataModel) params.data_model = dataModel;
        const data = await request(`/v1/${os}/compact_sales_report_estimates`, params);
        returnItems.push({ json: data });
      } else if (operation === 'get_active_users') {
        const os = this.getNodeParameter('os', i) as string;
        const appIds = this.getNodeParameter('auAppIds', i) as string;
        const timePeriod = this.getNodeParameter('auTimePeriod', i) as string;
        const startDate = this.getNodeParameter('auStartDate', i) as string;
        const endDate = this.getNodeParameter('auEndDate', i) as string;
        const countries = this.getNodeParameter('auCountries', i, '') as string;
        const dataModel = this.getNodeParameter('auDataModel', i, '') as string;
        const params: Record<string, unknown> = { app_ids: appIds, time_period: timePeriod, start_date: startDate, end_date: endDate };
        if (countries) params.countries = countries;
        if (dataModel) params.data_model = dataModel;
        const data = await request(`/v1/${os}/usage/active_users`, params);
        returnItems.push({ json: data });
      } else if (operation === 'get_category_history') {
        const os = this.getNodeParameter('os', i) as string;
        const appIds = this.getNodeParameter('chAppIds', i) as string;
        const category = this.getNodeParameter('chCategory', i) as string;
        const chartTypeIds = this.getNodeParameter('chChartTypeIds', i) as string;
        const countries = this.getNodeParameter('chCountries', i) as string;
        const startDate = this.getNodeParameter('chStartDate', i, '') as string;
        const endDate = this.getNodeParameter('chEndDate', i, '') as string;
        const isHourly = this.getNodeParameter('chIsHourly', i, false) as boolean;
        const params: Record<string, unknown> = { app_ids: appIds, category, chart_type_ids: chartTypeIds, countries };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (isHourly !== undefined) params.is_hourly = String(isHourly);
        const data = await request(`/v1/${os}/category/category_history`, params);
        returnItems.push({ json: data });
      } else if (operation === 'get_category_ranking_summary') {
        const os = this.getNodeParameter('os', i) as string;
        const appId = this.getNodeParameter('crsAppId', i) as string;
        const country = this.getNodeParameter('crsCountry', i) as string;
        const data = await request(`/v1/${os}/category/category_ranking_summary`, { app_id: appId, country });
        returnItems.push({ json: data });
      } else if (operation === 'get_network_analysis') {
        const os = this.getNodeParameter('os', i) as string;
        const appIds = this.getNodeParameter('naAppIds', i) as string;
        const startDate = this.getNodeParameter('naStartDate', i) as string;
        const endDate = this.getNodeParameter('naEndDate', i) as string;
        const period = this.getNodeParameter('naPeriod', i) as string;
        const networks = this.getNodeParameter('naNetworks', i, '') as string;
        const countries = this.getNodeParameter('naCountries', i, '') as string;
        const params: Record<string, unknown> = { app_ids: appIds, start_date: startDate, end_date: endDate, period };
        if (networks) params.networks = networks;
        if (countries) params.countries = countries;
        const data = await request(`/v1/${os}/ad_intel/network_analysis`, params);
        returnItems.push({ json: data });
      } else if (operation === 'get_network_analysis_rank') {
        const os = this.getNodeParameter('os', i) as string;
        const appIds = this.getNodeParameter('narAppIds', i) as string;
        const startDate = this.getNodeParameter('narStartDate', i) as string;
        const endDate = this.getNodeParameter('narEndDate', i) as string;
        const period = this.getNodeParameter('narPeriod', i) as string;
        const networks = this.getNodeParameter('narNetworks', i, '') as string;
        const countries = this.getNodeParameter('narCountries', i, '') as string;
        const params: Record<string, unknown> = { app_ids: appIds, start_date: startDate, end_date: endDate, period };
        if (networks) params.networks = networks;
        if (countries) params.countries = countries;
        const data = await request(`/v1/${os}/ad_intel/network_analysis/rank`, params);
        returnItems.push({ json: data });
      } else if (operation === 'get_retention') {
        const os = this.getNodeParameter('os', i) as string;
        const appIds = this.getNodeParameter('retAppIds', i) as string;
        const dateGranularity = this.getNodeParameter('retDateGranularity', i) as string;
        const startDate = this.getNodeParameter('retStartDate', i) as string;
        const endDate = this.getNodeParameter('retEndDate', i, '') as string;
        const country = this.getNodeParameter('retCountry', i, '') as string;
        const params: Record<string, unknown> = { app_ids: appIds, date_granularity: dateGranularity, start_date: startDate };
        if (endDate) params.end_date = endDate;
        if (country) params.country = country;
        const data = await request(`/v1/${os}/usage/retention`, params);
        returnItems.push({ json: data });
      } else if (operation === 'get_downloads_by_sources') {
        const os = this.getNodeParameter('os', i) as string;
        const appIds = this.getNodeParameter('dbsAppIds', i) as string;
        const countries = this.getNodeParameter('dbsCountries', i) as string;
        const startDate = this.getNodeParameter('dbsStartDate', i) as string;
        const endDate = this.getNodeParameter('dbsEndDate', i) as string;
        const dateGranularity = this.getNodeParameter('dbsDateGranularity', i, 'monthly') as string;
        const params: Record<string, unknown> = { app_ids: appIds, countries, start_date: startDate, end_date: endDate, date_granularity: dateGranularity };
        const data = await request(`/v1/${os}/downloads_by_sources`, params);
        returnItems.push({ json: data });
      }
    }

    return [returnItems];
  }
}


