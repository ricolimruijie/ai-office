import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group } from "three";
import { UPPER_Y, WALL_H, type Layout } from "../../shared/layout";
import { useOfficeStore } from "../state/officeStore";
import { C } from "./palette";
import { Box, Cyl, Glass, TBox } from "./parts";
import { TEX } from "./textures";

/* One flat roof: a concrete slab with a parapet, skylights and rooftop air-conditioning. */
function Roof({ minX, maxX, minZ, maxZ, y }: { minX: number; maxX: number; minZ: number; maxZ: number; y: number }) {
  const w = maxX - minX, d = maxZ - minZ, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const sky = Math.max(2, Math.floor(w / 5));
  return (
    <group>
      <TBox size={[w, 0.4, d]} pos={[cx, y + 0.2, cz]} tex={TEX.panel} tile={2.4} color="#E3D3BC" />
      {[[cx, minZ, w, 0.3], [cx, maxZ, w, 0.3]].map(([x, z, ww, dd], i) => <Box key={"pz" + i} size={[ww, 0.55, dd]} pos={[x, y + 0.65, z]} color="#C9B9A2" />)}
      {[minX, maxX].map(x => <Box key={"px" + x} size={[0.3, 0.55, d]} pos={[x, y + 0.65, cz]} color="#C9B9A2" />)}
      {Array.from({ length: sky }, (_, i) => {
        const x = minX + ((i + 0.5) * w) / sky;
        return (
          <group key={i} position={[x, y + 0.4, cz - d * 0.18]}>
            <Box size={[2.0, 0.18, 1.2]} pos={[0, 0.09, 0]} color={C.steel} />
            <Glass size={[1.8, 0.3, 1.0]} pos={[0, 0.3, 0]} tint="#FFE3B8" opacity={0.45} />
          </group>
        );
      })}
      {[0.2, 0.62, 0.84].map((f, i) => (
        <group key={"ac" + i} position={[minX + w * f, y + 0.4, cz + d * 0.22]}>
          <Box size={[1.6, 0.9, 1.1]} pos={[0, 0.45, 0]} color="#B9B4AA" />
          <Cyl rt={0.4} rb={0.4} h={0.06} pos={[0, 0.93, 0]} color={C.steel} seg={14} />
          <Box size={[1.62, 0.1, 1.12]} pos={[0, 0.9, 0]} color="#8C877D" cast={false} />
        </group>
      ))}
      {[0.12, 0.46, 0.9].map((f, i) => <Cyl key={"v" + i} rt={0.12} rb={0.12} h={0.9} pos={[minX + w * f, y + 0.85, cz - d * 0.38]} color="#9AA0A8" seg={10} />)}
    </group>
  );
}

/* Roofs that slide away in the inside view and settle on the building in the outside view. */
export function Roofs({ layout }: { layout: Layout }) {
  const g = useRef<Group>(null);
  useFrame((_, rawDt) => {
    const grp = g.current;
    if (!grp) return;
    const outside = useOfficeStore.getState().viewMode === "outside";
    const target = outside ? 0 : 18, k = 1 - Math.exp(-5 * Math.min(rawDt, 0.1));
    grp.position.y += (target - grp.position.y) * k;
    grp.visible = grp.position.y < 17.5;
  });
  const b = layout.building, u = layout.upper;
  const slot = (children: ReactNode) => <>{children}</>;
  return (
    <group ref={g} position={[0, 18, 0]}>
      {slot(<Roof minX={b.minX - 0.4} maxX={b.maxX + 0.4} minZ={b.minZ - 0.5} maxZ={b.maxZ + 0.5} y={WALL_H} />)}
      {u && <Roof minX={u.minX - 0.4} maxX={u.maxX + 0.4} minZ={u.minZ - 0.5} maxZ={u.maxZ + 0.5} y={UPPER_Y + WALL_H} />}
    </group>
  );
}
