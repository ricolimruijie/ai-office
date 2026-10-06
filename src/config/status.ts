import type { AgentStatus } from "../../shared/events";

export const STATUS: Record<AgentStatus, { label: string; color: string }> = {
  idle:     { label: "Idle",     color: "#8E97A8" },
  thinking: { label: "Thinking", color: "#E9A824" },
  working:  { label: "Working",  color: "#3C7DFF" },
  done:     { label: "Done",     color: "#2FA872" },
  error:    { label: "Error",    color: "#E5484D" }
};
