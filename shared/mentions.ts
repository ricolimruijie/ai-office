import type { AgentConfig } from "./agents";

/* Parsing for the web command bar and the Discord bot: "@nika create a new project" -> assign "create a new project" to Nika.
   An agent can be mentioned by name (@nika), id (@backend) or position (@productmanager, @technicalwriter). */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const keysOf = (a: AgentConfig) => [a.name, a.id, a.position].map(norm);

export const handleOf = (a: AgentConfig) => norm(a.name);

export function findAgent(agents: AgentConfig[], token: string): AgentConfig | undefined {
  const t = norm(token);
  if (!t) return undefined;
  return agents.find(a => norm(a.name) === t) ?? agents.find(a => norm(a.id) === t) ?? agents.find(a => norm(a.position) === t);
}

/* Agents whose name, id or position starts with what has been typed after "@". */
export function suggest(agents: AgentConfig[], prefix: string): AgentConfig[] {
  const t = norm(prefix);
  return agents.filter(a => keysOf(a).some(k => k.startsWith(t)));
}

export type ParsedCommand =
  | { ok: true; agent: AgentConfig; task: string }
  | { ok: false; error: string };

export function parseCommand(text: string, agents: AgentConfig[]): ParsedCommand {
  const m = /(^|\s)@([\w&-]+)[:,]?/.exec(text);
  if (!m) return { ok: false, error: "Start with @name, for example @" + handleOf(agents[0]) + " create a new project." };
  const agent = findAgent(agents, m[2]);
  if (!agent) return { ok: false, error: "No agent called @" + m[2] + "." };
  const task = (text.slice(0, m.index) + " " + text.slice(m.index + m[0].length))
    .replace(/\s+/g, " ").replace(/^[\s:,.-]+/, "").trim();
  if (!task) return { ok: false, error: "What should " + agent.name + " do? Add a task after the name." };
  return { ok: true, agent, task };
}
