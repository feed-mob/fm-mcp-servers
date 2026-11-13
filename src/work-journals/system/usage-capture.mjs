import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const fields = ["event_id", "time", "operation", "access_mode", "outcome", "request_id", "http_status", "duration_ms"].sort();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function fixture(t, { enabled = "true", relay = "accept", trailing = "", missing } = {}) {
  const events = [];
  const authorizations = [];
  let markBusinessStarted;
  const businessStarted = new Promise((resolve) => markBusinessStarted = resolve);
  let active = 0;
  let maximumActive = 0;
  const collector = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/api/usage_events") {
      active++;
      maximumActive = Math.max(maximumActive, active);
      res.once("close", () => active--);
      authorizations.push(req.headers.authorization);
      events.push(JSON.parse(body));
      if (relay === "hang") return;
      if (relay === "reset") {
        req.socket.destroy();
        return;
      }
      if (relay === "slow") {
        await delay(350);
        if (res.destroyed) return;
      }
      if (relay === "redirect") {
        res.writeHead(307, { Location: "/forbidden-redirect" });
        res.end();
      } else if (relay === "reject") {
        res.writeHead(503);
        res.end("private-collector-error");
      } else if (relay === "body") {
        res.writeHead(202);
        res.write("x".repeat(65536));
      } else {
        res.writeHead(202);
        res.end();
      }
      return;
    }
    if (path === "/forbidden-redirect") assert.fail("Usage delivery followed a redirect");
    if (req.headers.authorization !== "Bearer system-test-token") {
      res.writeHead(401);
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    if (path === "/api/schema") res.end('{"schema":"private-marker"}');
    else if (path === "/api/journals" || path === "/api/journals/create_or_update") {
      if (body.includes("hang-business")) {
        markBusinessStarted();
        return;
      }
      if (body.includes("cause-error")) {
        res.writeHead(503);
        res.end("private-business-error");
      } else if (body.includes("invalid-json")) res.end("invalid JSON");
      else res.end('{"journals":["private-marker"]}');
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  collector.listen(0, "127.0.0.1");
  await once(collector, "listening");
  t.after(() => {
    collector.closeAllConnections();
    collector.close();
  });
  const env = { ...process.env, API_URL: `http://127.0.0.1:${collector.address().port}/api${trailing}`, API_TOKEN: "system-test-token" };
  delete env.AI_USAGE_ENABLED;
  if (enabled !== undefined && enabled !== null) env.AI_USAGE_ENABLED = enabled;
  if (missing) delete env[missing];
  const child = spawn(process.execPath, [entry], { env, stdio: ["pipe", "pipe", "pipe"] });
  const exited = once(child, "exit");
  let stderr = "";
  child.stderr.on("data", (chunk) => stderr += chunk);
  const pending = new Map();
  const responses = [];
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    responses.push(message);
    if ("id" in message) pending.get(message.id)?.(message);
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exited;
    lines.close();
  });
  let nextId = 0;
  async function rpc(method, params, id = ++nextId) {
    const response = new Promise((resolve) => pending.set(id, resolve));
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) }) + "\n");
    let timeout;
    try {
      return await Promise.race([response, new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`RPC timeout: ${method}; ${stderr}`)), 5000);
      })]);
    } finally {
      clearTimeout(timeout);
      pending.delete(id);
    }
  }
  async function initialize() {
    const result = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "usage-system-check", version: "1.0.0" } });
    assert.equal(result.result.serverInfo.name, "work-journals");
    child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
  }
  async function stop(signal) {
    const started = performance.now();
    if (signal) child.kill(signal);
    else child.stdin.end();
    let timeout;
    const result = await Promise.race([exited, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("MCP shutdown exceeded 3 seconds")), 3000);
    })]).finally(() => clearTimeout(timeout));
    assert.equal(result[0], 0);
    return performance.now() - started;
  }
  return { events, authorizations, businessStarted, child, exited, rpc, initialize, stop, responses, stderr: () => stderr, maximumActive: () => maximumActive };
}

