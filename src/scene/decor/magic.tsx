import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D, type Group, type Mesh } from "three";
import { flameMat, spellMat } from "../materials";
import { C } from "../palette";
import { Ball, Box, Cone, Cyl, Glass, TBox } from "../parts";
import { rng } from "../rng";
import { TEX } from "../textures";
import { toonGradient } from "../toon";

type V3 = [number, number, number];

/* A small flame: a glowing teardrop. */
export function Flame({ pos, s = 1 }: { pos: V3; s?: number }) {
  return <mesh position={pos} scale={s} material={flameMat}><coneGeometry args={[0.045, 0.15, 6]} /></mesh>;
}

/* A wall torch on an iron bracket. Faces +z. */
export function Torch({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.12, 0.3, 0.05]} pos={[0, 0, 0]} color={C.iron} cast={false} />
      <Cyl rt={0.05} rb={0.035} h={0.4} pos={[0, 0.1, 0.18]} rot={[-0.35, 0, 0]} color="#4A3426" seg={6} cast={false} />
      <Cyl rt={0.075} rb={0.05} h={0.1} pos={[0, 0.3, 0.26]} color={C.iron} seg={8} cast={false} />
      <Flame pos={[0, 0.42, 0.26]} s={1.6} />
      <Ball r={0.05} pos={[0, 0.34, 0.26]} color="#FF7A2E" emissive="#FF7A2E" emissiveIntensity={2} cast={false} seg={6} />
    </group>
  );
}

/* A hanging house banner. Faces +z. */
export function Banner({ pos, rotY = 0, color, trim = C.gold, w = 0.9, h = 2.6 }: { pos: V3; rotY?: number; color: string; trim?: string; w?: number; h?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Cyl rt={0.03} rb={0.03} h={w + 0.3} pos={[0, h / 2, 0]} rot={[0, 0, Math.PI / 2]} color={C.iron} seg={6} cast={false} />
      <Box size={[w, h, 0.04]} pos={[0, 0, 0]} color={color} cast={false} />
      <Box size={[w + 0.06, 0.07, 0.05]} pos={[0, -h / 2 + 0.04, 0.005]} color={trim} cast={false} />
      <Box size={[w - 0.2, 0.05, 0.045]} pos={[0, h / 2 - 0.4, 0.01]} color={trim} cast={false} />
      <Box size={[0.3, 0.3, 0.05]} pos={[0, 0.2, 0.012]} rot={[0, 0, Math.PI / 4]} color={trim} cast={false} />
      {[-1, 0, 1].map(k => <Cone key={k} r={0.07} h={0.18} pos={[k * (w / 2 - 0.1), -h / 2 - 0.08, 0]} rot={[Math.PI, 0, 0]} color={trim} seg={4} cast={false} />)}
    </group>
  );
}

/* Candles that hang in the air and bob gently. They fill the ceiling of the big halls. */
export function FloatingCandles({ area, y = 3.0, count = 28, seed = 1 }: { area: [number, number, number, number]; y?: number; count?: number; seed?: number }) {
  const wax = useRef<InstancedMesh>(null), fl = useRef<InstancedMesh>(null), o = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ x: area[0] + r() * (area[1] - area[0]), z: area[2] + r() * (area[3] - area[2]), y: y + (r() - 0.5) * 0.9, ph: r() * 6.28, h: 0.2 + r() * 0.12 }));
  }, [area, y, count, seed]);
  useLayoutEffect(() => { if (wax.current) { const c = new Color("#F6EFD9"); items.forEach((_, i) => wax.current!.setColorAt(i, c)); } }, [items]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, w = wax.current, f = fl.current;
    if (!w || !f) return;
    items.forEach((it, i) => {
      const by = it.y + Math.sin(t * 0.8 + it.ph) * 0.08;
      o.position.set(it.x + Math.sin(t * 0.3 + it.ph) * 0.05, by, it.z); o.rotation.set(0, 0, 0); o.scale.set(1, it.h / 0.25, 1); o.updateMatrix(); w.setMatrixAt(i, o.matrix);
      o.position.y = by + it.h / 2 + 0.07; o.scale.setScalar(0.9 + Math.sin(t * 9 + it.ph * 3) * 0.12); o.updateMatrix(); f.setMatrixAt(i, o.matrix);
    });
    w.instanceMatrix.needsUpdate = true; f.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={wax} args={[undefined, undefined, count]} frustumCulled={false}><cylinderGeometry args={[0.032, 0.036, 0.25, 6]} /><meshToonMaterial gradientMap={toonGradient} emissive="#FFE9B0" emissiveIntensity={0.25} /></instancedMesh>
      <instancedMesh ref={fl} args={[undefined, undefined, count]} frustumCulled={false} material={flameMat}><coneGeometry args={[0.035, 0.12, 6]} /></instancedMesh>
    </group>
  );
}

