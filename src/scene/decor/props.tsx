import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, MeshBasicMaterial, Object3D, type Group, type Mesh } from "three";
import { C } from "../palette";
import { Ball, Box, Cone, Cyl, Glass, TBox } from "../parts";
import { rng } from "../rng";
import { TEX } from "../textures";
import { toonGradient } from "../toon";

type V3 = [number, number, number];

/* ---------- pixel-art neon lettering ---------- */
const FONT: Record<string, string[]> = {
  A: [" ### ", "#   #", "#####", "#   #", "#   #"], B: ["#### ", "#   #", "#### ", "#   #", "#### "], C: [" ####", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "], E: ["#####", "#    ", "#### ", "#    ", "#####"], F: ["#####", "#    ", "#### ", "#    ", "#    "],
  G: [" ####", "#    ", "#  ##", "#   #", " ####"], H: ["#   #", "#   #", "#####", "#   #", "#   #"], I: ["#####", "  #  ", "  #  ", "  #  ", "#####"],
  K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"], L: ["#    ", "#    ", "#    ", "#    ", "#####"], M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"], O: [" ### ", "#   #", "#   #", "#   #", " ### "], P: ["#### ", "#   #", "#### ", "#    ", "#    "],
  R: ["#### ", "#   #", "#### ", "#  # ", "#   #"], S: [" ####", "#    ", " ### ", "    #", "#### "], T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "], V: ["#   #", "#   #", "#   #", " # # ", "  #  "], W: ["#   #", "#   #", "# # #", "## ##", "#   #"],
  X: ["#   #", " # # ", "  #  ", " # # ", "#   #"], Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "], " ": ["     ", "     ", "     ", "     ", "     "]
};

/* Text made of glowing pixels, like a neon sign. Faces +z. */
export function PixelText({ text, pos, cell = 0.1, color, rotY = 0, flicker = false }: { text: string; pos: V3; cell?: number; color: string; rotY?: number; flicker?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const mat = useMemo(() => new MeshBasicMaterial({ color: new Color(color).multiplyScalar(0.55) }), [color]);
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    [...text.toUpperCase()].forEach((ch, i) => (FONT[ch] ?? FONT[" "]).forEach((row, y) => [...row].forEach((c, x) => { if (c === "#") out.push([i * 6 + x, 4 - y]); })));
    return out;
  }, [text]);
  const total = text.length * 6 - 1;
  useLayoutEffect(() => {
    const m = ref.current, o = new Object3D();
    if (!m) return;
    cells.forEach(([x, y], i) => { o.position.set((x - total / 2) * cell, y * cell, 0); o.scale.set(cell * 0.82, cell * 0.82, cell * 0.4); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [cells, cell, total]);
  useFrame(({ clock }) => { if (flicker) { const f = Math.sin(clock.elapsedTime * 23) * Math.sin(clock.elapsedTime * 7.3); mat.color.set(color).multiplyScalar(f > 0.93 ? 0.2 : 0.55); } });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} material={mat}><boxGeometry args={[1, 1, 1]} /></instancedMesh>
    </group>
  );
}

/* A tube of neon light. */
export function Neon({ size, pos, color, rot }: { size: V3; pos: V3; color: string; rot?: V3 }) {
  return <Box size={size} pos={pos} color={color} emissive={color} emissiveIntensity={0.9} cast={false} rot={rot} />;
}

/* ---------- industrial props ---------- */

export function ServerRack({ pos, rotY = 0, seed = 1, h = 2.1 }: { pos: V3; rotY?: number; seed?: number; h?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const leds = useMemo(() => { const r = rng(seed); return Array.from({ length: 44 }, (_, i) => ({ x: -0.28 + (i % 4) * 0.1 + (i % 2) * 0.0, y: 0.18 + Math.floor(i / 4) * ((h - 0.4) / 11), sp: 1 + r() * 4, ph: r() * 9, c: [new Color("#39FF88"), new Color("#FFB000"), new Color("#2DE2E6")][Math.floor(r() * 3)] })); }, [seed, h]);
  const o = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => { const m = ref.current; if (!m) return; leds.forEach((l, i) => { o.position.set(l.x, l.y, 0); o.scale.set(0.045, 0.02, 0.01); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, l.c); }); m.instanceMatrix.needsUpdate = true; }, [leds, o]);
  const c = useMemo(() => new Color(), []);
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return;
    leds.forEach((l, i) => { const on = Math.sin(clock.elapsedTime * l.sp + l.ph) > -0.3; m.setColorAt(i, on ? l.c : c.set("#0A0C10")); });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.8, h, 0.9]} pos={[0, h / 2, 0]} color="#171A20" />
      <Box size={[0.74, h - 0.12, 0.04]} pos={[0, h / 2, 0.45]} color="#0F1116" cast={false} />
      {Array.from({ length: 11 }, (_, i) => <Box key={i} size={[0.7, 0.012, 0.03]} pos={[0, 0.14 + i * ((h - 0.4) / 11) , 0.46]} color="#262A33" cast={false} />)}
      <group position={[0, 0, 0.475]}>
        <instancedMesh ref={ref} args={[undefined, undefined, leds.length]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial /></instancedMesh>
      </group>
      <Glass size={[0.76, h - 0.1, 0.02]} pos={[0, h / 2, 0.5]} opacity={0.12} />
    </group>
  );
}

