import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import { COURT_Z, UPPER_Y, type Layout, type RoomRect } from "../../../shared/layout";
import { C } from "../palette";
import { Box, Cyl } from "../parts";
import { rng } from "../rng";
import { toonGradient } from "../toon";
import {
  Armor, Banner, Cauldron, Chandelier, CrystalBall, FloatingCandles, Fireplace, HousePoints, Lectern, OwlPerch, Orrery, Pensieve,
  PotionShelf, SortingHat, Torch, Trunks, WizardChair
} from "./magic";
import { CoffeeTable, FloorLamp, PottedPlant, Rug, Sofa } from "./props";

const HALF_PI = Math.PI / 2;
type V3 = [number, number, number];
const BOOK_COLORS = ["#8E1F2E", "#1F6B4A", "#2B4C9A", "#D9A441", "#6B3FA0", "#5C4331", "#B5651D", "#3E3E4A", "#9A2A5A"];
/* The decor below was laid out for rooms whose back wall is at z = -8. Rooms elsewhere shift it by their own offset. */
const OLD_BACK_Z = -8;
const GROUND_BACK_Z = OLD_BACK_Z;

/* A bookcase full of books drawn as one instanced mesh. Faces +z. */
function Bookcase({ pos, rotY = 0, w = 2.0, h = 2.4, seed = 1 }: { pos: V3; rotY?: number; w?: number; h?: number; seed?: number }) {
  const levels = Math.floor(h / 0.5), ref = useRef<InstancedMesh>(null);
  const books = useMemo(() => {
    const r = rng(seed), out: { x: number; y: number; bw: number; bh: number; c: string }[] = [];
    for (let l = 0; l < levels; l++) { let x = -w / 2 + 0.1; while (x < w / 2 - 0.15) { const bw = 0.05 + r() * 0.07, bh = 0.26 + r() * 0.13; if (r() > 0.12) out.push({ x: x + bw / 2, y: 0.07 + l * 0.5 + bh / 2, bw, bh, c: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)] }); x += bw + 0.005; } }
    return out;
  }, [levels, seed, w]);
  useLayoutEffect(() => {
    const m = ref.current, o = new Object3D(), col = new Color();
    if (!m) return;
    books.forEach((b, i) => { o.position.set(b.x, b.y, 0.02); o.scale.set(b.bw, b.bh, 0.3); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(b.c)); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [books]);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w, h, 0.05]} pos={[0, h / 2, -0.22]} color="#2E2018" />
      {[-1, 1].map(s => <Box key={s} size={[0.06, h, 0.5]} pos={[s * (w / 2), h / 2, 0]} color="#2E2018" />)}
      {Array.from({ length: levels + 1 }, (_, l) => <Box key={l} size={[w, 0.05, 0.5]} pos={[0, 0.03 + l * 0.5, 0]} color="#5C4331" />)}
      <instancedMesh ref={ref} args={[undefined, undefined, books.length]} castShadow><boxGeometry args={[1, 1, 1]} /><meshToonMaterial gradientMap={toonGradient} /></instancedMesh>
    </group>
  );
}

/* The Charms classroom: bookcases, a roaring fireplace, an orrery, armor on guard and banners on the walls. */
function CharmsDecor({ r, layout }: { r: RoomRect; layout: Layout }) {
  const dz = r.minZ - OLD_BACK_Z;
  const desks = layout.desks.filter(d => d.y === 0 && d.room >= 0 && layout.rooms[d.room] === r);
  const back = GROUND_BACK_Z, cx = (r.minX + r.maxX) / 2;
  return (
    <group>
      {[0, 1].map(k => <Bookcase key={k} pos={[r.minX + 1.3 + k * 2.2, 0, back + 0.4]} seed={60 + k} />)}
      <Fireplace pos={[cx + 1.0, 0, back + 0.4]} />
      <Torch pos={[cx - 1.1, 2.3, back + 0.05]} /><Torch pos={[cx + 3.1, 2.3, back + 0.05]} />
      <Orrery pos={[r.maxX - 1.5, 0, back + 1.3]} />
      <Armor pos={[r.maxX - 0.7, 0, -2.4]} rotY={-HALF_PI} />
      <Armor pos={[r.minX + 0.7, 0, -1.4]} rotY={HALF_PI} />
      <Banner pos={[r.minX + 0.3, 2.3, -4.6]} rotY={HALF_PI} color={C.sapphire} trim="#C9D1D9" />
      <Banner pos={[r.maxX - 0.3, 2.3, -4.6]} rotY={-HALF_PI} color={C.sapphire} trim="#C9D1D9" />
      <Lectern pos={[r.minX + 2.0, 0, -1.4]} />
      <PottedPlant pos={[r.maxX - 0.6, 0, -0.9]} scale={1.0} seed={3} />
      {desks.map(d => <Rug key={d.x} pos={[d.x, 0.04, d.z + 0.2 - dz]} size={[3.8, 3.4]} color="#1F2F5A" border="#D9A441" />)}
      <FloatingCandles area={[r.minX + 1, r.maxX - 1, -7, -0.5]} y={3.0} count={16} seed={11} />
    </group>
  );
}

