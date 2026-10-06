import type { AgentConfig } from "../../shared/agents";
import type { OfficeEvent } from "../../shared/events";
import { parseCommand } from "../../shared/mentions";

/* Pure helpers for the Discord bot: no Discord objects, so they can be tested directly. */

export type TextRoute =
  | { kind: "ignore" }
  | { kind: "error"; text: string }
  | { kind: "assign"; agent: AgentConfig; task: string };

/* Decide what a chat message in the feed channel means. Normal conversation is ignored. */
export function routeText(text: string, agents: AgentConfig[]): TextRoute {
  const t = text.trim();
  if (!/(^|\s)@[\w&-]/.test(t)) return { kind: "ignore" };
  const r = parseCommand(t, agents);
  if (r.ok) return { kind: "assign", agent: r.agent, task: r.task };
  // Only complain when the message is clearly a command (starts with @) and is not a server-wide ping.
  if (!t.startsWith("@") || /^@(everyone|here)\b/i.test(t)) return { kind: "ignore" };
  return { kind: "error", text: r.error };
}

const ICON = { idle: "⚪", thinking: "🟡", working: "🔵", done: "🟢", error: "🔴" } as const;
const LABEL = { idle: "Idle", thinking: "Thinking", working: "Working", done: "Done", error: "Error" } as const;
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export type AgentState = { status: keyof typeof ICON; task?: string };

/* Text for the live status board, plus how many robots are busy. */
export function boardLines(agents: AgentConfig[], state: Map<string, AgentState>, queued: (id: string) => number) {
  let working = 0;
  const lines = agents.map(a => {
    const s = state.get(a.id) ?? { status: "idle" as const };
    if (s.status !== "idle") working++;
    const q = queued(a.id);
    return ICON[s.status] + " **" + a.name + "** · " + a.position + " — " + LABEL[s.status]
      + (s.task ? " · " + short(s.task, 80) : "") + (q ? " (+" + q + " queued)" : "");
  });
  return { text: lines.join("\n"), working };
}

export function avatarFor(a: AgentConfig): string {
  return a.avatar ?? "https://api.dicebear.com/9.x/bottts-neutral/png?size=128&seed=" + encodeURIComponent(a.name) + "&backgroundColor=" + a.color.slice(1);
}

export const threadTitle = (a: AgentConfig, task: string) => short(a.name + ": " + task, 90);

const NOISE = /^(Picked up|Finished|Queued|Busy|Queue full)/;

/* One line to post for an office event, or null for events too noisy for chat (model calls, working, idle). */
export function stepText(ev: OfficeEvent, agents: AgentConfig[], lastTask: (id: string) => string | undefined): string | null {
  const nameOf = (id: string) => agents.find(a => a.id === id)?.name ?? id;
  switch (ev.type) {
    case "agent.status":
      if (ev.status === "thinking" && ev.task) return "🧠 Picked up: " + ev.task;
      if (ev.status === "done") return "✅ Finished: " + (lastTask(ev.agentId) ?? "task");
      if (ev.status === "error") return "⚠️ Ran into an error on: " + (lastTask(ev.agentId) ?? "task") + ". Will retry later.";
      return null;
    case "agent.handoff":
      return "📨 Handed off to " + nameOf(ev.to) + ": " + ev.task;
    case "agent.log":
      return NOISE.test(ev.message) ? null : "› " + ev.message;
    default:
      return null;
  }
}
