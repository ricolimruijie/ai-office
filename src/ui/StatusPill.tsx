import { STATUS } from "../config/status";
import type { AgentStatus } from "../../shared/events";

export function StatusPill({ status }: { status: AgentStatus }) {
  return (
    <span className="pill">
      <i style={{ background: STATUS[status].color }} />
      {STATUS[status].label}
    </span>
  );
}
