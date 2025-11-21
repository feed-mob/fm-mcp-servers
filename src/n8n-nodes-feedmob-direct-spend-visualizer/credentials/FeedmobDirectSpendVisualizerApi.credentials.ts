import type { INodeProperties } from 'n8n-workflow';

export class FeedmobDirectSpendVisualizerApi {
  name = 'feedmobDirectSpendVisualizerApi';
  displayName = 'FeedMob Direct Spend Visualizer';

  properties: INodeProperties[] = [
    {
      displayName: 'AWS Region',
      name: 'awsRegion',
      type: 'string',
      default: 'us-east-1',
      required: true,
      description: 'Region used for the Bedrock-based Claude Agent SDK run.',
    },
    {
      displayName: 'AWS Access Key ID',
      name: 'awsAccessKeyId',
      type: 'string',
      default: '',
      required: true,
      description: 'Access key with permission to invoke Bedrock Claude models.',
    },
    {
      displayName: 'AWS Secret Access Key',
      name: 'awsSecretAccessKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Secret for the above access key.',
    },
    {
      displayName: 'FeedMob Key',
      name: 'feedmobKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'FEEDMOB_KEY used by the plugin’s FeedMob MCP server (generate from https://admin.feedmob.com/api_keys).',
    },
    {
      displayName: 'FeedMob Secret',
      name: 'feedmobSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'FEEDMOB_SECRET used by the plugin’s FeedMob MCP server (generate from https://admin.feedmob.com/api_keys).',
    },
    {
      displayName: 'FeedMob API Base',
      name: 'feedmobApiBase',
      type: 'string',
      default: 'https://admin.feedmob.com',
      required: true,
      description: 'FEEDMOB_API_BASE base URL expected by the plugin.',
    },
    {
      displayName: 'Anthropic Model (primary)',
      name: 'anthropicModel',
      type: 'string',
      default: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      required: true,
      description: 'Model identifier passed through to CLAUDE_CODE on Bedrock.',
    },
    {
      displayName: 'Anthropic Model (fast)',
      name: 'anthropicSmallModel',
      type: 'string',
      default: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      required: true,
      description: 'Fast/cheap model identifier for CLAUDE_CODE small tasks.',
    },
  ];
}
