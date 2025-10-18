#!/usr/bin/env node

import "dotenv/config";
import { FastMCP } from "fastmcp";

import { createPromptTool } from "./tools/createPrompt.js";
import { createAssetTool } from "./tools/createAsset.js";
import { updateAssetTool } from "./tools/updateAsset.js";
import { createCivitaiPostTool } from "./tools/createCivitaiPost.js";
import { listCivitaiPostsTool } from "./tools/listCivitaiPosts.js";
import { getWorkflowGuideTool } from "./tools/getWorkflowGuide.js";
import { recordCivitaiWorkflowPrompt } from "./prompts/recordCivitaiWorkflow.js";

const server = new FastMCP({
  name: "feedmob-civitai-records",
  version: "0.1.0",
});

server.addPrompt(recordCivitaiWorkflowPrompt);

server.addTool(getWorkflowGuideTool);
server.addTool(createPromptTool);
server.addTool(createAssetTool);
server.addTool(updateAssetTool);
server.addTool(createCivitaiPostTool);
server.addTool(listCivitaiPostsTool);

server.start({ transportType: "stdio" });
