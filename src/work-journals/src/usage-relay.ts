import { request as httpRequest, type ClientRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export type UsageEvent = {
  event_id: string;
  time: string;
  operation: string;
  access_mode: "read" | "write" | "unknown";
  outcome: "success" | "failure" | "unknown";
  request_id: string;
  http_status: number;
  duration_ms: number;
};

export class UsageRelay {
  private readonly endpoint: URL;
  private readonly queue: string[] = [];
  private readonly active = new Set<ClientRequest>();
  private readonly diagnostics = new Set<string>();
  private readonly idle = new Set<() => void>();
  private closed = false;

  constructor(apiUrl: string, private readonly token: string) {
    this.endpoint = new URL(`${apiUrl.replace(/\/+$/, "")}/usage_events`);
    if (!["http:", "https:"].includes(this.endpoint.protocol) || this.endpoint.username || this.endpoint.password) {
      throw new Error("Unsupported usage relay URL");
    }
  }

  enqueue(event: UsageEvent): void {
    if (this.closed) return;
    const body = JSON.stringify(event);
    if (Buffer.byteLength(body) > 2048 || this.queue.length + this.active.size >= 64) {
      this.diagnose("capacity exceeded; event dropped");
      return;
    }
    this.queue.push(body);
    this.pump();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (!this.queue.length && !this.active.size) return;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(deadline);
        this.idle.delete(finish);
        resolve();
      };
      const deadline = setTimeout(() => {
        this.queue.length = 0;
        for (const request of this.active) request.destroy();
        this.diagnose("shutdown deadline reached; remaining events dropped");
        finish();
      }, 2000);
      this.idle.add(finish);
    });
  }

  private diagnose(message: string): void {
    if (this.diagnostics.has(message)) return;
    this.diagnostics.add(message);
    console.error(`[work-journals usage] ${message}`);
  }

  private pump(): void {
    while (this.active.size < 2 && this.queue.length) {
      const body = this.queue.shift()!;
      try {
        const send = this.endpoint.protocol === "https:" ? httpsRequest : httpRequest;
        const request = send(this.endpoint, {
          method: "POST",
          agent: false,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            Authorization: `Bearer ${this.token}`,
          },
        });
        this.active.add(request);
        const deadline = setTimeout(() => request.destroy(new Error("Usage relay timeout")), 1500);
        request.once("response", (response) => {
          if (response.statusCode !== 202) this.diagnose("relay did not accept event");
          response.destroy();
        });
        request.once("error", () => this.diagnose("delivery failed"));
        request.once("close", () => {
          clearTimeout(deadline);
          this.active.delete(request);
          this.pump();
        });
        request.end(body);
      } catch {
        this.diagnose("delivery failed");
      }
    }
    if (!this.queue.length && !this.active.size) {
      for (const finish of this.idle) finish();
    }
  }
}
