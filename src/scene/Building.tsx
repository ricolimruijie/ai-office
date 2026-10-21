import { useMemo } from "react";
import { ExtrudeGeometry, Shape, type Texture } from "three";
import { UPPER_Y, WALL_H, type Layout, type RoomRect } from "../../shared/layout";
import { ArchWall, archRing } from "./Arches";
import { Banner, Chandelier, Torch } from "./decor/magic";
import { Cutaway } from "./Cutaway";
import { GateDoor } from "./Doors";
import { windowMat } from "./materials";
import { NearFade } from "./NearFade";
import { C } from "./palette";
import { Box, Cone, Cyl, TBox } from "./parts";
import { setAnchor } from "./sceneState";
import { TEX } from "./textures";

const H = WALL_H;
const T = 0.4;
type V3 = [number, number, number];

/* One piece of wall along x (fixed z) or along z (fixed x). */
function WallBox({ axis, from, to, at, yb = 0, h = H, thick = T, tex = TEX.stone, tile = 2.4, color = "#FFFFFF" }:
  { axis: "x" | "z"; from: number; to: number; at: number; yb?: number; h?: number; thick?: number; tex?: Texture; tile?: number; color?: string }) {
  const len = to - from, mid = (from + to) / 2;
  const size: V3 = axis === "x" ? [len, h, thick] : [thick, h, len];
  const pos: V3 = axis === "x" ? [mid, yb + h / 2, at] : [at, yb + h / 2, mid];
  return <TBox size={size} pos={pos} tex={tex} tile={tile} color={color} />;
}

const glassCache = new Map<string, ExtrudeGeometry>();
/* A tall window with a round top: glass that sits slightly proud of the wall on both faces. */
function lancetGlass(w: number, h: number, depth: number): ExtrudeGeometry {
  const key = [w, h, depth].map(n => n.toFixed(3)).join("|");
  let g = glassCache.get(key);
  if (!g) {
    const s = new Shape(), r = w / 2, top = h - r;
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, top); s.absarc(0, top, r, 0, Math.PI, false); s.lineTo(-r, 0);
    g = new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -depth / 2);
    glassCache.set(key, g);
  }
  return g;
}

/* A castle window: leaded glass in a stone arch with a cross of iron bars. Its glass is shared, so it glows at night. */
export function LancetWindow({ axis, at, along, y = 1.4, w = 1.3, h = 2.4 }: { axis: "x" | "z"; at: number; along: number; y?: number; w?: number; h?: number }) {
  const rotY = axis === "x" ? 0 : Math.PI / 2;
  const pos: V3 = axis === "x" ? [along, y, at] : [at, y, along];
  const depth = T + 0.06;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh geometry={lancetGlass(w, h, depth)} material={windowMat} />
      <mesh position={[0, h - w / 2, 0]} geometry={archRing(w / 2, w / 2 + 0.16, depth + 0.06)}><meshToonMaterial color={C.stoneLight} /></mesh>
      <Box size={[0.06, h - 0.1, depth + 0.02]} pos={[0, h / 2, 0]} color={C.iron} cast={false} />
      <Box size={[w, 0.06, depth + 0.02]} pos={[0, h * 0.45, 0]} color={C.iron} cast={false} />
      <Box size={[w + 0.5, 0.12, depth + 0.3]} pos={[0, -0.05, 0]} color={C.stoneLight} cast={false} />
      {[-1, 1].map(s => <Box key={s} size={[0.16, h - w / 2, depth + 0.06]} pos={[s * (w / 2 + 0.08), (h - w / 2) / 2, 0]} color={C.stoneLight} cast={false} />)}
    </group>
  );
}