export function Crate({ pos, size = [0.7, 0.6, 0.7], rotY = 0, color = "#9C7A52" }: { pos: V3; size?: V3; rotY?: number; color?: string }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={size} pos={[0, size[1] / 2, 0]} color={color} />
      <Box size={[size[0] + 0.02, 0.06, size[2] + 0.02]} pos={[0, size[1] - 0.05, 0]} color="#6F5538" cast={false} />
      <Box size={[size[0] + 0.02, 0.06, size[2] + 0.02]} pos={[0, 0.05, 0]} color="#6F5538" cast={false} />
    </group>
  );
}

export function SteelShelf({ pos, w = 2.2, h = 2.2, rotY = 0, seed = 1 }: { pos: V3; w?: number; h?: number; rotY?: number; seed?: number }) {
  const items = useMemo(() => { const r = rng(seed), out: { x: number; y: number; w: number; hh: number; c: string }[] = []; for (let l = 0; l < 4; l++) { let x = -w / 2 + 0.15; while (x < w / 2 - 0.3) { const ww = 0.25 + r() * 0.3; out.push({ x: x + ww / 2, y: 0.12 + l * (h / 4), w: ww, hh: 0.2 + r() * 0.22, c: ["#9C7A52", "#7A8696", "#C8553D", "#3E6AA8", "#E0A030"][Math.floor(r() * 5)] }); x += ww + 0.05; } } return out; }, [seed, w, h]);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => <Box key={sx + "," + sz} size={[0.06, h, 0.06]} pos={[sx * (w / 2), h / 2, sz * 0.3]} color="#E0A030" cast={false} />))}
      {[0, 1, 2, 3].map(l => <Box key={l} size={[w, 0.04, 0.64]} pos={[0, 0.06 + l * (h / 4), 0]} color={C.steelMid} />)}
      {items.map((it, i) => <Box key={i} size={[it.w, it.hh, 0.4]} pos={[it.x, it.y + it.hh / 2 + 0.05, 0]} color={it.c} />)}
    </group>
  );
}

export function Workbench({ pos, w = 2.6, rotY = 0 }: { pos: V3; w?: number; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w, 0.08, 0.8]} pos={[0, 0.92, 0]} color={C.woodLight} />
      <Box size={[w - 0.1, 0.88, 0.7]} pos={[0, 0.44, 0]} color={C.steelMid} />
      {[-0.6, 0, 0.6].map(x => <Box key={x} size={[0.5, 0.2, 0.02]} pos={[x * w / 1.5, 0.7, 0.36]} color={C.steel} cast={false} />)}
      <Box size={[w, 1.0, 0.04]} pos={[0, 1.55, -0.38]} color="#6B7480" />
      {Array.from({ length: 9 }, (_, i) => <Box key={i} size={[0.03, 0.22 + (i % 3) * 0.08, 0.02]} pos={[-w / 2 + 0.2 + i * ((w - 0.4) / 8), 1.6, -0.35]} color={["#E5484D", "#F2C230", "#8A929E"][i % 3]} cast={false} />)}
      <Cyl rt={0.07} rb={0.07} h={0.1} pos={[w / 2 - 0.3, 1.0, 0.1]} color={C.steel} seg={8} />
    </group>
  );
}

