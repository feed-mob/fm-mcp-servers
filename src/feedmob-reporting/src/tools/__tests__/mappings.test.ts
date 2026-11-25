import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
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
const { registerMappingsTools } = await import("../mappings.js");

const readTools = [
  ["get_partner_campaign_mappings", "partner_campaign_mappings", "appier"],
  ["get_mmp_campaign_mappings", "mmp_campaign_mappings", "appsflyer"],
  ["get_mmp_event_mappings", "mmp_event_mappings", "adjust"],
] as const;
const createTool = "create_partner_campaign_mapping";
const updateTool = "update_partner_campaign_mapping";
const readResponse = {
  status: 200,
  data: [{
    id: 456, client_id: 12, campaign_id: 123, vendor_id: 34, click_url_id: 789,
    mapping: { appier_campaign_id: "appier-123" },
    created_at: "2026-11-17T00:00:00.000Z", updated_at: "2026-11-17T00:00:00.000Z",
  }],
  meta: { current_page: 1, per_page: 25, total_count: 26, total_pages: 2 },
};
const channelMappings = {
  bidease: { click_url_id: 789, bidease_advertiser_id: 123, bidease_campaign_id: "654321" },
  freewheel: {
    click_url_id: 789, freewheel_campaign_id: "campaign-123", freewheel_campaign_name: "CTV Campaign",
    line_item_id: "line-1", line_item_name: "Prospecting", memo: { allocation: "12.34", note: "Approved" },
  },
  remerge: { click_url_id: 789, remerge_campaign_name: "Retargeting" },
};

function resultBody(result: Awaited<ReturnType<Client["callTool"]>>): string {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return result.content[0].text as string;
}

function assertReadResponse(result: Awaited<ReturnType<Client["callTool"]>>, expected: unknown) {
  const { csv_file_path: csvFilePath, ...response } = JSON.parse(resultBody(result));
  assert.deepEqual(response, expected);
  assert.equal(typeof csvFilePath, "string");
  return csvFilePath as string;
}

