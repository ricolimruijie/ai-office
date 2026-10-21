import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import type { Layout } from "../../shared/layout";
import { Torch } from "./decor/magic";
import { C } from "./palette";
import { Ball, Box, Cone, Cyl, TBox } from "./parts";
import { rng } from "./rng";
import { TEX } from "./textures";

function Smoke({ x, z, h }: { x: number; z: number; h: number }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((c, i) => {
      const f = ((clock.elapsedTime * 0.12 + i / 5) % 1);
      c.position.set(Math.sin(f * 5 + i) * 0.5 + f * 2.5, f * 7, 0);
      c.scale.setScalar(0.5 + f * 1.6);
    });
  });
  return <group ref={g} position={[x, h, z]}>{Array.from({ length: 5 }, (_, i) => <Ball key={i} r={0.45} pos={[0, 0, 0]} color="#C9CDD4" cast={false} seg={8} />)}</group>;
}

function Pine({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <Cyl rt={0.18} rb={0.26} h={1.6} pos={[0, 0.8, 0]} color="#4A3426" seg={6} />
      {[0, 1, 2, 3].map(i => <Cone key={i} r={1.9 - i * 0.38} h={2.2} pos={[0, 2.0 + i * 1.3, 0]} color={i % 2 ? "#1F4D33" : "#2A5E3D"} seg={8} />)}
    </group>
  );
}

/* A round hut with a thatched roof and a smoking chimney. */
function Hut({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cyl rt={2.1} rb={2.2} h={2.1} pos={[0, 1.05, 0]} color="#8A7A66" seg={14} />
      <Cone r={2.9} h={2.4} pos={[0, 3.3, 0]} color="#8A6A3A" seg={14} />
      <Box size={[0.9, 1.5, 0.12]} pos={[0, 0.75, 2.12]} color="#5C3B26" />
      <Box size={[0.7, 0.7, 0.06]} pos={[1.2, 1.3, 1.78]} rot={[0, 0.6, 0]} color="#FFD98A" emissive="#FFB347" emissiveIntensity={0.9} cast={false} />
      <Cyl rt={0.28} rb={0.32} h={1.4} pos={[0.9, 4.1, -0.5]} color={C.stoneDark} seg={8} />
      <Smoke x={0.9} z={-0.5} h={4.9} />
    </group>
  );
}

/* A Quidditch pitch edge: three golden hoops on poles. */
function Hoops({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[[-3.2, 7], [0, 9], [3.2, 7]].map(([dx, h], i) => (
        <group key={i} position={[dx, 0, 0]}>
          <Cyl rt={0.08} rb={0.1} h={h} pos={[0, h / 2, 0]} color="#B58A2E" seg={6} />
          <mesh position={[0, h + 0.9, 0]}><torusGeometry args={[0.9, 0.07, 6, 20]} /><meshToonMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.4} /></mesh>
        </group>
      ))}
    </group>
  );
}

/* A weeping willow with a thick twisting trunk. */
function Willow({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <Cyl rt={0.5} rb={0.9} h={3.4} pos={[0, 1.7, 0]} color="#4A3426" seg={8} />
      <Ball r={2.6} pos={[0, 4.6, 0]} scale={[1, 0.8, 1]} color="#3F7A4A" seg={10} />
      {[0, 1, 2, 3, 4, 5, 6].map(i => {
        const a = (i / 7) * Math.PI * 2;
        return <Cone key={i} r={0.45} h={3.4} pos={[Math.sin(a) * 2.4, 2.9, Math.cos(a) * 2.4]} rot={[Math.PI, 0, 0]} color="#4E8A55" seg={5} />;
      })}
    </group>
  );
}

/* Wooden Quidditch stands: three tiers of seats between tall posts. */
function Stand({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {[0, 1, 2].map(i => <Box key={i} size={[9, 0.3, 2.0]} pos={[0, 1.4 + i * 1.2, -i * 1.2]} color={i % 2 ? "#6B4A2E" : "#8A5A3A"} />)}
      {[-4.4, 4.4].map(px => <Cyl key={px} rt={0.2} rb={0.25} h={8} pos={[px, 4, -2.4]} color="#4A3426" seg={6} />)}
      {[-3, 0, 3].map((px, i) => <Box key={px} size={[0.05, 1.8, 0.9]} pos={[px, 5.5, -2.6]} color={[C.crimson, "#E3B341", C.sapphire][i]} cast={false} />)}
    </group>
  );
}

/* The grounds: lawns, a gravel approach to the gate, a stone bridge over the black lake, a dark forest behind the castle,
   a gamekeeper's hut, a Quidditch pitch, a willow and far mountains. */
