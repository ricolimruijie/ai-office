import divisions from "../divisions.json";
import type { AgentConfig } from "../shared/agents";
import type { AgentStatus, OfficeEvent } from "../shared/events";
import { computeLayout, deliveryTime, type Layout } from "../shared/layout";

type Draft<T> = T extends unknown ? Omit<T, "ts"> : never;

const MAX_QUEUE = 5;
const STEPS = ["Reading context", "Calling tools", "Checking results", "Writing output", "Double checking edge cases"];
const TIERS = ["subscription", "cheap", "free", "free"];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* Random agent activity that follows the same flow as the prototype. Swap this whole file for a real backend later. */
export class MockSim {
  running = true;
  private busy = new Set<string>();
  private queue = new Map<string, string[]>(); // tasks waiting for a busy agent, started one by one
  private state = new Map<string, { status: AgentStatus; task?: string }>();
  private layout: Layout;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private stopped = false;

  constructor(private agents: AgentConfig[], private out: (ev: OfficeEvent) => void) {
    this.layout = computeLayout(agents, divisions);
  }

  start() {
    // A few random agents start working right away.
    [...this.agents].sort(() => Math.random() - 0.5).slice(0, 3).forEach((a, i) => {
      this.later(() => this.runTask(a.id, pick(a.tasks)), 600 + i * 900);
    });
    this.later(() => this.tick(), 3000);
  }

  stop() {
    this.stopped = true;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  /* Events that bring a late-joining client up to date. */
  snapshot(): OfficeEvent[] {
    const ts = Date.now();
    const out: OfficeEvent[] = [];
    this.state.forEach((s, agentId) => {
      if (s.status !== "idle") out.push({ type: "agent.status", agentId, status: s.status, task: s.task, ts });
    });
    return out;
  }

  /* "queued" means the agent is busy and will start the task as soon as it is idle. "busy" means its queue is full. */
  assign(agentId: string, text: string): "started" | "queued" | "busy" | "unknown" {
    if (!this.agents.some(a => a.id === agentId)) return "unknown";
    if (this.busy.has(agentId)) {
      const q = this.queue.get(agentId) ?? [];
      if (q.length >= MAX_QUEUE) {
        this.emit({ type: "agent.log", agentId, message: "Queue full. Ignored new task: " + text });
        return "busy";
      }
      q.push(text);
      this.queue.set(agentId, q);
      this.emit({ type: "agent.log", agentId, message: "Queued (" + q.length + " waiting): " + text });
      return "queued";
    }
    this.runTask(agentId, text);
    return "started";
  }

  private emit(ev: Draft<OfficeEvent>) {
    if (ev.type === "agent.status") {
      this.state.set(ev.agentId, { status: ev.status, task: ev.status === "idle" ? undefined : ev.task ?? this.state.get(ev.agentId)?.task });
    }
    this.out({ ...ev, ts: Date.now() } as OfficeEvent);
  }

  private later(fn: () => void, ms: number) {
    if (this.stopped) return;
    const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms);
    this.timers.add(t);
  }

  private call(agentId: string) {
    this.emit({ type: "model.call", agentId, tier: pick(TIERS) });
  }

  private release(id: string) {
    this.emit({ type: "agent.status", agentId: id, status: "idle" });
    const next = this.queue.get(id)?.shift();
    if (next) { this.later(() => this.runTask(id, next), 800); return; } // stays busy, so nothing else grabs it
    this.busy.delete(id);
  }

  private runTask(id: string, task: string) {
    this.busy.add(id);
    this.emit({ type: "agent.status", agentId: id, status: "thinking", task });
    this.emit({ type: "agent.log", agentId: id, message: "Picked up: " + task });
    this.call(id);
    this.later(() => {
      if (Math.random() < 0.1) {
        this.emit({ type: "agent.status", agentId: id, status: "error" });
        this.emit({ type: "agent.log", agentId: id, message: "Model timed out. Will retry later." });
        this.later(() => this.release(id), 4500);
        return;
      }
      this.emit({ type: "agent.status", agentId: id, status: "working" });
      const steps = 2 + Math.floor(Math.random() * 3);
      let t = 0;
      for (let k = 0; k < steps; k++) {
        t += rand(1500, 2600);
        this.later(() => { this.emit({ type: "agent.log", agentId: id, message: pick(STEPS) }); this.call(id); }, t);
      }
      this.later(() => this.finish(id, task), t + rand(1200, 2000));
    }, rand(1800, 3200));
  }

  private finish(id: string, task: string) {
    this.emit({ type: "agent.status", agentId: id, status: "done" });
    this.emit({ type: "agent.log", agentId: id, message: "Finished: " + task });
    const idle = this.agents.filter(a => a.id !== id && !this.busy.has(a.id));
    if (this.running && idle.length && Math.random() < 0.4) {
      const to = pick(idle).id;
      const next = "Review: " + task;
      this.busy.add(to);
      this.later(() => {
        this.emit({ type: "agent.handoff", from: id, to, task: next });
        const i = this.agents.findIndex(a => a.id === id), j = this.agents.findIndex(a => a.id === to);
        const w = deliveryTime(this.layout, i, j) * 1000;
        // Frontend: the sender casts, the familiar flies over and drops the letter (w). Receiver starts just after.
        this.later(() => this.runTask(to, next), w + 300);
        this.later(() => this.release(id), w + 600);
      }, 900);
    } else {
      this.later(() => this.release(id), 1800);
    }
  }

  private tick() {
    if (this.running) {
      const idle = this.agents.filter(a => !this.busy.has(a.id));
      if (idle.length && Math.random() < 0.7) {
        const a = pick(idle);
        this.runTask(a.id, pick(a.tasks));
      }
    }
    this.later(() => this.tick(), rand(2400, 4200));
  }
}
