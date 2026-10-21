import { useLayoutEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, InstancedMesh, Object3D, Vector3 } from "three";
import { UPPER_Y, WALL_H, type Layout } from "../../shared/layout";
import { Torch } from "./decor/magic";
import { C } from "./palette";
import { Cyl } from "./parts";
import { toonGradient } from "./toon";

const STEPS = 52;

/* The spiral staircase: a stone newel, treads that wind up it, an iron handrail on posts, slim pillars round the outside and a pointed roof.
   The treads follow `stairs.climb`, the same line characters walk along, so feet meet stone. */
export function StairTower({ layout }: { layout: Layout }) {
  const st = layout.stairs!;
  const treads = useRef<InstancedMesh>(null), posts = useRef<InstancedMesh>(null);
  const turns = st.turns * Math.PI * 2, rail = 1.55, topY = UPPER_Y + WALL_H - 0.3;

  useLayoutEffect(() => {
    const o = new Object3D(), t = treads.current, p = posts.current;
    if (!t || !p) return;
    for (let i = 0; i < STEPS; i++) {
      const f = i / (STEPS - 1), a = -f * turns, y = UPPER_Y * f;
      o.position.set(st.x + Math.sin(a) * 0.95, y - 0.07, st.z + Math.cos(a) * 0.95);
      o.rotation.set(0, a, 0); o.scale.set(0.52, 0.14, 1.05); o.updateMatrix(); t.setMatrixAt(i, o.matrix);
      o.position.set(st.x + Math.sin(a) * rail, y + 0.5, st.z + Math.cos(a) * rail);
      o.rotation.set(0, 0, 0); o.scale.set(0.05, 1.0, 0.05); o.updateMatrix(); p.setMatrixAt(i, o.matrix);
    }
    t.instanceMatrix.needsUpdate = true; p.instanceMatrix.needsUpdate = true;
  }, [st, turns]);

  const handrail = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const f = i / 60, a = -f * turns;
      pts.push(new Vector3(st.x + Math.sin(a) * rail, UPPER_Y * f + 1.02, st.z + Math.cos(a) * rail));
    }
    return new CatmullRomCurve3(pts);
  }, [st, turns]);

  return (
    <group>
      <Cyl rt={0.36} rb={0.4} h={topY} pos={[st.x, topY / 2, st.z]} color={C.stone} seg={14} />
      <instancedMesh ref={treads} args={[undefined, undefined, STEPS]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} /><meshToonMaterial color="#A8A29A" gradientMap={toonGradient} />
      </instancedMesh>
      <instancedMesh ref={posts} args={[undefined, undefined, STEPS]}>
        <boxGeometry args={[1, 1, 1]} /><meshToonMaterial color={C.iron} gradientMap={toonGradient} />
      </instancedMesh>
      <mesh><tubeGeometry args={[handrail, 120, 0.035, 6, false]} /><meshToonMaterial color="#5C3B26" gradientMap={toonGradient} /></mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        return <Cyl key={i} rt={0.13} rb={0.16} h={topY} pos={[st.x + Math.sin(a) * 1.75, topY / 2, st.z + Math.cos(a) * 1.75]} color={C.stoneLight} seg={8} />;
      })}
      {[0, UPPER_Y].map(y => (
        <mesh key={y} position={[st.x, y + 0.1, st.z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.75, 0.1, 6, 24]} /><meshToonMaterial color={C.stone} gradientMap={toonGradient} /></mesh>
      ))}
      {[1.3, 3.3, 5.6].map((y, i) => {
        const a = 1.0 + i * 1.57;
        return <Torch key={y} pos={[st.x + Math.sin(a) * 0.4, y, st.z + Math.cos(a) * 0.4]} rotY={a + Math.PI} />;
      })}
    </group>
  );
}
