import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import { CORRIDOR_Z, GROUND_BACK_Z, PARTITION_Z, UPPER_Y, type Layout, type RoomRect } from "../../../shared/layout";
import { C } from "../palette";
import { Box, Cyl } from "../parts";
import { GamingChair } from "../desk/gear";
import { NearFade } from "../NearFade";
import { lampMat } from "../materials";
import { rng } from "../rng";
import { toonGradient } from "../toon";
import {
  CoffeeStation, CoffeeTable, FloorLamp, HoloTable, Neon, PottedPlant, Printer3D, RobotArm, Rug, ServerRack, Sofa,
  SteelShelf, StringLights, TV, VendingMachine, Whiteboard, Workbench, WaterCooler
} from "./props";

const HALF_PI = Math.PI / 2;
type V3 = [number, number, number];
const BOOK_COLORS = ["#C8553D", "#3E6EA8", "#E3B341", "#4C9A3F", "#8E5BB5", "#2F8F8A", "#D98A3D", "#B83C5A", "#5D6B7A"];

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
      <Box size={[w, h, 0.05]} pos={[0, h / 2, -0.22]} color={C.woodDark} />
      {[-1, 1].map(s => <Box key={s} size={[0.06, h, 0.5]} pos={[s * (w / 2), h / 2, 0]} color={C.woodDark} />)}
      {Array.from({ length: levels + 1 }, (_, l) => <Box key={l} size={[w, 0.05, 0.5]} pos={[0, 0.03 + l * 0.5, 0]} color={C.wood} />)}
      <instancedMesh ref={ref} args={[undefined, undefined, books.length]} castShadow><boxGeometry args={[1, 1, 1]} /><meshToonMaterial gradientMap={toonGradient} /></instancedMesh>
    </group>
  );
}

function DevelopersDecor({ r, layout }: { r: RoomRect; layout: Layout }) {
  const desks = layout.desks.filter(d => d.y === 0 && d.room >= 0 && layout.rooms[d.room] === r);
  const back = GROUND_BACK_Z;
  return (
    <group>
      {/* server racks in the back-left corner, shelves along the back wall between them and the coffee corner */}
      {[0, 1, 2].map(k => <ServerRack key={k} pos={[r.minX + 0.75 + k * 0.85, 0, back + 0.55]} seed={k + 1} />)}
      <SteelShelf pos={[r.minX + 6.2, 0, back + 0.45]} w={2.6} seed={4} />
      <SteelShelf pos={[r.minX + 9.4, 0, back + 0.45]} w={2.2} seed={5} />
      <Whiteboard pos={[r.minX + 0.35, 0, -4.1]} rotY={HALF_PI} w={2.2} seed={9} />
      <VendingMachine pos={[r.minX + 0.55, 0, -1.9]} rotY={HALF_PI} />
      {/* coffee corner at the back-right, well away from where the desks' owners walk */}
      <CoffeeStation pos={[r.maxX - 3.4, 0, back + 0.55]} />
      <WaterCooler pos={[r.maxX - 5.1, 0, back + 0.5]} />
      <PottedPlant pos={[r.maxX - 0.55, 0, -2.7]} scale={1.0} seed={3} />
      <PottedPlant pos={[r.minX + 4.6, 0, -1.9]} scale={1.0} seed={7} />
      {desks.map(d => (
        <group key={d.x}>
          <Rug pos={[d.x, 0.04, d.z + 0.2]} size={[3.8, 3.4]} color="#4A3A33" border="#B07A3A" />
        </group>
      ))}
    </group>
  );
}

