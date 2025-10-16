#!/usr/bin/env node

import "dotenv/config";
import { FastMCP } from "fastmcp";

import { listDemoRecordsTool } from "./tools/demoRecords.js";

const server = new FastMCP({
  name: "feedmob-civitai-records",
  version: "0.1.0",
});

server.addTool(listDemoRecordsTool);

server.start({ transportType: "stdio" });
