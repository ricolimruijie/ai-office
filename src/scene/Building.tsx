import { useMemo } from "react";
import {
  CORRIDOR_Z, FRONT_WALL_Z, GROUND_BACK_Z, PARTITION_Z, UPPER_Y, WALL_H, type Layout, type RoomRect
} from "../../shared/layout";
import { Cutaway } from "./Cutaway";
import { SlideDoor } from "./Doors";
import { GlassWall } from "./GlassWall";
import { lampMat, windowMat } from "./materials";
import { NearFade } from "./NearFade";
import { C } from "./palette";
import { Box, Cone, Cyl, TBox } from "./parts";
import { setAnchor } from "./sceneState";
import { TEX } from "./textures";
import type { Texture } from "three";

const H = WALL_H;
const T = 0.3;
type V3 = [number, number, number];

/* One piece of wall along x (fixed z) or along z (fixed x). */
function WallBox({ axis, from, to, at, yb = 0, h = H, thick = T, tex = TEX.brick, tile = 1.8, color = "#FFE9D2" }:
  { axis: "x" | "z"; from: number; to: number; at: number; yb?: number; h?: number; thick?: number; tex?: Texture; tile?: number; color?: string }) {
  const len = to - from, mid = (from + to) / 2;
  const size: V3 = axis === "x" ? [len, h, thick] : [thick, h, len];
  const pos: V3 = axis === "x" ? [mid, yb + h / 2, at] : [at, yb + h / 2, mid];
  return <TBox size={size} pos={pos} tex={tex} tile={tile} color={color} />;
}

/* A steel-framed factory window set into a wall. Its glass is shared, so it glows at night. */
function FactoryWindow({ axis, at, along, y = 2.0, w = 2.3, h = 1.7 }: { axis: "x" | "z"; at: number; along: number; y?: number; w?: number; h?: number }) {
  const pos = (a: number, yy: number, off = 0): V3 => (axis === "x" ? [along + a, yy, at + off] : [at + off, yy, along + a]);
  const sz = (a: number, hh: number, t: number): V3 => (axis === "x" ? [a, hh, t] : [t, hh, a]);
  const thick = T + 0.04;
  return (
    <group>
      <mesh position={pos(0, y)} material={windowMat}><boxGeometry args={sz(w, h, thick)} /></mesh>
      <Box size={sz(w + 0.2, 0.1, thick + 0.06)} pos={pos(0, y + h / 2 + 0.03)} color={C.steel} cast={false} />
      <Box size={sz(w + 0.2, 0.1, thick + 0.06)} pos={pos(0, y - h / 2 - 0.03)} color={C.steel} cast={false} />
      {[-w / 2 - 0.05, w / 2 + 0.05].map(a => <Box key={a} size={sz(0.1, h + 0.2, thick + 0.06)} pos={pos(a, y)} color={C.steel} cast={false} />)}
      {[-w / 6, w / 6].map(a => <Box key={a} size={sz(0.06, h, thick + 0.04)} pos={pos(a, y)} color={C.steel} cast={false} />)}
      <Box size={sz(w, 0.06, thick + 0.04)} pos={pos(0, y)} color={C.steel} cast={false} />
      <Box size={sz(w + 0.5, 0.08, thick + 0.2)} pos={pos(0, y - h / 2 - 0.12)} color={C.concreteLight} cast={false} />
    </group>
  );
}

const spread = (from: number, to: number, spacing: number) => {
  const n = Math.max(1, Math.round((to - from) / spacing));
  return Array.from({ length: n }, (_, i) => from + ((i + 0.5) * (to - from)) / n);
};

function Slab({ minX, maxX, minZ, maxZ, top, thick = 0.3, tex, tile = 3, color = "#FFFFFF" }:
  { minX: number; maxX: number; minZ: number; maxZ: number; top: number; thick?: number; tex: Texture; tile?: number; color?: string }) {
  return <TBox size={[maxX - minX, thick, maxZ - minZ]} pos={[(minX + maxX) / 2, top - thick / 2, (minZ + maxZ) / 2]} tex={tex} tile={tile} color={color} cast={false} />;
}