/* A buttress: a stone pier leaning against the outside of a wall, capped with a slope. */
function Buttress({ x, z, nx = 0, nz = 0, h = H + 0.4 }: { x: number; z: number; nx?: number; nz?: number; h?: number }) {
  const rotY = nz !== 0 ? 0 : Math.PI / 2;
  return (
    <group position={[x + nx * 0.4, 0, z + nz * 0.4]} rotation={[0, rotY, 0]}>
      <TBox size={[0.7, h, 0.8]} pos={[0, h / 2, 0]} tex={TEX.stone} tile={1.6} />
      <Box size={[0.8, 0.2, 0.9]} pos={[0, h + 0.1, 0]} color={C.stoneLight} />
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

/* Dark oak beams across a room, with iron chandeliers full of candles. */
function Ceiling({ minX, maxX, minZ, maxZ, y }: { minX: number; maxX: number; minZ: number; maxZ: number; y: number }) {
  const w = maxX - minX, d = maxZ - minZ;
  const across = useMemo(() => spread(minX, maxX, 3.6), [minX, maxX]);
  const lights = useMemo(() => spread(minX, maxX, 5.2), [minX, maxX]);
  return (
    <NearFade pitch perMesh min={4} max={11} floor={0.12}>
      {across.map(x => <Box key={x} size={[0.28, 0.3, d]} pos={[x, y, (minZ + maxZ) / 2]} color="#3A2A1E" cast={false} />)}
      {[minZ + d * 0.3, minZ + d * 0.7].map(z => <Box key={z} size={[w, 0.2, 0.2]} pos={[(minX + maxX) / 2, y - 0.2, z]} color="#47301F" cast={false} />)}
      {lights.map(x => <Chandelier key={x} pos={[x, y - 0.1, (minZ + maxZ) / 2]} r={0.55} n={6} drop={0.7} />)}
    </NearFade>
  );
}

/* A stone pier at a building corner. */
function Pier({ x, z, y0 = 0, h = H }: { x: number; z: number; y0?: number; h?: number }) {
  return (
    <group>
      <Cyl rt={0.26} rb={0.3} h={h} pos={[x, y0 + h / 2, z]} color={C.stoneLight} seg={10} />
      <Cyl rt={0.36} rb={0.36} h={0.2} pos={[x, y0 + 0.1, z]} color={C.stone} seg={10} />
      <Cyl rt={0.4} rb={0.3} h={0.2} pos={[x, y0 + h - 0.1, z]} color={C.stone} seg={10} />
    </group>
  );
}

/* A round turret with arrow slits and a pointed slate roof. */
export function Turret({ x, z, y0 = 0, r = 1.3, h, roof = 3.4 }: { x: number; z: number; y0?: number; r?: number; h: number; roof?: number }) {
  return (
    <group position={[x, y0, z]}>
      <Cyl rt={r} rb={r + 0.15} h={h} pos={[0, h / 2, 0]} color="#8E8985" seg={18} />
      {[0.3, 0.62].map(f => <Cyl key={f} rt={r + 0.1} rb={r + 0.1} h={0.16} pos={[0, h * f, 0]} color={C.stoneLight} seg={18} cast={false} />)}
      <Cyl rt={r + 0.3} rb={r + 0.1} h={0.35} pos={[0, h + 0.02, 0]} color={C.stoneLight} seg={18} />
      {[0, 1, 2, 3, 4].map(i => {
        const a = i * (Math.PI * 2 / 5) + 0.4;
        return <Box key={i} size={[0.14, 0.9, 0.14]} pos={[Math.sin(a) * (r + 0.02), h * (0.4 + (i % 2) * 0.25), Math.cos(a) * (r + 0.02)]} rot={[0, a, 0]} color="#1A1A22" emissive="#FFC27A" emissiveIntensity={0.25} cast={false} />;
      })}
      <Cone r={r + 0.5} h={roof} pos={[0, h + 0.2 + roof / 2, 0]} color={C.slate} seg={18} />
      <Cyl rt={0.03} rb={0.03} h={1.1} pos={[0, h + roof + 0.6, 0]} color={C.iron} seg={4} cast={false} />
      <Box size={[0.65, 0.38, 0.03]} pos={[0.33, h + roof + 0.95, 0]} color={C.crimson} cast={false} />
    </group>
  );
}

function RoomFloor({ room }: { room: RoomRect }) {
  const base = room.theme === "lab" ? { tex: TEX.flag, tile: 1.8, color: "#8E94A4" }
    : room.theme === "library" ? { tex: TEX.wood, tile: 2.2, color: "#6E5038" }
    : room.theme === "meeting" ? { tex: TEX.flag, tile: 1.8, color: "#B8B2AA" }
    : room.theme === "executive" ? { tex: TEX.flag, tile: 1.8, color: "#9C9690" }
    : room.theme === "lounge" ? { tex: TEX.wood, tile: 2.2, color: "#7A5A3E" }
    : { tex: TEX.wood, tile: 2.2, color: "#6B4C36" };
  return <Slab minX={room.minX} maxX={room.maxX} minZ={room.minZ} maxZ={room.maxZ} top={0.03} thick={0.06} {...base} />;
}

/* One stone building: floor, walls that drop when seen from outside, an open arcaded front with a doorway, and a ceiling of beams. */
function RoomShell({ room, layout }: { room: RoomRect; layout: Layout }) {
  const r = room, midX = (r.minX + r.maxX) / 2, midZ = (r.minZ + r.maxZ) / 2;
  const tower = r.level > 0, hall = r.theme === "meeting";
  const wallH = tower ? UPPER_Y : H;   // a tower's ground floor reaches right up to the study floor
  const winY = 1.4;
  const st = layout.stairs && layout.rooms[layout.stairs.room] === r ? layout.stairs : null;

  setAnchor("room:" + r.id, midX, r.y + H + 1.2, r.minZ);

  return (
    <group>
      <RoomFloor room={r} />
      {hall && <TBox size={[r.maxX - r.minX - 1.0, 0.02, 2.0]} pos={[midX, 0.075, layout.meeting ? layout.meeting.table.z : midZ]} tex={TEX.carpet} tile={2} cast={false} />}

      {/* back wall and the two side walls */}
      <Cutaway x={midX} z={r.minZ - 0.2} nx={0} nz={-1}>
        <WallBox axis="x" from={r.minX - T} to={r.maxX + T} at={r.minZ - 0.2} h={wallH} />
        {spread(r.minX + 0.8, r.maxX - 0.8, 4.2).map(x => <LancetWindow key={x} axis="x" at={r.minZ - 0.2} along={x} y={winY} />)}
      </Cutaway>
      <Cutaway x={r.minX - 0.2} z={midZ} nx={-1} nz={0}>
        <WallBox axis="z" from={r.minZ - T} to={r.maxZ + T} at={r.minX - 0.2} h={wallH} />
        {spread(r.minZ + 0.8, r.maxZ - 0.8, 4.2).map(z => <LancetWindow key={z} axis="z" at={r.minX - 0.2} along={z} y={winY} />)}
        {spread(r.minZ + 1, r.maxZ - 1, 7).map(z => <Buttress key={z} x={r.minX - 0.4} z={z + 2.1} nx={-1} h={wallH + 0.2} />)}
      </Cutaway>
      <Cutaway x={r.maxX + 0.2} z={midZ} nx={1} nz={0}>
        <WallBox axis="z" from={r.minZ - T} to={r.maxZ + T} at={r.maxX + 0.2} h={wallH} />
        {spread(r.minZ + 0.8, r.maxZ - 0.8, 4.2).map(z => <LancetWindow key={z} axis="z" at={r.maxX + 0.2} along={z} y={winY} />)}
        {spread(r.minZ + 1, r.maxZ - 1, 7).map(z => <Buttress key={z} x={r.maxX + 0.4} z={z + 2.1} nx={1} h={wallH + 0.2} />)}
      </Cutaway>

      {/* the front: an open arcade with a doorway, so you can always see in */}
      {hall ? (
        <group>
          <ArchWall axis="x" from={r.minX} to={r.maxX} at={r.maxZ} arches={[{ center: r.doorX, width: 4.0 }]} />
          <GateDoor axis="x" x={r.doorX} z={r.maxZ} width={4.0} height={3.0} mode="auto" />
          <Torch pos={[r.doorX - 3.3, 2.2, r.maxZ + 0.34]} /><Torch pos={[r.doorX + 3.3, 2.2, r.maxZ + 0.34]} />
          <Banner pos={[r.doorX - 5.2, 2.6, r.maxZ + 0.34]} color={C.crimson} />
          <Banner pos={[r.doorX + 5.2, 2.6, r.maxZ + 0.34]} color={C.emerald} trim="#C9D1D9" />
          {[0, 1, 2].map(i => <Box key={i} size={[6.4 + i * 1.2, 0.14, 0.9]} pos={[r.doorX, 0.07, r.maxZ + 0.7 + i * 0.9]} color={i % 2 ? C.stone : C.stoneLight} />)}
          <Box size={[6.4, 0.28, 0.9]} pos={[r.doorX, 0.14, r.maxZ + 0.7]} color={C.stoneLight} />
        </group>
      ) : (
        <ArchWall axis="x" from={r.minX} to={r.maxX} at={r.maxZ} arches={[{ center: r.doorX }]} />
      )}
      <Pier x={r.minX} z={r.maxZ} h={wallH} /><Pier x={r.maxX} z={r.maxZ} h={wallH} />

      <Ceiling minX={r.minX} maxX={r.maxX} minZ={r.minZ} maxZ={r.maxZ} y={wallH - 0.25} />

      {/* a tower's study: its own floor with an opening for the stairs, walls, open front and ceiling */}
      {tower && st && (<>
        <Slab minX={r.minX} maxX={st.x - 1.9} minZ={r.minZ} maxZ={r.maxZ} top={UPPER_Y} tex={TEX.flag} tile={2.4} />
        <Slab minX={st.x - 1.9} maxX={r.maxX} minZ={r.minZ} maxZ={st.z - 1.9} top={UPPER_Y} tex={TEX.flag} tile={2.4} />
        <Slab minX={st.x - 1.9} maxX={r.maxX} minZ={st.z + 1.9} maxZ={r.maxZ} top={UPPER_Y} tex={TEX.flag} tile={2.4} />
        <Slab minX={st.x + 1.9} maxX={r.maxX} minZ={st.z - 1.9} maxZ={st.z + 1.9} top={UPPER_Y} tex={TEX.flag} tile={2.4} />
        <Slab minX={r.minX} maxX={st.x - 1.9} minZ={r.minZ} maxZ={r.maxZ} top={UPPER_Y + 0.03} thick={0.06} tex={TEX.wood} tile={2.2} color="#5A3E2B" />
        <Cutaway x={midX} z={r.minZ - 0.2} y0={UPPER_Y} nx={0} nz={-1}>
          <WallBox axis="x" from={r.minX - T} to={r.maxX + T} at={r.minZ - 0.2} />
          {spread(r.minX + 0.8, r.maxX - 0.8, 4.2).map(x => <LancetWindow key={x} axis="x" at={r.minZ - 0.2} along={x} y={winY} />)}
        </Cutaway>
        <Cutaway x={r.minX - 0.2} z={midZ} y0={UPPER_Y} nx={-1} nz={0}>
          <WallBox axis="z" from={r.minZ - T} to={r.maxZ + T} at={r.minX - 0.2} />
          {spread(r.minZ + 0.8, r.maxZ - 0.8, 4.2).map(z => <LancetWindow key={z} axis="z" at={r.minX - 0.2} along={z} y={winY} />)}
        </Cutaway>
        <Cutaway x={r.maxX + 0.2} z={midZ} y0={UPPER_Y} nx={1} nz={0}>
          <WallBox axis="z" from={r.minZ - T} to={r.maxZ + T} at={r.maxX + 0.2} />
          {spread(r.minZ + 0.8, r.maxZ - 0.8, 4.2).map(z => <LancetWindow key={z} axis="z" at={r.maxX + 0.2} along={z} y={winY} />)}
        </Cutaway>
        <ArchWall axis="x" from={r.minX} to={r.maxX} at={r.maxZ} y0={UPPER_Y} />
        <Pier x={r.minX} z={r.maxZ} y0={UPPER_Y} /><Pier x={r.maxX} z={r.maxZ} y0={UPPER_Y} />
        <Ceiling minX={r.minX} maxX={r.maxX} minZ={r.minZ} maxZ={r.maxZ} y={UPPER_Y + H - 0.25} />
      </>)}
    </group>
  );
}

/* The whole castle: every building, the flagged lanes between them, and the turrets that give the skyline its look. */
export function Building({ layout }: { layout: Layout }) {
  const { rooms, site } = layout;
  const back = rooms.filter(r => r.row === "back"), front = rooms.filter(r => r.row === "front");
  return (
    <group>
      {/* flagstones under the alley, the passages and the forecourt */}
      <Slab minX={site.minX - 3} maxX={site.maxX + 3} minZ={site.minZ - 3} maxZ={site.maxZ + 6} top={0} tex={TEX.flag} tile={2.4} color="#9C9690" />
      <TBox size={[site.maxX - site.minX, 0.02, 1.6]} pos={[(site.minX + site.maxX) / 2, 0.05, site.maxZ + 1.5]} tex={TEX.carpet} tile={2} cast={false} />
      {rooms.map(r => <RoomShell key={r.id} room={r} layout={layout} />)}
      {/* round turrets on the outer corners, where they never block a lane */}
      {back.length > 0 && (<>
        <Turret x={back[0].minX - 0.3} z={back[0].minZ - 0.3} r={1.5} h={H + 3.0} roof={3.6} />
        <Turret x={back[back.length - 1].maxX + 0.3} z={back[back.length - 1].minZ - 0.3} r={1.5} h={H + 3.0} roof={3.6} />
      </>)}
      {front.length > 0 && (<>
        <Turret x={front[0].minX - 0.3} z={front[0].maxZ + 0.3} r={1.3} h={H + 2.0} roof={3.2} />
        <Turret x={front[front.length - 1].maxX + 0.3} z={front[front.length - 1].maxZ + 0.3} r={1.3} h={H + 2.0} roof={3.2} />
      </>)}
    </group>
  );
}

