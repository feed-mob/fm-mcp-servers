import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

// Set dummy credentials before loading the API module; never use real credentials.
const testEnv = {
  FEEDMOB_API_BASE: "https://feedmob.test",
  FEEDMOB_KEY: "test-key",
  FEEDMOB_SECRET: "test-secret",
};
Object.assign(process.env, testEnv);
const { registerClickUrlPricesTool } = await import("../click-url-prices.js");

const row = { spend_date: "2026-11-05", net_cpi: "15", gross_cpi: "25", margin: "40" };
const todayRateNotice = "Updating today's NET rate, GROSS rate, and MARGIN changes the Click URL's rates for today and all future dates until the next rate change.";
const success = {
  status: 200,
  data: [{ ...row, click_url_id: 123 }],
  errors: [],
  warnings: [],
};
const warning = {
  status: 422,
  data: {},
  title: "Edit Unit Price Errors",
  confirmation_required: true,
  errors: [{ title: "NET, GROSS, and MARGIN calculation is incorrect", content: ["Calculated margin is 39.84%, input is 40%"] }],
  message: "Resubmit with confirm: true to continue, or edit NET, GROSS, and MARGIN to cancel.",
};

function responseText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

describe("update_click_url_prices", () => {
  let server: McpServer;
  let client: Client;
  let requests: InternalAxiosRequestConfig[];
  let status: number;
  let body: unknown;
  const originalAdapter = axios.defaults.adapter;

  beforeEach(async () => {
    requests = [];
    status = 200;
    body = success;
    axios.defaults.adapter = async (config) => {
      requests.push(config);
      const response = { data: body, status, statusText: String(status), headers: {}, config };
      if (status >= 400) {
        throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
      }
      return response;
    };
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerClickUrlPricesTool(server);
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

  const args = { click_url_id: 123, prices: [row] };
  function callTool(arguments_: Record<string, unknown> = args) {
    return client.callTool({ name: "update_click_url_prices", arguments: arguments_ });
  }

  test("sends authenticated PATCH with the full batch and confirm false by default", async () => {
    const prices = [row, { spend_date: "2026-11-06", net_cpi: 0, gross_cpi: "N/A", margin: -10 }];
    const result = await callTool({ click_url_id: 123, prices });
    assert.equal(result.isError, undefined);
    assert.match(responseText(result), /updated successfully/);
    assert.ok(!responseText(result).includes(todayRateNotice));
    assert.ok(responseText(result).includes(JSON.stringify(success, null, 2)));
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.method, "patch");
    assert.equal(request.url, "https://feedmob.test/ai/api/click_urls/123/prices");
    assert.deepEqual(JSON.parse(request.data), { prices, confirm: false });
    assert.equal(request.headers.get("FEEDMOB-KEY"), testEnv.FEEDMOB_KEY);
    assert.ok(request.headers.get("FEEDMOB-TOKEN"));
  });

  test("advertises today's date and its future rate effect before submission", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((tool) => tool.name === "update_click_url_prices");
    assert.ok(tool);
    assert.match(tool.description!, /Before submitting today's prices, inform the user:/);
    assert.ok(tool.description!.includes(todayRateNotice));
    const prices = tool.inputSchema.properties!.prices as {
      items: { properties: { spend_date: { description: string } } };
    };
    assert.match(prices.items.properties.spend_date.description, /on or before today/);
    assert.ok(prices.items.properties.spend_date.description.includes(todayRateNotice));
  });

  test("submits a mixed past/today batch and displays the API notice without requiring confirmation", async () => {
    const today = { ...row, spend_date: new Date().toISOString().slice(0, 10) };
    const prices = [row, today];
    body = { ...success, data: prices.map((price) => ({ ...price, click_url_id: 123 })), message: todayRateNotice };
    const result = await callTool({ click_url_id: 123, prices });
    assert.equal(result.isError, undefined);
    assert.equal(responseText(result).split("\n")[0], `Click URL prices updated successfully. ${todayRateNotice}`);
    assert.ok(responseText(result).includes(JSON.stringify(body, null, 2)));
    assert.equal(requests.length, 1);
    assert.deepEqual(JSON.parse(requests[0].data), { prices, confirm: false });
  });

  test("returns all 422 warning details without saving, retrying, or confirming", async () => {
    status = 422;
    body = warning;
    const result = await callTool();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /no changes saved/);
    assert.ok(responseText(result).includes(JSON.stringify(warning, null, 2)));
    assert.equal(requests.length, 1);
    assert.equal(JSON.parse(requests[0].data).confirm, false);
  });

  test("forwards the requesting user and explicit confirmation with accepted warnings", async () => {
    body = { ...success, warnings: warning.errors };
    const result = await callTool({ ...args, confirm: true, on_behalf_of_user_id: 456 });
    assert.equal(result.isError, undefined);
    assert.deepEqual(JSON.parse(requests[0].data), { prices: args.prices, confirm: true, on_behalf_of_user_id: 456 });
    assert.ok(responseText(result).includes(JSON.stringify(body, null, 2)));
    assert.equal(requests.length, 1);
  });

  test("treats an unknown requesting user as an error without offering confirmation", async () => {
    status = 422;
    body = { status: 422, message: "Invalid on_behalf_of_user_id", errors: ["On behalf of user not found"], data: {} };
    const result = await callTool({ ...args, on_behalf_of_user_id: 456 });
    assert.equal(result.isError, true);
    assert.match(responseText(result), /On behalf of user not found/);
    assert.doesNotMatch(responseText(result), /requires confirmation|updated successfully/);
    assert.equal(requests.length, 1);
  });
});
