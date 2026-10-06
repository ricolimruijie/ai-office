import { isOfficeEvent, type OfficeEvent } from "../../shared/events";
import { useOfficeStore, type AgentState } from "./officeStore";

/* Transient effects for the 3D scene (walk, light pulse). They are triggered here and nowhere else. */
export type SceneEvent =
  | { kind: "handoff"; from: string; to: string }
  | { kind: "call"; agentId: string };

const listeners = new Set<(e: SceneEvent) => void>();
export function onSceneEvent(cb: (e: SceneEvent) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
const fire = (e: SceneEvent) => listeners.forEach(cb => cb(e));

const STATUS_LABEL = { idle: "Idle", thinking: "Thinking", working: "Working", done: "Done", error: "Error" } as const;
const MAX_LOG = 80, MAX_FEED = 20;

/* The single entry point for state changes. Every office event goes through here. */
export function ingest(ev: OfficeEvent): void {
  if (!isOfficeEvent(ev)) return;
  const ts = ev.ts;
  useOfficeStore.setState(s => {
    const agents = { ...s.agents };
    let feed = s.feed;
    let routerCalls = s.routerCalls;

    const edit = (id: string, f: (a: AgentState) => Partial<AgentState>) => {
      if (agents[id]) agents[id] = { ...agents[id], ...f(agents[id]) };
    };
    const log = (a: AgentState, text: string) => ({ log: [{ ts, text }, ...a.log].slice(0, MAX_LOG) });
    const note = (who: string, text: string) => { feed = [{ who, text }, ...feed].slice(0, MAX_FEED); };

    switch (ev.type) {
      case "agent.status": {
        const a = agents[ev.agentId];
        if (!a) return s;
        const task = ev.status === "idle" ? null : ev.task !== undefined ? ev.task : a.task;
        edit(ev.agentId, cur => ({
          status: ev.status, statusSince: performance.now(), task,
          inbox: ev.status === "idle" ? false : cur.inbox,
          ...log(cur, "Status: " + STATUS_LABEL[ev.status])
        }));
        if (ev.status !== "idle") note(a.cfg.name, STATUS_LABEL[ev.status].toLowerCase() + (task ? ": " + task : ""));
        break;
      }
      case "agent.log": {
        if (!agents[ev.agentId]) return s;
        edit(ev.agentId, cur => log(cur, ev.message));
        break;
      }
      case "agent.handoff": {
        const from = agents[ev.from], to = agents[ev.to];
        if (!from || !to) return s;
        edit(ev.from, cur => log(cur, "Handing off to " + to.cfg.name + ": " + ev.task));
        edit(ev.to, cur => log(cur, "Incoming from " + from.cfg.name + ": " + ev.task));
        note(from.cfg.name, "handed off to " + to.cfg.name);
        fire({ kind: "handoff", from: ev.from, to: ev.to });
        break;
      }
      case "model.call": {
        if (!agents[ev.agentId]) return s;
        routerCalls++;
        edit(ev.agentId, cur => log(cur, "Model call" + (ev.tier ? " via " + ev.tier + " tier" : "")));
        fire({ kind: "call", agentId: ev.agentId });
        break;
      }
    }
    return { agents, feed, routerCalls };
  });
}