/* Hanging industrial lamp: cord, steel shade, glowing bulb. */
function Pendant({ x, y, z, drop = 0.7 }: { x: number; y: number; z: number; drop?: number }) {
  return (
    <group position={[x, y, z]}>
      <Cyl rt={0.012} rb={0.012} h={drop} pos={[0, -drop / 2, 0]} color={C.black} seg={4} cast={false} />
      <Cone r={0.34} h={0.26} pos={[0, -drop - 0.1, 0]} color={C.steel} seg={14} cast={false} />
      <mesh position={[0, -drop - 0.24, 0]} material={lampMat}><sphereGeometry args={[0.11, 10, 8]} /></mesh>
    </group>
  );
}

/* Steel beams and pendant lamps above a room. */
function Ceiling({ minX, maxX, minZ, maxZ, y, lamps = true }: { minX: number; maxX: number; minZ: number; maxZ: number; y: number; lamps?: boolean }) {
  const w = maxX - minX, d = maxZ - minZ;
  const across = useMemo(() => spread(minX, maxX, 4.2), [minX, maxX]);
  const along = useMemo(() => spread(minZ, maxZ, 4.0), [minZ, maxZ]);
  return (
    <NearFade pitch perMesh min={4} max={11} floor={0.12}>
      {across.map(x => <Box key={x} size={[0.22, 0.26, d]} pos={[x, y, (minZ + maxZ) / 2]} color={C.steel} cast={false} />)}
      {[minZ + d * 0.3, minZ + d * 0.7].map(z => <Box key={z} size={[w, 0.16, 0.16]} pos={[(minX + maxX) / 2, y - 0.15, z]} color={C.steelMid} cast={false} />)}
      {lamps && across.flatMap(x => along.map(z => <Pendant key={x + "," + z} x={x} y={y - 0.1} z={z} />))}
    </NearFade>
  );
}

function Column({ x, z, y0 = 0, h = H }: { x: number; z: number; y0?: number; h?: number }) {
  return (
    <group>
      <Box size={[0.32, h, 0.32]} pos={[x, y0 + h / 2, z]} color={C.steel} />
      <Box size={[0.4, 0.5, 0.4]} pos={[x, y0 + 0.25, z]} color={C.hazard} />
    </group>
  );
}

function RoomFloor({ room }: { room: RoomRect }) {
  const base = room.theme === "lab" ? { tex: TEX.tile, tile: 1.4, color: "#FFFFFF" }
    : room.theme === "library" ? { tex: TEX.wood, tile: 2.2, color: "#C9A57A" }
    : room.theme === "meeting" ? { tex: TEX.wood, tile: 2.2, color: "#B58A5E" }
    : { tex: TEX.wood, tile: 2.2, color: "#8E6A4E" };
  return <Slab minX={room.minX} maxX={room.maxX} minZ={room.minZ} maxZ={room.maxZ} top={0.03} thick={0.06} {...base} />;
}

