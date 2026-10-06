import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D, type Group } from "three";
import type { DeskStyle } from "../../../shared/agents";
import { C } from "../palette";
import { Ball, Box, Cyl, Glass } from "../parts";
import { toonGradient } from "../toon";
import { keyColor, RGB } from "./rgb";

type V3 = [number, number, number];

/* A bar of animated RGB light. */
export function Glow({ size, pos, style, which = "a", rot }: { size: V3; pos: V3; style: DeskStyle; which?: "a" | "b" | "c"; rot?: V3 }) {
  return <mesh position={pos} rotation={rot} material={RGB[style][which]}><boxGeometry args={size} /></mesh>;
}

/* A monitor facing -z, toward the person sitting behind the desk. The back is matte plastic with an RGB ring. */
export function Monitor({ pos, w = 0.62, h = 0.36, rotY = 0, tilt = 0, style, curve = 0.0, vertical = false, screen = "#1E3A66", bars = "#6FB6FF" }: {
  pos: V3; w?: number; h?: number; rotY?: number; tilt?: number; style: DeskStyle; curve?: number; vertical?: boolean; screen?: string; bars?: string;
}) {
  const W = vertical ? h : w, H = vertical ? w : h;
  const segs = curve > 0 ? 3 : 1;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.2, 0.015, 0.16]} pos={[0, 0.0075, 0]} color={C.black} />
      <Box size={[0.05, 0.26, 0.04]} pos={[0, 0.14, 0.02]} color={C.steel} />
      <group position={[0, 0.2 + H / 2, 0.03]} rotation={[tilt, 0, 0]}>
        {Array.from({ length: segs }, (_, i) => {
          const sw = W / segs, a = (i - (segs - 1) / 2) * curve, x = (i - (segs - 1) / 2) * sw * Math.cos(a) * 0.98, z = Math.abs(i - (segs - 1) / 2) * sw * Math.sin(Math.abs(a)) * 0.9;
          return (
            <group key={i} position={[x, 0, -z]} rotation={[0, a, 0]}>
              <Box size={[sw, H, 0.035]} pos={[0, 0, 0]} color={C.black} />
              <Box size={[sw - 0.03, H - 0.03, 0.01]} pos={[0, 0, -0.02]} color={screen} emissive={screen} emissiveIntensity={0.9} cast={false} />
              {[0.3, 0.12, -0.06, -0.24].map((y, k) => <Box key={k} size={[(sw - 0.12) * (0.4 + (k % 3) * 0.2), 0.012, 0.004]} pos={[-sw * 0.08, y * H * 0.8, -0.027]} color={bars} emissive={bars} emissiveIntensity={1} cast={false} />)}
            </group>
          );
        })}
        <mesh position={[0, 0, 0.032]} rotation={[0, 0, 0]} material={RGB[style].a}><torusGeometry args={[Math.min(W, H) * 0.14, 0.008, 6, 20]} /></mesh>
      </group>
    </group>
  );
}