/* An iron ring chandelier with candles, hanging from `pos`. */
export function Chandelier({ pos, r = 0.9, n = 8, drop = 0.9 }: { pos: V3; r?: number; n?: number; drop?: number }) {
  return (
    <group position={pos}>
      <Cyl rt={0.015} rb={0.015} h={drop} pos={[0, -drop / 2, 0]} color={C.iron} seg={4} cast={false} />
      <mesh position={[0, -drop, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.035, 6, 24]} /><meshToonMaterial color={C.iron} gradientMap={toonGradient} /></mesh>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * r, -drop, Math.sin(a) * r]}>
            <Cyl rt={0.03} rb={0.03} h={0.18} pos={[0, 0.1, 0]} color="#F6EFD9" seg={6} cast={false} />
            <Flame pos={[0, 0.27, 0]} />
          </group>
        );
      })}
    </group>
  );
}

/* A bubbling cauldron: black iron, glowing brew, bubbles that rise and pop. */
export function Cauldron({ pos, color = "#6CFF8A", r = 0.5 }: { pos: V3; color?: string; r?: number }) {
  const bubbles = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    bubbles.current?.children.forEach((b, i) => {
      const f = (t * 0.45 + i / 4) % 1;
      b.position.set(Math.sin(i * 2.1 + t * 0.4) * r * 0.45, f * 0.35, Math.cos(i * 2.1) * r * 0.45);
      b.scale.setScalar(0.4 + Math.sin(f * Math.PI) * 0.8);
    });
  });
  return (
    <group position={pos}>
      <Ball r={r} pos={[0, r * 0.95, 0]} scale={[1, 0.85, 1]} color="#1B1B22" seg={16} />
      <mesh position={[0, r * 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r * 0.78, 0.05, 6, 20]} /><meshToonMaterial color="#2A2A33" gradientMap={toonGradient} /></mesh>
      <mesh position={[0, r * 1.46, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[r * 0.76, 20]} /><meshBasicMaterial color={color} /></mesh>
      <group ref={bubbles} position={[0, r * 1.5, 0]}>{[0, 1, 2, 3].map(i => <Ball key={i} r={0.07} pos={[0, 0, 0]} color={color} emissive={color} emissiveIntensity={1.4} cast={false} seg={6} />)}</group>
      {[0, 2.1, 4.2].map(a => <Cyl key={a} rt={0.05} rb={0.04} h={0.3} pos={[Math.sin(a) * r * 0.7, 0.15, Math.cos(a) * r * 0.7]} color="#1B1B22" seg={6} />)}
      <Flame pos={[0.2, 0.1, 0.4]} s={1.8} /><Flame pos={[-0.25, 0.1, 0.3]} s={1.5} />
    </group>
  );
}