export function Whiteboard({ pos, rotY = 0, w = 2.0, seed = 3, stickies = true }: { pos: V3; rotY?: number; w?: number; seed?: number; stickies?: boolean }) {
  const notes = useMemo(() => { const r = rng(seed), cols = ["#FFD966", "#FF9AA2", "#9AD1FF", "#B5EAD7"]; return Array.from({ length: 10 }, (_, i) => ({ x: -w / 2 + 0.3 + (i % 5) * ((w - 0.5) / 4.5), y: 1.95 - Math.floor(i / 5) * 0.4 + (r() - 0.5) * 0.06, c: cols[Math.floor(r() * 4)], rot: (r() - 0.5) * 0.25 })); }, [seed, w]);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w + 0.1, 1.3, 0.06]} pos={[0, 1.6, 0]} color="#AEB5C6" />
      <Box size={[w, 1.2, 0.07]} pos={[0, 1.6, 0.01]} color="#FAFBFD" />
      {stickies ? notes.map((n, i) => <Box key={i} size={[0.22, 0.22, 0.02]} pos={[n.x, n.y - 0.2, 0.06]} rot={[0, 0, n.rot]} color={n.c} cast={false} />)
        : [0.3, 0.05, -0.2].map((y, i) => <Box key={i} size={[w * (0.7 - i * 0.15), 0.025, 0.02]} pos={[-0.1, 1.6 + y, 0.06]} color={["#3C7DFF", "#E0638A", "#2FA872"][i]} cast={false} />)}
      {[-w / 2 + 0.2, w / 2 - 0.2].map(x => <Box key={x} size={[0.06, 1.0, 0.06]} pos={[x, 0.5, -0.12]} color={C.steel} />)}
    </group>
  );
}

/* An industrial robot arm that keeps working. */
export function RobotArm({ pos, color = "#F28C28" }: { pos: V3; color?: string }) {
  const j1 = useRef<Group>(null), j2 = useRef<Group>(null), j3 = useRef<Group>(null), claw = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (j1.current) j1.current.rotation.y = Math.sin(t * 0.5) * 1.1;
    if (j2.current) j2.current.rotation.x = -0.5 + Math.sin(t * 0.8) * 0.45;
    if (j3.current) j3.current.rotation.x = 0.9 + Math.sin(t * 1.1 + 1) * 0.5;
    if (claw.current) claw.current.scale.x = 0.6 + Math.abs(Math.sin(t * 1.6)) * 0.5;
  });
  return (
    <group position={pos}>
      <Cyl rt={0.55} rb={0.65} h={0.3} pos={[0, 0.15, 0]} color={C.steel} seg={16} />
      <Box size={[1.1, 0.04, 1.1]} pos={[0, 0.02, 0]} color={C.hazard} cast={false} />
      <group ref={j1} position={[0, 0.3, 0]}>
        <Cyl rt={0.3} rb={0.34} h={0.4} pos={[0, 0.2, 0]} color={color} seg={14} />
        <group ref={j2} position={[0, 0.45, 0]}>
          <Ball r={0.2} pos={[0, 0, 0]} color={C.steel} seg={10} />
          <Box size={[0.22, 1.1, 0.22]} pos={[0, 0.55, 0]} color={color} />
          <group ref={j3} position={[0, 1.1, 0]}>
            <Ball r={0.16} pos={[0, 0, 0]} color={C.steel} seg={10} />
            <Box size={[0.18, 0.9, 0.18]} pos={[0, 0.45, 0.0]} rot={[0, 0, 0]} color={color} />
            <group position={[0, 0.9, 0]}>
              <Box size={[0.3, 0.08, 0.12]} pos={[0, 0, 0]} color={C.black} />
              <group ref={claw}>
                {[-1, 1].map(s => <Box key={s} size={[0.04, 0.2, 0.08]} pos={[s * 0.1, 0.1, 0]} color={C.steelLight} />)}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export function HoloTable({ pos }: { pos: V3 }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = clock.elapsedTime * 0.7; g.current.position.y = 1.55 + Math.sin(clock.elapsedTime * 1.4) * 0.05; } });
  return (
    <group position={pos}>
      <Cyl rt={0.7} rb={0.75} h={0.9} pos={[0, 0.45, 0]} color={C.steelBlue} seg={20} />
      <Cyl rt={0.66} rb={0.66} h={0.04} pos={[0, 0.92, 0]} color={C.neonCyan} emissive={C.neonCyan} emissiveIntensity={1.4} seg={20} cast={false} />
      <group ref={g} position={[0, 1.55, 0]}>
        <mesh><icosahedronGeometry args={[0.42, 1]} /><meshBasicMaterial color={C.neonCyan} wireframe /></mesh>
        <mesh><boxGeometry args={[0.36, 0.36, 0.36]} /><meshBasicMaterial color="#B5F3FF" wireframe /></mesh>
      </group>
      <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.02, 0.5, 0.55, 14, 1, true]} /><meshBasicMaterial color={C.neonCyan} transparent opacity={0.1} depthWrite={false} /></mesh>
    </group>
  );
}

