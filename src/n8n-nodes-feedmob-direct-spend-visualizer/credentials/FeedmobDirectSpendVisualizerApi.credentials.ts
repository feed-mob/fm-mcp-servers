import type { INodeProperties } from 'n8n-workflow';

export class FeedmobDirectSpendVisualizerApi {
  name = 'feedmobDirectSpendVisualizerApi';
  displayName = 'FeedMob Direct Spend Visualizer';

  properties: INodeProperties[] = [
    {
      displayName: 'Provider',
      name: 'provider',
      type: 'options',
      options: [
        { name: 'AWS Bedrock', value: 'aws_bedrock' },
        { name: 'Zhipu AI (GLM)', value: 'glm' },
      ],
      default: 'aws_bedrock',
      required: true,
      description: 'Choose the AI provider to use.',
    },
    // --- AWS Bedrock Fields ---
    {
      displayName: 'AWS Region',
      name: 'awsRegion',
      type: 'string',
      default: 'us-east-1',
      required: true,
      displayOptions: {
        show: {
          provider: ['aws_bedrock'],
        },
      },
      description: 'Region used for the Bedrock-based Claude Agent SDK run.',
    },
    {
      displayName: 'AWS Access Key ID',
      name: 'awsAccessKeyId',
      type: 'string',
      default: '',
      required: true,
      displayOptions: {
        show: {
          provider: ['aws_bedrock'],
        },
      },
      description: 'Access key with permission to invoke Bedrock Claude models.',
    },
    {
      displayName: 'AWS Secret Access Key',
      name: 'awsSecretAccessKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      displayOptions: {
        show: {
          provider: ['aws_bedrock'],
        },
      },
      description: 'Secret for the above access key.',
    },
    {
      displayName: 'Anthropic Model (primary)',
      name: 'anthropicModel',
      type: 'string',
      default: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      required: true,
      displayOptions: {
        show: {
          provider: ['aws_bedrock'],
        },
      },
      description: 'Model identifier passed through to CLAUDE_CODE on Bedrock.',
    },
    {
      displayName: 'Anthropic Model (fast)',
      name: 'anthropicSmallModel',
      type: 'string',
      default: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      required: true,
      displayOptions: {
        show: {
          provider: ['aws_bedrock'],
        },
      },
      description: 'Fast/cheap model identifier for CLAUDE_CODE small tasks.',
    },
    // --- GLM / Zhipu AI Fields ---
    {
      displayName: 'Base URL',
      name: 'anthropicBaseUrl',
      type: 'string',
      default: 'https://open.bigmodel.cn/api/anthropic',
      required: true,
      displayOptions: {
        show: {
          provider: ['glm'],
        },
      },
      description: 'Base URL for the GLM / Zhipu AI API (compatible with Anthropic SDK).',
    },
    {
      displayName: 'API Key',
      name: 'anthropicAuthToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      displayOptions: {
        show: {
          provider: ['glm'],
        },
      },
      description: 'API Key for GLM / Zhipu AI.',
    },
    {
      displayName: 'Model',
      name: 'glmModel',
      type: 'string',
      default: 'glm-4.6',
      required: true,
      displayOptions: {
        show: {
          provider: ['glm'],
        },
      },
      description: 'Model identifier for GLM.',
    },
    {
      displayName: 'Small/Fast Model',
      name: 'glmSmallModel',
      type: 'string',
      default: 'glm-4.6',
      required: true,
      displayOptions: {
        show: {
          provider: ['glm'],
        },
      },
      description: 'Fast/cheap model identifier for GLM (can be same as main model).',
    },
    // --- Common Fields ---
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
  ];
}
