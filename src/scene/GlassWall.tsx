import { useMemo } from "react";
import { C } from "./palette";
import { Box, Glass } from "./parts";
import { SlideDoor } from "./Doors";

type V3 = [number, number, number];

interface Props {
  axis: "x" | "z";               // direction the wall runs
  from: number; to: number;      // extent along that axis
  at: number;                    // fixed coordinate on the other axis
  y0?: number; height?: number;
  doors?: { center: number; width?: number }[];
}

/* A steel-framed glass partition with a frosted band and optional sliding doors. Never cut away, so rooms stay visible. */
export function GlassWall({ axis, from, to, at, y0 = 0, height = 3.3, doors = [] }: Props) {
  const p = (along: number, y: number, across = 0): V3 => (axis === "x" ? [along, y0 + y, at + across] : [at + across, y0 + y, along]);
  const size = (along: number, h: number, thick: number): V3 => (axis === "x" ? [along, h, thick] : [thick, h, along]);

  const segs = useMemo(() => {
    const gaps = doors.map(d => ({ a: d.center - (d.width ?? 1.8) / 2, b: d.center + (d.width ?? 1.8) / 2 })).sort((u, v) => u.a - v.a);
    const out: [number, number][] = [];
    let cur = from;
    gaps.forEach(g => { if (g.a > cur + 0.05) out.push([cur, g.a]); cur = g.b; });
    if (to > cur + 0.05) out.push([cur, to]);
    return out;
  }, [from, to, doors]);

  return (
    <group>
      {segs.map(([a, b], i) => {
        const len = b - a, mid = (a + b) / 2, n = Math.max(1, Math.round(len / 2.2));
        return (
          <group key={i}>
            <Glass size={size(len, height - 0.15, 0.04)} pos={p(mid, height / 2)} opacity={0.2} />
            <Glass size={size(len, 0.5, 0.05)} pos={p(mid, 1.15)} tint="#FFFFFF" opacity={0.45} />
            <Box size={size(len, 0.1, 0.1)} pos={p(mid, height)} color={C.steel} cast={false} />
            <Box size={size(len, 0.12, 0.1)} pos={p(mid, 0.06)} color={C.steel} cast={false} />
            {Array.from({ length: n + 1 }, (_, k) => (
              <Box key={k} size={size(0.08, height, 0.1)} pos={p(a + (len * k) / n, height / 2)} color={C.steel} cast={false} />
            ))}
          </group>
        );
      })}
      {doors.map((d, i) => {
        const w = d.width ?? 1.8, center = d.center;
        return (
          <group key={"d" + i}>
            <Glass size={size(w, height - 2.8, 0.04)} pos={p(center, (height + 2.8) / 2)} opacity={0.2} />
            <Box size={size(w, 0.1, 0.1)} pos={p(center, height)} color={C.steel} cast={false} />
            <Box size={size(0.09, 2.85, 0.1)} pos={p(center - w / 2, 1.42)} color={C.hazard} cast={false} />
            <Box size={size(0.09, 2.85, 0.1)} pos={p(center + w / 2, 1.42)} color={C.hazard} cast={false} />
            <SlideDoor axis={axis} x={axis === "x" ? center : at} z={axis === "x" ? at : center} y0={y0} width={w} />
          </group>
        );
      })}
    </group>
  );
}
