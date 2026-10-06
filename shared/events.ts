/* ------------------------------------------------------------------
   EVENT CONTRACT. All office state changes come from these events.
   Every event carries ts (ms since epoch).
------------------------------------------------------------------- */

export type AgentStatus = "idle" | "thinking" | "working" | "done" | "error";

export type ModelTier = "subscription" | "cheap" | "free";

export interface AgentStatusEvent {
  type: "agent.status";
  agentId: string;
  status: AgentStatus;
  task?: string;
  ts: number;
}

export interface AgentLogEvent {
  type: "agent.log";
  agentId: string;
  message: string;
  ts: number;
}

export interface AgentHandoffEvent {
  type: "agent.handoff";
  from: string;
  to: string;
  task: string;
  ts: number;
}

export interface ModelCallEvent {
  type: "model.call";
  agentId: string;
  tier?: ModelTier | string;
  ts: number;
}

export type OfficeEvent =
  | AgentStatusEvent
  | AgentLogEvent
  | AgentHandoffEvent
  | ModelCallEvent;

/* Messages the frontend sends to the server. These are not office events. */
export type ClientMessage =
  | { type: "task.assign"; agentId: string; text: string }
  | { type: "sim.pause" }
  | { type: "sim.resume" };

export const WS_PORT = 8787;

/* Runtime guards, used by both the server and the frontend source. */
const isStr = (v: unknown): v is string => typeof v === "string";

export function isOfficeEvent(x: unknown): x is OfficeEvent {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  if (typeof e.ts !== "number") return false;
  switch (e.type) {
    case "agent.status":
      return isStr(e.agentId) && isStr(e.status) &&
        ["idle", "thinking", "working", "done", "error"].includes(e.status) &&
        (e.task === undefined || isStr(e.task));
    case "agent.log":     return isStr(e.agentId) && isStr(e.message);
    case "agent.handoff": return isStr(e.from) && isStr(e.to) && isStr(e.task);
    case "model.call":    return isStr(e.agentId) && (e.tier === undefined || isStr(e.tier));
    default:              return false;
  }
}

export function isClientMessage(x: unknown): x is ClientMessage {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  if (m.type === "task.assign") return isStr(m.agentId) && isStr(m.text);
  return m.type === "sim.pause" || m.type === "sim.resume";
}
