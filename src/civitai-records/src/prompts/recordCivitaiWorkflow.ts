import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const recordCivitaiWorkflowPrompt = {
  name: "record_civitai_workflow",
  description: "Guide for properly recording Civitai posts, prompts, and assets in the correct order",
  load: async () => {
    const workflowContent = await fs.promises.readFile(
      path.join(__dirname, "record-civitai-workflow.md"),
      "utf-8"
    );
    return workflowContent;
  },
};
