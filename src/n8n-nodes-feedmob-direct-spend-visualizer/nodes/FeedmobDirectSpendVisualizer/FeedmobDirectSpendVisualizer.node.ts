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
  anthropicApiKey: string;
  model?: string;
  feedmobKey?: string;
  feedmobSecret?: string;
  feedmobApiBase?: string;
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
        displayName: 'Claude Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'Claude 3.5 Sonnet (latest)', value: 'claude-3-5-sonnet-latest' },
          { name: 'Claude 3.5 Haiku (latest)', value: 'claude-3-5-haiku-latest' },
          { name: 'Claude 3 Opus (latest)', value: 'claude-3-opus-latest' },
        ],
        default: 'claude-3-5-sonnet-latest',
        description: 'Model used for Claude Agent SDK queries. Falls back to the credential default.',
      },
      {
        displayName: 'Max Turns',
        name: 'maxTurns',
        type: 'number',
        default: 3,
        typeOptions: { minValue: 1, maxValue: 8, numberStepSize: 1 },
        description: 'Number of reasoning turns allowed for the Claude Agent.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = (await this.getCredentials('feedmobDirectSpendVisualizerApi')) as FeedmobDirectSpendVisualizerCredentials;
    if (!credentials?.anthropicApiKey) {
      throw new Error('Missing Anthropic API key in credentials.');
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
        const maxTurns = this.getNodeParameter('maxTurns', itemIndex, 3) as number;
        const credentialModel = credentials.model || 'claude-3-5-sonnet-latest';
        const nodeModel = this.getNodeParameter('model', itemIndex, credentialModel) as string;

        const agentResult = await runAgentWithPlugin(prompt, {
          plugins: [{ type: 'local', path: pluginPath }],
          maxTurns,
          model: nodeModel || credentialModel,
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: credentials.anthropicApiKey,
            FEEDMOB_KEY: credentials.feedmobKey ?? process.env.FEEDMOB_KEY,
            FEEDMOB_SECRET: credentials.feedmobSecret ?? process.env.FEEDMOB_SECRET,
            FEEDMOB_API_BASE: credentials.feedmobApiBase ?? process.env.FEEDMOB_API_BASE,
          },
        });

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
