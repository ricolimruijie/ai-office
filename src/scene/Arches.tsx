import { useMemo } from "react";
import { ExtrudeGeometry, Path, Shape } from "three";
import { GateDoor } from "./Doors";
import { C } from "./palette";
import { Box, Cyl, TBox } from "./parts";
import { TEX } from "./textures";

type V3 = [number, number, number];

const ringCache = new Map<string, ExtrudeGeometry>();

/* A half ring (a round arch) lying in the x-y plane, thick in z. Its base sits at y = 0 and its apex at y = outer radius. */
export function archRing(inner: number, outer: number, depth: number): ExtrudeGeometry {
  const key = [inner, outer, depth].map(n => n.toFixed(3)).join("|");
  let g = ringCache.get(key);
  if (!g) {
    const s = new Shape();
    s.absarc(0, 0, outer, 0, Math.PI, false);
    s.lineTo(-inner, 0);
    s.absarc(0, 0, inner, Math.PI, 0, true);
    s.lineTo(outer, 0);
    g = new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 });
    g.translate(0, 0, -depth / 2);
    ringCache.set(key, g);
  }
  return g;
}

const wayCache = new Map<string, ExtrudeGeometry>();

/* A wall piece with a round-arched doorway cut out of it. The opening is w wide and its apex is openH high. Its base sits at y = 0. */
export function archDoorway(w: number, openH: number, wallH: number, depth: number): ExtrudeGeometry {
  const key = [w, openH, wallH, depth].map(n => n.toFixed(3)).join("|");
  let g = wayCache.get(key);
  if (!g) {
    const ow = w / 2 + 0.3, spring = openH - w / 2;
    const s = new Shape();
    s.moveTo(-ow, 0); s.lineTo(ow, 0); s.lineTo(ow, wallH); s.lineTo(-ow, wallH); s.lineTo(-ow, 0);
    const hole = new Path();
    hole.moveTo(-w / 2, 0); hole.lineTo(-w / 2, spring); hole.absarc(0, spring, w / 2, Math.PI, 0, true); hole.lineTo(w / 2, 0); hole.lineTo(-w / 2, 0);
    s.holes.push(hole);
    g = new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 });
    g.translate(0, 0, -depth / 2);
    wayCache.set(key, g);
  }
  return g;
}

interface Props {
  axis: "x" | "z";               // direction the wall runs
  from: number; to: number;      // extent along that axis
  at: number;                    // fixed coordinate on the other axis
  y0?: number; height?: number;
  /** Arched openings (no doors) at these positions along the wall. */
  arches?: { center: number; width?: number }[];
  /** Fill the wall solid between the arches (otherwise it is a low wall with an open colonnade above). */
  solid?: boolean;
}

/* The wall between a room and the cloister: a low stone wall topped by columns and rounded arches, so you can see into the room.
   Arched openings (with a keystone and a gold lintel) mark each doorway. */
export function ArchWall({ axis, from, to, at, y0 = 0, height = 3.6, arches = [], solid = false }: Props) {
  const p = (along: number, y: number, across = 0): V3 => (axis === "x" ? [along, y0 + y, at + across] : [at + across, y0 + y, along]);
  const size = (along: number, h: number, thick: number): V3 => (axis === "x" ? [along, h, thick] : [thick, h, along]);
  const rotY = axis === "x" ? 0 : Math.PI / 2;
  const wallH = solid ? height - 0.9 : 1.05;

  const segs = useMemo(() => {
    const gaps = arches.map(d => ({ a: d.center - (d.width ?? 2.6) / 2, b: d.center + (d.width ?? 2.6) / 2 })).sort((u, v) => u.a - v.a);
    const out: [number, number][] = [];
    let cur = from;
    gaps.forEach(g => { if (g.a > cur + 0.05) out.push([cur, g.a]); cur = g.b; });
    if (to > cur + 0.05) out.push([cur, to]);
    return out;
  }, [from, to, arches]);

  return (
    <group>
      {segs.map(([a, b], i) => {
        const len = b - a, mid = (a + b) / 2, n = Math.max(1, Math.round(len / 2.4));
        return (
          <group key={i}>
            <TBox size={size(len, wallH, 0.4)} pos={p(mid, wallH / 2)} tex={TEX.stone} tile={1.6} />
            <Box size={size(len, 0.1, 0.5)} pos={p(mid, wallH + 0.05)} color={C.stoneLight} />
            {!solid && Array.from({ length: n + 1 }, (_, k) => {
              const along = a + (len * k) / n;
              return <Cyl key={k} rt={0.14} rb={0.17} h={height - wallH} pos={p(along, wallH + (height - wallH) / 2)} color={C.stoneLight} seg={10} />;
            })}
            {!solid && Array.from({ length: n }, (_, k) => {
              const aw = len / n, along = a + aw * (k + 0.5);
              return (
                <mesh key={"ar" + k} position={p(along, height - aw / 2 + 0.05)} rotation={[0, rotY, 0]} geometry={archRing(aw / 2 - 0.3, aw / 2 - 0.02, 0.4)}>
                  <meshToonMaterial color={C.stoneLight} />
                </mesh>
              );
            })}
            <Box size={size(len, 0.22, 0.46)} pos={p(mid, height + 0.08)} color={C.stoneLight} />
          </group>
        );
      })}
      {arches.map((d, i) => {
        const w = d.width ?? 2.6, c = d.center;
        return (
          <group key={"d" + i}>
            {/* a stone surround with a round-arched opening, topped by a gold keystone */}
            <mesh position={p(c, 0)} rotation={[0, rotY, 0]} geometry={archDoorway(w, 3.0, height, 0.5)} castShadow>
              <meshToonMaterial color={C.stoneLight} />
            </mesh>
            <Box size={size(0.3, 0.3, 0.56)} pos={p(c, 3.1)} color={C.gold} />
          </group>
        );
      })}
    </group>
  );
}

export { GateDoor };