/* The whole building: ground floor, the raised upper block with its stone base, glass partitions and exterior walls. */
export function Building({ layout }: { layout: Layout }) {
  const { building: b, rooms, lobby, upper, suite, lounge, lift } = layout;
  const cx = (b.minX + b.maxX) / 2, midZ = (b.minZ + b.maxZ) / 2;
  const lobbyCx = (lobby.minX + lobby.maxX) / 2;
  const roomsEndX = lobby.minX;
  const entranceW = 3.4;

  rooms.forEach(r => setAnchor("room:" + r.id, (r.minX + r.maxX) / 2, H + 1.2, GROUND_BACK_Z));
  if (suite) setAnchor("room:" + suite.id, (suite.minX + suite.maxX) / 2, UPPER_Y + H + 1.2, suite.minZ);
  if (lounge) setAnchor("room:lounge", (lounge.minX + lounge.maxX) / 2, UPPER_Y + H + 1.2, lounge.minZ);

  return (
    <group>
      {/* ---------- ground floor: floors ---------- */}
      <Slab minX={b.minX} maxX={b.maxX} minZ={b.minZ} maxZ={b.maxZ} top={0} tex={TEX.panel} tile={3} color="#E8D5BC" />
      {rooms.map(r => <RoomFloor key={r.id} room={r} />)}
      <Slab minX={b.minX} maxX={roomsEndX} minZ={PARTITION_Z} maxZ={b.maxZ} top={0.03} thick={0.06} tex={TEX.wood} tile={2.2} color="#BA9A78" />
      <Slab minX={lobby.minX} maxX={lobby.maxX} minZ={b.minZ} maxZ={b.maxZ} top={0.03} thick={0.06} tex={TEX.wood} tile={2.2} color="#A7825E" />
      {[CORRIDOR_Z - 0.8, CORRIDOR_Z + 0.8].map(z => <Box key={z} size={[roomsEndX - b.minX - 0.6, 0.012, 0.09]} pos={[(b.minX + roomsEndX) / 2, 0.065, z]} color={C.hazard} cast={false} />)}
      {lift && <Slab minX={lift.shaftMinX} maxX={lift.shaftMaxX} minZ={lift.shaftMinZ} maxZ={GROUND_BACK_Z} top={0} tex={TEX.panel} tile={3} />}
      {lift && <TBox size={[lift.shaftMaxX - lift.shaftMinX, 0.012, 1.8]} pos={[lift.x, 0.07, GROUND_BACK_Z + 1.5]} tex={TEX.hazard} tile={0.9} cast={false} />}

      {/* ---------- ground floor: exterior walls (they drop when the camera looks at them from outside) ---------- */}
      <Cutaway x={cx} z={GROUND_BACK_Z - 0.15} nx={0} nz={-1}>
        {lift ? (<>
          <WallBox axis="x" from={b.minX - T} to={lift.shaftMinX} at={GROUND_BACK_Z - 0.15} />
          <WallBox axis="x" from={lift.shaftMaxX} to={b.maxX + T} at={GROUND_BACK_Z - 0.15} />
          <WallBox axis="x" from={lift.shaftMinX} to={lift.shaftMaxX} at={GROUND_BACK_Z - 0.15} yb={2.9} h={H - 2.9} />
        </>) : <WallBox axis="x" from={b.minX - T} to={b.maxX + T} at={GROUND_BACK_Z - 0.15} />}
        {rooms.flatMap(r => spread(r.minX + 0.5, r.maxX - 0.5, 4.4).map(x => <FactoryWindow key={r.id + x} axis="x" at={GROUND_BACK_Z - 0.15} along={x} />))}
      </Cutaway>
      <Cutaway x={b.minX - 0.15} z={midZ} nx={-1} nz={0}>
        <WallBox axis="z" from={b.minZ - T} to={b.maxZ + T} at={b.minX - 0.15} />
        {spread(b.minZ + 0.8, PARTITION_Z - 0.5, 4.2).map(z => <FactoryWindow key={z} axis="z" at={b.minX - 0.15} along={z} />)}
      </Cutaway>
      <Cutaway x={b.maxX + 0.15} z={midZ} nx={1} nz={0}>
        <WallBox axis="z" from={b.minZ - T} to={b.maxZ + T} at={b.maxX + 0.15} />
        {spread(b.minZ + 0.8, PARTITION_Z - 0.5, 4.2).map(z => <FactoryWindow key={z} axis="z" at={b.maxX + 0.15} along={z} />)}
      </Cutaway>
      <Cutaway x={cx} z={FRONT_WALL_Z + 0.15} nx={0} nz={1}>
        <WallBox axis="x" from={b.minX - T} to={lobbyCx - entranceW / 2} at={FRONT_WALL_Z + 0.15} />
        <WallBox axis="x" from={lobbyCx + entranceW / 2} to={b.maxX + T} at={FRONT_WALL_Z + 0.15} />
        <WallBox axis="x" from={lobbyCx - entranceW / 2} to={lobbyCx + entranceW / 2} at={FRONT_WALL_Z + 0.15} yb={2.9} h={H - 2.9} />
        {spread(b.minX + 0.8, lobbyCx - entranceW / 2 - 0.6, 4.4).map(x => <FactoryWindow key={x} axis="x" at={FRONT_WALL_Z + 0.15} along={x} y={1.9} />)}
        <SlideDoor axis="x" x={lobbyCx} z={FRONT_WALL_Z + 0.15} width={entranceW} height={2.8} mode="auto" />
        <Box size={[entranceW + 0.5, 0.2, 0.34]} pos={[lobbyCx, 3.0, FRONT_WALL_Z + 0.15]} color={C.steel} />
        {/* neon sign over the entrance */}
        <Box size={[2.6, 0.5, 0.1]} pos={[lobbyCx, 3.45, FRONT_WALL_Z + 0.4]} color={C.black} />
        <Box size={[2.3, 0.08, 0.06]} pos={[lobbyCx, 3.62, FRONT_WALL_Z + 0.46]} color={C.neonCyan} emissive={C.neonCyan} emissiveIntensity={2} cast={false} />
        <Box size={[1.7, 0.08, 0.06]} pos={[lobbyCx, 3.44, FRONT_WALL_Z + 0.46]} color={C.neonPink} emissive={C.neonPink} emissiveIntensity={2} cast={false} />
        <Box size={[2.0, 0.08, 0.06]} pos={[lobbyCx, 3.26, FRONT_WALL_Z + 0.46]} color={C.neonAmber} emissive={C.neonAmber} emissiveIntensity={2} cast={false} />
      </Cutaway>

      {/* ---------- ground floor: glass partitions and doors ---------- */}
      <GlassWall axis="x" from={b.minX} to={roomsEndX} at={PARTITION_Z} doors={rooms.map(r => ({ center: r.doorX }))} />
      {rooms.map(r => <GlassWall key={"div" + r.id} axis="z" from={GROUND_BACK_Z} to={PARTITION_Z} at={r.maxX} />)}
      {rooms.slice(0, -1).map(r => <Column key={"col" + r.id} x={r.maxX} z={PARTITION_Z} />)}
      <Column x={roomsEndX} z={PARTITION_Z} />
      <Column x={b.minX} z={PARTITION_Z} />

      {rooms.map(r => <Ceiling key={"ceil" + r.id} minX={r.minX} maxX={r.maxX} minZ={GROUND_BACK_Z} maxZ={PARTITION_Z} y={H - 0.25} />)}
      <Ceiling minX={b.minX} maxX={b.maxX} minZ={PARTITION_Z} maxZ={FRONT_WALL_Z} y={H - 0.25} lamps={false} />
      <NearFade pitch floor={0.2}>
        {spread(b.minX + 1, roomsEndX - 1, 3.6).map(x => (
          <mesh key={x} position={[x, H - 0.45, CORRIDOR_Z]} material={lampMat}><boxGeometry args={[1.6, 0.06, 0.16]} /></mesh>
        ))}
      </NearFade>
      <Ceiling minX={lobby.minX} maxX={lobby.maxX} minZ={b.minZ} maxZ={PARTITION_Z} y={H - 0.25} />

      {/* ---------- upper block: stone base, floors, walls, partition ---------- */}
      {upper && lift && suite && lounge && (<>
        <TBox size={[upper.maxX - upper.minX + 0.75, UPPER_Y - 0.3, 12.15]} pos={[(upper.minX + upper.maxX) / 2 - 0.075, (UPPER_Y - 0.3) / 2, -14.375]} tex={TEX.panel} tile={2.4} />
        <TBox size={[upper.maxX - upper.minX + 0.8, 0.5, 12.2]} pos={[(upper.minX + upper.maxX) / 2 - 0.075, 0.25, -14.375]} tex={TEX.hazard} tile={0.9} color="#8A8F98" cast={false} />
        {/* roller shutter on the left face of the base */}
        <TBox size={[0.08, 2.9, 3.6]} pos={[upper.minX - 0.45, 1.45, -14.4]} tex={TEX.corrugated} tile={0.7} />
        <Box size={[0.14, 0.18, 3.9]} pos={[upper.minX - 0.45, 3.0, -14.4]} color={C.hazard} />
        {/* floors */}
        <Slab minX={upper.minX} maxX={lift.shaftMinX} minZ={upper.minZ} maxZ={upper.maxZ} top={UPPER_Y} tex={TEX.panel} tile={3} />
        <Slab minX={suite.minX} maxX={suite.maxX} minZ={suite.minZ} maxZ={suite.maxZ} top={UPPER_Y + 0.03} thick={0.06} tex={TEX.wood} tile={2.2} color="#6B4C36" />
        <Slab minX={lounge.minX} maxX={lounge.maxX} minZ={lounge.minZ} maxZ={lounge.maxZ} top={UPPER_Y + 0.03} thick={0.06} tex={TEX.wood} tile={2.2} color="#5A4048" />
        <Slab minX={upper.minX - 0.1} maxX={lift.shaftMinX + 0.1} minZ={upper.maxZ - 0.9} maxZ={upper.maxZ - 0.5} top={UPPER_Y + 0.04} thick={0.06} tex={TEX.hazard} tile={0.9} color="#B8B8B8" />

        <Cutaway x={(upper.minX + upper.maxX) / 2} z={upper.maxZ + 0.15} y0={UPPER_Y} nx={0} nz={1}>
          <WallBox axis="x" from={upper.minX - T} to={upper.maxX + T} at={upper.maxZ + 0.15} tex={TEX.panel} tile={2.4} />
          {spread(upper.minX + 0.5, upper.maxX - 0.5, 4.4).map(x => <FactoryWindow key={x} axis="x" at={upper.maxZ + 0.15} along={x} />)}
        </Cutaway>
        <Cutaway x={(upper.minX + upper.maxX) / 2} z={upper.minZ - 0.15} y0={UPPER_Y} nx={0} nz={-1}>
          <WallBox axis="x" from={upper.minX - T} to={upper.maxX + T} at={upper.minZ - 0.15} tex={TEX.panel} tile={2.4} />
          {spread(upper.minX + 0.5, upper.maxX - 0.5, 4.4).map(x => <FactoryWindow key={x} axis="x" at={upper.minZ - 0.15} along={x} />)}
        </Cutaway>
        <Cutaway x={upper.minX - 0.15} z={(upper.minZ + upper.maxZ) / 2} y0={UPPER_Y} nx={-1} nz={0}>
          <WallBox axis="z" from={upper.minZ - T} to={upper.maxZ + T} at={upper.minX - 0.15} tex={TEX.panel} tile={2.4} />
          {spread(upper.minZ + 0.8, upper.maxZ - 0.8, 4.2).map(z => <FactoryWindow key={z} axis="z" at={upper.minX - 0.15} along={z} />)}
        </Cutaway>
        <Cutaway x={upper.maxX + 0.15} z={(upper.minZ + lift.shaftMinZ) / 2} y0={UPPER_Y} nx={1} nz={0}>
          <WallBox axis="z" from={upper.minZ - T} to={lift.shaftMinZ} at={upper.maxX + 0.15} tex={TEX.panel} tile={2.4} />
        </Cutaway>

        <GlassWall axis="z" from={suite.minZ} to={suite.maxZ} at={suite.maxX} y0={UPPER_Y} doors={[{ center: layout.aisleZ }]} />
        <Column x={suite.maxX} z={suite.maxZ} y0={UPPER_Y} />
        <Column x={suite.maxX} z={suite.minZ + 0.2} y0={UPPER_Y} />
        <Ceiling minX={suite.minX} maxX={suite.maxX} minZ={suite.minZ} maxZ={suite.maxZ} y={UPPER_Y + H - 0.25} />
        <Ceiling minX={lounge.minX} maxX={lounge.maxX} minZ={lounge.minZ} maxZ={lounge.maxZ} y={UPPER_Y + H - 0.25} />
      </>)}
    </group>
  );
}

