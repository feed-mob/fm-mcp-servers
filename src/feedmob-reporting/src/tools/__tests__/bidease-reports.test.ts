import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import jwt from "jsonwebtoken";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

Object.assign(process.env, {
  FEEDMOB_API_BASE: "https://feedmob.test",
  FEEDMOB_KEY: "test-key",
  FEEDMOB_SECRET: "test-secret",
});
const { registerBideaseReportsTool } = await import("../bidease-reports.js");

const matchedRow = {
  date: "2026-11-01", click_url_id: 123, campaign_id: 456,
  campaign_name: 'Campaign "A", JP', vendor_id: 789, vendor_name: "Bidease",
  bidease_advertiser_id: 100, bidease_campaign_id: "200",
  bidease_campaign_name: "Campaign A", matched: true,
  impressions: 10000, clicks: 25, conversions: 3, partner_net_spend: 12.34,
};
const unmatchedRow = {
  ...matchedRow, bidease_campaign_id: "201", matched: false,
  click_url_id: null, campaign_id: null, campaign_name: null,
  vendor_id: null, vendor_name: null,
};
const args = { start_date: "2026-11-01", end_date: "2026-11-10" };

function responseText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

describe("get_bidease_reports", () => {
  let server: McpServer;
  let client: Client;
  let requests: InternalAxiosRequestConfig[];
  let status: number;
  let body: unknown;
  let networkFailure: boolean;
  let directory: string;
  const originalDirectory = process.cwd();
  const originalAdapter = axios.defaults.adapter;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "bidease-reports-test-"));
    process.chdir(directory);
    requests = [];
    status = 200;
    body = { status: 200, data: [matchedRow, unmatchedRow] };
    networkFailure = false;
    axios.defaults.adapter = async (config) => {
      requests.push(config);
      if (networkFailure) {
        throw new AxiosError("Connection failed", "ECONNABORTED", config);
      }
      const response = { data: body, status, statusText: String(status), headers: {}, config };
      if (status >= 400) {
        throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
      }
      return response;
    };
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerBideaseReportsTool(server);
    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    axios.defaults.adapter = originalAdapter;
    process.chdir(originalDirectory);
    rmSync(directory, { recursive: true, force: true });
  });

  function callTool(arguments_: Record<string, unknown> = args) {
    return client.callTool({ name: "get_bidease_reports", arguments: arguments_ });
  }

  test("exposes the tool with both dates required", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find(({ name }) => name === "get_bidease_reports");
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ["start_date", "end_date"]);
  });

  test("sends an authenticated GET and preserves matched and unmatched data in JSON and CSV", async () => {
    const result = await callTool();
    assert.equal(result.isError, undefined);
    const text = responseText(result);
    const data = JSON.parse(text.split("```json\n")[1].split("\n```")[0]);
    assert.deepEqual(data.data, [matchedRow, unmatchedRow]);
    assert.equal(requests.length, 1);
    const request = requests[0];
    const url = new URL(request.url!);
    assert.equal(request.method, "get");
    assert.equal(url.origin + url.pathname, "https://feedmob.test/ai/api/bidease_reports");
    assert.deepEqual(Object.fromEntries(url.searchParams), args);
    assert.equal(request.timeout, 30000);
    assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
    const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
    assert.equal(typeof token === "object" && token.key, "test-key");
    assert.match(data.csv_file_path, /bidease_reports_2026-11-01_to_2026-11-10_.*\.csv$/);
    const csv = readFileSync(data.csv_file_path, "utf8");
    assert.ok(csv.includes('"Campaign ""A"", JP"'));
    assert.ok(csv.includes('"false"'));
    assert.ok(csv.includes('"12.34"'));
    assert.equal(csv.split("\n").length, 3);
    assert.ok(text.includes(`CSV file saved to: ${data.csv_file_path}`));
  });

  test("returns empty results without a CSV and accepts a single-day range", async () => {
    body = { status: 200, data: [] };
    const result = await callTool({ start_date: args.start_date, end_date: args.start_date });
    assert.equal(result.isError, undefined);
    assert.match(responseText(result), /"data": \[\]/);
    assert.doesNotMatch(responseText(result), /csv_file_path|CSV file saved/);
    assert.deepEqual(readdirSync(directory), []);
  });

  test("rejects missing, invalid and reversed dates before any HTTP request", async () => {
    for (const arguments_ of [
      {}, { start_date: args.start_date }, { end_date: args.end_date },
      { ...args, start_date: "2026-02-30" }, { ...args, end_date: "11/10/2026" },
    ]) {
      await assert.rejects(callTool(arguments_), /Invalid arguments/);
    }
    const result = await callTool({ ...args, start_date: "2026-11-11" });
    assert.equal(result.isError, true);
    assert.match(responseText(result), /start_date cannot be after end_date/);
    assert.equal(requests.length, 0);
  });

  for (const [code, message, pattern] of [
    [400, "start_date and end_date are required", /Bad Request \(400\)/],
    [401, "Invalid token", /Unauthorized/],
    [404, "Not found", /Not Found \(404\)/],
    [502, "Bidease stats request failed", /Bad Gateway \(502\)/],
  ] as const) {
    test(`returns HTTP ${code} and the API error as a tool error`, async () => {
      status = code;
      body = { status: code, error: message };
      const result = await callTool();
      assert.equal(result.isError, true);
      assert.match(responseText(result), pattern);
      assert.ok(responseText(result).includes(message));
      assert.equal(requests.length, 1);
      assert.deepEqual(readdirSync(directory), []);
    });
  }

  test("returns network failures without exposing authentication headers", async () => {
    networkFailure = true;
    const result = await callTool();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /ECONNABORTED/);
    assert.doesNotMatch(responseText(result), /test-key|test-secret|FEEDMOB-TOKEN/);
    assert.equal(requests.length, 1);
  });
});