describe("mapping tools", () => {
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
    directory = realpathSync(mkdtempSync(join(tmpdir(), "mappings-test-")));
    process.chdir(directory);
    requests = [];
    status = 200;
    body = readResponse;
    networkFailure = false;
    axios.defaults.adapter = async (config) => {
      requests.push(config);
      if (networkFailure) throw new AxiosError("Connection failed", "ECONNABORTED", config);
      const response = { data: body, status, statusText: String(status), headers: {}, config };
      if (status >= 400) {
        throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
      }
      return response;
    };
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerMappingsTools(server);
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

  function callTool(name: string, args: Record<string, unknown>) {
    return client.callTool({ name, arguments: args });
  }

  function assertAuthenticated(request: InternalAxiosRequestConfig) {
    assert.equal(request.timeout, 30000);
    assert.equal(request.headers.get("FEEDMOB-KEY"), "test-key");
    assert.equal(request.headers.get("Accept"), "application/json");
    const token = jwt.verify(String(request.headers.get("FEEDMOB-TOKEN")), "test-secret");
    assert.equal(typeof token === "object" && token.key, "test-key");
  }

  test("discovers five tools with channel, pagination and permission guidance", async () => {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 5);
    for (const [name] of readTools) {
      const tool = tools.find((tool) => tool.name === name)!;
      assert.deepEqual(tool.inputSchema.required, ["channel"]);
      assert.match(tool.description!, /meta.total_pages/);
      assert.match(tool.description!, /per_page=25/);
      assert.match(tool.description!, /csv_file_path/);
      assert.match(tool.description!, /only the current page/);
    }
    for (const name of [createTool, updateTool]) {
      const tool = tools.find((tool) => tool.name === name)!;
      assert.ok(Array.isArray(tool.inputSchema.required) && tool.inputSchema.required.includes("mapping"));
      assert.match(tool.description!, /AiToolPermission/);
      assert.match(tool.description!, /No automatic retries/);
      assert.match(tool.description!, /Do not retry a rejected request without attribution/);
    }
    const updateRequired = tools.find((tool) => tool.name === updateTool)!.inputSchema.required;
    assert.ok(Array.isArray(updateRequired) && updateRequired.includes("id"));
  });

  for (const [name, path, channel] of readTools) {
    test(`${name} sends authenticated GET and preserves data and pagination`, async () => {
      const result = await callTool(name, { channel });
      assert.equal(result.isError, undefined);
      const csvFilePath = assertReadResponse(result, readResponse);
      assert.equal(dirname(csvFilePath), join(directory, "tmp"));
      assert.ok(basename(csvFilePath).startsWith(`${path}_${channel}_page_1_`));
      assert.ok(csvFilePath.endsWith(".csv"));
      assert.match(basename(csvFilePath), /_[a-f0-9]{8}\.csv$/);
      const csv = readFileSync(csvFilePath, "utf8");
      assert.ok(csv.includes('"id","client_id","campaign_id","vendor_id","click_url_id","mapping"'));
      assert.ok(csv.includes('"456","12","123","34","789","{""appier_campaign_id"":""appier-123""}"'));
      assert.equal(csv.split("\n").length, 2);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, "get");
      assert.equal(requests[0].url, `https://feedmob.test/ai/api/${path}?channel=${channel}`);
      assert.equal(requests[0].data, undefined);
      assertAuthenticated(requests[0]);
    });

    test(`${name} preserves empty data and zero totals`, async () => {
      body = { status: 200, data: [], meta: { current_page: 1, per_page: 25, total_count: 0, total_pages: 0 } };
      const result = await callTool(name, { channel });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(resultBody(result)), body);
      assert.equal(requests.length, 1);
      assert.deepEqual(readdirSync(directory), []);
    });

    test(`${name} preserves nested JSON, quotes, commas, newlines, nulls and later columns in CSV`, async () => {
      const mapping = { name: 'Campaign "A", JP\nLine 2', events: ["install", "purchase"], active: false };
      body = { ...readResponse, data: [{ id: 1, mapping, app_id: null }, { id: 2, mapping: {}, later: 0 }] };
      const csvFilePath = assertReadResponse(await callTool(name, { channel }), body);
      const csv = readFileSync(csvFilePath, "utf8");
      const mappingCell = `"${JSON.stringify(mapping).replace(/"/g, '""')}"`;
      assert.equal(csv, `"id","mapping","app_id","later"\n"1",${mappingCell},"",""\n"2","{}","","0"`);
    });

    test(`${name} keeps mapping in one column and preserves legacy values`, async () => {
      body = { ...readResponse, data: [
        { id: 1, mapping: { id: 2, memo: { allocation: 0 }, remerge_campaign_name: "VN_APAC_Remerge_Android" } },
        { id: 3, mapping: { status: "paused" } },
        { id: 4, mapping: "legacy => malformed" },
        { id: 5, mapping: null },
      ] };
      const csvFilePath = assertReadResponse(await callTool(name, { channel }), body);
      assert.equal(readFileSync(csvFilePath, "utf8"),
        '"id","mapping"\n'
        + '"1","{""id"":2,""memo"":{""allocation"":0},""remerge_campaign_name"":""VN_APAC_Remerge_Android""}"\n'
        + '"3","{""status"":""paused""}"\n'
        + '"4","legacy => malformed"\n'
        + '"5",""');
    });

    test(`${name} saves separate files for pages and repeated calls`, async () => {
      const first = assertReadResponse(await callTool(name, { channel }), readResponse);
      body = { ...readResponse, data: [{ id: 999 }], meta: { ...readResponse.meta, current_page: 2 } };
      const second = assertReadResponse(await callTool(name, { channel, page: 2 }), body);
      const repeated = assertReadResponse(await callTool(name, { channel, page: 2 }), body);
      assert.ok(basename(second).startsWith(`${path}_${channel}_page_2_`));
      assert.notEqual(second, repeated);
      assert.equal(readFileSync(second, "utf8"), '"id"\n"999"');
      assert.equal(readFileSync(repeated, "utf8"), readFileSync(second, "utf8"));
      assert.ok(readFileSync(first, "utf8").includes('"456"'));
      assert.equal(readdirSync(join(directory, "tmp")).length, 3);
      assert.equal(requests.length, 3);
    });

    test(`${name} rejects missing/unknown channels and malformed common filters before HTTP`, async () => {
      for (const args of [
        {}, { channel: "singular" }, { channel: "unknown" }, { channel: "" },
        { channel, client_id: 0 }, { channel, client_id: "12" }, { channel, client_id: [12] },
        { channel, page: 0 }, { channel, per_page: -1 }, { channel, page: 1.5 },
        { channel, per_page: "25" }, { channel, page: null },
      ]) {
        await assert.rejects(callTool(name, args), /Invalid arguments/);
      }
      assert.equal(requests.length, 0);
    });
  }

  test("supports all partner channels and the distinct MMP channel lists", async () => {
    const partners = [
      "amazon", "appier", "applovin", "bidease", "bigo", "digital_turbine", "freewheel",
      "inmobi", "ironsource", "kayzen", "lg", "liftoff", "mintegral", "personaly", "pubmatic",
      "remerge", "rtb_house", "samsung", "smadex", "youappi",
    ];
    for (const channel of partners) {
      assert.equal((await callTool(readTools[0][0], { channel })).isError, undefined);
    }
    for (const channel of ["adjust", "branch", "impact", "kochava", "appsflyer"]) {
      assert.equal((await callTool(readTools[1][0], { channel })).isError, undefined);
      await assert.rejects(callTool(readTools[0][0], { channel }), /Invalid arguments/);
      if (channel !== "branch") {
        assert.equal((await callTool(readTools[2][0], { channel })).isError, undefined);
      }
    }
    await assert.rejects(callTool(readTools[2][0], { channel: "branch" }), /Invalid arguments/);
    assert.equal(requests.length, 29);
  });

  test("combines campaign filters, forwards pagination and preserves server page-size capping", async () => {
    body = { ...readResponse, meta: { current_page: 2, per_page: 100, total_count: 101, total_pages: 2 } };
    for (const [name, , channel] of readTools.slice(0, 2)) {
      const args = { channel, client_id: 12, campaign_id: 123, vendor_id: 34, click_url_id: 789, page: 2, per_page: 1000 };
      const result = await callTool(name, args);
      assert.equal(result.isError, undefined);
      assert.deepEqual(Object.fromEntries(new URL(requests.at(-1)!.url!).searchParams),
        Object.fromEntries(Object.entries(args).map(([key, value]) => [key, String(value)])));
      const csvFilePath = assertReadResponse(result, body);
      assert.ok(basename(csvFilePath).includes("_page_2_"));
    }
    assert.equal(requests.length, 2);
  });

  test("encodes external app IDs and preserves parsed events, legacy strings and null IDs", async () => {
    body = {
      ...readResponse,
      data: [{
        id: 1, client_id: 12, app_id: "com.test+app&os=ios",
        mapping: { events: { first_install: ["install"], all_purchase: ["purchase", "sale"] }, skan_events: "legacy => malformed", status: "paused" },
      }, { id: 2, client_id: 12, app_id: null, mapping: { events: {} } }],
    };
    const args = { channel: "adjust", client_id: 12, app_id: "com.test+app&os=ios", status: "paused", page: 3, per_page: 50 };
    const result = await callTool(readTools[2][0], args);
    assertReadResponse(result, body);
    assert.deepEqual(Object.fromEntries(new URL(requests[0].url!).searchParams),
      Object.fromEntries(Object.entries(args).map(([key, value]) => [key, String(value)])));
    await assert.rejects(callTool(readTools[2][0], { channel: "adjust", app_id: 123 }), /Invalid arguments/);
    await assert.rejects(callTool(readTools[2][0], { channel: "adjust", status: "deleted" }), /Invalid arguments/);
  });

  test("preserves API errors for unsupported channel/filter combinations", async () => {
    status = 400;
    for (const [name, args, error] of [
      [readTools[0][0], { channel: "liftoff", vendor_id: 34 }, "vendor_id is not supported for liftoff mappings"],
      [readTools[1][0], { channel: "adjust", click_url_id: 789 }, "click_url_id is not supported for adjust mappings"],
      [readTools[1][0], { channel: "branch", click_url_id: 789 }, "click_url_id is not supported for branch mappings"],
      [readTools[2][0], { channel: "impact", app_id: "app" }, "app_id is not supported for impact mappings"],
      [readTools[2][0], { channel: "kochava", status: "active" }, "status is not supported for kochava mappings"],
      [readTools[2][0], { channel: "impact", status: "paused" }, "status is not supported for impact mappings"],
    ] as const) {
      body = { status: 400, data: [], errors: [error] };
      const result = await callTool(name, args);
      assert.equal(result.isError, true);
      assert.ok(resultBody(result).includes(JSON.stringify(body)));
    }
    assert.equal(requests.length, 6);
    assert.deepEqual(readdirSync(directory), []);
  });

  for (const [channel, mapping] of Object.entries(channelMappings)) {
    test(`creates ${channel} with the exact envelope, auth and requester`, async () => {
      status = 201;
      body = { status: 201, data: { ...readResponse.data[0], mapping }, errors: [] };
      const args = { channel, mapping, on_behalf_of_user_id: 42 };
      const result = await callTool(createTool, args);
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(resultBody(result)), body);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, "post");
      assert.equal(requests[0].url, "https://feedmob.test/ai/api/partner_campaign_mappings");
      assert.deepEqual(JSON.parse(requests[0].data), args);
      assertAuthenticated(requests[0]);
      assert.deepEqual(readdirSync(directory), []);
    });

    test(`updates ${channel} with channel-scoped URL and preserves its envelope`, async () => {
      body = { status: 200, data: { ...readResponse.data[0], mapping }, errors: [] };
      const args = { channel, mapping, on_behalf_of_user_id: 42 };
      const result = await callTool(updateTool, { id: 456, ...args });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(resultBody(result)), body);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, "patch");
      assert.equal(requests[0].url, "https://feedmob.test/ai/api/partner_campaign_mappings/456");
      assert.deepEqual(JSON.parse(requests[0].data), args);
      assertAuthenticated(requests[0]);
      assert.deepEqual(readdirSync(directory), []);
    });
  }

  test("partial updates preserve blank optional strings, zero allocation and memo clearing", async () => {
    body = { status: 200, data: readResponse.data[0], errors: [] };
    for (const mapping of [
      { line_item_name: "" }, { line_item_id: "", memo: { allocation: 0, note: "" } },
      { memo: {} }, { memo: { note: "Updated" } }, { click_url_id: 790 },
    ]) {
      const result = await callTool(updateTool, { channel: "freewheel", id: 456, mapping });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(requests.at(-1)!.data), { channel: "freewheel", mapping });
    }
    assert.equal(requests.length, 5);
  });

  test("rejects empty writes, bad IDs, nulls, protected fields and malformed channel fields before HTTP", async () => {
    const badMappings = [
      {}, null, [], { on_behalf_of_user_id: 42 },
      { ...channelMappings.bidease, click_url_id: 0 },
      { ...channelMappings.bidease, click_url_id: "789" },
      { ...channelMappings.bidease, click_url_id: 2_147_483_648 },
      { ...channelMappings.bidease, bidease_advertiser_id: 1.5 },
      { ...channelMappings.bidease, bidease_campaign_id: 123 },
      { ...channelMappings.bidease, bidease_campaign_id: "  " },
      { ...channelMappings.bidease, created_by_user_id: 42 },
      { ...channelMappings.bidease, audit_comment: "Override" },
      { ...channelMappings.bidease, discarded_at: "2026-11-17" },
      { ...channelMappings.bidease, remerge_campaign_name: "wrong partner" },
    ];
    for (const name of [createTool, updateTool]) {
      for (const mapping of badMappings) {
        await assert.rejects(callTool(name, { channel: "bidease", id: 456, mapping }), /Invalid arguments/);
      }
      for (const fields of [{ channel: "appier" }, { on_behalf_of_user_id: 0 }, { on_behalf_of_user_id: "42" }]) {
        await assert.rejects(callTool(name, { channel: "bidease", id: 456, mapping: channelMappings.bidease, ...fields }), /Invalid arguments/);
      }
    }
    for (const id of [0, -1, 1.5, "456", 2_147_483_648, null]) {
      await assert.rejects(callTool(updateTool, { channel: "bidease", id, mapping: { click_url_id: 789 } }), /Invalid arguments/);
    }
    await assert.rejects(callTool(updateTool, { channel: "remerge", mapping: { remerge_campaign_name: "Name" } }), /Invalid arguments/);
    assert.equal(requests.length, 0);
  });

  test("rejects mappings from a different channel and incomplete creation before HTTP", async () => {
    for (const name of [createTool, updateTool]) {
      const result = await callTool(name, { channel: "bidease", id: 456, mapping: channelMappings.remerge });
      assert.equal(result.isError, true);
    }
    const result = await callTool(createTool, { channel: "freewheel", mapping: { click_url_id: 789, remerge_campaign_name: "Name" } });
    assert.equal(result.isError, true);
    await assert.rejects(callTool(createTool, { channel: "bidease", mapping: { click_url_id: 789 } }), /Invalid arguments/);
    assert.equal(requests.length, 0);
  });

  test("rejects invalid Freewheel memo fields without sending a write", async () => {
    for (const memo of [
      null, [], "memo", { unknown: 1 }, { allocation: -1 }, { allocation: 101 },
      { allocation: "" }, { allocation: "abc" }, { allocation: 1.234 }, { allocation: "1.234" },
      { allocation: null }, { allocation: true }, { note: null }, { note: "x".repeat(256) },
    ]) {
      await assert.rejects(callTool(updateTool, { channel: "freewheel", id: 456, mapping: { memo } }), /Invalid arguments/);
    }
    assert.equal(requests.length, 0);
  });

  for (const code of [400, 401, 403, 404, 422, 500, 503]) {
    test(`returns full HTTP ${code} details for all operations without retrying`, async () => {
      status = code;
      body = { status: code, data: {}, errors: ["Mapping request denied"], message: "API detail", request_id: "trace-1" };
      const calls = [
        ...readTools.map(([name, , channel]) => ({ name, args: { channel } })),
        { name: createTool, args: { channel: "bidease", mapping: channelMappings.bidease, on_behalf_of_user_id: 42 } },
        { name: updateTool, args: { channel: "bidease", id: 456, mapping: { bidease_campaign_id: "Updated" }, on_behalf_of_user_id: 42 } },
      ];
      for (const { name, args } of calls) {
        const result = await callTool(name, args);
        assert.equal(result.isError, true);
        assert.ok(resultBody(result).includes(String(code)));
        assert.ok(resultBody(result).includes(JSON.stringify(body)));
      }
      assert.equal(requests.length, 5);
      assert.equal(JSON.parse(requests.at(-1)!.data).on_behalf_of_user_id, 42);
      assert.deepEqual(readdirSync(directory), []);
    });
  }

  test("treats application failures in HTTP success as errors for reads and writes", async () => {
    for (const payload of [
      { status: 422, data: {}, errors: [] },
      { status: 200, data: [], errors: { mapping: ["Invalid mapping"] } },
    ]) {
      body = payload;
      for (const [name, args] of [
        [readTools[0][0], { channel: "appier" }],
        [createTool, { channel: "remerge", mapping: channelMappings.remerge }],
        [updateTool, { channel: "remerge", id: 456, mapping: { remerge_campaign_name: "Updated" } }],
      ] as const) {
        const result = await callTool(name, args);
        assert.equal(result.isError, true);
        assert.ok(resultBody(result).includes(JSON.stringify(payload)));
      }
    }
    assert.equal(requests.length, 6);
    assert.deepEqual(readdirSync(directory), []);
  });

  test("reports network errors without leaking credentials or retrying writes", async () => {
    networkFailure = true;
    const result = await callTool(createTool, { channel: "remerge", mapping: channelMappings.remerge });
    assert.equal(result.isError, true);
    assert.match(resultBody(result), /ECONNABORTED/);
    assert.doesNotMatch(resultBody(result), /test-key|test-secret|FEEDMOB-TOKEN/);
    assert.equal(requests.length, 1);
  });
});
