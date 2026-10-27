// Test-only adapter: every behavioral operation executes the Python engine.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export class HMEM {
  private state: any = { records: [], proposals: [], conflicts: [] };
  private entries: any[] = [];
  private clock: () => number;

  constructor(options: { clock: () => number }) {
    this.clock = options.clock;
  }

  private call(method: string, ...args: any[]): any {
    const bridge = fileURLToPath(new URL("./hmem_bridge.py", import.meta.url));
    const result = spawnSync(process.env.HMEM_PYTHON ?? "python3", [bridge], {
      input: JSON.stringify({
        state: this.state, ledger: this.entries, now: this.clock(), method, args,
      }),
      encoding: "utf8",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr);
    const response = JSON.parse(result.stdout);
    this.state = response.state;
    this.entries = response.ledger;
    return response.result;
  }

  add = (input: any) => {
    const result = this.call("add", input);
    return this.state.records.find((item: any) => item.id === result.id);
  };
  query = (query: string, options?: any) => this.call("query", query, options);
  feedback = (id: string, kind: string) => this.call("feedback", id, kind);
  mine = async (event: string, text: string, options?: any) => this.call("mine", event, text, options);
  store = {
    get: (id: string) => this.state.records.find((item: any) => item.id === id),
    all: () => this.state.records,
  };
  ledger = {
    all: () => this.entries,
    history: (id: string) => this.entries.filter((item: any) => item.memoryId === id),
  };
  sleep = {
    preview: () => this.call("preview"),
    execute: (plan?: any) => this.call("execute", plan),
    restore: (id: string) => this.call("restore", id),
  };
  dreaming = {
    dream: () => this.call("dream"),
    approve: (id: string) => this.call("approve", id),
    reject: (id: string) => this.call("reject", id),
    pending: () => this.state.proposals.filter((item: any) => item.status === "proposed"),
  };
  conflicts = {
    scan: () => this.call("scan"),
    autoResolve: (conflict: any) => this.call("autoResolve", conflict),
    queue: () => this.state.conflicts.filter((item: any) => !item.resolved),
  };
}
