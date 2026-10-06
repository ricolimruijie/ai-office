import { useEffect } from "react";
import { routeHome, routeTo, type Layout } from "../../shared/layout";
import { onSceneEvent } from "../state/ingest";
import { useOfficeStore } from "../state/officeStore";
import type { RobotMotion } from "./motion";

const HAND_OVER_MS = 1200;

/* Reacts to agent.handoff: the sender walks the aisle with a document, drops it in the other inbox, and walks back.
   The mock server budgets walk time from the same layout math, so it can time the receiver's start. */
export function Handoffs({ layout, motions }: { layout: Layout; motions: RobotMotion[] }) {
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const off = onSceneEvent(e => {
      if (e.kind !== "handoff") return;
      const { order, agents, setWalkLabel, setInbox } = useOfficeStore.getState();
      const i = order.indexOf(e.from), j = order.indexOf(e.to);
      const m = motions[i];
      if (i < 0 || j < 0 || i === j || !m || m.pose !== "seated") return;

      m.carry = true;
      setWalkLabel(e.from, "Taking task to " + agents[e.to].cfg.name);
      m.path = routeTo(layout, i, j);
      m.pose = "walking";
      m.onArrive = () => {
        m.heading = Math.PI; // face the desk
        const t = setTimeout(() => {
          timers.delete(t);
          m.carry = false;
          setInbox(e.to, true);
          setWalkLabel(e.from, "Heading back");
          m.path = routeHome(layout, i, j);
          m.pose = "walking";
          m.onArrive = () => { m.pose = "seated"; m.heading = 0; setWalkLabel(e.from, null); };
        }, HAND_OVER_MS);
        timers.add(t);
      };
    });
    return () => { off(); timers.forEach(clearTimeout); };
  }, [layout, motions]);
  return null;
}