function LabDecor({ r }: { r: RoomRect }) {
  const cx = (r.minX + r.maxX) / 2, back = GROUND_BACK_Z;
  return (
    <group>
      <RobotArm pos={[r.minX + 1.1, 0, back + 1.4]} />
      <Workbench pos={[cx + 0.9, 0, back + 0.5]} w={2.8} />
      <Printer3D pos={[r.minX + 2.9, 0, back + 0.7]} />
      <Printer3D pos={[r.maxX - 1.1, 0, back + 0.7]} />
      <HoloTable pos={[r.minX + 1.35, 0, -2.7]} />
      <Whiteboard pos={[r.minX + 0.3, 0, -4.9]} rotY={HALF_PI} w={2.0} seed={2} stickies={false} />
      <PottedPlant pos={[r.maxX - 0.5, 0, -2.3]} scale={1.0} seed={6} />
      <Rug pos={[cx, 0.04, -4.4]} size={[3.8, 3.4]} color="#E6DACB" border="#9C6ADE" />
    </group>
  );
}

function LibraryDecor({ r }: { r: RoomRect }) {
  const cx = (r.minX + r.maxX) / 2;
  return (
    <group>
      {[-6.2, -4.0, -1.8].map((z, i) => <Bookcase key={z} pos={[r.minX + 0.3, 0, z]} rotY={HALF_PI} w={2.0} seed={20 + i} />)}
      <Bookcase pos={[cx - 3.4, 0, GROUND_BACK_Z + 0.4]} w={2.0} seed={31} />
      <Bookcase pos={[cx + 3.0, 0, GROUND_BACK_Z + 0.4]} w={2.0} seed={32} />
      <Rug pos={[cx, 0.03, -4.6]} size={[4.4, 3.4]} color="#6A2F32" border="#B8893A" />
      <Sofa pos={[r.minX + 2.6, 0, -2.3]} w={2.4} color="#5A3A2C" accent="#E3B341" />
      <CoffeeTable pos={[r.minX + 2.6, 0, -0.9]} />
      <FloorLamp pos={[r.minX + 4.2, 0, -2.3]} />
      <FloorLamp pos={[r.maxX - 0.6, 0, -6.8]} />
      <PottedPlant pos={[r.maxX - 0.6, 0, -0.9]} scale={1.1} seed={8} />
      <StringLights a={[r.minX + 0.4, 3.35, GROUND_BACK_Z + 0.3]} b={[r.maxX - 0.4, 3.35, GROUND_BACK_Z + 0.3]} count={14} sag={0.35} />
    </group>
  );
}

