import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3, type Group } from "three";
import type { Accessory, Extra, HairStyle, Outfit } from "../../shared/agents";
import { Blk, Caps, Cylr, Dome, Ring, Sph } from "./parts3d";

export const INK = "#2A2330";

/* A darker version of a hex color. */
export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0");
  return "#" + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255);
}

/* ---------- hands: palm, four fingers with two joints each, and a thumb ---------- */

const tmpPos = new Vector3();

export interface FingerState { grip: number; wiggle: number }

export function Hand({ side, skin, state, ghost, nail }: { side: -1 | 1; skin: string; state: FingerState; ghost: boolean; nail?: string }) {
  const fingers = useRef<{ prox: Group | null; dist: Group | null }[]>(Array.from({ length: 4 }, () => ({ prox: null, dist: null })));
  const thumb = useRef<Group>(null);
  const detail = useRef<Group>(null);
  const r = ghost ? 1.25 : 1;
  const offs = [-0.036, -0.012, 0.012, 0.036];

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    // Fingers are only drawn when the camera is close enough to see them.
    if (detail.current) { detail.current.getWorldPosition(tmpPos); detail.current.visible = tmpPos.distanceTo(camera.position) < 26; if (!detail.current.visible) return; }
    fingers.current.forEach((f, i) => {
      const wig = state.wiggle * (0.5 + 0.5 * Math.sin(t * 14 + i * 1.7 + side)) * 0.7;
      if (f.prox) f.prox.rotation.x = -(state.grip * 1.2 + wig);
      if (f.dist) f.dist.rotation.x = -(state.grip * 1.0 + wig * 0.8);
    });
    if (thumb.current) thumb.current.rotation.x = -(state.grip * 0.7);
  });

  return (
    <group>
      <Blk size={[0.1 * r, 0.1, 0.042 * r]} pos={[0, -0.055, 0]} color={skin} outline />
      <group ref={detail}>
      {offs.map((x, i) => (
        <group key={i} position={[x * r, -0.105, 0]} ref={el => { fingers.current[i].prox = el; }}>
          <Cylr rt={0.0165 * r} rb={0.0155 * r} h={0.052 + (i === 1 || i === 2 ? 0.006 : 0) - (i === 0 ? 0.008 : 0)} pos={[0, -0.026, 0]} color={skin} seg={8} outline={false} />
          <group position={[0, -0.052, 0]} ref={el => { fingers.current[i].dist = el; }}>
            <Cylr rt={0.0145 * r} rb={0.012 * r} h={0.04} pos={[0, -0.02, 0]} color={skin} seg={8} outline={false} />
            <Sph r={0.013 * r} pos={[0, -0.042, 0]} color={nail ?? skin} seg={6} outline={false} />
          </group>
        </group>
      ))}
      <group ref={thumb} position={[-side * 0.058 * r, -0.04, 0.012]} rotation={[0, 0, side * 0.5]}>
        <Cylr rt={0.019 * r} rb={0.016 * r} h={0.055} pos={[0, -0.027, 0]} color={skin} seg={8} outline={false} />
        <Sph r={0.016 * r} pos={[0, -0.056, 0]} color={skin} seg={6} outline={false} />
      </group>
      </group>
    </group>
  );
}

/* ---------- hair, relative to the center of the skull (radius 0.25) ---------- */

