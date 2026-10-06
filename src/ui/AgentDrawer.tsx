import { useEffect, useState, type FormEvent } from "react";
import { assignTask } from "../events/actions";
import { useOfficeStore } from "../state/officeStore";
import { StatusPill } from "./StatusPill";

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function DrawerBody({ id }: { id: string }) {
  const a = useOfficeStore(s => s.agents[id]);
  const connection = useOfficeStore(s => s.connection);
  const select = useOfficeStore(s => s.select);
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");

  // Anything past idle means the agent has a task, or one is on its way (done, error, handoff).
  const busy = a.status !== "idle";
  const offline = connection !== "connected";
  const message = hint || (offline ? "Not connected to the event server." : busy ? a.cfg.name + " is busy. Try again once it is idle." : "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) { setHint("Type a task first."); return; }
    assignTask(id, t);
    setText(""); setHint("");
  };

  return (
    <>
      <div className="drawer-head">
        <span className="swatch" style={{ background: a.cfg.color }} />
        <div><h2>{a.cfg.name}</h2><p className="muted">{a.cfg.position} · {a.cfg.role}</p></div>
        <button className="icon-btn" type="button" aria-label="Close agent panel" onClick={() => select(null)}>×</button>
      </div>
      <div><StatusPill status={a.status} /></div>
      <div className="block"><h3>Current task</h3><p>{a.task || "No task right now."}</p></div>
      <form className="assign" onSubmit={submit}>
        <label htmlFor="taskInput">Give a task</label>
        <div className="assign-row">
          <input id="taskInput" placeholder={"e.g. " + a.cfg.tasks[0]} autoComplete="off" value={text}
            onChange={e => { setText(e.target.value); setHint(""); }} />
          <button className="btn primary" type="submit" disabled={busy || offline}>Assign</button>
        </div>
        <p className="hint" aria-live="polite">{message}</p>
      </form>
      <div className="block grow">
        <h3>Activity</h3>
        <ol className="log">
          {a.log.length === 0 && <li style={{ display: "block" }}>Nothing yet. Assign a task to get started.</li>}
          {a.log.slice(0, 40).map((e, i) => <li key={i}><time>{fmtTime(e.ts)}</time><span>{e.text}</span></li>)}
        </ol>
      </div>
    </>
  );
}

export function AgentDrawer() {
  const selected = useOfficeStore(s => s.selected);
  const select = useOfficeStore(s => s.select);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") select(null); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [select]);

  if (!selected) return null;
  return (
    <section className="drawer panel" aria-label="Agent details">
      <DrawerBody key={selected} id={selected} />
    </section>
  );
}