/* The Potions dungeon: cauldrons on the floor, shelves of glowing bottles and a pensieve of silver memory. */
function PotionsDecor({ r }: { r: RoomRect }) {
  const cx = (r.minX + r.maxX) / 2, back = GROUND_BACK_Z;
  return (
    <group>
      <Cauldron pos={[r.minX + 1.3, 0, back + 1.4]} color="#6CFF8A" />
      <Cauldron pos={[cx + 2.6, 0, back + 1.2]} color="#B07CFF" r={0.55} />
      <Cauldron pos={[r.maxX - 1.2, 0, back + 1.5]} color="#5CD6FF" r={0.45} />
      <PotionShelf pos={[cx - 2.4, 0, back + 0.4]} seed={3} />
      <PotionShelf pos={[cx + 0.2, 0, back + 0.4]} w={2.0} seed={4} />
      <Pensieve pos={[r.minX + 1.5, 0, -2.7]} />
      <Trunks pos={[r.maxX - 1.2, 0, -2.4]} rotY={-0.4} />
      <Torch pos={[r.minX + 2.6, 2.3, back + 0.05]} /><Torch pos={[r.maxX - 2.6, 2.3, back + 0.05]} />
      <Banner pos={[r.minX + 0.3, 2.3, -4.9]} rotY={HALF_PI} color={C.emerald} trim="#C9D1D9" />
      <PottedPlant pos={[r.maxX - 0.5, 0, -0.9]} scale={1.0} seed={6} />
      <Rug pos={[cx, 0.04, -4.4]} size={[3.8, 3.4]} color="#2B3A2E" border="#6CFF8A" />
      <FloatingCandles area={[r.minX + 1, r.maxX - 1, -7, -0.5]} y={2.9} count={12} seed={12} />
    </group>
  );
}

/* The Library: tall shelves, a reading nook, a lectern with a glowing book and an owl on a perch. */
function LibraryDecor({ r }: { r: RoomRect }) {
  const cx = (r.minX + r.maxX) / 2;
  return (
    <group>
      {[-6.2, -4.0, -1.8].map((z, i) => <Bookcase key={z} pos={[r.minX + 0.3, 0, z]} rotY={HALF_PI} w={2.0} h={3.0} seed={20 + i} />)}
      <Bookcase pos={[cx - 3.4, 0, GROUND_BACK_Z + 0.4]} h={3.0} seed={31} />
      <Bookcase pos={[cx + 3.0, 0, GROUND_BACK_Z + 0.4]} h={3.0} seed={32} />
      <Bookcase pos={[cx - 1.2, 0, GROUND_BACK_Z + 0.4]} h={3.0} seed={33} />
      <Rug pos={[cx, 0.03, -4.6]} size={[4.4, 3.4]} color="#4A1F2B" border="#D9A441" />
      <Sofa pos={[r.minX + 2.6, 0, -2.3]} w={2.4} color="#5A1F2B" accent="#D9A441" />
      <CoffeeTable pos={[r.minX + 2.6, 0, -0.9]} />
      <Lectern pos={[r.maxX - 1.6, 0, -1.2]} />
      <OwlPerch pos={[r.maxX - 0.8, 0, -6.6]} />
      <Torch pos={[cx + 1.2, 2.4, GROUND_BACK_Z + 0.05]} />
      <FloorLamp pos={[r.minX + 4.2, 0, -2.3]} />
      <PottedPlant pos={[r.maxX - 0.6, 0, -0.9]} scale={1.1} seed={8} />
      <FloatingCandles area={[r.minX + 1, r.maxX - 1, -7, -0.5]} y={3.0} count={14} seed={13} />
    </group>
  );
}

