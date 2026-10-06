import { create } from "zustand";

/* The time that drives the scenery. By default it follows the real clock; the top bar can preview other times. */
const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };

export const PREVIEWS = [
  { label: "Morning", hour: 8 },
  { label: "Afternoon", hour: 14.5 },
  { label: "Night", hour: 22 }
] as const;

function initialOverride(): number | null {
  const q = new URLSearchParams(location.search).get("hour");
  const h = q === null ? NaN : Number(q);
  return Number.isFinite(h) ? h : null;
}

interface ClockState {
  hour: number;                 // real local time
  override: number | null;      // previewed time, or null to follow the real clock
  tick: () => void;
  cyclePreview: () => void;
}

export const useClock = create<ClockState>(set => ({
  hour: nowHour(),
  override: initialOverride(),
  tick: () => set({ hour: nowHour() }),
  cyclePreview: () => set(s => {
    const i = PREVIEWS.findIndex(p => p.hour === s.override);
    const next = s.override === null ? 0 : i === -1 ? 0 : i + 1;
    return { override: next >= PREVIEWS.length ? null : PREVIEWS[next].hour };
  })
}));

export const effectiveHour = () => { const s = useClock.getState(); return s.override ?? s.hour; };

export type Phase = "Morning" | "Afternoon" | "Evening" | "Night";
export function phaseOf(h: number): Phase {
  if (h < 5 || h >= 20) return "Night";
  if (h < 11.5) return "Morning";
  if (h < 17.5) return "Afternoon";
  return "Evening";
}
export const fmtHour = (h: number) => {
  const m = Math.round(((h % 24) + 24) % 24 * 60), hh = Math.floor(m / 60) % 24, mm = m % 60;
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
};
