import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { routeFromSpot, routeSpotToSpot, routeToSpot, type ActivitySpot, type Layout } from "../../shared/layout";
import { useOfficeStore } from "../state/officeStore";
import type { RobotMotion } from "./motion";

type Mode = "desk" | "going" | "lounge" | "returning" | "meetGoing" | "meeting";
interface Mind { mode: Mode; idleSince: number; delay: number; spot: number; until: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a);
/* Preview switches: ?lounge=instant skips waiting and walking (lounge and meeting), ?lounge=off stops the trips to the lounge (meetings still work), ?meeting=1 starts with a meeting called. */
const LOUNGE_MODE = typeof location !== "undefined" ? new URLSearchParams(location.search).get("lounge") : null;
const INSTANT = LOUNGE_MODE === "instant";
const OFF = LOUNGE_MODE === "off";

/* What characters do when they are not at a desk.
   When idle for a while, a character gets up, climbs the tower stairs to the common room and picks something to do; when work arrives it hurries back.
   When a meeting is called (top bar), everybody walks to their seat at the meeting table, and goes home when it ends.
   Nothing here touches the event contract: it only reads each agent's status. */
export function LoungeBehavior({ layout, motions }: { layout: Layout; motions: RobotMotion[] }) {
  const minds = useMemo<Mind[]>(() => motions.map(() => ({ mode: "desk", idleSince: performance.now(), delay: INSTANT ? 600 : rand(7000, 13000), spot: -1, until: 0 })), [motions]);
  const taken = useRef(new Set<number>());
  const last = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - last.current < 400) return;
    last.current = now;
    const { order, agents, meeting } = useOfficeStore.getState();
    const seats = layout.meeting?.seats ?? [];

    const pickSpot = (i: number, avoid = -1): number => {
      const free = layout.spots.map((_, k) => k).filter(k => !taken.current.has(k) && k !== avoid);
      if (!free.length) return -1;
      // Everyone has their own taste, so start the search at a different place for each character.
      return free[(i * 3 + Math.floor(Math.random() * free.length)) % free.length];
    };

    function arrive(i: number, spot: ActivitySpot, k: number, mode: Mode) {
      const m = motions[i], mind = minds[i];
      m.pose = "activity"; m.activity = spot.kind; m.heading = spot.heading; m.x = spot.x; m.z = spot.z; m.y = spot.y; m.speedMul = 1;
      mind.mode = mode; mind.spot = k; mind.until = performance.now() + rand(22000, 45000);
    }

    function goHome(i: number, spot: ActivitySpot) {
      const m = motions[i], mind = minds[i];
      if (mind.spot >= 0) taken.current.delete(mind.spot);
      mind.mode = "returning"; mind.spot = -1;
      m.activity = null; m.speedMul = 1.35;
      m.path = routeFromSpot(layout, i, spot); m.pose = "walking";
      m.onArrive = () => {
        m.pose = "seated"; m.heading = 0; m.speedMul = 1;
        mind.mode = "desk"; mind.idleSince = performance.now(); mind.delay = rand(7000, 13000);
      };
    }

    order.forEach((id, i) => {
      const m = motions[i], mind = minds[i], status = agents[id].status;
      if (!m) return;

      // ---- meeting: everybody to their seat, and home again afterwards ----
      if (meeting && seats[i]) {
        if (mind.mode === "meetGoing" || mind.mode === "meeting") return;
        const ready = (mind.mode === "desk" && m.pose === "seated") || (mind.mode === "lounge" && m.pose === "activity");
        if (!ready) return; // still walking somewhere: join the meeting once it gets there
        const seat = seats[i];
        const from = mind.mode === "lounge" ? layout.spots[mind.spot] : null;
        if (mind.spot >= 0) taken.current.delete(mind.spot);
        mind.mode = "meetGoing"; mind.spot = -1;
        m.carry = false; m.activity = null; m.speedMul = 1.15;
        m.path = from ? routeSpotToSpot(layout, from, seat) : routeToSpot(layout, i, seat);
        if (INSTANT) { arrive(i, seat, -1, "meeting"); return; }
        m.pose = "walking";
        m.onArrive = () => arrive(i, seat, -1, "meeting");
        return;
      }
      if (!meeting && mind.mode === "meeting") { goHome(i, seats[i]); return; }
      if (mind.mode === "meetGoing" || mind.mode === "meeting") return;

      // ---- the lounge ----
      if (!layout.spots.length || OFF) return;
      if (mind.mode === "desk") {
        if (m.pose !== "seated") return;
        if (status !== "idle") { mind.idleSince = now; return; }
        if (now - mind.idleSince < mind.delay) return;
        const k = pickSpot(i);
        if (k < 0) { mind.idleSince = now; return; }
        const spot = layout.spots[k];
        taken.current.add(k); mind.spot = k; mind.mode = "going";
        m.carry = false; m.speedMul = 1;
        if (INSTANT) { arrive(i, spot, k, "lounge"); return; }
        m.path = routeToSpot(layout, i, spot); m.pose = "walking";
        m.onArrive = () => arrive(i, spot, k, "lounge");
        return;
      }

      if (mind.mode === "lounge") {
        const spot = layout.spots[mind.spot];
        if (status !== "idle") return goHome(i, spot);
        if (now > mind.until) { // time for a change of scenery
          const k = pickSpot(i, mind.spot);
          if (k < 0) { mind.until = now + 8000; return; }
          const next = layout.spots[k];
          taken.current.delete(mind.spot); taken.current.add(k);
          mind.spot = k; mind.mode = "going";
          m.activity = null; m.path = routeSpotToSpot(layout, spot, next); m.pose = "walking";
          m.onArrive = () => arrive(i, next, k, "lounge");
        }
      }
    });
  });
  return null;
}
