import type { ContentResult } from "fastmcp";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workflowContent = fs.readFileSync(
  path.join(__dirname, "../prompts/record-civitai-workflow.md"),
  "utf-8"
);

export const getWorkflowGuideParameters = z.object({});

export type GetWorkflowGuideParameters = z.infer<typeof getWorkflowGuideParameters>;

export const getWorkflowGuideTool = {
  name: "get_workflow_guide",
  description: "Get the complete step-by-step guide for properly recording Civitai posts, prompts, and assets. Use this to understand the correct workflow order and best practices.",
  parameters: getWorkflowGuideParameters,
  execute: async (): Promise<ContentResult> => {
    return {
      content: [
        {
          type: "text",
          text: workflowContent,
        },
      ],
    } satisfies ContentResult;
  },
};
