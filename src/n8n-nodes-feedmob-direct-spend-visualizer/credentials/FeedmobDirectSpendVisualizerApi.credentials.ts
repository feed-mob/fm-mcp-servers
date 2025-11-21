import type { INodeProperties } from 'n8n-workflow';

export class FeedmobDirectSpendVisualizerApi {
  name = 'feedmobDirectSpendVisualizerApi';
  displayName = 'FeedMob Direct Spend Visualizer';

  properties: INodeProperties[] = [
    {
      displayName: 'Anthropic API Key',
      name: 'anthropicApiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'API key used by the Claude Agent SDK to run the plugin.',
    },
    {
      displayName: 'FeedMob Key',
      name: 'feedmobKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'FEEDMOB_KEY used by the plugin’s FeedMob MCP server.',
    },
    {
      displayName: 'FeedMob Secret',
      name: 'feedmobSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'FEEDMOB_SECRET used by the plugin’s FeedMob MCP server.',
    },
    {
      displayName: 'FeedMob API Base',
      name: 'feedmobApiBase',
      type: 'string',
      default: '',
      required: true,
      description: 'FEEDMOB_API_BASE base URL expected by the plugin.',
    },
    {
      displayName: 'Default Claude Model',
      name: 'model',
      type: 'options',
      options: [
        { name: 'Claude 3.5 Sonnet (latest)', value: 'claude-3-5-sonnet-latest' },
        { name: 'Claude 3.5 Haiku (latest)', value: 'claude-3-5-haiku-latest' },
        { name: 'Claude 3 Opus (latest)', value: 'claude-3-opus-latest' },
      ],
      default: 'claude-3-5-sonnet-latest',
      description: 'Optional default model. Can be overridden per node.',
    },
  ];
}