/* Shelves of glowing potion bottles, drawn as two instanced meshes. Faces +z. */
export function PotionShelf({ pos, rotY = 0, w = 2.2, h = 2.3, seed = 1 }: { pos: V3; rotY?: number; w?: number; h?: number; seed?: number }) {
  const levels = Math.floor(h / 0.55), ref = useRef<InstancedMesh>(null), cork = useRef<InstancedMesh>(null);
  const bottles = useMemo(() => {
    const r = rng(seed), cols = ["#6CFF8A", "#B07CFF", "#FF6FA8", "#5CD6FF", "#FFD05C", "#FF8A4C"], out: { x: number; y: number; s: number; c: string }[] = [];
    for (let l = 0; l < levels; l++) for (let x = -w / 2 + 0.18; x < w / 2 - 0.12; x += 0.2 + r() * 0.08) out.push({ x, y: 0.12 + l * 0.55, s: 0.8 + r() * 0.5, c: cols[Math.floor(r() * cols.length)] });
    return out;
  }, [levels, seed, w]);
  useLayoutEffect(() => {
    const m = ref.current, k = cork.current, o = new Object3D(), col = new Color();
    if (!m || !k) return;
    bottles.forEach((b, i) => {
      o.position.set(b.x, b.y + 0.12 * b.s, 0.03); o.scale.set(b.s, b.s, b.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(b.c));
      o.position.set(b.x, b.y + 0.27 * b.s, 0.03); o.updateMatrix(); k.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true; k.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [bottles]);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w, h, 0.05]} pos={[0, h / 2, -0.22]} color="#3A2A1E" />
      {[-1, 1].map(s => <Box key={s} size={[0.07, h, 0.5]} pos={[s * (w / 2), h / 2, 0]} color="#3A2A1E" />)}
      {Array.from({ length: levels + 1 }, (_, l) => <Box key={l} size={[w, 0.05, 0.5]} pos={[0, 0.03 + l * 0.55, 0]} color="#5C4331" />)}
      <instancedMesh ref={ref} args={[undefined, undefined, bottles.length]}><sphereGeometry args={[0.075, 8, 8]} /><meshToonMaterial gradientMap={toonGradient} emissive="#FFFFFF" emissiveIntensity={0.18} /></instancedMesh>
      <instancedMesh ref={cork} args={[undefined, undefined, bottles.length]}><cylinderGeometry args={[0.025, 0.03, 0.1, 6]} /><meshToonMaterial color="#8A6A4A" gradientMap={toonGradient} /></instancedMesh>
    </group>
  );
}

/* A stone fireplace with a living fire. Faces +z. */
export function Fireplace({ pos, rotY = 0, w = 2.6, h = 2.2 }: { pos: V3; rotY?: number; w?: number; h?: number }) {
  const fire = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fire.current?.children.forEach((c, i) => { c.scale.set(1, 0.8 + Math.sin(t * 7 + i * 2) * 0.3, 1); c.rotation.z = Math.sin(t * 5 + i) * 0.12; });
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <TBox size={[w, h, 0.7]} pos={[0, h / 2, 0]} tex={TEX.stone} tile={1.2} />
      <Box size={[w - 1.0, h - 0.9, 0.5]} pos={[0, (h - 0.9) / 2 + 0.05, 0.12]} color="#17110F" cast={false} />
      <Box size={[w + 0.3, 0.14, 0.9]} pos={[0, h + 0.07, 0.05]} color={C.stoneLight} />
      <Cyl rt={0.08} rb={0.08} h={0.9} pos={[0, 0.12, 0.2]} rot={[0, 0, Math.PI / 2]} color="#4A3426" seg={6} />
      <group ref={fire} position={[0, 0.2, 0.2]}>
        {[-0.3, 0, 0.3].map((x, i) => <mesh key={i} position={[x, 0.3, 0]} material={flameMat}><coneGeometry args={[0.22, 0.75 - Math.abs(x) * 0.5, 7]} /></mesh>)}
      </group>
      <Ball r={0.3} pos={[0, 0.3, 0.3]} color="#FF7A2E" emissive="#FF5A10" emissiveIntensity={1.6} cast={false} scale={[2.2, 0.5, 0.8]} seg={8} />
    </group>
  );
}