/* A gaming PC in a glass case. The glass faces +z (the viewer), with RGB fans that really spin and a lit graphics card. */
export function PCTower({ pos, style, h = 0.52, rotY = 0, fans = 3 }: { pos: V3; style: DeskStyle; h?: number; rotY?: number; fans?: number }) {
  const spin = useRef<Group[]>([]);
  useFrame((_, dt) => { spin.current.forEach(g => { if (g) g.rotation.z += dt * 9; }); });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* hollow shell: you see the parts through the glass front */}
      {[-1, 1].map(s => <Box key={s} size={[0.012, h, 0.5]} pos={[s * 0.119, h / 2, 0]} color="#16181D" />)}
      <Box size={[0.25, 0.014, 0.5]} pos={[0, h - 0.007, 0]} color="#16181D" />
      <Box size={[0.25, 0.014, 0.5]} pos={[0, 0.007, 0]} color="#16181D" />
      <Box size={[0.25, h, 0.012]} pos={[0, h / 2, -0.244]} color="#16181D" />
      <Box size={[0.22, h - 0.04, 0.01]} pos={[0, h / 2, -0.2]} color="#0B0D12" cast={false} />
      <Glass size={[0.236, h - 0.02, 0.012]} pos={[0, h / 2, 0.252]} tint="#7FB6D6" opacity={0.2} />
      {Array.from({ length: fans }, (_, i) => (
        <group key={i} position={[0, 0.1 + (fans === 1 ? (h - 0.2) / 2 : ((h - 0.2) / (fans - 1)) * i), 0.2]}>
          <mesh material={RGB[style].a}><torusGeometry args={[0.052, 0.007, 6, 18]} /></mesh>
          <group ref={el => { if (el) spin.current[i] = el; }}>
            {[0, 1, 2].map(k => <Box key={k} size={[0.016, 0.044, 0.004]} pos={[0, 0, 0]} rot={[0, 0, (k * Math.PI * 2) / 3]} color="#E9EDF2" cast={false} />)}
          </group>
        </group>
      ))}
      <Box size={[0.19, 0.05, 0.3]} pos={[0, h * 0.42, 0.06]} color="#2B2F3A" cast={false} />
      <mesh position={[0, h * 0.42 + 0.028, 0.06]} material={RGB[style].b}><boxGeometry args={[0.19, 0.008, 0.3]} /></mesh>
      <mesh position={[0, 0.03, 0.05]} material={RGB[style].b}><boxGeometry args={[0.2, 0.01, 0.36]} /></mesh>
      <mesh position={[0.1, h - 0.1, 0.05]} material={RGB[style].c}><boxGeometry args={[0.01, 0.12, 0.3]} /></mesh>
      <Cyl rt={0.016} rb={0.016} h={0.01} pos={[0, h - 0.03, 0.25]} rot={[Math.PI / 2, 0, 0]} color={C.steelLight} seg={10} cast={false} />
    </group>
  );
}

/* A mechanical keyboard with a rainbow-style wave across its keys. */
export function Keyboard({ pos, style, rotY = 0, w = 0.44 }: { pos: V3; style: DeskStyle; rotY?: number; w?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const cols = 15, rows = 5;
  const o = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      o.position.set(-w / 2 + 0.02 + (c + 0.5) * ((w - 0.04) / cols), 0.02, -0.06 + r * 0.03); o.scale.set((w - 0.04) / cols * 0.82, 0.016, 0.024); o.updateMatrix();
      m.setMatrixAt(r * cols + c, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [o, w]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < rows * cols; i++) m.setColorAt(i, keyColor(style, t, (i % cols) * 0.7 + Math.floor(i / cols) * 0.4));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w, 0.022, 0.17]} pos={[0, 0.011, 0]} color="#14161B" />
      <instancedMesh ref={ref} args={[undefined, undefined, rows * cols]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
}

export function MousePad({ pos, size = [0.85, 0.36], color = "#14161B", style, rotY = 0 }: { pos: V3; size?: [number, number]; color?: string; style: DeskStyle; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[size[0], 0.008, size[1]]} pos={[0, 0.004, 0]} color={color} cast={false} />
      <Glow size={[size[0] + 0.01, 0.006, 0.012]} pos={[0, 0.006, size[1] / 2]} style={style} which="b" />
      <Glow size={[size[0] + 0.01, 0.006, 0.012]} pos={[0, 0.006, -size[1] / 2]} style={style} which="b" />
      <Box size={[0.065, 0.03, 0.105]} pos={[size[0] * 0.28, 0.022, 0]} color="#1B1D22" />
      <Glow size={[0.012, 0.01, 0.07]} pos={[size[0] * 0.28, 0.035, 0]} style={style} which="c" />
    </group>
  );
}

