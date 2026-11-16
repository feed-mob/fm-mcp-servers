import assert from "node:assert/strict";
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
const { registerClickUrlsTool } = await import("../click-urls.js");

const row = {
  id: 56, uuid: "click-url-uuid", campaign_id: 12, campaign_name: "Test campaign",
  client_id: 34, client_name: "Test client", vendor_id: 78, vendor_name: "Test vendor",
  track_party_name: "AppsFlyer", tracking_url: "https://tracking.test/click?a=1&b=2",
  direct_spend_input: false, net_cpi: "1.5", gross_cpi: "2", margin: "25",
  client_paid_action: "multiple", vendor_paid_action: "first_install",
  link_type: "fm_link", status: "active", display_status: "Active",
  approved_countries: ["US", "JP"], impression_tracking_enabled: true,
};
const success = {
  status: 200, data: [row],
  meta: { current_page: 1, per_page: 100, total_count: 101, total_pages: 2 },
};

function responseText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

describe("get_click_urls", () => {
  let server: McpServer;
  let client: Client;
  let requests: InternalAxiosRequestConfig[];
  let status: number;
  let body: unknown;
  let networkFailure: boolean;
  const originalAdapter = axios.defaults.adapter;

  beforeEach(async () => {
    requests = [];
    status = 200;
    body = success;
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
    registerClickUrlsTool(server);
    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    axios.defaults.adapter = originalAdapter;
  });

  function callTool(arguments_: Record<string, unknown> = {}) {
    return client.callTool({ name: "get_click_urls", arguments: arguments_ });
  }

  test("exposes optional filters with pagination guidance", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find(({ name }) => name === "get_click_urls");
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required ?? [], []);
    assert.match(tool.description ?? "", /meta.total_pages/);
  });

  test("sends authenticated GET, preserves all row fields and meta, and fetches one page", async () => {
    const result = await callTool();
    assert.equal(result.isError, undefined);
    assert.equal(responseText(result), `Click URLs:\n${JSON.stringify(success, null, 2)}`);
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.method, "get");
    assert.equal(request.url, "https://feedmob.test/ai/api/click_urls");
    assert.equal(request.data, undefined);
    assert.equal(request.timeout, 30000);
    assert.equal(request.headers.get("Accept"), "application/json");
    assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
    const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
    assert.equal(typeof token === "object" && token.key, "test-key");
  });

  test("combines every scalar filter without losing false or zero", async () => {
    const filters = {
      client_id: 34, campaign_id: "12", vendor_id: 78, parent_campaign_id: 90,
      click_url_id: 56, direct_spend_input: false, stage_level: 0,
      link_type: "fm_link", client_paid_action: 0, vendor_paid_action: "first_install",
      page: 2, per_page: 25,
    };
    await callTool(filters);
    const url = new URL(requests[0].url!);
    assert.deepEqual(Object.fromEntries(url.searchParams),
      Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, String(value)])));
    assert.equal(requests.length, 1);
  });

  test("encodes multiple IDs with Rails array query keys without broadening the filters", async () => {
    await callTool({ client_id: "34", campaign_id: [12, "13"], vendor_id: [78, "79"], click_url_id: [56, "57"] });
    const params = new URL(requests[0].url!).searchParams;
    assert.equal(params.get("client_id"), "34");
    assert.deepEqual(params.getAll("campaign_id[]"), ["12", "13"]);
    assert.deepEqual(params.getAll("vendor_id[]"), ["78", "79"]);
    assert.deepEqual(params.getAll("click_url_id[]"), ["56", "57"]);
    for (const key of ["campaign_id", "vendor_id", "click_url_id", "vendor_ids[]"]) {
      assert.equal(params.has(key), false);
    }
  });

  test("supports true, string stage levels and numeric enum filters", async () => {
    await callTool({ direct_spend_input: true, stage_level: "1", link_type: 2, client_paid_action: "4", vendor_paid_action: 5 });
    const params = new URL(requests[0].url!).searchParams;
    assert.deepEqual(Object.fromEntries(params), {
      direct_spend_input: "true", stage_level: "1", link_type: "2", client_paid_action: "4", vendor_paid_action: "5",
    });
  });

  test("forwards explicit pagination and preserves the server's capped page size", async () => {
    body = { ...success, meta: { current_page: 2, per_page: 100, total_count: 101, total_pages: 2 } };
    const result = await callTool({ page: 2, per_page: 1000 });
    const params = new URL(requests[0].url!).searchParams;
    assert.deepEqual(Object.fromEntries(params), { page: "2", per_page: "1000" });
    assert.equal(responseText(result), `Click URLs:\n${JSON.stringify(body, null, 2)}`);
    assert.equal(requests.length, 1);
  });

  test("preserves empty results and zero pagination totals", async () => {
    body = { status: 200, data: [], meta: { current_page: 1, per_page: 100, total_count: 0, total_pages: 0 } };
    const result = await callTool({ client_id: 999 });
    assert.equal(result.isError, undefined);
    assert.equal(responseText(result), `Click URLs:\n${JSON.stringify(body, null, 2)}`);
  });

  test("rejects malformed IDs, empty arrays, invalid pagination and booleans before HTTP", async () => {
    for (const field of ["campaign_id", "vendor_id", "click_url_id"]) {
      for (const value of [0, -1, 1.5, "", "bad", [], [0], [null], [1, "bad"], [[1]]]) {
        await assert.rejects(callTool({ [field]: value }), /Invalid arguments/);
      }
    }
    for (const filters of [
      { client_id: 0 }, { parent_campaign_id: [1] }, { page: 0 }, { page: 1.5 },
      { per_page: -1 }, { per_page: "100" }, { direct_spend_input: "false" },
      { stage_level: 3 }, { stage_level: "invalid" }, { client_paid_action: -1 },
      { vendor_paid_action: [] }, { link_type: "" },
    ]) {
      await assert.rejects(callTool(filters), /Invalid arguments/);
    }
    assert.equal(requests.length, 0);
  });

  for (const [code, errors, pattern] of [
    [400, ["campaign_id must be a positive integer or a non-empty array of positive integers"], /Bad Request \(400\)/],
    [401, ["Invalid token"], /Unauthorized/],
    [403, "Access denied", /Forbidden \(403\)/],
    [404, ["Not found"], /Not Found \(404\)/],
    [500, ["Click URL lookup failed"], /500/],
  ] as const) {
    test(`returns HTTP ${code} and the API error details`, async () => {
      status = code;
      body = { status: code, data: [], errors };
      const result = await callTool();
      assert.equal(result.isError, true);
      assert.match(responseText(result), pattern);
      assert.ok(responseText(result).includes(JSON.stringify(errors)));
      assert.equal(requests.length, 1);
    });
  }

  test("preserves a fallback API error message", async () => {
    status = 500;
    body = { status: 500, message: "Unable to load Click URLs" };
    const result = await callTool();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /Unable to load Click URLs/);
  });

  test("treats application errors in HTTP success responses as tool errors", async () => {
    for (const payload of [
      { status: 400, data: [], errors: [] },
      { status: 200, data: [], errors: { filters: ["Invalid filter"] } },
    ]) {
      body = payload;
      const result = await callTool();
      assert.equal(result.isError, true);
      assert.ok(responseText(result).includes(JSON.stringify(payload)));
    }
  });

  test("reports network failures without exposing authentication headers", async () => {
    networkFailure = true;
    const result = await callTool();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /ECONNABORTED/);
    assert.doesNotMatch(responseText(result), /test-key|test-secret|FEEDMOB-TOKEN/);
    assert.equal(requests.length, 1);
  });
});
