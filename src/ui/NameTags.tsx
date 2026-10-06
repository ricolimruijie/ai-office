import { STATUS } from "../config/status";
import { useOfficeStore } from "../state/officeStore";
import { sceneState } from "../scene/sceneState";

const bubble = { thinking: "…", error: "!", done: "✓", idle: "", working: "" } as const;

const reg = (key: string) => (el: HTMLElement | null) => {
  if (el) sceneState.tagEls.set(key, el); else sceneState.tagEls.delete(key);
};

function AgentTag({ id }: { id: string }) {
  const a = useOfficeStore(s => s.agents[id]);
  const selected = useOfficeStore(s => s.selected === id);
  const select = useOfficeStore(s => s.select);
  const st = STATUS[a.status];
  return (
    <button ref={reg(id)} type="button" className={"tag" + (selected ? " sel" : "")} aria-label={"Open " + a.cfg.name} onClick={() => select(id)}>
      <span className="d" style={{ background: st.color }} />
      <span className="nm">{a.cfg.name}</span>
      <span className="pos">{a.cfg.position}</span>
      <span className="sub">{a.walkLabel || st.label}</span>
      <span className="bub" style={{ color: st.color }}>{bubble[a.status]}</span>
    </button>
  );
}

/* Floating name tags. Positioned each frame by TagProjector from the 3D anchors. */
export function NameTags() {
  const order = useOfficeStore(s => s.order);
  const calls = useOfficeStore(s => s.routerCalls);
  const viewMode = useOfficeStore(s => s.viewMode);
  return (
    <div id="labels" className={viewMode === "outside" ? "outside" : ""}>
      {order.map(id => <AgentTag key={id} id={id} />)}
      <div ref={reg("router")} className="tag router">
        <span className="nm">Model router</span><span className="sub">{calls} {calls === 1 ? "call" : "calls"}</span>
      </div>
    </div>
  );
}