export function Printer3D({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  const head = useRef<Group>(null);
  useFrame(({ clock }) => { if (head.current) head.current.position.x = Math.sin(clock.elapsedTime * 2.2) * 0.14; });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.9, 0.06, 0.7]} pos={[0, 0.78, 0]} color={C.steelMid} />
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([a, b], i) => <Box key={i} size={[0.07, 0.76, 0.07]} pos={[a * 0.4, 0.38, b * 0.3]} color={C.steel} />)}
      <Box size={[0.7, 0.62, 0.55]} pos={[0, 1.12, 0]} color="#F4F6FA" />
      <Glass size={[0.58, 0.44, 0.04]} pos={[0, 1.12, 0.28]} tint="#7FE6FF" opacity={0.3} />
      <Box size={[0.4, 0.02, 0.36]} pos={[0, 0.95, 0.04]} color="#2B3142" cast={false} />
      <group ref={head} position={[0, 1.18, 0.08]}><Box size={[0.1, 0.08, 0.1]} pos={[0, 0, 0]} color="#FF8A3D" emissive="#FF8A3D" emissiveIntensity={0.5} cast={false} /></group>
      <Box size={[0.12, 0.14, 0.12]} pos={[0.04, 1.03, 0.04]} color="#FF8A3D" emissive="#FF8A3D" emissiveIntensity={0.4} cast={false} />
    </group>
  );
}

export function PottedPlant({ pos, scale = 1, seed = 3 }: { pos: V3; scale?: number; seed?: number }) {
  const leaves = useMemo(() => { const r = rng(seed); return Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2 + r(), tilt: 0.3 + r() * 0.45, h: 0.6 + r() * 0.4 })); }, [seed]);
  return (
    <group position={pos} scale={scale}>
      <Cyl rt={0.24} rb={0.19} h={0.45} pos={[0, 0.225, 0]} color="#4A4F58" seg={12} />
      <Cyl rt={0.22} rb={0.22} h={0.04} pos={[0, 0.45, 0]} color="#3B2F26" seg={12} cast={false} />
      {leaves.map((l, i) => <group key={i} rotation={[0, l.a, 0]}><Cone r={0.1} h={l.h} pos={[0.13 * l.tilt * 2, 0.45 + l.h / 2, 0]} rot={[0, 0, -l.tilt]} color={i % 2 ? "#4F9A62" : "#3F8A55"} seg={6} /></group>)}
    </group>
  );
}

export function WaterCooler({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <Box size={[0.38, 0.95, 0.38]} pos={[0, 0.475, 0]} color="#E9EDF2" />
      <Cyl rt={0.16} rb={0.16} h={0.4} pos={[0, 1.15, 0]} color="#7FC8FF" seg={12} />
      <Box size={[0.1, 0.06, 0.04]} pos={[0, 0.8, 0.2]} color="#3C7DFF" cast={false} />
    </group>
  );
}

export function CoffeeStation({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[1.4, 0.06, 0.7]} pos={[0, 0.9, 0]} color={C.woodLight} />
      <Box size={[1.3, 0.86, 0.62]} pos={[0, 0.43, 0]} color={C.steelMid} />
      <Box size={[0.5, 0.45, 0.4]} pos={[-0.35, 1.15, 0]} color="#16181D" />
      <Box size={[0.3, 0.05, 0.06]} pos={[-0.35, 1.2, 0.2]} color={C.neonRed} emissive={C.neonRed} emissiveIntensity={1.4} cast={false} />
      {[0.15, 0.4].map(x => <Cyl key={x} rt={0.04} rb={0.034} h={0.09} pos={[x, 0.98, 0.05]} color="#F2F3F7" seg={10} />)}
    </group>
  );
}