export function Environment({ layout }: { layout: Layout }) {
  const b = layout.bounds, s = layout.site;
  const cx = (b.minX + b.maxX) / 2;
  const hall = layout.rooms.find(r => r.theme === "meeting");
  const hx = hall ? (hall.minX + hall.maxX) / 2 : cx;
  const lake = useRef<Mesh>(null);
  useFrame(({ clock }) => { if (lake.current) lake.current.position.y = -0.1 + Math.sin(clock.elapsedTime * 0.7) * 0.015; });

  const mountains = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 18 }, (_, i) => ({ x: -280 + i * 34 + r() * 14, h: 55 + r() * 80, w: 30 + r() * 26, z: -150 - r() * 40 }));
  }, []);
  const forest = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: 110 }, () => {
      const side = r();
      const x = side < 0.3 ? s.minX - 8 - r() * 60 : side < 0.6 ? s.maxX + 8 + r() * 60 : s.minX - 20 + r() * (s.maxX - s.minX + 40);
      const z = side < 0.6 ? -60 + r() * 70 : -(32 + r() * 60);
      return { x, z, s: 0.8 + r() * 1.0 };
    }).filter(t => !(t.x > s.minX - 5 && t.x < s.maxX + 5 && t.z > s.minZ - 7));
  }, [s.minX, s.maxX, s.minZ]);
  const pumpkins = useMemo(() => { const r = rng(4); return Array.from({ length: 9 }, () => ({ x: r() * 7, z: r() * 5, s: 0.35 + r() * 0.3 })); }, []);

  return (
    <group>
      <TBox size={[900, 0.2, 900]} pos={[cx, -0.16, -60]} tex={TEX.grass} tile={14} color="#9FC48A" cast={false} />
      {/* gravel approach from the forecourt, then the bridge over the lake */}
      <Box size={[s.maxX - s.minX + 12, 0.1, 6]} pos={[(s.minX + s.maxX) / 2, -0.04, s.maxZ + 9]} color="#B7AA94" cast={false} />
      <Box size={[6, 0.1, 18]} pos={[hx, -0.05, s.maxZ + 18]} color="#B7AA94" cast={false} />
      <mesh ref={lake} position={[hx, -0.1, s.maxZ + 70]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.4, 1, 1]}>
        <circleGeometry args={[46, 48]} /><meshToonMaterial color="#2F5E96" transparent opacity={0.93} />
      </mesh>
      <group position={[hx, 0, s.maxZ + 32]}>
        <Box size={[4, 0.4, 52]} pos={[0, 0.2, 14]} color={C.stoneLight} />
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} position={[0, 0, 2 + i * 5.6]}>
            {[-1, 1].map(sd => <Box key={sd} size={[0.3, 1.0, 0.7]} pos={[sd * 1.85, 0.9, 0]} color={C.stone} />)}
            {i % 2 === 0 && [-1, 1].map(sd => <Torch key={"t" + sd} pos={[sd * 1.85, 1.3, 0.4]} rotY={sd < 0 ? Math.PI / 2 : -Math.PI / 2} />)}
          </group>
        ))}
        {[-1, 1].map(sd => <Box key={"r" + sd} size={[0.2, 0.2, 52]} pos={[sd * 1.85, 1.45, 14]} color={C.stoneLight} cast={false} />)}
      </group>
      {forest.map((t, i) => <Pine key={i} x={t.x} z={t.z} s={t.s} />)}
      <Willow x={s.minX - 9} z={s.maxZ + 6} s={1.3} />
      <Hut x={s.minX - 34} z={s.maxZ - 4} />
      {pumpkins.map((p, i) => <Ball key={i} r={p.s} pos={[s.minX - 29 + p.x, p.s * 0.8, s.maxZ - 7 + p.z]} scale={[1, 0.8, 1]} color="#E8761E" seg={8} />)}
      {/* the Quidditch pitch with its hoops and stands, to the east */}
      <Box size={[44, 0.06, 70]} pos={[s.maxX + 44, -0.07, -10]} color="#5E9A55" cast={false} />
      <Hoops x={s.maxX + 44} z={-38} />
      <Hoops x={s.maxX + 44} z={18} />
      <Stand x={s.maxX + 20} z={-10} rotY={Math.PI / 2} />
      <Stand x={s.maxX + 68} z={-10} rotY={-Math.PI / 2} />
      {/* distant mountains */}
      {mountains.map((m, i) => <Cone key={i} r={m.w} h={m.h} pos={[m.x, m.h / 2, m.z]} color={i % 3 ? "#58627A" : "#6A7590"} seg={6} cast={false} />)}
      {mountains.map((m, i) => <Cone key={"s" + i} r={m.w * 0.32} h={m.h * 0.28} pos={[m.x, m.h * 0.86, m.z]} color="#EEF3FA" seg={6} cast={false} />)}
    </group>
  );
}
