function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class RateLimiter {
  private readonly requestTimestamps: number[] = [];
  private gate: Promise<void> = Promise.resolve();

  constructor(
    private readonly maxRequestsPerSecond: number,
    private readonly windowMs: number = 1000
  ) {}

  async waitForTurn(): Promise<void> {
    const turn = this.gate.then(async () => {
      while (true) {
        const now = Date.now();
        this.pruneExpired(now);

        if (this.requestTimestamps.length < this.maxRequestsPerSecond) {
          this.requestTimestamps.push(now);
          return;
        }

        const waitMs = Math.max(this.windowMs - (now - this.requestTimestamps[0]), 1);
        await sleep(waitMs);
      }
    });

    this.gate = turn.catch(() => undefined);
    await turn;
  }

  private pruneExpired(now: number): void {
    while (this.requestTimestamps.length > 0 && now - this.requestTimestamps[0] >= this.windowMs) {
      this.requestTimestamps.shift();
    }
  }
}
