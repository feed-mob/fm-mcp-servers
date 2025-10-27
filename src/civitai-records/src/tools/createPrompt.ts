import type { ContentResult } from "fastmcp";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const metadataSchema = z.record(z.any()).nullable().default(null);

export const createPromptParameters = z.object({
  prompt_text: z
    .string()
    .min(1)
    .describe("The actual text content of the prompt. This is the main creative or instructional text that describes what the user wants to generate or accomplish."),
  llm_model_provider: z
    .string()
    .nullable()
    .default(null)
    .describe("The AI model provider used with this prompt (e.g., 'openai', 'anthropic', 'google'). Leave empty if not applicable or unknown."),
  llm_model: z
    .string()
    .nullable()
    .default(null)
    .describe("The specific AI model name or identifier (e.g., 'gpt-4', 'claude-3-opus', 'gemini-pro'). Leave empty if not applicable or unknown."),
  purpose: z
    .string()
    .nullable()
    .default(null)
    .describe("The intended purpose or use case for this prompt (e.g., 'image_generation', 'video_creation', 'text_completion'). Leave empty if not applicable or unknown."),
  metadata: metadataSchema.describe("Additional structured data about this prompt in JSON format. Can include tags, categories, version info, or any custom fields relevant to your workflow."),
  on_behalf_of: z
    .string()
    .nullable()
    .default(null)
    .describe("The user account this action is being performed on behalf of. If not provided, defaults to the authenticated database user and can be changed later via update tools."),
});

export type CreatePromptParameters = z.infer<typeof createPromptParameters>;

export const createPromptTool = {
  name: "create_prompt",
  description: "Save a user's text prompt to the database. Use this to store prompts that will be used for content generation, video creation, or other AI tasks.",
  parameters: createPromptParameters,
  execute: async ({ prompt_text, llm_model_provider, llm_model, purpose, metadata, on_behalf_of }: CreatePromptParameters): Promise<ContentResult> => {
    const prompt = await prisma.prompts.create({
      data: {
        content: prompt_text,
        llm_model_provider,
        llm_model,
        purpose,
        metadata: metadata ?? undefined,
        on_behalf_of: on_behalf_of ?? undefined,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            prompt_id: prompt.id.toString(),
            prompt_text: prompt.content,
            llm_model_provider: prompt.llm_model_provider,
            llm_model: prompt.llm_model,
            on_behalf_of: prompt.on_behalf_of,
            created_at: prompt.created_at.toISOString(),
          }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
