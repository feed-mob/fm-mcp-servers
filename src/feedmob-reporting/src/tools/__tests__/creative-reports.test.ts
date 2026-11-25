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
const { registerCreativeReportsTools } = await import("../creative-reports.js");

const args = { start_date: "2026-11-01", end_date: "2026-11-10" };
const metadata = {
  date: args.start_date, click_url_id: 123, campaign_id: 456,
  campaign_name: 'Campaign "A", JP', vendor_id: 789,
  matched: true, impressions: 10000, clicks: 25, partner_net_spend: 12.34,
};
const beeswaxRow = {
  ...metadata, vendor_name: "Freewheel", beeswax_campaign_id: "200",
  beeswax_campaign_name: "Campaign A", beeswax_line_item_id: "300",
  beeswax_line_item_name: "Line item A", beeswax_creative_id: "400", apac_fee: 5,
};
const bideaseRow = {
  ...metadata, vendor_name: "Bidease", bidease_advertiser_id: 100,
  bidease_campaign_id: "200", bidease_campaign_name: "Campaign A",
  bidease_creative_id: "400", conversions: 3,
};
const reportCases = [
  { name: "get_beeswax_reports_creative", provider: "beeswax", row: beeswaxRow, creativeField: "beeswax_creative_id" },
  { name: "get_bidease_reports_creative", provider: "bidease", row: bideaseRow, creativeField: "bidease_creative_id" },
];

function responseText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

function responseData(result: Awaited<ReturnType<Client["callTool"]>>) {
  return JSON.parse(responseText(result).split("```json\n")[1].split("\n```")[0]);
}

describe("creative query tools", () => {
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
    directory = mkdtempSync(join(tmpdir(), "creative-reports-test-"));
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
    registerCreativeReportsTools(server);
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

  function assertAuthenticatedGet(path: string) {
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.method, "get");
    assert.equal(new URL(request.url!).pathname, path);
    assert.equal(new URL(request.url!).origin, "https://feedmob.test");
    assert.equal(request.timeout, 30000);
    assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
    const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
    assert.equal(typeof token === "object" && token.key, "test-key");
  }

  test("exposes all three tools and their required inputs and spend semantics", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(({ name }) => name).sort(), [
      "get_beeswax_creative", "get_beeswax_reports_creative", "get_bidease_reports_creative",
    ]);
    for (const tool of tools) {
      assert.deepEqual(tool.inputSchema.required,
        tool.name === "get_beeswax_creative" ? ["creative_id"] : ["start_date", "end_date"]);
    }
    const beeswaxTool = tools.find(({ name }) => name === "get_beeswax_reports_creative")!;
    assert.match(beeswaxTool.description!, /media spend plus vendor fees, excluding bid shading fees/);
    assert.match(beeswaxTool.description!, /once per click URL and date/);
  });

  for (const report of reportCases) {
    test(`${report.name} preserves individual creatives and unmatched rows in JSON and CSV`, async () => {
      const rows = [report.row, { ...report.row, [report.creativeField]: "401", partner_net_spend: 0 }, {
        ...report.row, [report.creativeField]: "402", matched: false,
        click_url_id: null, campaign_id: null, campaign_name: null, vendor_id: null, vendor_name: null,
      }];
      body = { status: 200, data: rows };
      const result = await client.callTool({ name: report.name, arguments: args });
      assert.equal(result.isError, undefined);
      const data = responseData(result);
      assert.equal(data.status, 200);
      assert.deepEqual(data.data, rows);
      assertAuthenticatedGet(`/ai/api/${report.provider}_reports/creative`);
      assert.deepEqual(Object.fromEntries(new URL(requests[0].url!).searchParams), args);
      assert.ok(data.csv_file_path.includes(`${report.provider}_reports_creative_${args.start_date}_to_${args.end_date}_`));
      const csv = readFileSync(data.csv_file_path, "utf8");
      assert.ok(csv.includes(`"${report.creativeField}"`));
      assert.ok(csv.includes('"Campaign ""A"", JP"'));
      assert.ok(csv.includes('"false"'));
      assert.ok(csv.includes('"0"'));
      assert.equal(csv.split("\n").length, 4);
      assert.ok(responseText(result).includes(`CSV file saved to: ${data.csv_file_path}`));
    });

    test(`${report.name} accepts a single day and returns empty results without a CSV`, async () => {
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
  }

  test("get_beeswax_creative returns the original nested REST JSON without CSV conversion", async () => {
    body = { status: 200, data: {
      creative_id: 400, name: "Banner A", active: true,
      assets: [{ url: "https://cdn.test/banner.png", width: 320, height: 50 }],
      extra: { tags: ["a", "b"], optional: null },
    } };
    const result = await client.callTool({ name: "get_beeswax_creative", arguments: { creative_id: "400" } });
    assert.equal(result.isError, undefined);
    assert.deepEqual(responseData(result), body);
    assertAuthenticatedGet("/ai/api/beeswax_reports/creative/400");
    assert.equal(new URL(requests[0].url!).search, "");
    assert.deepEqual(readdirSync(directory), []);
  });

  test("get_beeswax_creative rejects missing, zero, negative, fractional and unsafe IDs before HTTP", async () => {
    for (const arguments_ of [{}, ...["", "0", "000", "-1", "1.5", "1e3", "abc", "../400", "400?x=1", " 400 ", 400].map((creative_id) => ({ creative_id }))]) {
      await assert.rejects(client.callTool({ name: "get_beeswax_creative", arguments: arguments_ }), /Invalid arguments/);
    }
    assert.equal(requests.length, 0);
  });

  test("get_beeswax_creative preserves string IDs beyond JavaScript integer precision", async () => {
    const creative_id = "9007199254740993";
    body = { status: 200, data: { creative_id } };
    const result = await client.callTool({ name: "get_beeswax_creative", arguments: { creative_id } });
    assert.equal(result.isError, undefined);
    assertAuthenticatedGet(`/ai/api/beeswax_reports/creative/${creative_id}`);
    assert.deepEqual(responseData(result), body);
  });

  for (const name of [...reportCases.map((report) => report.name), "get_beeswax_creative"]) {
    const toolArgs = name === "get_beeswax_creative" ? { creative_id: "400" } : args;

    for (const [code, message, pattern] of [
      [400, "Invalid query", /Bad Request \(400\)/],
      [401, "Invalid token", /Unauthorized/],
      [404, "Not found", /Not Found \(404\)/],
      [502, "Upstream creative request failed", /Bad Gateway \(502\)/],
    ] as const) {
      test(`${name} returns HTTP ${code} and API details as a tool error`, async () => {
        status = code;
        body = { status: code, error: message };
        const result = await client.callTool({ name, arguments: toolArgs });
        assert.equal(result.isError, true);
        assert.match(responseText(result), pattern);
        assert.ok(responseText(result).includes(message));
        assert.equal(requests.length, 1);
        assert.deepEqual(readdirSync(directory), []);
      });
    }

    test(`${name} reports network failures without exposing authentication headers`, async () => {
      networkFailure = true;
      const result = await client.callTool({ name, arguments: toolArgs });
      assert.equal(result.isError, true);
      assert.match(responseText(result), /ECONNABORTED/);
      assert.doesNotMatch(responseText(result), /test-key|test-secret|FEEDMOB-TOKEN/);
      assert.equal(requests.length, 1);
      assert.deepEqual(readdirSync(directory), []);
    });
  }
});