export function Hair({ style, color }: { style: HairStyle; color: string }) {
  const bangs = (xs: number[]) => xs.map(x => <Sph key={x} r={0.064} pos={[x, 0.165, 0.195]} scale={[1, 0.8, 0.7]} color={color} seg={10} />);
  const sides = (dy: number, h: number) => [-1, 1].map(s => <Blk key={s} size={[0.04, h, 0.085]} pos={[s * 0.235, dy, 0.05]} color={color} />);
  const spike = (x: number, y: number, z: number, rx: number, rz: number, k = 1) => (
    <mesh key={`${x}${z}`} position={[x, y, z]} rotation={[rx, 0, rz]} castShadow><coneGeometry args={[0.058 * k, 0.17 * k, 7]} /><meshToonMaterial color={color} /></mesh>
  );
  switch (style) {
    case "none": return null;
    case "slick":
      return (<>
        <Dome r={0.27} theta={Math.PI * 0.5} rot={[-0.55, 0, 0]} pos={[0, 0.01, -0.01]} color={color} />
        <Sph r={0.15} pos={[0, 0.08, -0.15]} scale={[1.2, 1, 0.9]} color={color} />
        {sides(-0.015, 0.1)}
      </>);
    case "messy":
      return (<>
        <Dome r={0.27} theta={Math.PI * 0.52} rot={[-0.3, 0, 0]} color={color} />
        {bangs([-0.12, -0.03, 0.07, 0.15])}
        {spike(-0.13, 0.23, 0.03, 0, 0.55)}{spike(0, 0.27, 0.07, 0.45, 0)}{spike(0.14, 0.23, 0.02, 0, -0.55)}
        {spike(-0.04, 0.25, -0.1, -0.45, 0)}{spike(0.1, 0.21, -0.11, -0.3, -0.3)}
        {sides(-0.015, 0.11)}
      </>);
    case "patchy": // a zombie's thinning hair
      return (<>
        <Dome r={0.265} theta={Math.PI * 0.3} rot={[-0.85, 0, 0]} pos={[0, 0.0, -0.02]} color={color} />
        {spike(-0.1, 0.24, -0.02, 0, 0.5, 0.8)}{spike(0.08, 0.25, 0.03, 0.2, -0.4, 0.7)}{spike(0.17, 0.12, -0.12, 0, -1, 0.7)}
        {sides(0.0, 0.07)}
      </>);
    case "bun":
      return (<>
        <Dome r={0.27} theta={Math.PI * 0.5} rot={[-0.35, 0, 0]} color={color} />
        {bangs([-0.09, 0, 0.09])}
        <Sph r={0.1} pos={[0, 0.3, -0.09]} color={color} />
        <Cylr rt={0.008} h={0.3} pos={[0, 0.3, -0.09]} rot={[0, 0, 1.2]} color="#E3B341" outline={false} />
        {[-1, 1].map(s => <Blk key={s} size={[0.045, 0.17, 0.045]} pos={[s * 0.225, -0.07, 0.08]} color={color} />)}
      </>);
    case "spiky":
      return (<>
        <Dome r={0.27} theta={Math.PI * 0.5} rot={[-0.3, 0, 0]} color={color} />
        {Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * Math.PI * 2; return spike(Math.sin(a) * 0.15, 0.24, Math.cos(a) * 0.15 - 0.03, Math.cos(a) * 0.5, -Math.sin(a) * 0.5); })}
        {sides(-0.02, 0.1)}
      </>);
    case "long":
      return (<>
        <Dome r={0.27} theta={Math.PI * 0.55} rot={[-0.3, 0, 0]} color={color} />
        {bangs([-0.15, -0.075, 0, 0.075, 0.15])}
        <Sph r={0.25} pos={[0, -0.15, -0.15]} scale={[1, 1.3, 0.55]} color={color} />
        {[-1, 1].map(s => <Blk key={s} size={[0.05, 0.34, 0.1]} pos={[s * 0.235, -0.15, 0.05]} color={color} />)}
      </>);
    default: // "short"
      return (<>
        <Dome r={0.27} theta={Math.PI * 0.52} rot={[-0.3, 0, 0]} color={color} />
        {bangs([-0.13, -0.045, 0.045, 0.13])}
        {sides(-0.015, 0.1)}
      </>);
  }
}

/* ---------- accessories, relative to the skull ---------- */

