#!/usr/bin/env node

import "dotenv/config";
import { FastMCP } from "fastmcp";

import { createPromptTool } from "./tools/createPrompt.js";
import { createAssetTool } from "./tools/createAsset.js";
import { updateAssetPromptTool } from "./tools/updateAssetPrompt.js";

const server = new FastMCP({
  name: "feedmob-civitai-records",
  version: "0.1.0",
});

server.addTool(createPromptTool);
server.addTool(createAssetTool);
server.addTool(updateAssetPromptTool);

server.start({ transportType: "stdio" });