export function VendingMachine({ pos, rotY = 0, color = "#3E6AA8" }: { pos: V3; rotY?: number; color?: string }) {
  const cans = useMemo(() => { const r = rng(7), cols = ["#E5484D", "#3C7DFF", "#F2C230", "#2FA872", "#8E5BB5"], out: { x: number; y: number; c: string }[] = []; for (let row = 0; row < 4; row++) for (let i = 0; i < 5; i++) out.push({ x: -0.28 + i * 0.14, y: 1.35 - row * 0.26, c: cols[Math.floor(r() * cols.length)] }); return out; }, []);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.95, 1.85, 0.75]} pos={[0, 0.925, 0]} color={color} />
      <Box size={[0.72, 1.15, 0.04]} pos={[-0.05, 1.12, 0.38]} color="#F4F8FF" emissive="#DCEBFF" emissiveIntensity={0.7} cast={false} />
      {cans.map((c, i) => <Cyl key={i} rt={0.04} rb={0.04} h={0.12} pos={[c.x - 0.05, c.y - 0.05, 0.41]} color={c.c} seg={8} cast={false} />)}
      <Box size={[0.16, 0.5, 0.04]} pos={[0.37, 1.2, 0.38]} color="#2B3142" cast={false} />
      <Box size={[0.7, 0.2, 0.04]} pos={[-0.05, 0.3, 0.38]} color="#2B3142" cast={false} />
    </group>
  );
}

/* ---------- soft seating ---------- */

export function Sofa({ pos, rotY = 0, w = 2.4, color = "#2F3A4A", accent = "#C8553D" }: { pos: V3; rotY?: number; w?: number; color?: string; accent?: string }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w, 0.2, 0.95]} pos={[0, 0.3, 0]} color={color} />
      <Box size={[w, 0.16, 0.95]} pos={[0, 0.1, 0]} color="#1B1E26" />
      <Box size={[w, 0.65, 0.22]} pos={[0, 0.72, -0.36]} color={color} />
      {[-1, 1].map(s => <Box key={s} size={[0.2, 0.5, 0.95]} pos={[s * (w / 2 - 0.1), 0.5, 0]} color={color} />)}
      {Array.from({ length: Math.max(2, Math.round(w / 0.8)) }, (_, i) => i).map((i, _k, arr) => (
        <Box key={i} size={[(w - 0.4) / arr.length - 0.04, 0.12, 0.78]} pos={[-(w - 0.4) / 2 + ((i + 0.5) * (w - 0.4)) / arr.length, 0.46, 0.04]} color={shade(color)} />
      ))}
      <Box size={[0.4, 0.4, 0.12]} pos={[-w / 2 + 0.5, 0.7, -0.15]} rot={[0.2, 0.2, 0]} color={accent} />
    </group>
  );
}
const shade = (hex: string) => { const n = parseInt(hex.slice(1), 16); const ch = (v: number) => Math.min(255, Math.round(v * 1.15)).toString(16).padStart(2, "0"); return "#" + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255); };

export function BeanBag({ pos, color = "#C8553D" }: { pos: V3; color?: string }) {
  return <Ball r={0.5} pos={[pos[0], pos[1] + 0.2, pos[2]]} scale={[1, 0.5, 1]} color={color} seg={14} />;
}

export function Rug({ pos, size, color, border = "#E3B341" }: { pos: V3; size: [number, number]; color: string; border?: string }) {
  return (
    <group position={pos}>
      <Box size={[size[0], 0.025, size[1]]} pos={[0, 0.0125, 0]} color={border} cast={false} />
      <Box size={[size[0] - 0.2, 0.03, size[1] - 0.2]} pos={[0, 0.015, 0]} color={color} cast={false} />
    </group>
  );
}

export function CoffeeTable({ pos, w = 1.2, d = 0.7 }: { pos: V3; w?: number; d?: number }) {
  return (
    <group position={pos}>
      <Box size={[w, 0.05, d]} pos={[0, 0.4, 0]} color={C.woodDark} />
      {[-1, 1].map(s => <Box key={s} size={[0.05, 0.38, d - 0.1]} pos={[s * (w / 2 - 0.1), 0.19, 0]} color={C.steel} />)}
    </group>
  );
}

/* ---------- screens ---------- */

