import { create } from "zustand";
import type { AgentConfig } from "../../shared/agents";
import type { AgentStatus } from "../../shared/events";
import { AGENTS } from "../config/agents";

export interface LogEntry { ts: number; text: string }
export interface FeedItem { who: string; text: string }
export type ConnectionState = "connecting" | "connected" | "disconnected";

export interface AgentState {
  cfg: AgentConfig;
  status: AgentStatus;
  statusSince: number; // performance.now() ms, lets animations ask "how long in this status"
  task: string | null;
  log: LogEntry[];
  inbox: boolean;       // paper on the desk, set by the scene when a handoff is delivered
  walkLabel: string | null;
}

interface OfficeState {
  agents: Record<string, AgentState>;
  order: string[];
  feed: FeedItem[];
  routerCalls: number;
  selected: string | null;
  paused: boolean;
  connection: ConnectionState;
  resetSeq: number;
  meeting: boolean;
  viewMode: "inside" | "outside";
  // View-only actions. Domain state (agents, feed, routerCalls) changes only through ingest().
  select: (id: string | null) => void;
  setPaused: (v: boolean) => void;
  setConnection: (c: ConnectionState) => void;
  resetView: () => void;
  toggleMeeting: () => void;
  toggleView: () => void;
  setInbox: (id: string, v: boolean) => void;
  setWalkLabel: (id: string, label: string | null) => void;
}

const initialAgents = (): Record<string, AgentState> =>
  Object.fromEntries(AGENTS.map(cfg => [cfg.id, {
    cfg, status: "idle" as AgentStatus, statusSince: 0, task: null, log: [], inbox: false, walkLabel: null
  }]));

const patchAgent = (s: OfficeState, id: string, p: Partial<AgentState>) =>
  s.agents[id] ? { agents: { ...s.agents, [id]: { ...s.agents[id], ...p } } } : s;

export const useOfficeStore = create<OfficeState>(set => ({
  agents: initialAgents(),
  order: AGENTS.map(a => a.id),
  feed: [],
  routerCalls: 0,
  selected: null,
  paused: false,
  connection: "connecting",
  resetSeq: 0,
  meeting: typeof location !== "undefined" && new URLSearchParams(location.search).get("meeting") === "1",
  viewMode: "inside",
  select: id => set({ selected: id }),
  setPaused: paused => set({ paused }),
  setConnection: connection => set({ connection }),
  resetView: () => set(s => ({ resetSeq: s.resetSeq + 1 })),
  toggleMeeting: () => set(s => ({ meeting: !s.meeting })),
  toggleView: () => set(s => ({ viewMode: s.viewMode === "inside" ? "outside" : "inside" })),
  setInbox: (id, v) => set(s => patchAgent(s, id, { inbox: v })),
  setWalkLabel: (id, walkLabel) => set(s => patchAgent(s, id, { walkLabel }))
}));
