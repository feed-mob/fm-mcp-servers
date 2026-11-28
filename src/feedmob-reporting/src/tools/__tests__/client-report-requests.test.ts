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
const { registerClientReportRequestsTools } = await import("../client-report-requests.js");

const record = { id: 78, report_name: "Daily report", created_by_user_id: 90, client_ids: [0], status: "initialized" };
const toolNames = ["get_client_report_requests", "get_client_report_request_options", "create_client_report_request", "update_client_report_request"];
const queryFields = ["id", "creator_user_id", "client_id", "vendor_id", "report_name", "report_code", "status", "report_type", "scope", "report_categories", "start_date", "end_date", "automation_start_date", "automation_end_date"];
const writableFields = [
  "client_ids", "vendor_ids", "delivery_methods", "report_categories", "client_id", "vendor_id", "report_config_id", "schedule_export_id",
  "business_proposal", "pm", "pa", "dev", "github_ticket", "hubspot_ticket", "data_source", "note", "request_user", "report_name", "destination", "report_code",
  "report_type", "scope", "status", "automation_start_date",
];

function responseText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

describe("client report request tools", () => {
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
    body = { status: 200, data: record, errors: [] };
    networkFailure = false;
    axios.defaults.adapter = async (config) => {
      requests.push(config);
      if (networkFailure) throw new AxiosError("Connection failed", "ECONNABORTED", config);
      const response = { data: body, status, statusText: String(status), headers: {}, config };
      if (status >= 400) throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
      return response;
    };
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerClientReportRequestsTools(server);
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

  function call(name: string, args: Record<string, unknown> = {}) {
    return client.callTool({ name, arguments: args });
  }

  function assertAuthentication(request: InternalAxiosRequestConfig) {
    assert.equal(request.timeout, 30000);
    assert.equal(request.headers.get("Accept"), "application/json");
    assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
    const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
    assert.equal(typeof token === "object" && token.key, "test-key");
  }

  test("registers all four tools with complete schemas and no update defaults", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(({ name }) => name).sort(), [...toolNames].sort());
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
    assert.deepEqual(Object.keys(byName.get_client_report_requests.inputSchema.properties ?? {}).sort(), [...queryFields].sort());
    assert.deepEqual(byName.get_client_report_requests.inputSchema.required ?? [], []);
    assert.deepEqual(byName.get_client_report_request_options.inputSchema.properties ?? {}, {});
    assert.deepEqual(byName.create_client_report_request.inputSchema.required, ["report_name"]);
    assert.deepEqual(byName.update_client_report_request.inputSchema.required, ["id"]);
    assert.deepEqual(Object.keys(byName.create_client_report_request.inputSchema.properties ?? {}).sort(), [...writableFields, "on_behalf_of_user_id"].sort());
    assert.deepEqual(Object.keys(byName.update_client_report_request.inputSchema.properties ?? {}).sort(), [...writableFields, "id", "on_behalf_of_user_id"].sort());
    assert.ok(Object.values(byName.update_client_report_request.inputSchema.properties ?? {}).every((property) => !Object.hasOwn(property as object, "default")));
    for (const name of ["create_client_report_request", "update_client_report_request"]) {
      assert.match(byName[name].description ?? "", /First call get_client_report_request_options/);
      assert.ok(byName[name].description?.includes(`feedmob-reporting/${name}`));
    }
    assert.equal(requests.length, 0);
  });

  test("lists with no filters and preserves the API's bare array, including empty results", async () => {
    for (const rows of [[record], []]) {
      body = rows;
      const result = await call("get_client_report_requests");
      assert.equal(result.isError, undefined);
      assert.equal(responseText(result), `Client report requests:\n${JSON.stringify(rows, null, 2)}`);
      const request = requests.at(-1)!;
      assert.equal(request.method, "get");
      assert.equal(request.url, "https://feedmob.test/ai/api/client_report_requests");
      assert.equal(request.data, undefined);
      assertAuthentication(request);
    }
  });

  test("encodes all intersecting filters with Rails array keys and literal search text", async () => {
    const filters = {
      id: 78, creator_user_id: 90, client_id: 12, vendor_id: 34,
      report_name: "Daily & 100%_+报告", report_code: "C78__a<>b", status: "paused",
      report_type: "internel_report", scope: "external", report_categories: ["client_report", "schedule_report"],
      start_date: "2026-11-01", end_date: "2026-11-24", automation_start_date: "2026-10-01", automation_end_date: "2026-12-01",
    };
    await call("get_client_report_requests", filters);
    const url = new URL(requests[0].url!);
    assert.equal(url.pathname, "/ai/api/client_report_requests");
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) assert.deepEqual(url.searchParams.getAll(`${key}[]`), value);
      else assert.equal(url.searchParams.get(key), String(value));
    }
    assert.equal(requests[0].data, undefined);
  });

  test("omits an empty category selection rather than serializing an invalid value", async () => {
    await call("get_client_report_requests", { report_categories: [] });
    assert.equal(requests[0].url, "https://feedmob.test/ai/api/client_report_requests");
  });

  test("rejects reversed creation and automation date ranges before HTTP", async () => {
    for (const filters of [
      { start_date: "2026-11-24", end_date: "2026-11-01" },
      { automation_start_date: "2026-11-24", automation_end_date: "2026-11-01" },
    ]) {
      const result = await call("get_client_report_requests", filters);
      assert.equal(result.isError, true);
      assert.match(responseText(result), /start must be on or before/);
    }
    assert.equal(requests.length, 0);
  });

  test("fetches fresh options and preserves all live choices, lookups and future metadata", async () => {
    for (const jobId of [100, 101]) {
      body = { status: 200, data: { create: { permission: "feedmob-reporting/create_client_report_request" }, update: {}, fields: {
        report_config_id: { nullable: true, options: [{ label: "Paused job", value: jobId }] },
        on_behalf_of_user_id: { lookup: { path: "/ai/api/user_infos", value_field: "feedmob_user_id" } },
        future_field: { options: [{ label: "Future", value: "future" }] },
      } }, errors: [] };
      const result = await client.callTool({ name: "get_client_report_request_options" });
      assert.equal(result.isError, undefined);
      assert.equal(responseText(result), `Client report request parameter options:\n${JSON.stringify(body, null, 2)}`);
      const request = requests.at(-1)!;
      assert.equal(request.method, "get");
      assert.equal(request.url, "https://feedmob.test/ai/api/client_report_requests/options");
      assert.equal(request.data, undefined);
      assertAuthentication(request);
    }
    assert.equal(requests.length, 2);
  });

  test("creates with only report_name, leaving API defaults and generated fields intact", async () => {
    status = 201;
    body = { status: 201, data: { ...record, report_number: "generated", report_code: "C78" }, errors: [] };
    const result = await call("create_client_report_request", { report_name: "Daily report" });
    assert.equal(result.isError, undefined);
    assert.ok(responseText(result).includes(JSON.stringify(body, null, 2)));
    assert.equal(requests[0].method, "post");
    assert.equal(requests[0].url, "https://feedmob.test/ai/api/client_report_requests");
    assert.deepEqual(JSON.parse(requests[0].data), { report_name: "Daily report" });
    assert.equal(requests[0].headers.get("Content-Type"), "application/json");
    assertAuthentication(requests[0]);
  });

  test("forwards every writable field and top-level delegation, excluding protected metadata", async () => {
    const fields = {
      report_name: "Daily report", report_type: "internel_report", scope: "internal", status: "auto_upload",
      report_categories: ["schedule_report", "p360_report"], delivery_methods: ["Email", "Google Sheet"],
      client_ids: [0], vendor_ids: [34, 35], client_id: 12, vendor_id: 34, report_config_id: 100, schedule_export_id: 200,
      automation_start_date: "2026-11-24", pm: "pm@example.test", pa: "pa@example.test", dev: "dev@example.test", request_user: "custom@example.test",
      business_proposal: "Proposal", github_ticket: "#123", hubspot_ticket: "456", data_source: "API", note: "Note", destination: "S3", report_code: "Custom code",
      on_behalf_of_user_id: 90,
    };
    await call("create_client_report_request", { ...fields, user_id: 999, created_by_user_id: 999, report_number: "spoofed", memo: {}, audit_comment: "spoofed", id: 999 });
    assert.deepEqual(JSON.parse(requests[0].data), fields);
    assert.equal(requests.length, 1);
  });

  test("patches only supplied fields and puts id in the URL", async () => {
    const result = await call("update_client_report_request", { id: 78, note: "Updated", on_behalf_of_user_id: 90, user_id: 999, report_number: "spoofed" });
    assert.equal(result.isError, undefined);
    assert.equal(requests[0].method, "patch");
    assert.equal(requests[0].url, "https://feedmob.test/ai/api/client_report_requests/78");
    assert.deepEqual(JSON.parse(requests[0].data), { note: "Updated", on_behalf_of_user_id: 90 });
    assertAuthentication(requests[0]);
  });

  test("preserves array replacements, clears and nullable fields as explicit updates", async () => {
    for (const fields of [
      { client_ids: [] }, { vendor_ids: [0] }, { report_categories: [] }, { delivery_methods: [] },
      { client_id: null }, { vendor_id: null }, { report_config_id: null }, { schedule_export_id: null },
      { report_type: null }, { scope: null }, { automation_start_date: null }, { note: "" }, { pm: null },
    ]) {
      const result = await call("update_client_report_request", { id: 78, ...fields });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(requests.at(-1)!.data), fields);
    }
  });

  test("rejects empty or metadata-only updates without HTTP", async () => {
    for (const fields of [{}, { on_behalf_of_user_id: 90 }, { user_id: 999 }, { report_number: "spoofed" }, { memo: {} }, { unknown: "value" }]) {
      const result = await call("update_client_report_request", { id: 78, ...fields });
      assert.equal(result.isError, true);
      assert.match(responseText(result), /At least one writable field is required/);
    }
    assert.equal(requests.length, 0);
  });

  test("rejects malformed writes and unsupported options before HTTP", async () => {
    const malformed = [
      { report_name: "" }, { report_name: " \t\n" }, { report_name: null }, { report_name: 12 },
      { client_ids: [0, 12] }, { vendor_ids: [34, 0] }, { client_ids: [-1] }, { vendor_ids: "34" },
      { delivery_methods: ["email"] }, { report_categories: ["internal_report"] }, { report_type: "internal_report" },
      { status: "active" }, { status: null }, { scope: "private" }, { pm: 12 }, { note: {} },
      { report_config_id: 0 }, { schedule_export_id: -1 }, { on_behalf_of_user_id: 0 },
      { automation_start_date: "2026-02-30" },
    ];
    for (const fields of malformed) {
      await assert.rejects(call("create_client_report_request", { report_name: "Daily report", ...fields }), /Invalid arguments/);
      await assert.rejects(call("update_client_report_request", { id: 78, ...fields }), /Invalid arguments/);
    }
    await assert.rejects(call("create_client_report_request"), /Invalid arguments/);
    for (const id of [undefined, 0, -1, 1.5, "78"]) {
      await assert.rejects(call("update_client_report_request", { id, note: "Updated" }), /Invalid arguments/);
    }
    assert.equal(requests.length, 0);
  });

  test("rejects malformed query filters before HTTP", async () => {
    for (const filters of [
      { id: 0 }, { creator_user_id: -1 }, { client_id: 1.5 }, { vendor_id: [] }, { report_name: 12 },
      { report_code: {} }, { status: "active" }, { scope: "private" }, { report_type: "internal_report" },
      { report_categories: "client_report" }, { report_categories: ["invalid"] },
      { start_date: "2026-02-30" }, { end_date: "today" }, { automation_start_date: "2026-13-01" }, { automation_end_date: "2026-11-31" },
    ]) {
      await assert.rejects(call("get_client_report_requests", filters), /Invalid arguments/);
    }
    assert.equal(requests.length, 0);
  });

  for (const name of toolNames) {
    const args = name === "create_client_report_request" ? { report_name: "Daily report" }
      : name === "update_client_report_request" ? { id: 78, note: "Updated" } : {};

    test(`${name} reports HTTP failures with API details and no retries`, async () => {
      for (const code of [400, 401, 403, 404, 422, 500]) {
        status = code;
        body = { status: code, errors: ["Action-specific permission or validation failure"] };
        const count = requests.length;
        const result = await call(name, args);
        assert.equal(result.isError, true);
        assert.ok(responseText(result).includes(String(code)));
        assert.ok(responseText(result).includes(JSON.stringify((body as { errors: unknown }).errors)));
        assert.equal(requests.length, count + 1);
      }
    });

    test(`${name} preserves message-only HTTP failures and application errors`, async () => {
      status = 422;
      body = { status: 422, message: "Invalid requester" };
      let result = await call(name, args);
      assert.equal(result.isError, true);
      assert.match(responseText(result), /Invalid requester/);
      status = 200;
      for (const payload of [{ status: 400, errors: [] }, { status: 200, errors: { report_name: ["is required"] } }]) {
        body = payload;
        result = await call(name, args);
        assert.equal(result.isError, true);
        assert.ok(responseText(result).includes(JSON.stringify(payload)));
      }
    });

    test(`${name} reports network failure without credentials or retries`, async () => {
      networkFailure = true;
      const result = await call(name, args);
      assert.equal(result.isError, true);
      assert.match(responseText(result), /ECONNABORTED/);
      assert.doesNotMatch(responseText(result), /test-key|test-secret|FEEDMOB-TOKEN/);
      assert.equal(requests.length, 1);
    });
  }
});
