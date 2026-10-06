import type { ReactNode } from "react";
import { BackSide, MeshBasicMaterial } from "three";
import { toonGradient } from "../scene/toon";

type V3 = [number, number, number];

/* Dark ink outline drawn as a slightly larger back-facing copy of the shape (the classic cel-shading trick). */
export const outlineMat = new MeshBasicMaterial({ color: "#2B2233", side: BackSide });
const OUT = 0.016;

interface PartProps {
  pos?: V3; rot?: V3; scale?: V3 | number; color: string; outline?: boolean;
  emissive?: string; emissiveIntensity?: number; opacity?: number; children?: ReactNode;
}

function Toon({ color, emissive, emissiveIntensity, opacity }: { color: string; emissive?: string; emissiveIntensity?: number; opacity?: number }) {
  return <meshToonMaterial color={color} gradientMap={toonGradient} emissive={emissive} emissiveIntensity={emissiveIntensity} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
}

export function Sph({ r, seg = 20, pos, rot, scale, color, outline = true, emissive, emissiveIntensity, opacity, children }: PartProps & { r: number; seg?: number }) {
  const args: [number, number, number] = [r, seg, Math.max(8, Math.round(seg * 0.75))];
  return (
    <mesh position={pos} rotation={rot} scale={scale} castShadow={r >= 0.06}>
      <sphereGeometry args={args} />
      <Toon color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} opacity={opacity} />
      {outline && <mesh scale={1 + OUT / r} material={outlineMat}><sphereGeometry args={args} /></mesh>}
      {children}
    </mesh>
  );
}

export function Cylr({ rt, rb = rt, h, seg = 14, pos, rot, scale, color, outline = true, emissive, emissiveIntensity, opacity, children }: PartProps & { rt: number; rb?: number; h: number; seg?: number }) {
  const args: [number, number, number, number] = [rt, rb, h, seg];
  const k = 1 + OUT / Math.max(rt, rb, 0.02);
  return (
    <mesh position={pos} rotation={rot} scale={scale} castShadow={Math.max(rt, rb) >= 0.05 || h >= 0.25}>
      <cylinderGeometry args={args} />
      <Toon color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} opacity={opacity} />
      {outline && <mesh scale={[k, 1 + (OUT * 2) / h, k]} material={outlineMat}><cylinderGeometry args={args} /></mesh>}
      {children}
    </mesh>
  );
}

export function Caps({ r, len, pos, rot, scale, color, outline = true, emissive, emissiveIntensity, opacity }: PartProps & { r: number; len: number }) {
  const args: [number, number, number, number] = [r, len, 6, 16];
  return (
    <mesh position={pos} rotation={rot} scale={scale} castShadow={r >= 0.05}>
      <capsuleGeometry args={args} />
      <Toon color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} opacity={opacity} />
      {outline && <mesh scale={1 + OUT / r} material={outlineMat}><capsuleGeometry args={args} /></mesh>}
    </mesh>
  );
}

export function Blk({ size, pos, rot, color, outline = false }: PartProps & { size: V3 }) {
  return (
    <mesh position={pos} rotation={rot} castShadow={Math.max(size[0], size[1], size[2]) >= 0.14}>
      <boxGeometry args={size} />
      <Toon color={color} />
      {outline && <mesh scale={[1 + (OUT * 2) / size[0], 1 + (OUT * 2) / size[1], 1 + (OUT * 2) / size[2]]} material={outlineMat}><boxGeometry args={size} /></mesh>}
    </mesh>
  );
}

/* The top part of a sphere: hair, caps and beanies. */
export function Dome({ r, theta, pos, rot, color, outline = true }: PartProps & { r: number; theta: number }) {
  const args: [number, number, number, number, number, number, number] = [r, 28, 18, 0, Math.PI * 2, 0, theta];
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <sphereGeometry args={args} />
      <meshToonMaterial color={color} gradientMap={toonGradient} side={2} />
      {outline && <mesh scale={1 + OUT / r} material={outlineMat}><sphereGeometry args={args} /></mesh>}
    </mesh>
  );
}

export function Ring({ r, tube, pos, rot, color, arc = Math.PI * 2 }: PartProps & { r: number; tube: number; arc?: number }) {
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <torusGeometry args={[r, tube, 8, 28, arc]} />
      <Toon color={color} />
    </mesh>
  );
}
