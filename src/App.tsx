import { useEffect } from "react";
import { connectSource, source } from "./events";
import { phaseOf, effectiveHour, useClock } from "./state/clockStore";
import { useOfficeStore } from "./state/officeStore";
import { OfficeCanvas } from "./scene/OfficeCanvas";
import { AgentDrawer } from "./ui/AgentDrawer";
import { CommandBar } from "./ui/CommandBar";
import { NameTags } from "./ui/NameTags";
import { RosterPanel } from "./ui/RosterPanel";
import { TopBar } from "./ui/TopBar";

export function App() {
  useEffect(() => connectSource(source), []);
  // V switches between the inside and outside views.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code === "KeyV" && !e.ctrlKey && !e.metaKey && !(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA"))) useOfficeStore.getState().toggleView();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  // The clock drives the scenery, and the panels follow it: dark after sunset, light by day.
  useEffect(() => {
    const apply = () => { document.documentElement.dataset.theme = phaseOf(effectiveHour()) === "Night" ? "dark" : "light"; };
    apply();
    const timer = setInterval(() => useClock.getState().tick(), 20000);
    const off = useClock.subscribe(apply);
    return () => { clearInterval(timer); off(); };
  }, []);
  return (
    <>
      <OfficeCanvas />
      <NameTags />
      <TopBar />
      <RosterPanel />
      <AgentDrawer />
      <CommandBar />
    </>
  );
}