/* A slowly turning brass orrery: sun, rings and planets. */
export function Orrery({ pos, scale = 1 }: { pos: V3; scale?: number }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => { g.current?.children.forEach((c, i) => { c.rotation.y = clock.elapsedTime * (0.6 - i * 0.12); }); });
  return (
    <group position={pos} scale={scale}>
      <Cyl rt={0.35} rb={0.45} h={0.12} pos={[0, 0.06, 0]} color="#5C4331" seg={12} />
      <Cyl rt={0.05} rb={0.05} h={1.0} pos={[0, 0.6, 0]} color={C.gold} seg={8} />
      <group position={[0, 1.15, 0]}>
        <Ball r={0.14} pos={[0, 0, 0]} color="#FFD05C" emissive="#FFB000" emissiveIntensity={1.6} cast={false} seg={10} />
        <group ref={g}>
          {[0.4, 0.7, 1.0].map((r, i) => (
            <group key={i}>
              <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.012, 6, 32]} /><meshToonMaterial color={C.gold} gradientMap={toonGradient} /></mesh>
              <Ball r={0.06 + i * 0.015} pos={[r, 0, 0]} color={["#5CD6FF", "#FF8A4C", "#9C8CFF"][i]} emissive={["#5CD6FF", "#FF8A4C", "#9C8CFF"][i]} emissiveIntensity={0.7} cast={false} seg={8} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/* Four tall hourglasses counting house points. */
export function HousePoints({ pos }: { pos: V3 }) {
  const cols = [C.crimson, "#E3B341", C.sapphire, C.emerald], fills = [0.8, 0.55, 0.65, 0.9];
  return (
    <group position={pos}>
      <Box size={[4.0, 0.16, 0.8]} pos={[0, 0.08, 0]} color="#3A2A1E" />
      {cols.map((c, i) => (
        <group key={i} position={[-1.5 + i, 0, 0]}>
          <Cyl rt={0.3} rb={0.3} h={0.08} pos={[0, 0.2, 0]} color={C.gold} seg={12} />
          <Cyl rt={0.3} rb={0.3} h={0.08} pos={[0, 1.9, 0]} color={C.gold} seg={12} />
          <Glass size={[0.5, 1.6, 0.5]} pos={[0, 1.05, 0]} tint="#DDEBFF" opacity={0.22} />
          <Cyl rt={0.2} rb={0.2} h={1.5 * fills[i]} pos={[0, 0.24 + (1.5 * fills[i]) / 2, 0]} color={c} emissive={c} emissiveIntensity={0.5} seg={8} cast={false} />
        </group>
      ))}
    </group>
  );
}

/* A carved high-backed chair. Its owner sits facing +z. */
export function WizardChair({ main = "#5C3B26", accent = C.gold }: { main?: string; accent?: string }) {
  return (
    <group>
      <Box size={[0.52, 0.08, 0.5]} pos={[0, 0.43, 0]} color={main} />
      <Box size={[0.46, 0.04, 0.44]} pos={[0, 0.49, 0]} color={C.crimson} cast={false} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Box key={i} size={[0.06, 0.42, 0.06]} pos={[a * 0.23, 0.21, b * 0.21]} color={main} cast={false} />)}
      <Box size={[0.52, 1.0, 0.07]} pos={[0, 0.95, -0.25]} color={main} />
      <Box size={[0.4, 0.5, 0.03]} pos={[0, 0.85, -0.21]} color={C.crimson} cast={false} />
      <Cone r={0.2} h={0.3} pos={[0, 1.6, -0.25]} color={main} seg={4} />
      <Ball r={0.04} pos={[0, 1.78, -0.25]} color={accent} cast={false} seg={6} />
      {[-1, 1].map(s => <Box key={s} size={[0.06, 0.05, 0.4]} pos={[s * 0.27, 0.68, 0]} color={main} cast={false} />)}
    </group>
  );
}

/* A reading lectern with a glowing open book. Faces +z. */
export function Lectern({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Cyl rt={0.28} rb={0.3} h={0.1} pos={[0, 0.05, 0]} color="#3A2A1E" seg={8} />
      <Cyl rt={0.07} rb={0.09} h={0.95} pos={[0, 0.55, 0]} color="#5C4331" seg={8} />
      <Box size={[0.7, 0.05, 0.5]} pos={[0, 1.05, 0]} rot={[-0.45, 0, 0]} color="#5C4331" />
      <Box size={[0.58, 0.04, 0.36]} pos={[0, 1.1, 0.02]} rot={[-0.45, 0, 0]} color="#F4EAD2" emissive="#FFE9B0" emissiveIntensity={0.5} cast={false} />
      <Ball r={0.05} pos={[0, 1.35, 0.1]} color="#B7A6FF" emissive="#B7A6FF" emissiveIntensity={1.6} cast={false} seg={6} />
    </group>
  );
}

