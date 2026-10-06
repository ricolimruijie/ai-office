import { UPPER_Y, type Lift, type RouteStep } from "../../shared/layout";
import type { RobotMotion } from "../characters/motion";

/* The lift: one cab, two doors (front on the ground floor, side upstairs).
   Characters line up near the doors while they wait. When the doors open, everyone queued for that floor steps in and rides
   together (up to four), and the lift holds the doors a moment for anyone close behind.
   Everything the 3D lift draws is read from `liftState`. */
export const liftState = { cabY: 0, front: 0, side: 0, moving: false, dir: 0 };

let cfg: Lift | null = null;
export const configureLift = (l: Lift | null) => { cfg = l; };

const CAPACITY = 4;
const CAB_SPEED = 2.6, DOOR_RATE = 1.5;
const GRACE = 1.1;        // seconds to wait after the last person steps in
const HOLD_MAX = 6;       // never hold the doors longer than this for latecomers
const EXIT_GAP = 0.45;    // seconds between people stepping out
// Where each rider stands inside the cab, relative to its center.
const SLOTS: [number, number][] = [[-0.55, -0.45], [0.55, -0.45], [-0.55, 0.5], [0.55, 0.5]];

interface Passenger {
  motion: RobotMotion; fromY: number; toY: number; rest: RouteStep[]; cb: (() => void) | null;
  state: "queued" | "boarding" | "inside" | "done"; spot: string; slot: number;
}
interface Trip { fromY: number; toY: number; riders: Passenger[]; phase: "prep" | "boarding" | "closing" | "ride" | "opening" | "exiting"; t: number; grace: number; hold: number; released: number }

const waiting: Passenger[] = [];
let trip: Trip | null = null;
let idleFor = 0;

const doorFor = (y: number) => (y < UPPER_Y / 2 ? "front" : "side");
const dist = (m: RobotMotion, x: number, z: number) => Math.hypot(m.x - x, m.z - z);

/* A spot in the line near the doors. The first two stand side by side, then the line grows away from the doors. */
function queueSpot(floorY: number, rank: number): { x: number; z: number; face: number } {
  const c = cfg!;
  if (floorY < UPPER_Y / 2) return { x: c.x + (rank % 2 === 0 ? -0.5 : 0.5), z: c.groundWait.z + 0.15 + Math.floor(rank / 2) * 0.75, face: Math.PI };
  return { x: c.upperWait.x - Math.floor(rank / 2) * 0.75, z: c.upperWait.z + (rank % 2 === 0 ? -0.45 : 0.45), face: Math.PI / 2 };
}

/* Send everyone who is waiting to their place in line. Runs whenever the line changes. */
function arrangeQueue() {
  const rank = new Map<number, number>();
  waiting.forEach(p => {
    if (p.state !== "queued") return;
    const k = rank.get(p.fromY) ?? 0;
    rank.set(p.fromY, k + 1);
    const s = queueSpot(p.fromY, k), key = s.x.toFixed(2) + "," + s.z.toFixed(2);
    if (p.spot === key) return;
    p.spot = key;
    const m = p.motion;
    m.path = [{ x: s.x, z: s.z, y: p.fromY }]; m.pose = "walking"; m.speedMul = 1;
    m.onArrive = () => { m.heading = s.face; };
  });
}

export function requestLift(motion: RobotMotion, toY: number, rest: RouteStep[], cb: (() => void) | null) {
  waiting.push({ motion, fromY: motion.y, toY, rest, cb, state: "queued", spot: "", slot: -1 });
  arrangeQueue();
}

function moveDoor(key: "front" | "side", target: number, dt: number): boolean {
  const cur = liftState[key], step = DOOR_RATE * dt;
  liftState[key] = cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step);
  return liftState[key] === target;
}
const closeAll = (dt: number) => { const a = moveDoor("front", 0, dt), b = moveDoor("side", 0, dt); return a && b; };

function moveCab(toY: number, dt: number): boolean {
  const d = toY - liftState.cabY, step = CAB_SPEED * dt * Math.min(1, 0.25 + Math.abs(d) * 0.6); // ease in and out
  liftState.moving = true; liftState.dir = Math.sign(d);
  if (Math.abs(d) <= step) { liftState.cabY = toY; liftState.moving = false; liftState.dir = 0; return true; }
  liftState.cabY += Math.sign(d) * step;
  return false;
}