export function AccessoryMesh({ kind, accent, outfit }: { kind: Accessory; accent: string; outfit: string }) {
  switch (kind) {
    case "glasses":
    case "roundglasses": {
      const round = kind === "roundglasses", r = round ? 0.07 : 0.062, c = round ? "#C9962A" : "#1D1F27";
      return (<>
        {[-1, 1].map(s => <Ring key={s} r={r} tube={0.009} pos={[s * 0.095, 0.03, 0.222]} color={c} />)}
        <Blk size={[0.045, 0.009, 0.009]} pos={[0, 0.042, 0.228]} color={c} />
        {[-1, 1].map(s => <Blk key={s} size={[0.008, 0.008, 0.21]} pos={[s * 0.16, 0.04, 0.125]} color={c} />)}
      </>);
    }
    case "monocle":
      return (<>
        <Ring r={0.07} tube={0.01} pos={[0.095, 0.03, 0.226]} color="#E3B341" />
        <Cylr rt={0.003} h={0.3} pos={[0.17, -0.12, 0.22]} rot={[0, 0, 0.1]} color="#E3B341" outline={false} seg={4} />
      </>);
    case "headphones":
      return (<>
        <Ring r={0.28} tube={0.022} arc={Math.PI} color="#2B2F3D" />
        {[-1, 1].map(s => <Cylr key={s} rt={0.078} h={0.075} pos={[s * 0.27, -0.015, 0]} rot={[0, 0, Math.PI / 2]} color={accent} />)}
      </>);
    case "goggles":
      return (<>
        <Ring r={0.262} tube={0.018} pos={[0, 0.13, 0]} rot={[Math.PI / 2 - 0.2, 0, 0]} color="#3A3F52" />
        {[-1, 1].map(s => (
          <group key={s} position={[s * 0.088, 0.17, 0.225]} rotation={[-0.35, 0, 0]}>
            <Ring r={0.06} tube={0.013} color="#3A3F52" />
            <Cylr rt={0.052} h={0.016} rot={[Math.PI / 2, 0, 0]} color="#7FE6FF" outline={false} emissive="#7FE6FF" emissiveIntensity={0.6} />
          </group>
        ))}
      </>);
    case "cap":
      return (<>
        <Dome r={0.275} theta={Math.PI * 0.5} rot={[-0.2, 0, 0]} pos={[0, 0.04, -0.01]} color={outfit} />
        <Blk size={[0.26, 0.02, 0.19]} pos={[0, 0.115, 0.27]} rot={[0.2, 0, 0]} color={outfit} outline />
      </>);
    case "beanie":
      return (<>
        <Dome r={0.285} theta={Math.PI * 0.56} rot={[-0.15, 0, 0]} pos={[0, 0.03, 0]} color={accent} />
        <Cylr rt={0.28} h={0.065} pos={[0, 0.115, 0]} rot={[-0.1, 0, 0]} color="#FFFFFF" />
        <Sph r={0.07} pos={[0, 0.31, -0.02]} color="#FFFFFF" />
      </>);
    case "tophat":
      return (<>
        <Cylr rt={0.3} h={0.025} pos={[0, 0.22, 0]} color="#1A1C22" />
        <Cylr rt={0.17} rb={0.18} h={0.28} pos={[0, 0.37, 0]} color="#1A1C22" />
        <Cylr rt={0.182} rb={0.182} h={0.05} pos={[0, 0.27, 0]} color="#C8423A" />
      </>);
    default:
      return null;
  }
}

/* ---------- outfit pieces on the chest (relative to the chest joint) ---------- */

