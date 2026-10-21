import type { ActivityKind, RouteStep } from "../../shared/layout";

/* Mutable per-character motion state, driven by walkers and read by the animation each frame. */
export type Pose = "seated" | "walking" | "standing" | "activity";

export interface RobotMotion {
  pose: Pose;
  x: number;
  y: number;
  z: number;
  heading: number;
  carry: boolean;
  /** True while the character is casting a spell with a wand (summoning a familiar). */
  casting: boolean;
  walkPhase: number;
  path: RouteStep[];
  onArrive: (() => void) | null;
  /** What the character is doing in the lounge while pose is "activity". */
  activity: ActivityKind | null;
  /** Multiplier on walking speed (a character hurrying back to work walks faster). */
  speedMul: number;
}

export const createMotion = (x: number, z: number, y = 0): RobotMotion => ({
  pose: "seated", x, y, z, heading: 0, carry: false, casting: false, walkPhase: 0, path: [], onArrive: null, activity: null, speedMul: 1
});

/* Walk a character along its path. Points can carry a height, so a climb up the staircase is just more points.
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
