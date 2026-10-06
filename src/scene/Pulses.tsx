import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import type { Layout } from "../../shared/layout";
import { onSceneEvent } from "../state/ingest";
import { useOfficeStore } from "../state/officeStore";
import { sceneState } from "./sceneState";

interface Pulse { mesh: Mesh; p0: Vector3; c: Vector3; p1: Vector3; t: number }

/* Each model.call sends a small light along an arc from the agent to the router rack. */
export function Pulses({ layout }: { layout: Layout }) {
  const group = useRef<Group>(null);
  const live = useRef<Pulse[]>([]);
  const geo = useMemo(() => new SphereGeometry(.07, 10, 8), []);
  const end = useMemo(() => new Vector3(layout.routerPos.x, layout.routerPos.y + 1.0, layout.routerPos.z + .3), [layout]);

  useEffect(() => {
    const off = onSceneEvent(e => {
      if (e.kind !== "call" || !group.current) return;
      const a = sceneState.anchors.get(e.agentId);
      if (!a) return;
      const color = useOfficeStore.getState().agents[e.agentId].cfg.color;
      const mesh = new Mesh(geo, new MeshBasicMaterial({ color }));
      const p0 = new Vector3(a.x, a.y - 0.2, a.z);
      const c = p0.clone().lerp(end, .5); c.y += 2.4;
      group.current.add(mesh);
      live.current.push({ mesh, p0, c, p1: end, t: 0 });
    });
    return () => {
      off();
      live.current.forEach(p => { p.mesh.removeFromParent(); (p.mesh.material as MeshBasicMaterial).dispose(); });
      live.current = [];
    };
  }, [geo, end]);

  useFrame((_, dt) => {
    const list = live.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t += dt / .9;
      const t = Math.min(p.t, 1), u = 1 - t;
      p.mesh.position.set(0, 0, 0).addScaledVector(p.p0, u * u).addScaledVector(p.c, 2 * u * t).addScaledVector(p.p1, t * t);
      if (p.t >= 1) {
        p.mesh.removeFromParent();
        (p.mesh.material as MeshBasicMaterial).dispose();
        list.splice(i, 1);
        sceneState.routerFlash = .3;
      }
    }
  });

  return <group ref={group} />;
}
