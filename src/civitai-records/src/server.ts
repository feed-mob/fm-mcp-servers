#!/usr/bin/env node

import "dotenv/config";
import { FastMCP } from "fastmcp";

import { createPromptTool } from "./tools/createPrompt.js";
import { createAssetTool } from "./tools/createAsset.js";
import { updateAssetTool } from "./tools/updateAsset.js";
import { findAssetTool } from "./tools/findAsset.js";
import { calculateSha256Tool } from "./tools/calculateSha256.js";
import { createCivitaiPostTool } from "./tools/createCivitaiPost.js";
import { listCivitaiPostsTool } from "./tools/listCivitaiPosts.js";
import { getWorkflowGuideTool } from "./tools/getWorkflowGuide.js";
import { fetchCivitaiPostAssetsTool } from "./tools/fetchCivitaiPostAssets.js";
import { getMediaEngagementGuideTool } from "./tools/getMediaEngagementGuide.js";
import { syncPostAssetStatsTool } from "./tools/syncPostAssetStats.js";
import { recordCivitaiWorkflowPrompt } from "./prompts/recordCivitaiWorkflow.js";
import { civitaiMediaEngagementPrompt } from "./prompts/civitaiMediaEngagement.js";

const server = new FastMCP({
  name: "feedmob-civitai-records",
  version: "0.1.16",
});

server.addPrompt(recordCivitaiWorkflowPrompt);
server.addPrompt(civitaiMediaEngagementPrompt);

server.addTool(getWorkflowGuideTool);
server.addTool(getMediaEngagementGuideTool);
server.addTool(createPromptTool);
server.addTool(createAssetTool);
server.addTool(updateAssetTool);
server.addTool(findAssetTool);
server.addTool(calculateSha256Tool);
server.addTool(createCivitaiPostTool);
server.addTool(listCivitaiPostsTool);
server.addTool(fetchCivitaiPostAssetsTool);
server.addTool(syncPostAssetStatsTool);

server.start({ transportType: "stdio" });
