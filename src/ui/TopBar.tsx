import { setSimPaused } from "../events/actions";
import { fmtHour, phaseOf, PREVIEWS, useClock } from "../state/clockStore";
import { useOfficeStore, type ConnectionState } from "../state/officeStore";

const PHASE_ICON = { Morning: "🌅", Afternoon: "☀️", Evening: "🌇", Night: "🌙" } as const;

const CONN: Record<ConnectionState, { label: string; color: string }> = {
  connected:    { label: "Live",           color: "#2FA872" },
  connecting:   { label: "Connecting…",    color: "#E9A824" },
  disconnected: { label: "Offline, retrying", color: "#E5484D" }
};

export function TopBar() {
  const connection = useOfficeStore(s => s.connection);
  const paused = useOfficeStore(s => s.paused);
  const setPaused = useOfficeStore(s => s.setPaused);
  const resetView = useOfficeStore(s => s.resetView);
  const meeting = useOfficeStore(s => s.meeting);
  const toggleMeeting = useOfficeStore(s => s.toggleMeeting);
  const viewMode = useOfficeStore(s => s.viewMode);
  const toggleView = useOfficeStore(s => s.toggleView);
  const c = CONN[connection];
  const hour = useClock(s => s.override ?? s.hour);
  const previewing = useClock(s => s.override !== null);
  const cyclePreview = useClock(s => s.cyclePreview);
  const phase = phaseOf(hour);

  const toggle = () => { setPaused(!paused); setSimPaused(!paused); };

  return (
    <header className="topbar">
      <div className="brand panel">
        <h1>Agent Office</h1>
        <span className="src" role="status" aria-label={"Event server: " + c.label}>
          <i className="dot" style={{ background: c.color }} /><span>{c.label}</span>
        </span>
      </div>
      <div className="top-actions">
        <button className="btn clock" type="button" onClick={cyclePreview} aria-label={"Time of day: " + phase + ". Click to preview " + PREVIEWS.map(p => p.label.toLowerCase()).join(", ") + " or return to the real time."}
          title="Follows your clock. Click to preview morning, afternoon, night.">
          <span aria-hidden>{PHASE_ICON[phase]}</span> {phase} · {fmtHour(hour)}{previewing && <em className="prev">preview</em>}
        </button>
        <button className="btn" type="button" aria-pressed={viewMode === "outside"} onClick={toggleView}
          title="Switch between seeing inside the building and seeing its outside (shortcut: V)">
          {viewMode === "inside" ? "🏠 Inside view" : "🏢 Outside view"}
        </button>
        <button className="btn" type="button" aria-pressed={meeting} onClick={toggleMeeting}
          title="Everyone goes to the meeting room. Click again to send them back.">
          {meeting ? "End meeting" : "Call meeting"}
        </button>
        <button className="btn" type="button" onClick={resetView}>Reset view</button>
        <button className="btn" type="button" aria-pressed={!paused} onClick={toggle}>
          {paused ? "Resume auto activity" : "Pause auto activity"}
        </button>
      </div>
    </header>
  );
}