/* The Great Hall: one long oak table under a sky of floating candles, banners of the four houses, a fireplace and the hourglasses of house points. */
function GreatHallDecor({ layout }: { layout: Layout }) {
  const m = layout.meeting!, r = m.room, { x: tx, z: tz, len, wid } = m.table, dz = r.minZ - OLD_BACK_Z;
  const houses = [C.crimson, "#E3B341", C.sapphire, C.emerald];
  return (
    <group>
      <Rug pos={[tx, 0.04, tz]} size={[len + 2.6, wid + 3.4]} color="#5C1A24" border="#D9A441" />
      {/* the table */}
      <Box size={[len, 0.08, wid]} pos={[tx, 0.76, tz]} color="#5C3B26" />
      <Box size={[len - 0.2, 0.025, wid - 0.2]} pos={[tx, 0.8, tz]} color="#6B4A2E" cast={false} />
      <Box size={[len - 0.6, 0.02, 0.5]} pos={[tx, 0.82, tz]} color={C.crimson} cast={false} />
      {[-1, 1].map(sx => <Box key={sx} size={[0.12, 0.72, wid - 0.3]} pos={[tx + sx * (len / 2 - 0.45), 0.36, tz]} color="#3A2A1E" />)}
      {/* a chair, a goblet and a candle for each seat */}
      {m.seats.map((s, i) => {
        const back = s.heading === 0, edge = back ? tz - wid / 2 + 0.28 : tz + wid / 2 - 0.28;
        return (
          <group key={i}>
            <group position={[s.x, 0, s.z]} rotation={[0, s.heading, 0]}><WizardChair /></group>
            <Cyl rt={0.045} rb={0.03} h={0.14} pos={[s.x + 0.3, 0.9, edge]} color={C.gold} seg={8} cast={false} />
            <Box size={[0.3, 0.02, 0.22]} pos={[s.x - 0.1, 0.825, edge]} color="#E8DCC0" cast={false} />
          </group>
        );
      })}
      {[-1, 0, 1].map(k => (
        <group key={k} position={[tx + k * (len / 3.4), 0.82, tz]}>
          <Cyl rt={0.03} rb={0.03} h={0.3} pos={[0, 0.15, 0]} color="#F6EFD9" seg={6} cast={false} />
          <mesh position={[0, 0.34, 0]}><coneGeometry args={[0.035, 0.12, 6]} /><meshBasicMaterial color="#FFB84D" /></mesh>
        </group>
      ))}
      {/* the four house banners and the fireplace on the back wall */}
      {houses.map((c, i) => <Banner key={i} pos={[r.minX + 1.4 + i * ((r.maxX - r.minX - 2.8) / 3), 2.3, r.minZ + 0.35]} color={c} trim={i === 1 ? "#2B2B33" : C.gold} h={2.4} />)}
      <Fireplace pos={[r.minX + 0.5, 0, -2.0 + dz]} rotY={HALF_PI} w={2.2} h={2.0} />
      <HousePoints pos={[tx + 0.4, 0, r.minZ + 1.0]} />
      <Armor pos={[r.maxX - 0.7, 0, -1.6 + dz]} rotY={-HALF_PI} />
      <Armor pos={[r.doorX - 2.6, 0, r.maxZ - 0.7]} rotY={Math.PI} />
      <Armor pos={[r.doorX + 2.6, 0, r.maxZ - 0.7]} rotY={Math.PI} />
      <SortingHat pos={[r.maxX - 2.2, 0, tz + 2.6]} />
      <Torch pos={[r.maxX - 0.2, 2.2, -4.3 + dz]} rotY={-HALF_PI} />
      {/* a sky of candles, and chandeliers over the table */}
      <FloatingCandles area={[r.minX + 0.8, r.maxX - 0.8, r.minZ + 0.8, r.maxZ - 0.6]} y={3.0} count={46} seed={14} />
      <Chandelier pos={[tx - len / 4, 3.7, tz]} r={0.7} n={8} drop={0.8} />
      <Chandelier pos={[tx + len / 4, 3.7, tz]} r={0.7} n={8} drop={0.8} />
    </group>
  );
}