/* The meeting room: one long table with a chair for everybody, a screen on a stand at one end, and a whiteboard. */
function MeetingDecor({ layout }: { layout: Layout }) {
  const m = layout.meeting!, r = m.room, { x: tx, z: tz, len, wid } = m.table;
  return (
    <group>
      <Rug pos={[tx, 0.04, tz]} size={[len + 2.6, wid + 3.4]} color="#7A4A34" border="#D9A441" />
      {/* the table */}
      <Box size={[len, 0.07, wid]} pos={[tx, 0.76, tz]} color="#7A5234" />
      <Box size={[len - 0.2, 0.025, wid - 0.2]} pos={[tx, 0.8, tz]} color="#8A6040" cast={false} />
      {[-1, 1].map(sx => <Box key={sx} size={[0.1, 0.72, wid - 0.3]} pos={[tx + sx * (len / 2 - 0.45), 0.36, tz]} color="#3A3F48" />)}
      <Box size={[len - 1.0, 0.08, 0.12]} pos={[tx, 0.3, tz]} color="#3A3F48" cast={false} />
      {/* a chair, a cup and a notebook for each seat */}
      {m.seats.map((s, i) => {
        const back = s.heading === 0, edge = back ? tz - wid / 2 + 0.28 : tz + wid / 2 - 0.28;
        return (
          <group key={i}>
            <group position={[s.x, 0, s.z]} rotation={[0, s.heading, 0]}><GamingChair main="#8A5A3C" accent="#D9A441" leather /></group>
            <Box size={[0.3, 0.02, 0.22]} pos={[s.x - 0.05, 0.815, edge]} color="#F4EFE6" cast={false} />
            <Cyl rt={0.04} rb={0.034} h={0.09} pos={[s.x + 0.32, 0.86, edge]} color={["#F4E1D2", "#D9A441", "#E8E2D6"][i % 3]} seg={10} />
            {i % 2 === 0 && <Box size={[0.34, 0.02, 0.24]} pos={[s.x - 0.05, 0.835, edge]} rot={[0, back ? 0.1 : -0.1, 0]} color="#2B2F3A" cast={false} />}
          </group>
        );
      })}
      <PottedPlant pos={[tx, 0.83, tz]} scale={0.36} seed={41} />
      <Cyl rt={0.06} rb={0.06} h={0.2} pos={[tx + 0.7, 0.9, tz]} color="#7FC8FF" seg={10} />
      {/* screen on a stand at the left end, whiteboard on the back wall */}
      <group position={[tx - len / 2 - 1.15, 0, tz]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[0.9, 0.06, 0.5]} pos={[0, 0.03, 0]} color="#2B2F3A" />
        <Box size={[0.08, 1.4, 0.08]} pos={[0, 0.75, 0]} color="#3A3F48" />
        <TV pos={[0, 1.55, 0.05]} w={1.9} h={1.1} hue={0.07} />
      </group>
      <Whiteboard pos={[tx + 1.2, 0, r.minZ + 0.3]} w={2.4} seed={14} stickies={false} />
      <PottedPlant pos={[r.minX + 0.6, 0, r.minZ + 0.7]} scale={1.3} seed={42} />
      <PottedPlant pos={[r.maxX - 0.6, 0, r.minZ + 0.7]} scale={1.2} seed={43} />
      <FloorLamp pos={[r.maxX - 0.7, 0, -3.3]} />
      {/* a long warm lamp over the table */}
      <NearFade pitch perMesh min={4} max={11} floor={0.12}>
        <Box size={[len - 0.8, 0.05, 0.12]} pos={[tx, 3.0, tz]} color="#2B2F3A" cast={false} />
        {[-1, 0, 1].map(k => <mesh key={k} position={[tx + k * (len / 3.2), 2.9, tz]} material={lampMat}><sphereGeometry args={[0.16, 12, 8]} /></mesh>)}
      </NearFade>
    </group>
  );
}

function SuiteDecor({ layout }: { layout: Layout }) {
  const s = layout.suite!, Y = UPPER_Y, cx = (s.minX + s.maxX) / 2;
  return (
    <group>
      <Rug pos={[layout.desks.find(d => d.y > 0)!.x, Y + 0.03, -15.2]} size={[5.2, 3.8]} color="#2A2F3E" border="#C79A2B" />
      {[0, 1, 2].map(k => <Bookcase key={k} pos={[s.minX + 1.3 + k * 2.2, Y, s.minZ + 0.4]} w={2.0} h={2.6} seed={50 + k} />)}
      <Sofa pos={[s.minX + 2.3, Y, -11.9]} w={2.6} color="#2B2024" accent="#C79A2B" />
      <CoffeeTable pos={[s.minX + 2.3, Y, -10.8]} />
      <FloorLamp pos={[s.minX + 0.7, Y, -11.9]} />
      <PottedPlant pos={[s.minX + 0.6, Y, s.minZ + 1.5]} scale={1.3} seed={9} />
      <PottedPlant pos={[s.maxX - 0.6, Y, s.minZ + 1.0]} scale={1.2} seed={10} />
      <Box size={[0.9, 0.05, 0.5]} pos={[s.minX + 0.8, Y + 0.85, -17.3]} color={C.woodDark} />
      <Box size={[0.06, 0.85, 0.5]} pos={[s.minX + 0.4, Y + 0.425, -17.3]} color={C.steel} />
      <Box size={[0.06, 0.85, 0.5]} pos={[s.minX + 1.2, Y + 0.425, -17.3]} color={C.steel} />
      {[0, 1, 2].map(i => <Cyl key={i} rt={0.04} rb={0.035} h={0.24} pos={[s.minX + 0.5 + i * 0.12, Y + 1.0, -17.3]} color={["#3E8A5A", "#C8553D", "#E0A030"][i]} seg={8} cast={false} />)}
    </group>
  );
}