/* A stone basin full of swirling silver memories. */
export function Pensieve({ pos }: { pos: V3 }) {
  const swirl = useRef<Mesh>(null);
  useFrame(({ clock }) => { if (swirl.current) { swirl.current.rotation.z = clock.elapsedTime * 0.8; swirl.current.position.y = 1.02 + Math.sin(clock.elapsedTime * 1.5) * 0.015; } });
  return (
    <group position={pos}>
      <Cyl rt={0.15} rb={0.28} h={0.8} pos={[0, 0.4, 0]} color={C.stoneDark} seg={10} />
      <Cyl rt={0.5} rb={0.34} h={0.22} pos={[0, 0.9, 0]} color={C.stoneLight} seg={14} />
      <mesh ref={swirl} position={[0, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.44, 5]} /><meshBasicMaterial color="#CFE3FF" /></mesh>
      <mesh position={[0, 1.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={spellMat}><ringGeometry args={[0.18, 0.3, 20]} /></mesh>
    </group>
  );
}

/* A perch with a sleepy owl. */
export function OwlPerch({ pos, color = "#8A6A4A" }: { pos: V3; color?: string }) {
  return (
    <group position={pos}>
      <Cyl rt={0.04} rb={0.06} h={1.3} pos={[0, 0.65, 0]} color="#5C4331" seg={6} />
      <Cyl rt={0.3} rb={0.3} h={0.04} pos={[0, 0.02, 0]} color="#3A2A1E" seg={10} cast={false} />
      <Box size={[0.5, 0.05, 0.05]} pos={[0, 1.28, 0]} color="#5C4331" cast={false} />
      <Ball r={0.13} pos={[0, 1.46, 0]} scale={[1, 1.2, 0.9]} color={color} seg={10} />
      <Ball r={0.1} pos={[0, 1.66, 0]} color={color} seg={10} />
      <Ball r={0.09} pos={[0, 1.44, 0.07]} scale={[1, 1.2, 0.5]} color="#F4EAD2" cast={false} seg={8} />
    </group>
  );
}

/* A wizard chess table: a big board with carved pieces. Players stand at both ends and lean over it. */
export function ChessTable({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  const pieces = useMemo(() => {
    const out: { x: number; z: number; h: number; white: boolean }[] = [];
    for (let i = 0; i < 8; i++) for (const [row, white, h] of [[0, true, 0.2], [1, true, 0.14], [6, false, 0.14], [7, false, 0.2]] as const) out.push({ x: (row - 3.5) * 0.33, z: (i - 3.5) * 0.15, h, white });
    return out;
  }, []);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[3.0, 0.1, 1.6]} pos={[0, 0.85, 0]} color="#3A2A1E" />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Box key={i} size={[0.2, 0.8, 0.2]} pos={[a * 1.3, 0.4, b * 0.65]} color="#3A2A1E" />)}
      {Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => (
        <Box key={i + "," + j} size={[0.33, 0.02, 0.17]} pos={[(i - 3.5) * 0.33, 0.915, (j - 3.5) * 0.17]} color={(i + j) % 2 ? "#E8DCC0" : "#3B2A22"} cast={false} />
      )))}
      {pieces.map((p, i) => <Cyl key={i} rt={0.045} rb={0.06} h={p.h} pos={[p.x, 0.93 + p.h / 2, p.z]} color={p.white ? "#F2E9D0" : "#2A1F24"} seg={6} cast={false} />)}
    </group>
  );
}

/* A pedestal table where playing cards go off in puffs of sparks (Exploding Snap). */
export function SnapTable({ pos, rotY = 0, color = "#FF8A4C" }: { pos: V3; rotY?: number; color?: string }) {
  const cards = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    cards.current?.children.forEach((c, i) => {
      const f = (t * 0.7 + i / 5) % 1;
      c.position.set(Math.sin(i * 1.7 + t) * 0.18, 1.0 + f * 0.5, Math.cos(i * 1.7 + t) * 0.12);
      c.rotation.set(f * 5, f * 7, 0); c.scale.setScalar(Math.max(0.01, 1 - f * f));
    });
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Cyl rt={0.4} rb={0.5} h={0.08} pos={[0, 0.04, 0]} color="#3A2A1E" seg={10} />
      <Cyl rt={0.12} rb={0.16} h={0.8} pos={[0, 0.45, 0]} color="#5C4331" seg={8} />
      <Cyl rt={0.5} rb={0.5} h={0.08} pos={[0, 0.88, 0]} color="#3A2A1E" seg={12} />
      <Cyl rt={0.44} rb={0.44} h={0.02} pos={[0, 0.93, 0]} color={C.emerald} seg={12} cast={false} />
      <group ref={cards}>{[0, 1, 2, 3, 4].map(i => <Box key={i} size={[0.16, 0.22, 0.01]} pos={[0, 1, 0]} color={i % 2 ? "#F4EAD2" : color} emissive={color} emissiveIntensity={0.9} cast={false} />)}</group>
    </group>
  );
}