export function OutfitChest({ outfit, color, accent, ghost }: { outfit: Outfit; color: string; accent: string; ghost: boolean }) {
  const r = ghost ? 0.2 : 0.185;
  switch (outfit) {
    case "suit":
      return (<>
        <Caps r={r + 0.015} len={0.14} pos={[0, 0.1, 0]} color={color} />
        <Blk size={[0.13, 0.28, 0.03]} pos={[0, 0.14, r + 0.01]} color="#FFFFFF" />
        {[-1, 1].map(s => <Blk key={s} size={[0.055, 0.26, 0.03]} pos={[s * 0.08, 0.15, r + 0.015]} rot={[0, 0, s * 0.3]} color={shade(color, 0.75)} />)}
        <Sph r={0.016} pos={[0.1, 0.24, r + 0.03]} color="#E3B341" outline={false} seg={8} />
      </>);
    case "labcoat":
      return (<>
        <Caps r={r - 0.01} len={0.12} pos={[0, 0.1, 0]} color={accent} />
        <Caps r={r + 0.02} len={0.12} pos={[0, 0.1, 0]} color={color} />
        <Blk size={[0.1, 0.34, 0.03]} pos={[0, 0.1, r + 0.03]} color={accent} />
        {[-1, 1].map(s => <Blk key={s} size={[0.06, 0.1, 0.03]} pos={[s * 0.11, 0.28, r + 0.02]} rot={[0, 0, s * -0.5]} color={color} />)}
        <Blk size={[0.09, 0.06, 0.03]} pos={[0.11, 0.0, r + 0.03]} color={shade(color, 0.9)} />
        <Sph r={0.04} pos={[-0.1, -0.02, r + 0.04]} scale={[1, 1, 0.3]} color="#7DC96A" outline={false} seg={8} />
      </>);
    case "vest":
      return (<>
        <Caps r={r} len={0.14} pos={[0, 0.1, 0]} color="#394150" />
        <Caps r={r + 0.015} len={0.1} pos={[0, 0.1, 0]} color={color} />
        {[0.02, 0.18].map(y => <Blk key={y} size={[0.4, 0.045, 0.03]} pos={[0, y, r + 0.025]} color="#E8EDF2" />)}
        {[-1, 1].map(s => <Blk key={s} size={[0.04, 0.34, 0.03]} pos={[s * 0.1, 0.1, r + 0.03]} color="#E8EDF2" />)}
      </>);
    case "scarf":
      return (<>
        <Caps r={r} len={0.14} pos={[0, 0.1, 0]} color={accent} outline={false} opacity={ghost ? 0.001 : undefined} />
        <Ring r={0.14} tube={0.05} pos={[0, 0.3, 0]} rot={[Math.PI / 2, 0, 0]} color={color} />
        <Blk size={[0.09, 0.32, 0.03]} pos={[0.08, 0.1, r + 0.02]} rot={[0, 0, -0.1]} color={color} outline />
        <Blk size={[0.09, 0.06, 0.035]} pos={[0.08, -0.08, r + 0.025]} color={shade(color, 0.8)} />
      </>);
    case "hoodie":
      return (<>
        <Caps r={r + 0.015} len={0.14} pos={[0, 0.1, 0]} color={color} />
        <Sph r={0.14} pos={[0, 0.3, -0.12]} scale={[1.2, 0.8, 0.75]} color={color} />
        <Blk size={[0.24, 0.09, 0.04]} pos={[0, 0.0, r + 0.02]} color={shade(color, 0.82)} />
        {[-1, 1].map(s => <Cylr key={s} rt={0.007} h={0.12} pos={[s * 0.045, 0.22, r + 0.025]} color="#FFFFFF" outline={false} seg={6} />)}
      </>);
    default:
      return <Caps r={r} len={0.14} pos={[0, 0.1, 0]} color={accent} />;
  }
}

/* Zombie details on the head: stitches and a bandage. */
export function HeadExtras({ extras }: { extras: Extra[] }) {
  return (
    <>
      {extras.includes("stitches") && (<>
        <Blk size={[0.2, 0.012, 0.012]} pos={[0.02, 0.14, 0.235]} rot={[0.2, 0, 0.12]} color="#2B2B33" />
        {[-0.07, -0.02, 0.03, 0.08, 0.13].map(x => <Blk key={x} size={[0.01, 0.045, 0.012]} pos={[x, 0.14, 0.24]} rot={[0.2, 0, 0.12]} color="#2B2B33" />)}
        <Blk size={[0.012, 0.15, 0.012]} pos={[0.17, -0.02, 0.17]} rot={[0.25, 0.7, 0]} color="#2B2B33" />
      </>)}
      {extras.includes("bandage") && (<>
        <Ring r={0.255} tube={0.03} pos={[0, 0.085, 0]} rot={[Math.PI / 2 - 0.25, 0, 0.1]} color="#F2EEE4" />
        <Ring r={0.255} tube={0.026} pos={[0.01, 0.15, 0]} rot={[Math.PI / 2 - 0.1, 0, -0.15]} color="#E6E0D2" />
        <Blk size={[0.05, 0.02, 0.1]} pos={[0.24, 0.07, 0.04]} rot={[0, 0.3, 0.5]} color="#F2EEE4" />
      </>)}
    </>
  );
}
