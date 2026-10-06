import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group, Material, Mesh } from "three";
import { Vector3 } from "three";

/* Foreground structure (front beams, ceiling beams, hanging lamps) fades away so it never blocks the view.
   By distance: nearly gone inside `min`, fully visible beyond `max`. With `pitch`, it also fades when the camera looks down from above. */
export function NearFade({ children, min = 20, max = 34, pitch = false, floor = 0.1, perMesh = false }: { children: ReactNode; min?: number; max?: number; pitch?: boolean; floor?: number; perMesh?: boolean }) {
  const g = useRef<Group>(null);
  const last = useRef(-1);
  const wp = useRef(new Vector3());
  const controls = useThree(s => s.controls) as unknown as { target: Vector3 } | null;

  useFrame(({ camera }) => {
    const grp = g.current;
    if (!grp || !controls?.target) return;
    let pitchF = 1;
    if (pitch) {
      // Looking down from above, ceiling structure would hide the rooms, so it fades. From a low angle it shows.
      const t = controls.target, hd = Math.hypot(camera.position.x - t.x, camera.position.z - t.z) || 1;
      const f = Math.min(1, Math.max(0, (0.62 - Math.atan2(camera.position.y - t.y, hd)) / 0.42));
      pitchF = floor + (1 - floor) * f * f * (3 - 2 * f);
    }
    if (perMesh) {
      // Each piece fades by its own distance to the camera, so only what is in the way disappears.
      grp.traverse(obj => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;
        mesh.getWorldPosition(wp.current);
        const mo = Math.min(pitchF, Math.min(1, Math.max(floor, (wp.current.distanceTo(camera.position) - min) / (max - min))));
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m: Material) => {
          if (m.userData.shared) return;
          const base = (m.userData.baseOpacity ??= m.opacity) as number, was = m.transparent;
          m.transparent = mo < 1 || base < 1; m.opacity = base * mo; m.depthWrite = mo >= 1 && base >= 1;
          if (m.transparent !== was) m.needsUpdate = true;
        });
      });
      return;
    }
    const d = camera.position.distanceTo(controls.target);
    const o = Math.min(pitchF, Math.min(1, Math.max(floor, (d - min) / (max - min))));
    if (Math.abs(o - last.current) < 0.01) return;
    last.current = o;
    grp.traverse(obj => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m: Material) => {
        const wasTransparent = m.transparent;
        const base = (m.userData.baseOpacity ??= m.opacity) as number;
        m.transparent = o < 1 || base < 1;
        m.opacity = base * o;
        m.depthWrite = o >= 1 && base >= 1;
        if (m.transparent !== wasTransparent) m.needsUpdate = true;
      });
    });
  });

  return <group ref={g}>{children}</group>;
}