export function Headset({ pos, style }: { pos: V3; style: DeskStyle }) {
  return (
    <group position={pos}>
      <Box size={[0.12, 0.012, 0.1]} pos={[0, 0.006, 0]} color={C.black} />
      <Cyl rt={0.012} rb={0.012} h={0.2} pos={[0, 0.1, 0]} color={C.steel} seg={6} />
      <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.085, 0.014, 6, 14, Math.PI]} /><meshToonMaterial color="#1C1E24" gradientMap={toonGradient} /></mesh>
      {[-1, 1].map(s => <Cyl key={s} rt={0.045} rb={0.045} h={0.035} pos={[s * 0.085, 0.215, 0]} rot={[0, 0, Math.PI / 2]} color="#16181D" seg={12} />)}
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.104, 0.215, 0]} rotation={[0, 0, Math.PI / 2]} material={RGB[style].a}><cylinderGeometry args={[0.03, 0.03, 0.006, 12]} /></mesh>)}
    </group>
  );
}

export function Speaker({ pos, style }: { pos: V3; style: DeskStyle }) {
  return (
    <group position={pos}>
      <Box size={[0.1, 0.2, 0.1]} pos={[0, 0.1, 0]} color="#16181D" />
      <mesh position={[0, 0.07, 0.052]} rotation={[Math.PI / 2, 0, 0]} material={RGB[style].c}><torusGeometry args={[0.03, 0.005, 6, 14]} /></mesh>
      <mesh position={[0, 0.15, 0.052]} rotation={[Math.PI / 2, 0, 0]} material={RGB[style].c}><torusGeometry args={[0.018, 0.004, 6, 12]} /></mesh>
    </group>
  );
}

/* A racing-style gaming chair with bolstered seat, tall back and headrest. It faces +z. */
export function GamingChair({ main, accent, leather = false }: { main: string; accent: string; leather?: boolean }) {
  return (
    <group>
      {[0, 1, 2, 3, 4].map(i => <Box key={i} size={[0.045, 0.035, 0.36]} pos={[Math.sin((i * Math.PI * 2) / 5) * 0.18, 0.06, Math.cos((i * Math.PI * 2) / 5) * 0.18]} rot={[0, (i * Math.PI * 2) / 5, 0]} color="#1B1D22" cast={false} />)}
      {[0, 1, 2, 3, 4].map(i => <Ball key={i} r={0.03} pos={[Math.sin((i * Math.PI * 2) / 5) * 0.34, 0.03, Math.cos((i * Math.PI * 2) / 5) * 0.34]} color="#101216" cast={false} seg={8} />)}
      <Cyl rt={0.04} rb={0.04} h={0.34} pos={[0, 0.25, 0]} color={C.steel} seg={8} />
      <Box size={[0.52, 0.09, 0.5]} pos={[0, 0.43, 0]} color={main} />
      {[-1, 1].map(s => <Box key={s} size={[0.07, 0.12, 0.46]} pos={[s * 0.25, 0.47, 0]} color={accent} />)}
      <Box size={[0.5, 0.1, 0.06]} pos={[0, 0.5, 0.22]} color={main} />
      <Box size={[0.5, 0.62, 0.1]} pos={[0, 0.82, -0.25]} rot={[-0.1, 0, 0]} color={main} />
      {[-1, 1].map(s => <Box key={s} size={[0.07, 0.56, 0.12]} pos={[s * 0.25, 0.82, -0.26]} rot={[-0.1, 0, 0]} color={accent} />)}
      <Box size={[0.3, 0.2, 0.09]} pos={[0, 1.22, -0.3]} rot={[-0.1, 0, 0]} color={main} />
      <Box size={[0.24, 0.08, 0.06]} pos={[0, 1.2, -0.25]} color={accent} cast={false} />
      {[-1, 1].map(s => (
        <group key={s}>
          <Box size={[0.05, 0.22, 0.05]} pos={[s * 0.33, 0.58, -0.05]} color="#16181D" />
          <Box size={[0.07, 0.04, 0.3]} pos={[s * 0.33, 0.7, 0.04]} color={leather ? main : "#16181D"} />
        </group>
      ))}
    </group>
  );
}