/* Furnishings for the three ground-floor rooms, the corridor and lobby, and the product suite. */
export function RoomsDecor({ layout }: { layout: Layout }) {
  const { building: b, lobby } = layout;
  return (
    <group>
      {layout.rooms.map(r => (
        <group key={r.id}>
          {r.theme === "developers" && <DevelopersDecor r={r} layout={layout} />}
          {r.theme === "lab" && <LabDecor r={r} />}
          {r.theme === "library" && <LibraryDecor r={r} />}
          {r.theme === "meeting" && layout.meeting && <MeetingDecor layout={layout} />}
        </group>
      ))}

      {/* corridor: plants beside the glass columns and benches halfway between doors, so nothing blocks a door */}
      {[b.minX + 0.9, ...layout.rooms.map(r => r.maxX - 0.9)].filter(x => layout.rooms.every(r => Math.abs(x - r.doorX) > 2.2) && x < lobby.minX - 0.5).map((x, i) => (
        <PottedPlant key={x} pos={[x, 0, PARTITION_Z + 0.5]} scale={1.0} seed={i + 12} />
      ))}
      {layout.rooms.slice(0, -1).map((r, i) => {
        const x = (r.doorX + layout.rooms[i + 1].doorX) / 2;
        return (
          <group key={"bench" + r.id} position={[x, 0, FRONT_BENCH_Z]}>
            <Box size={[1.8, 0.07, 0.45]} pos={[0, 0.45, 0]} color={C.woodLight} />
            {[-0.75, 0.75].map(dx => <Box key={dx} size={[0.07, 0.45, 0.4]} pos={[dx, 0.225, 0]} color={C.steel} />)}
          </group>
        );
      })}
      {layout.rooms.map(r => (
        <group key={"exit" + r.id}>
          <Box size={[0.5, 0.16, 0.05]} pos={[r.doorX, 3.05, PARTITION_Z + 0.05]} color="#0E3A22" emissive={C.neonGreen} emissiveIntensity={1.2} cast={false} />
          <Cyl rt={0.07} rb={0.07} h={0.3} pos={[r.maxX - 0.2, 0.9, PARTITION_Z + 0.3]} color={C.neonRed} seg={8} cast={false} />
        </group>
      ))}

      {/* lobby: reception and a waiting corner by the lift */}
      <group>
        <Box size={[0.8, 1.1, 2.8]} pos={[lobby.maxX - 1.0, 0.55, -3.2]} color="#2B2F3A" />
        <Box size={[1.0, 0.07, 3.0]} pos={[lobby.maxX - 1.0, 1.13, -3.2]} color={C.woodLight} />
        <Neon size={[0.04, 0.05, 2.6]} pos={[lobby.maxX - 1.42, 0.3, -3.2]} color={C.neonCyan} />
        <Box size={[0.4, 0.3, 0.05]} pos={[lobby.maxX - 1.0, 1.35, -3.9]} rot={[0, HALF_PI, 0]} color={C.black} />
        <Sofa pos={[lobby.minX + 0.9, 0, -4.2]} rotY={HALF_PI} w={2.2} color="#3A4256" accent={C.hazard} />
        <PottedPlant pos={[lobby.minX + 0.6, 0, -7.0]} scale={1.3} seed={20} />
        <PottedPlant pos={[lobby.maxX - 0.6, 0, -0.6]} scale={1.2} seed={21} />
        <Box size={[2.4, 0.012, 2.4]} pos={[(lobby.minX + lobby.maxX) / 2, 0.065, -2.0]} color="#2D323C" cast={false} />
        <Box size={[1.6, 0.012, 0.05]} pos={[(lobby.minX + lobby.maxX) / 2, 0.075, -2.0]} color={C.hazard} cast={false} />
      </group>

      {layout.suite && <SuiteDecor layout={layout} />}
      <group visible={false}><Box size={[0.01, 0.01, 0.01]} pos={[b.minX, 0, CORRIDOR_Z]} color="#000000" /></group>
    </group>
  );
}

const FRONT_BENCH_Z = 2.9;
