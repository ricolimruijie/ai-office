import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group } from "three";
import { useOfficeStore } from "../state/officeStore";

const CUT = 0.14;

/* An exterior wall that drops to a low base when the camera looks at it from outside, so you can always see in.
   Children are placed in world x and z, and relative to `y0` in height. (nx, nz) is the direction the wall faces outward. */
export function Cutaway({ x, z, y0 = 0, nx, nz, children }: { x: number; z: number; y0?: number; nx: number; nz: number; children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ camera }, rawDt) => {
    const grp = g.current;
    if (!grp) return;
    const dx = camera.position.x - x, dz = camera.position.z - z, len = Math.hypot(dx, dz) || 1;
    const facing = (dx * nx + dz * nz) / len;
    const outside = useOfficeStore.getState().viewMode === "outside";
    const target = !outside && facing > 0.08 ? CUT : 1;
    const k = 1 - Math.exp(-7 * Math.min(rawDt, 0.1));
    grp.scale.y += (target - grp.scale.y) * k;
  });
  return <group ref={g} position={[0, y0, 0]}>{children}</group>;
}
