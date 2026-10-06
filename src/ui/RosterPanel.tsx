import { STATUS } from "../config/status";
import { useOfficeStore } from "../state/officeStore";
import { StatusPill } from "./StatusPill";

function AgentRow({ id }: { id: string }) {
  const a = useOfficeStore(s => s.agents[id]);
  const selected = useOfficeStore(s => s.selected === id);
  const select = useOfficeStore(s => s.select);
  return (
    <li>
      <button className="agent-btn" type="button" aria-pressed={selected} onClick={() => select(id)}>
        <span className="swatch" style={{ background: a.cfg.color }} />
        <span className="nm">{a.cfg.name}<span className="rl">{a.cfg.position}</span></span>
        <StatusPill status={a.status} />
      </button>
    </li>
  );
}

export function RosterPanel() {
  const order = useOfficeStore(s => s.order);
  const feed = useOfficeStore(s => s.feed);
  return (
    <aside className="roster panel" aria-label="Agents">
      <h2>Agents</h2>
      <p className="hint">Select an agent to open its desk.</p>
      <ul className="agent-list">{order.map(id => <AgentRow key={id} id={id} />)}</ul>
      <div className="feed-wrap">
        <h3>Recent activity</h3>
        <ul className="feed">
          {feed.slice(0, 6).map((f, i) => <li key={i}><b>{f.who} </b>{f.text}</li>)}
        </ul>
      </div>
    </aside>
  );
}
