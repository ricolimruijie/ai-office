import { isLiftStep, type ActivityKind, type RouteStep } from "../../shared/layout";
import { requestLift } from "../scene/lift";

/* Mutable per-character motion state, driven by walkers and read by the animation each frame. */
export type Pose = "seated" | "walking" | "standing" | "lifting" | "activity";

export interface RobotMotion {
  pose: Pose;
  x: number;
  y: number;
  z: number;
  heading: number;
  carry: boolean;
  walkPhase: number;
  path: RouteStep[];
  onArrive: (() => void) | null;
  /** What the character is doing in the lounge while pose is "activity". */
  activity: ActivityKind | null;
  /** Multiplier on walking speed (a character hurrying back to work walks faster). */
  speedMul: number;
}

export const createMotion = (x: number, z: number, y = 0): RobotMotion => ({
  pose: "seated", x, y, z, heading: 0, carry: false, walkPhase: 0, path: [], onArrive: null, activity: null, speedMul: 1
});

/* Walk a character along its path. Lift steps hand the character over to the lift controller until it arrives upstairs or downstairs.
   Returns true while the character is walking. */
export function stepMotion(motion: RobotMotion, dt: number, speed: number): boolean {
  if (motion.pose !== "walking") return false;
  const p = motion.path[0];
  if (!p) {
    motion.pose = "standing";
    const cb = motion.onArrive; motion.onArrive = null;
    if (cb) cb();
    return false;
  }
  if (isLiftStep(p)) {
    const rest = motion.path.slice(1), cb = motion.onArrive;
    motion.path = []; motion.onArrive = null; motion.pose = "lifting";
    requestLift(motion, p.toY, rest, cb);
    return false;
  }
  const vx = p.x - motion.x, vz = p.z - motion.z, vy = (p.y ?? 0) - motion.y, d = Math.hypot(vx, vz, vy), step = speed * dt;
  if (d <= step) {
    motion.x = p.x; motion.z = p.z; motion.y = p.y ?? 0; motion.path.shift();
    if (!motion.path.length) {
      motion.pose = "standing";
      const cb = motion.onArrive; motion.onArrive = null;
      if (cb) cb();
    }
  } else {
    motion.x += vx / d * step; motion.z += vz / d * step; motion.y += vy / d * step;
    if (Math.hypot(vx, vz) > 0.01) motion.heading = Math.atan2(vx, vz);
  }
  motion.walkPhase += dt * 9;
  return true;
}
