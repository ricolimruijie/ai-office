import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AGENTS } from "../config/agents";
import { assignTask } from "../events/actions";
import { useOfficeStore } from "../state/officeStore";
import { handleOf, parseCommand, suggest } from "../../shared/mentions";

interface Note { kind: "ok" | "error"; text: string }

/* Give a task by name: "@nika create a new project". Typing "@" lists the agents. */
export function CommandBar() {
  const select = useOfficeStore(s => s.select);
  const withDrawer = useOfficeStore(s => s.selected !== null);
  const [text, setText] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const say = (n: Note) => {
    setNote(n);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(null), 5000);
  };

  // An unfinished "@word" at the end of the text opens the suggestion list.
  const token = /@([\w&-]*)$/.exec(text);
  const options = token ? suggest(AGENTS, token[1]) : [];
  const pick = options[Math.min(active, options.length - 1)];

  const accept = (handle: string) => {
    setText(t => t.replace(/@[\w&-]*$/, "@" + handle + " "));
    setActive(0);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { agents, connection } = useOfficeStore.getState();
    const r = parseCommand(text, AGENTS);
    if (!r.ok) return say({ kind: "error", text: r.error });
    if (connection !== "connected") return say({ kind: "error", text: "Not connected to the event server." });
    if (agents[r.agent.id].status !== "idle") return say({ kind: "error", text: r.agent.name + " is busy. Try again once idle." });
    assignTask(r.agent.id, r.task);
    select(r.agent.id);
    setText("");
    say({ kind: "ok", text: "Sent to " + r.agent.name + ": " + r.task });
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!options.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % options.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i - 1 + options.length) % options.length); }
    else if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); accept(handleOf(pick)); }
  };

  return (
    <form className={"cmdbar panel" + (withDrawer ? " with-drawer" : "")} onSubmit={submit}>
      {options.length > 0 && (
        <ul className="suggest" role="listbox" aria-label="Agents">
          {options.map((a, i) => (
            <li key={a.id} role="option" aria-selected={a === pick}>
              <button type="button" tabIndex={-1} className={a === pick ? "on" : ""}
                onMouseDown={e => e.preventDefault()} onClick={() => accept(handleOf(a))}>
                <span className="swatch" style={{ background: a.color }} />
                <span className="nm">@{handleOf(a)}</span>
                <span className="rl">{a.position}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="cmd-row">
        <input
          value={text} autoComplete="off" spellCheck={false}
          aria-label="Give a task. Type @ and an agent name, then the task."
          placeholder={"@" + handleOf(AGENTS[0]) + " create a new project"}
          onChange={e => { setText(e.target.value); setActive(0); }} onKeyDown={onKey}
        />
        <button className="btn primary" type="submit" disabled={!text.trim()}>Send</button>
      </div>
      <p className={"cmd-note" + (note ? " " + note.kind : "")} aria-live="polite">{note ? note.text : "Type @ to pick an agent, e.g. @" + handleOf(AGENTS[0]) + " create a new project"}</p>
    </form>
  );
}