/* A wall TV with a moving picture. Faces +z. */
export function TV({ pos, rotY = 0, w = 2.4, h = 1.35, hue = 0.6 }: { pos: V3; rotY?: number; w?: number; h?: number; hue?: number }) {
  const screen = useRef<Mesh>(null), bar = useRef<Mesh>(null);
  const mat = useMemo(() => new MeshBasicMaterial({ color: "#222" }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mat.color.setHSL((hue + Math.sin(t * 0.35) * 0.12 + 1) % 1, 0.75, 0.42 + Math.sin(t * 2.1) * 0.05);
    if (bar.current) bar.current.position.y = ((t * 0.5) % 1 - 0.5) * (h - 0.1);
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w + 0.1, h + 0.1, 0.07]} pos={[0, 0, 0]} color="#0C0D10" />
      <mesh ref={screen} position={[0, 0, 0.04]} material={mat}><planeGeometry args={[w, h]} /></mesh>
      <mesh ref={bar} position={[0, 0, 0.045]}><planeGeometry args={[w, 0.05]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.16} depthWrite={false} /></mesh>
      <mesh position={[-w * 0.25, h * 0.1, 0.05]}><planeGeometry args={[w * 0.28, h * 0.4]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.12} depthWrite={false} /></mesh>
    </group>
  );
}

export function ArcadeCabinet({ pos, rotY = 0, color = "#8A5CFF" }: { pos: V3; rotY?: number; color?: string }) {
  const mat = useMemo(() => new MeshBasicMaterial({ color: "#222" }), []);
  useFrame(({ clock }) => { mat.color.setHSL((clock.elapsedTime * 0.3 + pos[2]) % 1, 0.8, 0.5); });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.8, 1.2, 0.8]} pos={[0, 0.6, 0]} color={color} />
      <Box size={[0.8, 0.6, 0.5]} pos={[0, 1.5, -0.15]} color={color} />
      <Box size={[0.8, 0.22, 0.5]} pos={[0, 1.9, -0.1]} color={C.black} />
      <Box size={[0.7, 0.12, 0.03]} pos={[0, 1.95, 0.16]} color={C.neonPink} emissive={C.neonPink} emissiveIntensity={2} cast={false} />
      <mesh position={[0, 1.5, 0.12]} rotation={[-0.25, 0, 0]} material={mat}><planeGeometry args={[0.62, 0.46]} /></mesh>
      <Box size={[0.8, 0.12, 0.5]} pos={[0, 1.18, 0.2]} rot={[-0.2, 0, 0]} color={C.black} />
      <Cyl rt={0.015} rb={0.015} h={0.14} pos={[-0.15, 1.28, 0.26]} color={C.black} seg={6} />
      <Ball r={0.035} pos={[-0.15, 1.36, 0.26]} color={C.neonRed} seg={8} />
      {[0.05, 0.16, 0.27].map((x, i) => <Ball key={i} r={0.03} pos={[x + 0.08, 1.26, 0.25]} color={[C.neonCyan, C.neonAmber, C.neonGreen][i]} seg={8} />)}
    </group>
  );
}

/* ---------- lounge furniture ---------- */

export function BilliardTable({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  const balls = useMemo(() => {
    const cols = ["#F2C230", "#2F5FD0", "#E5484D", "#6B3FA0", "#F28C28", "#2FA872", "#8A2A2A", "#111111"], out: { x: number; z: number; c: string }[] = [];
    let n = 0;
    for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) out.push({ x: 0.6 + row * 0.09, z: (i - row / 2) * 0.1, c: cols[n++ % cols.length] });
    out.push({ x: -0.6, z: 0, c: "#FFFFFF" });
    return out;
  }, []);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[3.2, 0.12, 1.7]} pos={[0, 0.82, 0]} color={C.walnut} />
      <Box size={[2.9, 0.04, 1.4]} pos={[0, 0.9, 0]} color="#1F7A4A" cast={false} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Box key={i} size={[0.22, 0.8, 0.22]} pos={[a * 1.4, 0.4, b * 0.7]} color={C.walnut} />)}
      {[-1, 1].map(s => <Box key={s} size={[3.2, 0.1, 0.12]} pos={[0, 0.95, s * 0.79]} color={C.walnut} />)}
      {[-1, 1].map(s => <Box key={s} size={[0.12, 0.1, 1.7]} pos={[s * 1.54, 0.95, 0]} color={C.walnut} />)}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]].map(([a, b], i) => <Ball key={i} r={0.07} pos={[a * 1.45, 0.92, b * 0.72]} color="#0A0B0E" seg={8} cast={false} />)}
      {balls.map((b, i) => <Ball key={i} r={0.032} pos={[b.x, 0.94, b.z]} color={b.c} seg={8} cast={false} />)}
      <Box size={[2.6, 0.06, 0.18]} pos={[0, 2.6, 0]} color={C.black} />
      {[-1, 1].map(s => <Box key={s} size={[0.02, 0.8, 0.02]} pos={[s * 1.2, 2.2, 0]} color={C.black} cast={false} />)}
      <Box size={[2.4, 0.03, 0.14]} pos={[0, 2.56, 0]} color="#FFF1CF" emissive="#FFD79A" emissiveIntensity={1.6} cast={false} />
    </group>
  );
}

