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
const { registerDirectSpendRequestsTool } = await import("../direct-spend-requests.js");

const args = { client_id: 12, vendor_ids: [34], click_url_ids: [56] };
const success = {
  status: 201,
  data: { id: 78, ...args, client_name: "Test Client", vendor_names: ["Test Vendor"], status: "initialized", created_by_user_id: 90 },
  errors: [],
  warnings: [],
};
const options = {
  status: 200,
  data: {
    create: {
      method: "POST", path: "/ai/api/direct_spend_requests",
      payload_key: "direct_spend_request", accepts_top_level_fields: true,
      description: "Submit option values, not labels. Admin page JavaScript autofill is not applied by this API.",
    },
    fields: {
      client_id: { type: "integer", required: true, lookup: { method: "GET", path: "/ai/api/clients", value_field: "id" } },
      client_paid_actions: {
        type: "array", items: { type: "integer" }, required: false, default: [],
        options: [{ label: "multiple", value: 0 }, { label: "first_install", value: 1 }],
        description: "Submit an array of integer values, for example [1, 8]. Use [] for None.",
      },
      status: {
        type: "string", required: false, default: "initialized",
        options: [{ label: "initialized(waiting approve)", value: "initialized" }],
      },
      net_spend_source: {
        type: "string", required: false, allow_custom: true, integrated_vendor_ids: [34],
        options: [{ label: "Integrated Vendor API", value: "Integrated Vendor API" }],
        custom_value_instructions: "Submit the actual source string, not custom option.",
      },
      pm: { type: "string", allow_custom: true, lookup: { method: "GET", path: "/ai/api/user_infos", value_field: "email" } },
      on_behalf_of_user_id: { type: "integer", lookup: { method: "GET", path: "/ai/api/user_infos", value_field: "feedmob_user_id" } },
    },
  },
  errors: [],
};

function responseText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

