import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { Layout } from "../../shared/layout";
import { windowMat } from "./materials";
import { C } from "./palette";
import { Ball, Box, Cyl, TBox } from "./parts";
import { rng } from "./rng";
import { TEX } from "./textures";

function Container({ x, z, y = 0, rotY = 0, color }: { x: number; z: number; y?: number; rotY?: number; color: string }) {
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <TBox size={[6, 2.6, 2.4]} pos={[0, 1.3, 0]} tex={TEX.corrugated} tile={1.5} color={color} />
      <Box size={[6.1, 0.12, 2.5]} pos={[0, 2.62, 0]} color={C.steel} />
      <Box size={[6.1, 0.12, 2.5]} pos={[0, 0.06, 0]} color={C.steel} />
      <Box size={[0.08, 2.4, 2.3]} pos={[3.02, 1.3, 0]} color={C.steelLight} />
    </group>
  );
}

function Smoke({ x, z, h }: { x: number; z: number; h: number }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((c, i) => {
      const f = ((clock.elapsedTime * 0.12 + i / 6) % 1);
      c.position.set(Math.sin(f * 5 + i) * 1.2 + f * 6, f * 22, 0);
      c.scale.setScalar(1 + f * 3.2);
    });
  });
  return <group ref={g} position={[x, h, z]}>{Array.from({ length: 6 }, (_, i) => <Ball key={i} r={1.1} pos={[0, 0, 0]} color="#C9CDD4" cast={false} seg={8} />)}</group>;
}

/* The yard around the building: asphalt, a concrete apron, shipping containers, a chimney, silos, street lamps and a distant skyline. */
export function Environment({ layout }: { layout: Layout }) {
  const b = layout.bounds;
  const cx = (b.minX + b.maxX) / 2;
  const skyline = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 22 }, (_, i) => ({ x: -190 + i * 17 + r() * 8, h: 14 + r() * 40, w: 9 + r() * 8, z: -170 - r() * 18 }));
  }, []);
  const trees = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: 26 }, (_, i) => {
      const side = i % 3;
      const x = side === 0 ? b.minX - 8 - r() * 22 : side === 1 ? b.maxX + 8 + r() * 22 : b.minX + r() * (b.maxX - b.minX);
      return { x, z: side === 2 ? -(26 + r() * 14) : -32 + r() * 52, s: 0.9 + r() * 0.8 };
    });
  }, [b.minX, b.maxX]);
  const lines = useMemo(() => Array.from({ length: 12 }, (_, i) => b.minX + 3 + i * 4.2), [b.minX]);

  return (
    <group>
      <Box size={[520, 0.2, 520]} pos={[cx, -0.16, -40]} color={C.grass} cast={false} />
      {/* asphalt yard in front and a service road behind */}
      <Box size={[b.maxX - b.minX + 40, 0.1, 22]} pos={[cx, -0.08, b.maxZ + 6]} color={C.asphalt} cast={false} />
      <Box size={[b.maxX - b.minX + 40, 0.1, 8]} pos={[cx, -0.08, (b.minZ) - 14]} color={C.asphalt} cast={false} />
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <Cyl rt={0.14} rb={0.2} h={1.6} pos={[0, 0.8, 0]} color="#5A4132" seg={7} />
          <Ball r={1.1} pos={[0, 2.3, 0]} color={i % 2 ? "#3F7A4A" : "#4E8A55"} seg={10} />
          <Ball r={0.8} pos={[0.5, 3.0, 0.2]} color={i % 2 ? "#4E8A55" : "#5A9A60"} seg={9} />
        </group>
      ))}
      <TBox size={[b.maxX - b.minX + 6, 0.12, b.maxZ - b.minZ + 4]} pos={[cx, -0.05, (b.minZ + b.maxZ) / 2]} tex={TEX.concrete} tile={4} color="#8C9097" cast={false} />
      {/* parking bays in front */}
      {lines.map(x => <Box key={x} size={[0.15, 0.02, 3.4]} pos={[x, 0.0, b.maxZ - 1.8]} color="#E9E6D6" cast={false} />)}
      <Box size={[b.maxX - b.minX - 2, 0.02, 0.15]} pos={[cx, 0.0, b.maxZ - 3.6]} color="#E9E6D6" cast={false} />
      {/* behind and beside */}
      <Container x={-26} z={-30} color="#3E6AA8" />
      <Container x={-26} z={-30} y={2.62} rotY={0.12} color="#C8553D" />
      <Container x={-18} z={-31} color="#E0A030" />
      <Container x={26} z={-32} color="#3E8A5A" rotY={1.57} />
      <Container x={-40} z={-8} color="#7A4EA8" rotY={1.57} />
      <Container x={-40} z={-14} color="#C8553D" rotY={1.57} />
      {/* chimney with smoke */}
      <Cyl rt={1.3} rb={2.0} h={34} pos={[-34, 17, -42]} color={C.brick} seg={16} />
      {[7, 14, 21, 28].map(y => <Cyl key={y} rt={1.55 - y * 0.02} rb={1.62 - y * 0.02} h={1.2} pos={[-34, y, -42]} color={y % 14 ? "#E8E4DA" : C.brickDark} seg={16} cast={false} />)}
      <Smoke x={-34} z={-42} h={34} />
      {/* silos */}
      {[0, 1, 2].map(i => <Cyl key={i} rt={3} rb={3} h={14 + i * 2} pos={[34 + i * 7, 7 + i, -40]} color={C.steelLight} seg={20} />)}
      {[0, 1, 2].map(i => <Ball key={i} r={3} pos={[34 + i * 7, 14 + i * 2, -40]} scale={[1, 0.5, 1]} color={C.steelMid} seg={16} />)}
      {/* street lamps */}
      {[-24, -8, 8, 24, 40].map(x => (
        <group key={x} position={[x, 0, b.maxZ + 3.2]}>
          <Cyl rt={0.07} rb={0.09} h={6} pos={[0, 3, 0]} color={C.steel} seg={8} />
          <Box size={[1.1, 0.12, 0.3]} pos={[0.5, 6.05, 0]} color={C.steel} />
          <mesh position={[1.0, 5.95, 0]} material={windowMat}><boxGeometry args={[0.5, 0.08, 0.26]} /></mesh>
        </group>
      ))}
      {/* pallets and barrels by the entrance */}
      {[0, 1, 2].map(i => <Cyl key={i} rt={0.35} rb={0.35} h={0.95} pos={[layout.lobby.minX - 2.4 + i * 0.8, 0.48, b.maxZ + 1.2]} color={["#C8553D", "#3E6AA8", "#E0A030"][i]} seg={12} />)}
      {/* distant skyline */}
      {skyline.map((s, i) => <Box key={i} size={[s.w, s.h, 8]} pos={[s.x, s.h / 2, s.z]} color={i % 3 ? "#4A5568" : "#3A4252"} cast={false} />)}
      {skyline.map((s, i) => (
        <mesh key={"w" + i} position={[s.x, s.h * 0.6, s.z + 4.1]} material={windowMat}><boxGeometry args={[s.w * 0.7, s.h * 0.5, 0.1]} /></mesh>
      ))}
    </group>
  );
}