/* The Headmaster's study on the tower's upper floor: shelves, a pensieve, an orrery, a phoenix perch and a crystal ball. */
function StudyDecor({ r, layout }: { r: RoomRect; layout: Layout }) {
  const Y = UPPER_Y, desk = layout.desks.find(d => d.y > 0);
  return (
    <group>
      <Rug pos={[desk ? desk.x : r.minX + 3.2, Y + 0.03, r.minZ + 3.6]} size={[5.2, 3.8]} color="#3A1F4A" border="#D9A441" />
      {[0, 1].map(k => <Bookcase key={k} pos={[r.minX + 1.3 + k * 2.2, Y, r.minZ + 0.4]} w={2.0} h={3.0} seed={50 + k} />)}
      <Sofa pos={[r.minX + 2.3, Y, r.minZ + 5.6]} w={2.6} color="#2B1F3A" accent="#D9A441" />
      <CoffeeTable pos={[r.minX + 2.3, Y, r.minZ + 6.6]} />
      <CrystalBall pos={[r.minX + 2.3, Y + 0.42, r.minZ + 6.6]} />
      <Pensieve pos={[r.minX + 5.6, Y, r.minZ + 6.2]} />
      <Orrery pos={[r.minX + 0.9, Y, r.minZ + 7.4]} scale={0.8} />
      <OwlPerch pos={[r.minX + 0.6, Y, r.minZ + 4.2]} color="#FF8A4C" />
      <Banner pos={[r.minX + 0.3, Y + 2.3, r.minZ + 3.6]} rotY={HALF_PI} color="#3A1F4A" />
      <Torch pos={[r.maxX - 0.2, Y + 2.2, r.minZ + 6.4]} rotY={-HALF_PI} />
      <FloatingCandles area={[r.minX + 1, r.maxX - 1, r.minZ + 1, r.maxZ - 1]} y={Y + 3.0} count={14} seed={15} />
    </group>
  );
}

/* The stair hall on the ground floor of the headmaster's tower. */
function StairHallDecor({ r }: { r: RoomRect }) {
  return (
    <group>
      <Torch pos={[r.minX + 0.3, 2.3, r.minZ + 3.6]} rotY={HALF_PI} />
      <Banner pos={[r.minX + 0.3, 2.4, r.minZ + 6.2]} rotY={HALF_PI} color="#3A1F4A" />
      <Armor pos={[r.minX + 1.0, 0, r.minZ + 1.0]} />
      <Trunks pos={[r.minX + 3.0, 0, r.minZ + 1.2]} />
      <FloatingCandles area={[r.minX + 0.8, r.minX + 6, r.minZ + 1, r.maxZ - 1]} y={3.1} count={8} seed={18} />
    </group>
  );
}

/* Furnishings for every building, the passages between them and the forecourt. */
export function RoomsDecor({ layout }: { layout: Layout }) {
  const hall = layout.rooms.find(r => r.theme === "meeting");
  const hx = hall ? (hall.minX + hall.maxX) / 2 : 0;
  return (
    <group>
      {layout.rooms.map(r => {
        const dz = r.minZ - OLD_BACK_Z;
        return (
          <group key={r.id}>
            <group position={[0, 0, dz]}>
              {r.theme === "developers" && <CharmsDecor r={r} layout={layout} />}
              {r.theme === "lab" && <PotionsDecor r={r} />}
              {r.theme === "library" && <LibraryDecor r={r} />}
            </group>
            {r.theme === "meeting" && layout.meeting && <GreatHallDecor layout={layout} />}
            {r.level > 0 && <StudyDecor r={r} layout={layout} />}
            {r.level > 0 && <StairHallDecor r={r} />}
          </group>
        );
      })}

      {/* torches beside every doorway, on both the forecourt and the alley side */}
      {layout.rooms.filter(r => r.theme !== "meeting").map(r => (
        <group key={"arch" + r.id}>
          <Torch pos={[r.doorX - 2.1, 2.1, r.maxZ + 0.32]} />
          <Torch pos={[r.doorX + 2.1, 2.1, r.maxZ + 0.32]} />
        </group>
      ))}

      {/* the forecourt: a fountain, stone benches and potted plants */}
      <group position={[hx, 0, COURT_Z + 4.4]}>
        <Cyl rt={2.2} rb={2.4} h={0.5} pos={[0, 0.25, 0]} color={C.stoneLight} seg={20} />
        <Cyl rt={1.9} rb={1.9} h={0.08} pos={[0, 0.5, 0]} color="#5CA8D8" seg={20} cast={false} />
        <Cyl rt={0.25} rb={0.4} h={1.6} pos={[0, 1.0, 0]} color={C.stone} seg={10} />
        <Cyl rt={0.8} rb={0.5} h={0.18} pos={[0, 1.7, 0]} color={C.stoneLight} seg={14} />
        <Cyl rt={0.1} rb={0.12} h={0.6} pos={[0, 2.0, 0]} color={C.stone} seg={8} />
        {[0, 1, 2, 3].map(i => <Box key={i} size={[1.8, 0.1, 0.5]} pos={[Math.sin(i * HALF_PI) * 4.0, 0.45, Math.cos(i * HALF_PI) * 4.0]} rot={[0, i * HALF_PI, 0]} color={C.stoneLight} />)}
      </group>
      {layout.passages.map((x, i) => <PottedPlant key={x} pos={[x, 0, COURT_Z - 0.6]} scale={1.1} seed={i + 12} />)}

    </group>
  );
}
