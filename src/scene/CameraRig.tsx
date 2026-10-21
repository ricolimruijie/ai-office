import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ElementRef } from "react";
import { Vector3 } from "three";
import type { Layout } from "../../shared/layout";
import { useOfficeStore } from "../state/officeStore";
import { sceneState } from "./sceneState";

const THETA = 0.78, PHI = 1.0;
const FOCUS_DIST = 7;
const MOVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "KeyR", "KeyF", "ShiftLeft", "ShiftRight", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

/* Camera controls.
   Mouse: drag to orbit, right-drag to pan, wheel to zoom. Touch: one finger orbits, two fingers pan and pinch.
   Keyboard: W A S D (or arrows) move across the floor, Q and E turn, R and F go up and down, Shift is faster.
   Selecting an agent flies to its desk and zooms in. */
export function CameraRig({ layout }: { layout: Layout }) {
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const camera = useThree(s => s.camera);
  const size = useThree(s => s.size);
  const goal = useMemo(() => new Vector3(), []);
  const zoom = useRef({ until: 0, dist: FOCUS_DIST });
  const keys = useRef(new Set<string>());
  const following = useRef(false);
  const prev = useMemo(() => new Vector3(), []);
  const tmpF = useMemo(() => new Vector3(), []), tmpR = useMemo(() => new Vector3(), []), off = useMemo(() => new Vector3(), []);
  const selected = useOfficeStore(s => s.selected);
  const resetSeq = useOfficeStore(s => s.resetSeq);

  const homeDist = size.width < 760 ? 140 : 80;

  const homeView = () => {
    const c = controls.current;
    if (!c) return;
    const sp = Math.sin(PHI);
    c.target.set(layout.center.x, 1.5, layout.center.z + 2);
    goal.copy(c.target);
    zoom.current.until = 0;
    camera.position.set(
      c.target.x + homeDist * sp * Math.sin(THETA), c.target.y + homeDist * Math.cos(PHI), c.target.z + homeDist * sp * Math.cos(THETA)
    );
    c.update();
  };
  useLayoutEffect(homeView, [resetSeq, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return; if (MOVE_KEYS.includes(e.code)) { keys.current.add(e.code); e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.code); };
    const clear = () => keys.current.clear();
    addEventListener("keydown", down); addEventListener("keyup", up); addEventListener("blur", clear);
    return () => { removeEventListener("keydown", down); removeEventListener("keyup", up); removeEventListener("blur", clear); };
  }, []);

  const gl = useThree(s => s.gl);
  useEffect(() => {
    // Panning by hand takes over from following someone.
    const el = gl.domElement;
    const stop = (e: PointerEvent) => { if (e.button === 2 || e.ctrlKey || e.shiftKey) following.current = false; };
    el.addEventListener("pointerdown", stop);
    return () => el.removeEventListener("pointerdown", stop);
  }, [gl]);

  useEffect(() => {
    if (!selected) { following.current = false; return; }
    const i = useOfficeStore.getState().order.indexOf(selected);
    const d = layout.desks[i];
    if (!d) return;
    goal.set(d.x, d.y + 0.9, d.z - 0.5);
    zoom.current = { until: performance.now() + 1500, dist: FOCUS_DIST };
    following.current = true;
  }, [selected, layout, goal]);

  useFrame((_, rawDt) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(rawDt, 0.1), k = 1 - Math.exp(-5 * dt), K = keys.current;
    const fz = (K.has("KeyW") || K.has("ArrowUp") ? 1 : 0) - (K.has("KeyS") || K.has("ArrowDown") ? 1 : 0);
    const fx = (K.has("KeyD") || K.has("ArrowRight") ? 1 : 0) - (K.has("KeyA") || K.has("ArrowLeft") ? 1 : 0);
    const turn = (K.has("KeyE") ? 1 : 0) - (K.has("KeyQ") ? 1 : 0);
    const lift = (K.has("KeyR") ? 1 : 0) - (K.has("KeyF") ? 1 : 0);

    if (fx || fz || turn || lift) {
      goal.copy(c.target); zoom.current.until = 0; following.current = false;   // moving by hand cancels any focus glide
      const dist = camera.position.distanceTo(c.target);
      const speed = (K.has("ShiftLeft") || K.has("ShiftRight") ? 2.6 : 1) * 11 * Math.min(2.6, Math.max(0.55, dist / 30));
      camera.getWorldDirection(tmpF); tmpF.y = 0; tmpF.normalize();
      tmpR.set(-tmpF.z, 0, tmpF.x);
      const move = tmpF.multiplyScalar(fz * speed * dt).addScaledVector(tmpR, fx * speed * dt);
      move.y = lift * 6 * dt;
      const b = layout.bounds;
      const nx = Math.min(b.maxX, Math.max(b.minX, c.target.x + move.x)), nz = Math.min(b.maxZ, Math.max(b.minZ, c.target.z + move.z));
      const ny = Math.min(12, Math.max(0, c.target.y + move.y));
      move.set(nx - c.target.x, ny - c.target.y, nz - c.target.z);
      c.target.add(move); camera.position.add(move); goal.copy(c.target);
      if (turn) {
        off.copy(camera.position).sub(c.target);
        const a = turn * 1.6 * dt, cos = Math.cos(a), sin = Math.sin(a);
        const x = off.x * cos - off.z * sin, z = off.x * sin + off.z * cos;
        camera.position.set(c.target.x + x, camera.position.y, c.target.z + z);
      }
    } else {
      // Keep the selected character in view as it walks about, then glide there with the camera, so the viewing angle stays the same.
      const sel = useOfficeStore.getState().selected, mo = sel ? sceneState.walkers.get(sel) : undefined;
      if (following.current && mo) goal.set(mo.x, mo.y + 0.9, mo.z - 0.2);
      prev.copy(c.target);
      c.target.lerp(goal, k);
      camera.position.add(prev.subVectors(c.target, prev));
      if (performance.now() < zoom.current.until) {
        off.copy(camera.position).sub(c.target);
        const d = off.length();
        camera.position.copy(c.target).addScaledVector(off.normalize(), d + (zoom.current.dist - d) * k);
      }
    }
  }, -2);

  return (
    <OrbitControls
      ref={controls} makeDefault enablePan screenSpacePanning={false} enableDamping={false} rotateSpeed={0.75}
      minPolarAngle={0.12} maxPolarAngle={1.5} minDistance={5} maxDistance={140}
    />
  );
}
