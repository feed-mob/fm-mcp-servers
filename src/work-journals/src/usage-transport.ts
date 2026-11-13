import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";
import { ErrorCode, type JSONRPCMessage, type RequestId } from "@modelcontextprotocol/sdk/types.js";
import { UsageRelay, type UsageEvent } from "./usage-relay.js";

type Call = {
  event: UsageEvent;
  started: number;
};

export class UsageTransport implements Transport {
  onmessage?: Transport["onmessage"];
  onerror?: Transport["onerror"];
  onclose?: Transport["onclose"];
  private readonly calls = new Map<RequestId, Call>();
  private capacityReported = false;

  constructor(
    private readonly transport: Transport,
    private readonly relay: UsageRelay,
    private readonly accessModes: ReadonlyMap<string, "read" | "write" | "unknown">,
  ) {}

  async start(): Promise<void> {
    this.transport.onmessage = (message, extra) => {
      if ("method" in message && "id" in message && message.method === "tools/call") {
        this.begin(message.id, message.params?.name);
      }
      try {
        this.onmessage?.(message, extra);
      } catch (error) {
        if ("id" in message) this.finish(message.id, "failure", 500);
        throw error;
      }
    };
    this.transport.onerror = (error) => this.onerror?.(error);
    this.transport.onclose = () => {
      for (const id of this.calls.keys()) this.finish(id, "unknown", 500);
      this.onclose?.();
    };
    await this.transport.start();
  }

  async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    const isResponse = "id" in message && !("method" in message);
    try {
      await this.transport.send(message, options);
    } catch (error) {
      if (isResponse) this.finish(message.id, "failure", 500);
      throw error;
    }
    if (isResponse) {
      const failed = "error" in message || message.result.isError === true;
      const internal = "error" in message && message.error.code === ErrorCode.InternalError;
      this.finish(message.id, failed ? "failure" : "success", internal ? 500 : 200);
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  private begin(id: RequestId, name: unknown): void {
    if (this.calls.has(id)) this.finish(id, "unknown", 500);
    if (this.calls.size >= 128) {
      if (!this.capacityReported) {
        this.capacityReported = true;
        console.error("[work-journals usage] active call capacity exceeded; event dropped");
      }
      return;
    }
    const operation = typeof name === "string" && /^[a-zA-Z0-9_.-]{1,200}$/.test(name) ? name : "unknown_tool";
    this.calls.set(id, {
      event: {
        event_id: randomUUID(),
        time: new Date().toISOString(),
        operation,
        access_mode: this.accessModes.get(operation) ?? "unknown",
        outcome: "unknown",
        request_id: randomUUID(),
        http_status: 500,
        duration_ms: 0,
      },
      started: performance.now(),
    });
  }

  private finish(id: RequestId, outcome: UsageEvent["outcome"], status: number): void {
    const call = this.calls.get(id);
    if (!call) return;
    this.calls.delete(id);
    this.relay.enqueue({
      ...call.event,
      outcome,
      http_status: status,
      duration_ms: Math.max(0, Math.floor(performance.now() - call.started)),
    });
  }
}
