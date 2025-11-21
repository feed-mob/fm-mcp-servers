import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  query,
  type SDKAssistantMessage,
  type SDKMessage,
  type SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

type FeedmobDirectSpendVisualizerCredentials = {
  feedmobKey?: string;
  feedmobSecret?: string;
  feedmobApiBase?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  anthropicModel?: string;
  anthropicSmallModel?: string;
};

type AgentRunResult = {
  text: string;
  structuredOutput?: unknown;
  usage?: SDKResultMessage['usage'];
};

const DEFAULT_PLUGIN_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'vendor',
  'claude-code-marketplace',
  'plugins',
  'direct-spend-visualizer',
);

const buildPrompt = (clickUrlId: string, startDate: string, endDate: string) => `
Use the Claude agent skill "direct-spend-visualizer" to visualize FeedMob direct spend.
Click URL ID: ${clickUrlId}
Start date: ${startDate}
End date: ${endDate}
Return any ASCII output plus JSON with keys status, summary, and data.
`.trim();

export class FeedmobDirectSpendVisualizer implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FeedMob Direct Spend Visualizer',
    name: 'feedmobDirectSpendVisualizer',
    icon: 'file:logo.svg',
    group: ['transform'],
    version: 1,
    description: 'Ask the Claude Agent SDK to run the FeedMob direct-spend visualizer plugin',
    defaults: { name: 'Direct Spend Visualizer' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      { name: 'feedmobDirectSpendVisualizerApi', required: true },
    ],
    properties: [
      {
        displayName: 'Start Date',
        name: 'startDate',
        type: 'string',
        required: true,
        default: '',
        description: 'Start date in YYYY-MM-DD format.',
      },
      {
        displayName: 'End Date',
        name: 'endDate',
        type: 'string',
        required: true,
        default: '',
        description: 'End date in YYYY-MM-DD format.',
      },
      {
        displayName: 'Click URL ID',
        name: 'clickUrlId',
        type: 'string',
        required: true,
        default: '',
        description: 'Single FeedMob click_url_id to visualize.',
      },
      {
        displayName: 'Max Turns',
        name: 'maxTurns',
        type: 'number',
        default: 50,
        typeOptions: { minValue: 1, maxValue: 100, numberStepSize: 1 },
        description: 'Number of reasoning turns allowed for the Claude Agent.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = (await this.getCredentials('feedmobDirectSpendVisualizerApi')) as FeedmobDirectSpendVisualizerCredentials;
    if (!credentials?.awsAccessKeyId || !credentials.awsSecretAccessKey) {
      throw new Error('Missing AWS credentials in the FeedMob Direct Spend Visualizer credential.');
    }

    const items = this.getInputData();
    const results: INodeExecutionData[] = [];
    const execContext = this as IExecuteFunctions & { continueOnFail?: () => boolean };

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const pluginPath = DEFAULT_PLUGIN_PATH;
        if (!existsSync(pluginPath)) {
          throw new Error(`Plugin path "${pluginPath}" does not exist. Run npm install to clone the marketplace repository.`);
        }

        const startDate = this.getNodeParameter('startDate', itemIndex) as string;
        const endDate = this.getNodeParameter('endDate', itemIndex) as string;
        const clickUrlId = this.getNodeParameter('clickUrlId', itemIndex) as string;
        const prompt = buildPrompt(clickUrlId, startDate, endDate);
        const maxTurns = this.getNodeParameter('maxTurns', itemIndex, 50) as number;

        const agentResult = await runAgentWithPlugin(
          prompt,
          {
            plugins: [{ type: 'local', path: pluginPath }],
            allowedTools: ['Skill', 'mcp__plugin_direct-spend-visualizer_feedmob__get_direct_spends'],
            maxTurns,
            env: buildRuntimeEnv(credentials),
          },
        );

        results.push({
          json: {
            clickUrlId,
            startDate,
            endDate,
            pluginPath,
            prompt,
            responseText: agentResult.text,
            structuredOutput: agentResult.structuredOutput,
            usage: agentResult.usage,
            parsed: normalizeResult(agentResult),
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Claude Agent SDK error';
        if (execContext.continueOnFail && execContext.continueOnFail()) {
          results.push({ json: { error: errorMessage } });
          continue;
        }
        throw error;
      }
    }

    return [results];
  }
}

async function runAgentWithPlugin(
  prompt: string,
  options: Parameters<typeof query>[0]['options'],
): Promise<AgentRunResult> {
  const assistantSnippets: string[] = [];
  let resultMessage: SDKResultMessage | undefined;

  for await (const message of query({ prompt, options })) {
    if (message.type === 'assistant') {
      const text = extractAssistantText(message);
      if (text) assistantSnippets.push(text);
    } else if (message.type === 'result') {
      resultMessage = message;
    }
  }

  if (!resultMessage) throw new Error('Claude Agent SDK returned no result message.');
  if (resultMessage.subtype !== 'success') {
    const reason = Array.isArray(resultMessage.errors) && resultMessage.errors.length
      ? resultMessage.errors.join('; ')
      : `subtype ${resultMessage.subtype}`;
    throw new Error(`Claude Agent run failed: ${reason}`);
  }

  const responseText = (resultMessage.result || assistantSnippets.join('\n')).trim();
  return {
    text: responseText,
    structuredOutput: resultMessage.structured_output,
    usage: resultMessage.usage,
  };
}

function extractAssistantText(message: Extract<SDKMessage, { type: 'assistant' }>): string {
  const assistantMessage = message.message as SDKAssistantMessage['message'];
  const content = Array.isArray((assistantMessage as any).content) ? (assistantMessage as any).content : [];
  const textParts: string[] = [];

  for (const block of content) {
    if (typeof block === 'string') {
      textParts.push(block);
      continue;
    }
    if (block?.type === 'text' && typeof block.text === 'string') {
      textParts.push(block.text);
      continue;
    }
    if (block?.type === 'tool_result' && Array.isArray(block.content)) {
      for (const nested of block.content) {
        if (typeof nested === 'string') textParts.push(nested);
        else if (nested?.type === 'text' && typeof nested.text === 'string') textParts.push(nested.text);
      }
    }
  }

  return textParts.join('\n').trim();
}

function normalizeResult(agentResult: AgentRunResult) {
  const structured =
    (typeof agentResult.structuredOutput === 'object' && agentResult.structuredOutput !== null
      ? agentResult.structuredOutput
      : undefined) ?? tryParseJson(agentResult.text);
  if (structured) return structured;
  return { raw: agentResult.text };
}

function tryParseJson(text?: string): unknown | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const codeBlockMatch = trimmed.match(/```json([\s\S]*?)```/i) || trimmed.match(/```([\s\S]*?)```/i);
  const candidate = codeBlockMatch ? codeBlockMatch[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function buildRuntimeEnv(credentials: FeedmobDirectSpendVisualizerCredentials): NodeJS.ProcessEnv {
  const baseEnv = { ...process.env };
  const awsAccessKeyId = credentials.awsAccessKeyId ?? baseEnv.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = credentials.awsSecretAccessKey ?? baseEnv.AWS_SECRET_ACCESS_KEY;
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY missing. Update the credential or host environment.');
  }

  const feedmobKey = credentials.feedmobKey ?? baseEnv.FEEDMOB_KEY;
  const feedmobSecret = credentials.feedmobSecret ?? baseEnv.FEEDMOB_SECRET;
  const feedmobApiBase = credentials.feedmobApiBase ?? baseEnv.FEEDMOB_API_BASE;
  if (!feedmobKey || !feedmobSecret || !feedmobApiBase) {
    throw new Error('FeedMob API env vars (FEEDMOB_KEY/SECRET/API_BASE) are required for the plugin.');
  }

  return {
    ...baseEnv,
    AWS_REGION: credentials.awsRegion ?? baseEnv.AWS_REGION ?? 'us-east-1',
    AWS_ACCESS_KEY_ID: awsAccessKeyId,
    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
    AWS_RETRY_MODE: baseEnv.AWS_RETRY_MODE ?? 'adaptive',
    AWS_MAX_ATTEMPTS: baseEnv.AWS_MAX_ATTEMPTS ?? '20',
    CLAUDE_CODE_USE_BEDROCK: baseEnv.CLAUDE_CODE_USE_BEDROCK ?? '1',
    ANTHROPIC_MODEL: credentials.anthropicModel ?? baseEnv.ANTHROPIC_MODEL ?? 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    ANTHROPIC_SMALL_FAST_MODEL: credentials.anthropicSmallModel ?? baseEnv.ANTHROPIC_SMALL_FAST_MODEL ?? 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    FEEDMOB_KEY: feedmobKey,
    FEEDMOB_SECRET: feedmobSecret,
    FEEDMOB_API_BASE: feedmobApiBase,
  };
}
