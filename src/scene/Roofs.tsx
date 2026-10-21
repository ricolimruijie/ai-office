import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ExtrudeGeometry, Shape, type Group } from "three";
import { UPPER_Y, WALL_H, type Layout, type RoomRect } from "../../shared/layout";
import { useOfficeStore } from "../state/officeStore";
import { LancetWindow } from "./Building";
import { C } from "./palette";
import { Box, Cyl, TBox } from "./parts";
import { TEX } from "./textures";
import { toonGradient } from "./toon";

const roofMat = <meshToonMaterial color={C.slate} gradientMap={toonGradient} />;

/* A gabled roof: a triangular prism whose ridge runs along x, with a little overhang. */
function GableRoof({ w, d, y, cx, cz, rise }: { w: number; d: number; y: number; cx: number; cz: number; rise: number }) {
  const geo = useMemo(() => {
    const s = new Shape(), hw = d / 2 + 0.6;
    s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(0, rise); s.lineTo(-hw, 0);
    const g = new ExtrudeGeometry(s, { depth: w + 1.2, bevelEnabled: false });
    g.translate(0, 0, -(w + 1.2) / 2);
    return g;
  }, [w, d, rise]);
  return (
    <group position={[cx, y, cz]}>
      <mesh geometry={geo} rotation={[0, Math.PI / 2, 0]} castShadow>{roofMat}</mesh>
      <Box size={[w + 1.4, 0.18, 0.3]} pos={[0, rise + 0.02, 0]} color={C.stoneLight} />
      {[0.22, 0.7].map((f, i) => (
        <group key={i} position={[-w / 2 + w * f, rise * 0.45, (i ? 1 : -1) * d * 0.1]}>
          <Box size={[0.8, 1.9, 0.8]} pos={[0, 0.7, 0]} color={C.brickDark} />
          <Box size={[1.0, 0.18, 1.0]} pos={[0, 1.7, 0]} color={C.stoneLight} />
        </group>
      ))}
    </group>
  );
}

/* A square tower cap: a stone upper storey with slit windows, a pointed roof and a flag. */
function TowerCap({ w, d, y, cx, cz, storey = 3.4, rise = 5.0 }: { w: number; d: number; y: number; cx: number; cz: number; storey?: number; rise?: number }) {
  return (
    <group position={[cx, y, cz]}>
      <TBox size={[w + 0.3, storey, d + 0.3]} pos={[0, storey / 2, 0]} tex={TEX.stone} tile={2.4} />
      <Box size={[w + 0.7, 0.3, d + 0.7]} pos={[0, storey + 0.1, 0]} color={C.stoneLight} />
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => <LancetWindow key={sx + "," + sz} axis="x" at={sz * (d / 2 + 0.15)} along={sx * w * 0.25} y={0.7} w={0.9} h={1.9} />))}
      <mesh position={[0, storey + 0.25 + rise / 2, 0]} rotation={[0, Math.PI / 4, 0]} scale={[(w + 0.9) / Math.SQRT2, rise, (d + 0.9) / Math.SQRT2]} castShadow>
        <coneGeometry args={[1, 1, 4]} />{roofMat}
      </mesh>
      <Cyl rt={0.03} rb={0.03} h={1.3} pos={[0, storey + rise + 0.8, 0]} color={C.iron} seg={4} cast={false} />
      <Box size={[0.8, 0.42, 0.03]} pos={[0.4, storey + rise + 1.15, 0]} color={C.crimson} cast={false} />
    </group>
  );
}

function RoomRoof({ room }: { room: RoomRect }) {
  const w = room.maxX - room.minX, d = room.maxZ - room.minZ, cx = (room.minX + room.maxX) / 2, cz = (room.minZ + room.maxZ) / 2;
  const tower = room.level > 0, base = (tower ? UPPER_Y : 0) + WALL_H;
  if (room.theme === "meeting") return <GableRoof w={w} d={d} y={base} cx={cx} cz={cz} rise={4.6} />;
  if (room.theme === "developers" || room.theme === "lounge") return <GableRoof w={w} d={d} y={base} cx={cx} cz={cz} rise={3.6} />;
  return <TowerCap w={w} d={d} y={base} cx={cx} cz={cz} storey={tower ? 4.2 : 3.4} rise={tower ? 7.5 : 5.0} />;
}

/* Roofs that slide away in the inside view and settle on the castle in the outside view. */
export function Roofs({ layout }: { layout: Layout }) {
  const g = useRef<Group>(null);
  useFrame((_, rawDt) => {
    const grp = g.current;
    if (!grp) return;
    const outside = useOfficeStore.getState().viewMode === "outside";
    const target = outside ? 0 : 24, k = 1 - Math.exp(-5 * Math.min(rawDt, 0.1));
    grp.position.y += (target - grp.position.y) * k;
    grp.visible = grp.position.y < 23.5;
  });
  return (
    <group ref={g} position={[0, 24, 0]}>
      {layout.rooms.map(r => <RoomRoof key={r.id} room={r} />)}
    </group>
  );
}