export function SimRig({ pos, rotY = 0, color = "#E5484D" }: { pos: V3; rotY?: number; color?: string }) {
  const wheel = useRef<Group>(null);
  const mat = useMemo(() => new MeshBasicMaterial({ color: "#222" }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (wheel.current) wheel.current.rotation.z = Math.sin(t * 1.3 + pos[0]) * 0.5;
    mat.color.setHSL(0.02 + Math.sin(t * 1.2) * 0.03, 0.85, 0.45);
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* aluminium profile frame */}
      <Box size={[0.9, 0.08, 1.9]} pos={[0, 0.06, 0]} color={C.steelMid} />
      {[-1, 1].map(s => <Box key={s} size={[0.08, 0.08, 1.9]} pos={[s * 0.4, 0.14, 0]} color={C.steelLight} />)}
      {/* bucket seat (the driver sits here, hips at the origin) */}
      <Box size={[0.52, 0.12, 0.55]} pos={[0, 0.34, 0]} color={color} />
      {[-1, 1].map(s => <Box key={s} size={[0.1, 0.18, 0.55]} pos={[s * 0.27, 0.42, 0]} color="#16181D" />)}
      <Box size={[0.52, 0.75, 0.12]} pos={[0, 0.78, 0.3]} rot={[0.12, 0, 0]} color={color} />
      {[-1, 1].map(s => <Box key={s} size={[0.1, 0.7, 0.14]} pos={[s * 0.27, 0.8, 0.28]} rot={[0.12, 0, 0]} color="#16181D" />)}
      <Box size={[0.3, 0.2, 0.1]} pos={[0, 1.25, 0.36]} rot={[0.12, 0, 0]} color="#16181D" />
      <Box size={[0.12, 0.08, 0.5]} pos={[0, 0.2, 0]} color={C.steel} cast={false} />
      {/* wheel, column and pedals in front (toward -z) */}
      <Box size={[0.07, 0.07, 0.5]} pos={[0, 0.95, -0.85]} rot={[0.25, 0, 0]} color={C.black} />
      <group ref={wheel} position={[0, 1.0, -1.05]} rotation={[0.25, 0, 0]}>
        <mesh castShadow><torusGeometry args={[0.16, 0.026, 8, 20]} /><meshToonMaterial color="#16181D" gradientMap={toonGradient} /></mesh>
        <Box size={[0.08, 0.08, 0.04]} pos={[0, 0, 0]} color={C.neonRed} emissive={C.neonRed} emissiveIntensity={1.4} cast={false} />
        <Box size={[0.26, 0.03, 0.03]} pos={[0, 0.0, 0]} color="#16181D" cast={false} />
      </group>
      {[-0.1, 0, 0.1].map((x, i) => <Box key={i} size={[0.07, 0.03, 0.14]} pos={[x, 0.2, -1.25 + (i === 1 ? 0.02 : 0)]} rot={[-0.5, 0, 0]} color={C.steelLight} />)}
      {/* screens */}
      <group position={[0, 0, -1.85]} rotation={[0, Math.PI, 0]}>
        <Box size={[0.1, 1.0, 0.1]} pos={[0, 0.5, 0]} color={C.steel} />
        <Box size={[1.5, 0.55, 0.04]} pos={[0, 1.35, 0]} color={C.black} />
        <mesh position={[0, 1.35, -0.025]} rotation={[0, Math.PI, 0]} material={mat}><planeGeometry args={[1.42, 0.48]} /></mesh>
        {[-1, 1].map(s => <group key={s} position={[s * 0.8, 1.35, 0.12]} rotation={[0, s * -0.5, 0]}><Box size={[0.6, 0.5, 0.04]} pos={[0, 0, 0]} color={C.black} /></group>)}
      </group>
    </group>
  );
}