/* A practice broom on a saddle stand. The rider sits at the origin facing -z. */
export function BroomMount({ pos, rotY = 0, color = "#8E1F2E" }: { pos: V3; rotY?: number; color?: string }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.9, 0.08, 1.9]} pos={[0, 0.04, 0]} color="#3A2A1E" />
      <Box size={[0.34, 0.14, 0.5]} pos={[0, 0.36, 0]} color={color} />
      <Box size={[0.1, 0.3, 0.1]} pos={[0, 0.22, 0]} color="#5C4331" />
      {/* the broom: a long handle rising to the front, a bundle of twigs behind */}
      <Cyl rt={0.025} rb={0.03} h={1.9} pos={[0, 0.52, -0.15]} rot={[Math.PI / 2 + 0.5, 0, 0]} color="#6B4A2E" seg={6} />
      <Cone r={0.16} h={0.6} pos={[0, 0.16, 0.86]} rot={[-Math.PI / 2 + 0.5, 0, 0]} color="#B08A4A" seg={8} cast={false} />
      <Box size={[0.08, 0.1, 0.5]} pos={[0, 0.24, -0.5]} color="#5C4331" cast={false} />
      <Box size={[0.08, 0.1, 0.5]} pos={[0, 0.24, 0.5]} color="#5C4331" cast={false} />
    </group>
  );
}

/* A bar for butterbeer: barrels, a counter and frothy mugs. Faces +z. */
export function ButterbeerBar({ pos, w = 3.4, rotY = 0 }: { pos: V3; w?: number; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w, 0.08, 0.8]} pos={[0, 1.08, 0]} color="#3A2A1E" />
      <TBox size={[w, 1.04, 0.6]} pos={[0, 0.52, -0.05]} tex={TEX.stone} tile={1.2} color="#8A7A66" />
      {Array.from({ length: 5 }, (_, i) => <Cyl key={i} rt={0.17} rb={0.17} h={0.28} pos={[-w / 2 + 0.4 + i * 0.4, 1.26, 0.05]} color="#E7C46A" seg={10} cast={false} />)}
      {Array.from({ length: 5 }, (_, i) => <Ball key={i} r={0.15} pos={[-w / 2 + 0.4 + i * 0.4, 1.42, 0.05]} color="#FFF4D0" cast={false} seg={8} />)}
      <Box size={[w, 1.2, 0.08]} pos={[0, 1.6, -1.3]} color="#3A2A1E" />
      {[1.25, 1.65, 2.05].map(y => <Box key={y} size={[w - 0.3, 0.04, 0.3]} pos={[0, y, -1.15]} color="#5C4331" />)}
      {Array.from({ length: 12 }, (_, i) => <Cyl key={i} rt={0.034} rb={0.04} h={0.3} pos={[-w / 2 + 0.25 + i * ((w - 0.5) / 11), 1.45 + (i % 3) * 0.4, -1.15]} color={["#E7C46A", "#6CFF8A", "#B07CFF", "#FF8A4C"][i % 4]} seg={8} cast={false} />)}
      <group position={[w / 2 - 0.5, 0, -1.1]}>
        {[0, 1].map(i => <Cyl key={i} rt={0.3} rb={0.3} h={0.7} pos={[i * 0.62 - 0.3, 0.35, 0]} color="#6B4A2E" seg={12} />)}
      </group>
    </group>
  );
}

/* A wooden stool. */
export function WoodStool({ pos, h = 0.75 }: { pos: V3; h?: number }) {
  return (
    <group position={pos}>
      <Cyl rt={0.2} rb={0.2} h={0.08} pos={[0, h, 0]} color="#5C3B26" seg={12} />
      {[0, 1, 2].map(i => <Cyl key={i} rt={0.025} rb={0.03} h={h} pos={[Math.sin(i * 2.09) * 0.13, h / 2, Math.cos(i * 2.09) * 0.13]} color="#3A2A1E" seg={5} cast={false} />)}
    </group>
  );
}

