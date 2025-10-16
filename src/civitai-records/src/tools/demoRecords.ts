import type { ContentResult } from "fastmcp";
import { z } from "zod";

const demoRecords = [
  {
    id: "civitai-demo-001",
    name: "Placeholder Model",
    version: "1.0.0",
    description: "Sample record used to validate wiring.",
  },
  {
    id: "civitai-demo-002",
    name: "Another Placeholder",
    version: "0.2.1",
    description: "Swap in real data once the integration is ready.",
  },
  {
    id: "civitai-demo-003",
    name: "Sandbox Entry",
    version: "0.0.1",
    description: "Keeps the tool outputs predictable for testing.",
  },
] as const;

const defaultLimit = 3;

export const listDemoRecordsParameters = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(demoRecords.length)
    .default(defaultLimit)
    .describe("Maximum number of placeholder records to return."),
});

export type ListDemoRecordsParameters = z.infer<typeof listDemoRecordsParameters>;

export const listDemoRecordsTool = {
  name: "list_demo_records",
  description:
    "Return a slice of placeholder Civitai records. Replace this tool with real logic when implementing the integration.",
  parameters: listDemoRecordsParameters,
  execute: async ({ limit }: ListDemoRecordsParameters): Promise<ContentResult> => {
    const normalizedLimit = Math.min(Math.max(limit, 1), demoRecords.length);
    const results = demoRecords.slice(0, normalizedLimit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ records: results, count: results.length }, null, 2),
        },
      ],
    } satisfies ContentResult;
  },
};
