import { Vector3 } from "three";
import type { RobotMotion } from "../characters/motion";

/* Mutable per-frame values shared between scene components and the DOM label layer. Not React state, so no re-renders. */
export const sceneState = {
  routerFlash: 0,
  // World-space anchor for each floating tag, keyed by agent id, room id or "router". Updated by scene components.
  anchors: new Map<string, Vector3>(),
  // DOM element for each tag, registered by the label layer.
  tagEls: new Map<string, HTMLElement>(),
  // Every character's motion, so doors can open for whoever walks up to them.
  walkers: new Map<string, RobotMotion>()
};

export function setAnchor(key: string, x: number, y: number, z: number) {
  const v = sceneState.anchors.get(key);
  if (v) v.set(x, y, z); else sceneState.anchors.set(key, new Vector3(x, y, z));
}