/* A sorting hat on a three-legged stool. */
export function SortingHat({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <WoodStool pos={[0, 0, 0]} h={0.9} />
      <Cyl rt={0.3} rb={0.3} h={0.03} pos={[0, 1.0, 0]} color="#6B4A2E" seg={14} cast={false} />
      <Cone r={0.2} h={0.55} pos={[0.02, 1.3, 0]} rot={[0, 0, -0.25]} color="#6B4A2E" seg={10} />
      <Ball r={0.02} pos={[-0.04, 1.12, 0.19]} color="#16110C" cast={false} seg={4} />
    </group>
  );
}

/* A suit of armor on guard. Faces +z. */
export function Armor({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.5, 0.12, 0.5]} pos={[0, 0.06, 0]} color="#3A2A1E" />
      {[-1, 1].map(s => <Box key={s} size={[0.14, 0.8, 0.16]} pos={[s * 0.1, 0.5, 0]} color="#9AA3B2" />)}
      <Box size={[0.46, 0.55, 0.28]} pos={[0, 1.15, 0]} color="#B4BCC9" />
      {[-1, 1].map(s => <Box key={s} size={[0.12, 0.55, 0.14]} pos={[s * 0.3, 1.1, 0]} color="#9AA3B2" />)}
      <Ball r={0.17} pos={[0, 1.62, 0]} color="#B4BCC9" seg={10} />
      <Box size={[0.2, 0.04, 0.05]} pos={[0, 1.63, 0.16]} color="#16110C" cast={false} />
      <Cone r={0.05} h={0.16} pos={[0, 1.86, 0]} color={C.crimson} seg={6} cast={false} />
      <Cyl rt={0.02} rb={0.02} h={1.9} pos={[0.38, 1.0, 0.08]} color="#6B4A2E" seg={5} />
      <Cone r={0.07} h={0.22} pos={[0.38, 2.05, 0.08]} color="#B4BCC9" seg={4} cast={false} />
    </group>
  );
}

/* A glowing crystal ball on a stand. */
export function CrystalBall({ pos, color = "#B7A6FF" }: { pos: V3; color?: string }) {
  return (
    <group position={pos}>
      <Cyl rt={0.07} rb={0.1} h={0.08} pos={[0, 0.04, 0]} color={C.gold} seg={8} cast={false} />
      <Ball r={0.11} pos={[0, 0.17, 0]} color={color} emissive={color} emissiveIntensity={1.2} cast={false} seg={12} />
    </group>
  );
}

/* A pile of ancient trunks. */
export function Trunks({ pos, rotY = 0 }: { pos: V3; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[1.0, 0.5, 0.6]} pos={[0, 0.25, 0]} color="#5C3B26" />
      <Box size={[1.02, 0.08, 0.62]} pos={[0, 0.54, 0]} color="#47301F" cast={false} />
      <Box size={[0.9, 0.4, 0.55]} pos={[0.05, 0.75, 0]} rot={[0, 0.2, 0]} color="#7A4A2C" />
      {[-0.35, 0.35].map(x => <Box key={x} size={[0.06, 0.52, 0.63]} pos={[x, 0.26, 0]} color={C.gold} cast={false} />)}
    </group>
  );
}

/* A long refectory table with benches along both sides, for the dining halls. */
export function LongTable({ pos, len = 6, rotY = 0 }: { pos: V3; len?: number; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[len, 0.09, 1.0]} pos={[0, 0.78, 0]} color="#6B4A2E" />
      <Box size={[len - 0.4, 0.06, 0.12]} pos={[0, 0.3, 0]} color="#3A2A1E" cast={false} />
      {[-1, 1].map(s => <Box key={s} size={[0.14, 0.76, 0.9]} pos={[s * (len / 2 - 0.4), 0.38, 0]} color="#3A2A1E" />)}
      {[-1, 1].map(s => <Box key={s} size={[len - 0.3, 0.07, 0.34]} pos={[0, 0.47, s * 0.72]} color="#5C3B26" />)}
    </group>
  );
}