describe("direct spend request tools", () => {
  let server: McpServer;
  let client: Client;
  let requests: InternalAxiosRequestConfig[];
  let status: number;
  let body: unknown;
  let networkFailure: boolean;
  const originalAdapter = axios.defaults.adapter;

  beforeEach(async () => {
    requests = [];
    status = 201;
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
    registerDirectSpendRequestsTool(server);
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

  function callTool(arguments_: Record<string, unknown> = args) {
    return client.callTool({ name: "create_direct_spend_request", arguments: arguments_ });
  }

  function callOptions() {
    return client.callTool({ name: "get_direct_spend_request_options", arguments: {} });
  }

  test("exposes parameter discovery without arguments and directs creation to use it first", async () => {
    const { tools } = await client.listTools();
    const discovery = tools.find(({ name }) => name === "get_direct_spend_request_options");
    assert.ok(discovery);
    assert.equal(discovery.inputSchema.type, "object");
    assert.deepEqual(discovery.inputSchema.properties ?? {}, {});
    assert.deepEqual(discovery.inputSchema.required ?? [], []);
    const create = tools.find(({ name }) => name === "create_direct_spend_request");
    assert.match(create?.description ?? "", /First call get_direct_spend_request_options/);
    assert.equal(requests.length, 0);
  });

  test("fetches options with an authenticated GET and preserves all parameter guidance", async () => {
    status = 200;
    body = options;
    const result = await client.callTool({ name: "get_direct_spend_request_options" });
    assert.equal(result.isError, undefined);
    assert.equal(responseText(result), `Direct spend request parameter options:\n${JSON.stringify(options, null, 2)}`);
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.method, "get");
    assert.equal(request.url, "https://feedmob.test/ai/api/direct_spend_requests/options");
    assert.equal(request.data, undefined);
    assert.equal(request.params, undefined);
    assert.equal(request.timeout, 30000);
    assert.equal(request.headers.get("Accept"), "application/json");
    assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
    const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
    assert.equal(typeof token === "object" && token.key, "test-key");
  });

  test("fetches current options on each call and preserves new fields from the API", async () => {
    status = 200;
    body = options;
    await callOptions();
    body = { ...options, data: { ...options.data, fields: {
      ...options.data.fields, new_field: { type: "string", options: [{ label: "New choice", value: "new_value" }] },
    } } };
    const result = await callOptions();
    assert.equal(result.isError, undefined);
    assert.ok(responseText(result).includes(JSON.stringify(body, null, 2)));
    assert.equal(requests.length, 2);
    assert.ok(requests.every(({ method }) => method === "get"));
  });

  for (const [code, errors, pattern] of [
    [401, ["Invalid token"], /Unauthorized/],
    [403, "Access denied", /Forbidden \(403\)/],
    [404, ["Options endpoint not found"], /Not Found \(404\)/],
    [500, ["Options lookup failed"], /500/],
  ] as const) {
    test(`returns options HTTP ${code} errors without attempting creation`, async () => {
      status = code;
      body = { status: code, errors };
      const result = await callOptions();
      assert.equal(result.isError, true);
      assert.match(responseText(result), pattern);
      assert.ok(responseText(result).includes(JSON.stringify(errors)));
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, "get");
    });
  }

  test("returns options API messages when an HTTP error has no errors field", async () => {
    status = 500;
    body = { status: 500, message: "Unable to load field options" };
    const result = await callOptions();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /Unable to load field options/);
  });

  test("rejects options application errors even when HTTP succeeds", async () => {
    status = 200;
    for (const payload of [
      { ...options, status: 500 },
      { ...options, errors: { options: ["Lookup unavailable"] } },
    ]) {
      body = payload;
      const result = await callOptions();
      assert.equal(result.isError, true);
      assert.ok(responseText(result).includes(JSON.stringify(payload)));
    }
  });

  test("returns options network errors without leaking credentials or creating requests", async () => {
    networkFailure = true;
    const result = await callOptions();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /ECONNABORTED/);
    assert.doesNotMatch(responseText(result), /test-key|test-secret|FEEDMOB-TOKEN/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "get");
  });

  test("exposes creation with only client_id required and leaves defaults to the API", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find(({ name }) => name === "create_direct_spend_request");
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ["client_id"]);
    const result = await callTool({ client_id: 12 });
    assert.equal(result.isError, undefined);
    assert.deepEqual(JSON.parse(requests[0].data), { client_id: 12 });
    assert.ok(responseText(result).includes(JSON.stringify(success, null, 2)));
  });

  test("sends authenticated POST with all admin-form fields and optional requester", async () => {
    const payload = {
      ...args, vendor_ids: [34, "35"], click_url_ids: ["56"],
      client_paid_actions: [0, "1", 104], vendor_paid_actions: ["0", 8, 100],
      direct_spend_job_stat_id: 99, gross_spend_formula: "net_spend / 0.8",
      net_spend_formula: "partner_net_spend", margin_formula: "(gross - net) / gross",
      margin_type: "fixed", gross_spend_source: "formula", net_spend_source: "vendor report",
      margin_source: "formula", github_ticket: "https://github.test/issues/1",
      hubspot_ticket: "ticket-1", arbitrage_level_switch: false, notes: "Request details",
      schedule: "0 1 * * *", automation_start_date: "2026-11-12", job: "spend-job",
      marketing_rep: "marketing@example.test", pm: "pm@example.test", pa: "pa@example.test",
      dev: "dev@example.test", status: "initialized(waiting approve)", having_client_report: false,
      on_behalf_of_user_id: 123,
    };
    const result = await callTool(payload);
    assert.equal(result.isError, undefined);
    assert.match(responseText(result), /created successfully/);
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.method, "post");
    assert.equal(request.url, "https://feedmob.test/ai/api/direct_spend_requests");
    assert.deepEqual(JSON.parse(request.data), payload);
    assert.equal(request.timeout, 30000);
    assert.equal(request.headers.get("Content-Type"), "application/json");
    assert.equal(request.headers.get("Accept"), "application/json");
    assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
    const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
    assert.equal(typeof token === "object" && token.key, "test-key");
  });

  test("preserves notification warnings as successful creation without retrying", async () => {
    body = { ...success, warnings: ["Email notification failed", "Slack notification failed"] };
    const result = await callTool();
    assert.equal(result.isError, undefined);
    assert.match(responseText(result), /created successfully/);
    assert.ok(responseText(result).includes(JSON.stringify(body, null, 2)));
    assert.equal(requests.length, 1);
  });

  test("rejects malformed IDs, arrays, codes, dates, enums and booleans before HTTP", async () => {
    for (const arguments_ of [
      {}, { ...args, client_id: 0 }, { ...args, client_id: 1.5 },
      { ...args, vendor_ids: "34" }, { ...args, click_url_ids: [0] },
      { ...args, vendor_ids: ["bad"] }, { ...args, client_paid_actions: [999] },
      { ...args, vendor_paid_actions: [1.5] }, { ...args, client_paid_actions: "1" },
      { ...args, vendor_paid_actions: ["-1"] }, { ...args, vendor_ids: [""] },
      { ...args, automation_start_date: "2026-02-30" },
      { ...args, status: "invalid" }, { ...args, margin_type: "invalid" },
      { ...args, margin_source: "invalid" }, { ...args, on_behalf_of_user_id: -1 },
      { ...args, having_client_report: "false" }, { ...args, arbitrage_level_switch: "0" },
    ]) {
      await assert.rejects(callTool(arguments_), /Invalid arguments/);
    }
    assert.equal(requests.length, 0);
  });

  test("does not forward caller-supplied creator, audit or record metadata", async () => {
    await callTool({ ...args, id: 999, created_by_user_id: 999, user_id: 999,
      audit_comment: "spoofed", deleted_at: "2026-11-12", created_at: "2026-01-01" });
    assert.deepEqual(JSON.parse(requests[0].data), args);
  });

  for (const [code, errors, pattern] of [
    [400, ["Spend Automation Request create fail, already existed!"], /Bad Request \(400\)/],
    [400, ["Client must exist"], /Bad Request \(400\)/],
    [401, ["Invalid token"], /Unauthorized/],
    [403, "You are not allowed to create or update direct spends.", /Forbidden \(403\)/],
    [403, "You are not allowed to use on_behalf_of_user_id.", /Forbidden \(403\)/],
    [404, ["Not found"], /Not Found \(404\)/],
    [422, ["On behalf of user not found"], /Unprocessable Entity \(422\)/],
    [500, ["Internal server error"], /500/],
  ] as const) {
    test(`returns HTTP ${code} with API errors: ${JSON.stringify(errors)}`, async () => {
      status = code;
      body = { status: code, data: {}, errors };
      const result = await callTool({ ...args, on_behalf_of_user_id: 123 });
      assert.equal(result.isError, true);
      assert.match(responseText(result), pattern);
      assert.ok(responseText(result).includes(JSON.stringify(errors)));
      assert.doesNotMatch(responseText(result), /created successfully/);
      assert.equal(requests.length, 1);
    });
  }

  test("preserves the API message when an HTTP error has no errors field", async () => {
    status = 422;
    body = { status: 422, message: "Invalid on_behalf_of_user_id" };
    const result = await callTool();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /Invalid on_behalf_of_user_id/);
  });

  test("treats errors in a successful HTTP response as tool errors", async () => {
    for (const payload of [
      { status: 400, data: {}, errors: [] },
      { status: 201, data: {}, errors: { client_id: ["must exist"] } },
    ]) {
      body = payload;
      const result = await callTool();
      assert.equal(result.isError, true);
      assert.ok(responseText(result).includes(JSON.stringify(payload)));
    }
    assert.equal(requests.length, 2);
  });

  test("reports network failures without exposing credentials or retrying creation", async () => {
    networkFailure = true;
    const result = await callTool();
    assert.equal(result.isError, true);
    assert.match(responseText(result), /ECONNABORTED/);
    assert.doesNotMatch(responseText(result), /test-key|test-secret|FEEDMOB-TOKEN/);
    assert.equal(requests.length, 1);
  });
});
