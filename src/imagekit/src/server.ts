
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "feedmob-imagekit",
  version: "1.0.0",
});

// A simple tool
server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => String(a + b),
});


server.start({ transportType: "stdio" });
