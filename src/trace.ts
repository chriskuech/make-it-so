import { randomUUID } from "crypto";

export type TraceEventHandler = (event: TraceEvent) => unknown;

export type TraceEvent = {
  timestamp: Date;
  scopes: string[];
  message: string;
};

export class Trace {
  constructor(
    private readonly id: string = randomUUID(),
    private readonly handlers: TraceEventHandler[] = [],
    private readonly scopes: string[] = []
  ) {}

  async measure<T>(action: (trace: Trace) => Promise<T>): Promise<T> {
    this.log("start");
    const start = new Date();
    const result = await action(this);
    const stop = new Date();
    const elapsed = start.getSeconds() - stop.getSeconds();
    this.log(`stop - ${elapsed}secs`);
    return result;
  }

  async push<T>(
    scope: string,
    action: (trace: Trace) => Promise<T>
  ): Promise<T> {
    return await action(
      new Trace(this.id, this.handlers, [...this.scopes, scope])
    );
  }

  log(message: string): void {
    for (const handler of this.handlers) {
      handler({
        timestamp: new Date(),
        scopes: this.scopes,
        message,
      });
    }
  }

  logState(inDesiredState: boolean): void {
    this.log(`In desired state: ${inDesiredState}`);
  }
}