function validateEvents(events) {
  assert.equal(new Set(events.map((event) => event.event_id)).size, events.length);
  assert.equal(new Set(events.map((event) => event.request_id)).size, events.length);
  for (const event of events) {
    assert.deepEqual(Object.keys(event).sort(), fields);
    assert.match(event.event_id, uuid);
    assert.match(event.request_id, uuid);
    assert.ok(event.request_id.length <= 255);
    assert.match(event.time, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    assert.ok(Number.isFinite(Date.parse(event.time)));
    assert.ok(event.operation.length <= 200);
    assert.ok(Number.isInteger(event.duration_ms) && event.duration_ms >= 0);
    assert.ok(Number.isInteger(event.http_status) && event.http_status >= 100 && event.http_status <= 599);
    assert.ok(["read", "write", "unknown"].includes(event.access_mode));
    assert.ok(["success", "failure", "unknown"].includes(event.outcome));
    assert.ok(Buffer.byteLength(JSON.stringify(event)) <= 2048);
    assert.doesNotMatch(JSON.stringify(event), /private-marker|system-test-token|private-business-error|cause-error/);
  }
}

const writeArgs = { date: "2026-11-13", content: "private-marker" };

test("spawned stdio captures dispatch successes, validation, unknown names and thrown business errors", { timeout: 15000 }, async (t) => {
  const f = await fixture(t);
  await f.initialize();
  const listed = await f.rpc("tools/list");
  assert.equal(listed.result.tools.length, 2);
  assert.equal(listed.result.tools[0].annotations.readOnlyHint, true);
  assert.equal(listed.result.tools[1].annotations.readOnlyHint, false);
  await f.rpc("resources/list");
  const resource = await f.rpc("resources/read", { uri: "time-off-api-scheam://usage" });
  assert.match(resource.result.contents[0].text, /private-marker/);
  assert.equal(f.events.length, 0);
  const started = Date.now();
  const query = await f.rpc("tools/call", { name: "query_journals", arguments: { scheam: "private-marker", start_date: "2026-11-01", end_date: "2026-11-13" }, _meta: { private: "private-marker" } }, "private-marker");
  assert.match(query.result.content[0].text, /Work Journal Query Result/);
  const written = await f.rpc("tools/call", { name: "create_or_update_journal", arguments: writeArgs });
  assert.match(written.result.content[0].text, /Work Journal Create\/Update Result/);
  const invalid = await f.rpc("tools/call", { name: "create_or_update_journal", arguments: { date: 3 } });
  assert.equal(invalid.error.code, -32602);
  const unknown = await f.rpc("tools/call", { name: "unregistered_tool", arguments: {} });
  assert.equal(unknown.error.code, -32601);
  for (const name of ["", " ", "x".repeat(201), 42]) {
    const result = await f.rpc("tools/call", { name, arguments: {} });
    assert.ok(result.error);
  }
  const missing = await f.rpc("tools/call");
  assert.ok(missing.error);
  for (const content of ["cause-error", "invalid-json"]) {
    const failure = await f.rpc("tools/call", { name: "create_or_update_journal", arguments: { ...writeArgs, content } });
    assert.equal(failure.result.isError, true);
    assert.match(failure.result.content[0].text, /execution failed/);
  }
  await f.stop();
  assert.equal(f.events.length, 11);
  validateEvents(f.events);
  assert.ok(f.events.every((event) => Date.parse(event.time) >= started && Date.parse(event.time) <= Date.now()));
  assert.deepEqual(f.events.slice(0, 4).map((event) => [event.operation, event.access_mode, event.outcome, event.http_status]), [
    ["query_journals", "read", "success", 200],
    ["create_or_update_journal", "write", "success", 200],
    ["create_or_update_journal", "write", "failure", 200],
    ["unregistered_tool", "unknown", "failure", 200],
  ]);
  assert.ok(f.events.slice(4, 9).every((event) => event.operation === "unknown_tool" && event.outcome === "failure"));
  assert.deepEqual(f.events.slice(9).map((event) => [event.outcome, event.http_status]), [["failure", 200], ["failure", 200]]);
  assert.ok(f.events.some((event) => event.http_status === 500));
  assert.ok(f.authorizations.every((value) => value === "Bearer system-test-token"));
  assert.doesNotMatch(f.stderr(), /system-test-token|private-marker|private-business-error/);
});

for (const enabled of [null, "false", "TRUE", "1"]) {
  test(`capture disabled for ${enabled ?? "unset"}`, { timeout: 8000 }, async (t) => {
    const f = await fixture(t, { enabled });
    await f.initialize();
    const response = await f.rpc("tools/call", { name: "create_or_update_journal", arguments: writeArgs });
    assert.match(response.result.content[0].text, /private-marker/);
    await f.stop();
    assert.equal(f.events.length, 0);
  });
}

for (const relay of ["reject", "redirect", "hang", "body", "reset"]) {
  test(`relay ${relay} preserves business response and bounded shutdown`, { timeout: 8000 }, async (t) => {
    const f = await fixture(t, { relay });
    await f.initialize();
    const started = performance.now();
    const result = await f.rpc("tools/call", { name: "create_or_update_journal", arguments: writeArgs });
    assert.match(result.result.content[0].text, /private-marker/);
    assert.ok(performance.now() - started < 1000);
    await f.stop();
    assert.equal(f.events.length, 1);
    validateEvents(f.events);
    assert.doesNotMatch(f.stderr(), /system-test-token|private-marker|private-collector-error/);
  });
}

for (const signal of [undefined, "SIGTERM", "SIGINT"]) {
  test(`immediately queued telemetry drains on ${signal ?? "EOF"}`, { timeout: 8000 }, async (t) => {
    const f = await fixture(t, { relay: "slow", trailing: "///" });
    await f.initialize();
    const response = await f.rpc("tools/call", { name: "unregistered_tool", arguments: {} });
    assert.equal(response.error.code, -32601);
    await f.stop(signal);
    assert.equal(f.events.length, 1);
    validateEvents(f.events);
    assert.doesNotMatch(f.stderr(), /relay did not accept|delivery failed|deadline/);
  });
}

test("delivery capacity and concurrency stay bounded under burst with a stalled relay", { timeout: 10000 }, async (t) => {
  const f = await fixture(t, { relay: "hang" });
  await f.initialize();
  const responses = await Promise.all(Array.from({ length: 100 }, () => f.rpc("tools/call", { name: "unregistered_tool", arguments: {} })));
  assert.ok(responses.every((response) => response.error.code === -32601));
  const elapsed = await f.stop();
  assert.ok(elapsed < 2800);
  assert.equal(f.maximumActive(), 2);
  assert.ok(f.events.length <= 4);
  assert.match(f.stderr(), /capacity exceeded; event dropped/);
  assert.match(f.stderr(), /shutdown deadline/);
  validateEvents(f.events);
});

test("interrupted in-flight call reports unknown and exits without waiting for business HTTP", { timeout: 8000 }, async (t) => {
  const f = await fixture(t);
  await f.initialize();
  f.child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 400, method: "tools/call", params: { name: "create_or_update_journal", arguments: { ...writeArgs, content: "hang-business" } } }) + "\n");
  await f.businessStarted;
  await f.stop("SIGTERM");
  assert.equal(f.events.length, 1);
  validateEvents(f.events);
  assert.equal(f.events[0].outcome, "unknown");
  assert.equal(f.events[0].http_status, 500);
  assert.equal(f.events[0].access_mode, "write");
  assert.ok(!f.responses.some((response) => response.id === 400));
});

for (const missing of ["API_URL", "API_TOKEN"]) {
  test(`missing ${missing} retains startup failure`, { timeout: 8000 }, async (t) => {
    const f = await fixture(t, { missing });
    const [code] = await f.exited;
    assert.equal(code, 1);
    assert.match(f.stderr(), /Error: API_URL, API_TOKEN environment variables must be set\./);
    assert.equal(f.events.length, 0);
  });
}
