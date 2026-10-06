import { useMemo, type ReactNode } from "react";
import { BoxGeometry, DoubleSide, type Texture } from "three";
import { toonGradient } from "./toon";

type V3 = [number, number, number];

interface BoxProps {
  size: V3; pos: V3; color: string;
  emissive?: string; emissiveIntensity?: number; opacity?: number;
  cast?: boolean; receive?: boolean; rot?: V3; visible?: boolean; children?: ReactNode;
}

/* Box mesh with a toon material. */
/* Small things do not cast shadows: nobody sees them, and each caster costs another draw call. */
const SMALL = 0.32;

export function Box({ size, pos, color, emissive, emissiveIntensity, opacity, cast, receive = true, rot, visible = true, children }: BoxProps) {
  return (
    <mesh position={pos} rotation={rot} castShadow={cast ?? Math.max(size[0], size[1], size[2]) >= SMALL} receiveShadow={receive} visible={visible}>
      <boxGeometry args={size} />
      <meshToonMaterial color={color} gradientMap={toonGradient} emissive={emissive} emissiveIntensity={emissiveIntensity}
        transparent={opacity !== undefined} opacity={opacity ?? 1} depthWrite={opacity === undefined} />
      {children}
    </mesh>
  );
}

/* A box whose texture repeats once every `tile` meters, whatever the box size. */
const uvCache = new Map<string, BoxGeometry>();
function uvBox(w: number, h: number, d: number, tile: number) {
  const key = [w, h, d, tile].map(n => n.toFixed(3)).join("|");
  let g = uvCache.get(key);
  if (!g) {
    g = new BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x, -x, +y, -y, +z, -z
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
    }
    uv.needsUpdate = true;
    uvCache.set(key, g);
  }
  return g;
}

export function TBox({ size, pos, tex, tile = 2, color = "#FFFFFF", rot, cast = true, receive = true, emissive, emissiveIntensity }: {
  size: V3; pos: V3; tex: Texture; tile?: number; color?: string; rot?: V3; cast?: boolean; receive?: boolean; emissive?: string; emissiveIntensity?: number;
}) {
  const geo = useMemo(() => uvBox(size[0], size[1], size[2], tile), [size[0], size[1], size[2], tile]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh position={pos} rotation={rot} castShadow={cast} receiveShadow={receive} geometry={geo}>
      <meshToonMaterial map={tex} color={color} gradientMap={toonGradient} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

interface CylProps {
  rt: number; rb: number; h: number; pos: V3; color: string; seg?: number; rot?: V3;
  emissive?: string; emissiveIntensity?: number; cast?: boolean; opacity?: number;
}

export function Cyl({ rt, rb, h, pos, color, seg = 16, rot, emissive, emissiveIntensity, cast, opacity }: CylProps) {
  return (
    <mesh position={pos} rotation={rot} castShadow={cast ?? Math.max(rt * 2, rb * 2, h) >= SMALL} receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <meshToonMaterial color={color} gradientMap={toonGradient} emissive={emissive} emissiveIntensity={emissiveIntensity}
        transparent={opacity !== undefined} opacity={opacity ?? 1} />
    </mesh>
  );
}

export function Ball({ r, pos, color, scale, cast, emissive, emissiveIntensity, seg = 14 }: {
  r: number; pos: V3; color: string; scale?: V3; cast?: boolean; emissive?: string; emissiveIntensity?: number; seg?: number;
}) {
  return (
    <mesh position={pos} scale={scale} castShadow={cast ?? r * 2 >= SMALL} receiveShadow>
      <sphereGeometry args={[r, seg, Math.max(8, seg - 4)]} />
      <meshToonMaterial color={color} gradientMap={toonGradient} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

export function Cone({ r, h, pos, color, rot, seg = 10, cast }: { r: number; h: number; pos: V3; color: string; rot?: V3; seg?: number; cast?: boolean }) {
  return (
    <mesh position={pos} rotation={rot} castShadow={cast ?? Math.max(r * 2, h) >= SMALL}>
      <coneGeometry args={[r, h, seg]} />
      <meshToonMaterial color={color} gradientMap={toonGradient} />
    </mesh>
  );
}

/* Shared glass look: pale and see-through. */
export function Glass({ size, pos, tint = "#A9D9E8", opacity = 0.2, rot }: { size: V3; pos: V3; tint?: string; opacity?: number; rot?: V3 }) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <meshToonMaterial color={tint} gradientMap={toonGradient} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