export function BarCounter({ pos, w = 3.6, rotY = 0 }: { pos: V3; w?: number; rotY?: number }) {
  const bottles = useMemo(() => { const r = rng(5), cols = ["#3E8A5A", "#C8553D", "#E0A030", "#3E6AA8", "#7A4EA8"]; return Array.from({ length: 12 }, (_, i) => ({ x: -w / 2 + 0.25 + i * ((w - 0.5) / 11), h: 0.26 + r() * 0.14, c: cols[Math.floor(r() * cols.length)] })); }, [w]);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w, 0.08, 0.8]} pos={[0, 1.08, 0]} color={C.walnut} />
      <TBox size={[w, 1.04, 0.6]} pos={[0, 0.52, -0.05]} tex={TEX.panel} tile={1.2} color="#4B5260" />
      <Neon size={[w - 0.2, 0.04, 0.03]} pos={[0, 0.2, 0.26]} color={C.neonPink} />
      <Neon size={[w - 0.2, 0.03, 0.03]} pos={[0, 1.0, 0.27]} color={C.neonCyan} />
      <Box size={[w, 1.2, 0.08]} pos={[0, 1.6, -1.3]} color="#2B2F3A" />
      {[1.25, 1.65, 2.05].map(y => <Box key={y} size={[w - 0.3, 0.04, 0.3]} pos={[0, y, -1.15]} color={C.woodDark} />)}
      {bottles.map((b, i) => <Cyl key={i} rt={0.034} rb={0.04} h={b.h} pos={[b.x, 1.27 + b.h / 2 + (i % 3) * 0.4, -1.15]} color={b.c} seg={8} cast={false} />)}
      <Box size={[0.5, 0.35, 0.4]} pos={[-w / 2 + 0.6, 1.3, -0.1]} color="#16181D" />
      {[0, 1, 2].map(i => <Cyl key={i} rt={0.015} rb={0.015} h={0.2} pos={[0.4 + i * 0.12, 1.24, 0.05]} color={C.steelLight} seg={6} />)}
    </group>
  );
}

export function Stool({ pos, color = "#C8553D", h = 0.75 }: { pos: V3; color?: string; h?: number }) {
  return (
    <group position={pos}>
      <Cyl rt={0.2} rb={0.2} h={0.1} pos={[0, h, 0]} color={color} seg={14} />
      <Cyl rt={0.03} rb={0.03} h={h} pos={[0, h / 2, 0]} color={C.steelMid} seg={6} />
      <Cyl rt={0.2} rb={0.2} h={0.03} pos={[0, 0.02, 0]} color={C.steelMid} seg={14} cast={false} />
      <Cyl rt={0.16} rb={0.16} h={0.02} pos={[0, h * 0.4, 0]} color={C.steelLight} seg={10} cast={false} />
    </group>
  );
}

/* A string of warm bulbs hanging between two points. */
export function StringLights({ a, b, count = 12, sag = 0.3 }: { a: V3; b: V3; count?: number; sag?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1), y = a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag;
        return <Ball key={i} r={0.045} pos={[a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t]} color="#FFF1CF" emissive="#FFC878" emissiveIntensity={1.6} cast={false} seg={6} />;
      })}
    </group>
  );
}

export function FloorLamp({ pos, color = "#FFD79A" }: { pos: V3; color?: string }) {
  return (
    <group position={pos}>
      <Cyl rt={0.18} rb={0.2} h={0.03} pos={[0, 0.015, 0]} color={C.black} seg={10} />
      <Cyl rt={0.014} rb={0.014} h={1.5} pos={[0, 0.78, 0]} color={C.steelMid} seg={6} />
      <Cone r={0.2} h={0.26} pos={[0, 1.6, 0]} rot={[Math.PI, 0, 0]} color={C.steel} seg={12} cast={false} />
      <Ball r={0.07} pos={[0, 1.5, 0]} color="#FFF1CF" emissive={color} emissiveIntensity={1.8} cast={false} seg={8} />
    </group>
  );
}