/* Everyone in the line (or still walking up to it) on this floor who could still get in. */
const hopefuls = (y: number) => waiting.filter(p => p.fromY === y && p.state === "queued");

export function updateLift(dt: number) {
  if (!cfg) return;

  if (!trip) {
    const first = waiting[0];
    if (!first) {
      idleFor += dt;
      if (idleFor > 3) closeAll(dt);
      liftState.moving = false;
      return;
    }
    idleFor = 0;
    trip = { fromY: first.fromY, toY: first.toY, riders: [], phase: "prep", t: 0, grace: 0, hold: 0, released: 0 };
  }
  const tr = trip, c = cfg;

  switch (tr.phase) {
    case "prep": // already here? then straight to boarding. Otherwise shut the doors and fetch the cab.
      if (Math.abs(liftState.cabY - tr.fromY) < 0.02) { liftState.cabY = tr.fromY; tr.phase = "boarding"; break; }
      if (!closeAll(dt)) break;
      if (moveCab(tr.fromY, dt)) tr.phase = "boarding";
      break;

    case "boarding": {
      moveDoor(doorFor(tr.fromY), 1, dt);
      const doorOpen = liftState[doorFor(tr.fromY)] > 0.6;
      let boarded = false;
      if (doorOpen) {
        for (const p of hopefuls(tr.fromY)) {
          if (tr.riders.length >= CAPACITY) break;
          if (p.motion.pose !== "standing") continue;   // still walking to its place in line
          const slot = SLOTS[tr.riders.length], m = p.motion;
          p.state = "boarding"; p.slot = tr.riders.length; tr.riders.push(p);
          waiting.splice(waiting.indexOf(p), 1);
          m.path = [{ x: c.x + slot[0], z: c.z + slot[1], y: tr.fromY }]; m.pose = "walking"; m.speedMul = 1;
          m.onArrive = () => { p.state = "inside"; m.pose = "lifting"; };
          boarded = true;
        }
        if (boarded) { tr.grace = 0; arrangeQueue(); }
      }
      if (!tr.riders.length) break;
      // hold the doors while people are still stepping in, or running up to the line
      const allIn = tr.riders.every(p => p.state === "inside");
      const closeBehind = hopefuls(tr.fromY).some(p => {
        const s = queueSpot(tr.fromY, 0);
        return tr.riders.length < CAPACITY && dist(p.motion, s.x, s.z) < 5;
      });
      tr.hold += dt;
      if (allIn && (!closeBehind || tr.hold > HOLD_MAX)) tr.grace += dt; else tr.grace = 0;
      if (tr.grace > GRACE) tr.phase = "closing";
      break;
    }

    case "closing":
      if (closeAll(dt)) {
        const face = doorFor(tr.toY) === "front" ? 0 : -Math.PI / 2; // turn to face the door they will leave through
        tr.riders.forEach(p => { p.motion.heading = face; p.motion.pose = "lifting"; });
        tr.phase = "ride";
      }
      break;

    case "ride": {
      const done = moveCab(tr.toY, dt);
      tr.riders.forEach(p => { const s = SLOTS[p.slot]; p.motion.x = c.x + s[0]; p.motion.z = c.z + s[1]; p.motion.y = liftState.cabY; });
      if (done) tr.phase = "opening";
      break;
    }

    case "opening":
      if (!moveDoor(doorFor(tr.toY), 1, dt)) break;
      // nearest to the exit door steps out first
      tr.riders.sort((a, b) => (doorFor(tr.toY) === "front" ? b.motion.z - a.motion.z : a.motion.x - b.motion.x));
      tr.phase = "exiting"; tr.t = 0; tr.released = 0;
      break;

    case "exiting":
      tr.t += dt;
      while (tr.released < tr.riders.length && tr.t >= tr.released * EXIT_GAP) {
        const p = tr.riders[tr.released++], m = p.motion;
        p.state = "done";
        m.path = p.rest; m.onArrive = p.cb; m.pose = "walking";
      }
      if (tr.released >= tr.riders.length && tr.t > tr.riders.length * EXIT_GAP + 1.3) trip = null;
      break;
  }
}
