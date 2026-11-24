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
const { registerIronsourceAuraReportsTools } = await import("../ironsource-aura-reports.js");

const args = { start_date: "2026-11-01", end_date: "2026-11-10" };
const matchedRow = {
  date: args.start_date, click_url_id: 123, campaign_id: 456,
  campaign_name: 'Campaign "A", JP', vendor_id: 288, vendor_name: "ironsourceAURA",
  ironsource_aura_campaign_name: 'Prefix Campaign "A", JP Suffix', matched: true,
  impressions: 10000, clicks: 25, completions: 5, installs: 3, partner_net_spend: 12.34,
};
const unmatchedRow = {
  ...matchedRow, ironsource_aura_campaign_name: "Unknown campaign", matched: false,
  click_url_id: null, campaign_id: null, campaign_name: null, vendor_id: null, vendor_name: null,
};
const reportCases = [
  { name: "get_ironsource_aura_reports", suffix: "", geo: false },
  { name: "get_ironsource_aura_reports_geo", suffix: "/geo", geo: true },
];

function responseText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

function responseData(result: Awaited<ReturnType<Client["callTool"]>>) {
  return JSON.parse(responseText(result).split("```json\n")[1].split("\n```")[0]);
}

describe("IronSource Aura report tools", () => {
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
    directory = mkdtempSync(join(tmpdir(), "ironsource-aura-reports-test-"));
    process.chdir(directory);
    requests = [];
    status = 200;
    body = { status: 200, data: [] };
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
    registerIronsourceAuraReportsTools(server);
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

  test("exposes both report tools with dates required and explains duplicate metrics", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(({ name }) => name).sort(), reportCases.map(({ name }) => name));
    for (const tool of tools) {
      assert.deepEqual(tool.inputSchema.required, ["start_date", "end_date"]);
      assert.deepEqual(Object.keys(tool.inputSchema.properties!), ["start_date", "end_date"]);
      assert.match(tool.description!, /vendor 288/);
      assert.match(tool.description!, /do not sum these across Click URLs/);
    }
  });

  for (const report of reportCases) {
    test(`${report.name} sends authenticated GET and preserves metrics, multiple matches and unmatched rows in JSON and CSV`, async () => {
      const rows = [matchedRow, { ...matchedRow, click_url_id: 124 }, unmatchedRow,
        { ...unmatchedRow, ironsource_aura_campaign_name: null, partner_net_spend: 0 }]
        .map((row, index) => report.geo ? { ...row, country_code: ["US", "US", "JP", null][index] } : row);
      body = { status: 200, data: rows };
      const result = await client.callTool({ name: report.name, arguments: args });
      assert.equal(result.isError, undefined);
      const data = responseData(result);
      assert.equal(data.status, 200);
      assert.deepEqual(data.data, rows);
      assert.equal(requests.length, 1);
      const request = requests[0];
      const url = new URL(request.url!);
      assert.equal(request.method, "get");
      assert.equal(url.origin + url.pathname, `https://feedmob.test/ai/api/ironsource_aura_reports${report.suffix}`);
      assert.deepEqual(Object.fromEntries(url.searchParams), args);
      assert.equal(request.timeout, 30000);
      assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
      const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
      assert.equal(typeof token === "object" && token.key, "test-key");
      assert.ok(data.csv_file_path.includes(`${report.name.slice(4)}_${args.start_date}_to_${args.end_date}_`));
      const csv = readFileSync(data.csv_file_path, "utf8");
      assert.ok(csv.includes('"Campaign ""A"", JP"'));
      assert.ok(csv.includes('"false"'));
      assert.ok(csv.includes('"12.34"'));
      assert.ok(csv.includes('"completions"'));
      assert.ok(csv.includes('"installs"'));
      assert.ok(csv.includes('"0"'));
      assert.equal(csv.split("\n").length, rows.length + 1);
      assert.equal(csv.includes('"country_code"'), report.geo);
      if (report.geo) {
        assert.ok(csv.includes('"US"'));
        assert.ok(csv.includes('"JP"'));
      }
      assert.ok(responseText(result).includes(`CSV file saved to: ${data.csv_file_path}`));
    });

    test(`${report.name} accepts a single day and returns empty results without CSV`, async () => {
      const dates = { start_date: args.start_date, end_date: args.start_date };
      const result = await client.callTool({ name: report.name, arguments: dates });
      assert.equal(result.isError, undefined);
      assert.deepEqual(responseData(result), { status: 200, data: [] });
      assert.deepEqual(Object.fromEntries(new URL(requests[0].url!).searchParams), dates);
      assert.doesNotMatch(responseText(result), /CSV file saved/);
      assert.deepEqual(readdirSync(directory), []);
    });

    test(`${report.name} rejects missing, invalid and reversed dates before HTTP`, async () => {
      for (const arguments_ of [
        {}, { start_date: args.start_date }, { end_date: args.end_date },
        { ...args, start_date: "2026-02-30" }, { ...args, end_date: "11/10/2026" },
      ]) {
        await assert.rejects(client.callTool({ name: report.name, arguments: arguments_ }), /Invalid arguments/);
      }
      const result = await client.callTool({ name: report.name, arguments: { ...args, start_date: "2026-11-11" } });
      assert.equal(result.isError, true);
      assert.match(responseText(result), /start_date cannot be after end_date/);
      assert.equal(requests.length, 0);
    });

    for (const [code, message, pattern] of [
      [400, "invalid date", /Bad Request \(400\)/],
      [401, "Invalid token", /Unauthorized/],
      [429, "provider rate limit", /429/],
      [502, "provider error", /Bad Gateway \(502\)/],
      [503, "Aura key is missing", /503/],
    ] as const) {
      test(`${report.name} returns HTTP ${code} and API details as a tool error`, async () => {
        status = code;
        body = { status: code, error: message };
        const result = await client.callTool({ name: report.name, arguments: args });
        assert.equal(result.isError, true);
        assert.match(responseText(result), pattern);
        assert.ok(responseText(result).includes(message));
        assert.equal(requests.length, 1);
        assert.deepEqual(readdirSync(directory), []);
      });
    }

    test(`${report.name} reports network failure without exposing authentication headers`, async () => {
      networkFailure = true;
      const result = await client.callTool({ name: report.name, arguments: args });
      assert.equal(result.isError, true);
      assert.match(responseText(result), /ECONNABORTED/);
      assert.doesNotMatch(responseText(result), /test-key|test-secret|FEEDMOB-TOKEN/);
      assert.equal(requests.length, 1);
      assert.deepEqual(readdirSync(directory), []);
    });
  }
});
