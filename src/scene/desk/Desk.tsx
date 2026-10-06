import type { DeskStyle } from "../../../shared/agents";
import { DESK_HALF_W } from "../../../shared/layout";
import { STATUS } from "../../config/status";
import { useOfficeStore } from "../../state/officeStore";
import { C } from "../palette";
import { Ball, Box, Cone, Cyl, TBox } from "../parts";
import { TEX } from "../textures";
import { GamingChair, Glow, Headset, Keyboard, Monitor, MousePad, PCTower, Speaker } from "./gear";
import { RGB } from "./rgb";

type V3 = [number, number, number];
const TOP = 0.76;
const W = DESK_HALF_W * 2, D = 1.3;

const CHAIRS: Record<DeskStyle, { main: string; accent: string; leather?: boolean }> = {
  executive: { main: "#17181C", accent: "#C79A2B", leather: true },
  lab: { main: "#EEF1F5", accent: "#9C6ADE" },
  writer: { main: "#E8DCCB", accent: "#C8553D" },
  backend: { main: "#1C2024", accent: "#21A99A" },
  frontend: { main: "#F4F6FA", accent: "#E0638A" },
  qa: { main: "#1C1F25", accent: "#E5484D" }
};

/* Desk top, steel legs and a glowing edge. */
function Frame({ style, top, topTex, edge = "a" }: { style: DeskStyle; top: string; topTex?: boolean; edge?: "a" | "b" | "c" }) {
  return (
    <group>
      {topTex
        ? <TBox size={[W, 0.06, D]} pos={[0, TOP - 0.03, 0]} tex={TEX.diamond} tile={0.6} color={top} />
        : <Box size={[W, 0.06, D]} pos={[0, TOP - 0.03, 0]} color={top} />}
      {[-1, 1].map(s => (
        <group key={s} position={[s * (W / 2 - 0.1), 0, 0]}>
          <Box size={[0.07, TOP - 0.06, D - 0.2]} pos={[0, (TOP - 0.06) / 2, 0]} color={C.steel} />
          <Box size={[0.07, 0.07, D + 0.1]} pos={[0, 0.035, 0]} color={C.steelMid} />
        </group>
      ))}
      <Box size={[W - 0.3, 0.3, 0.03]} pos={[0, TOP - 0.25, -D / 2 + 0.12]} color={C.steel} cast={false} />
      <Glow size={[W, 0.016, 0.016]} pos={[0, TOP - 0.065, D / 2]} style={style} which={edge} />
      <Glow size={[W, 0.016, 0.016]} pos={[0, TOP - 0.065, -D / 2]} style={style} which="b" />
      <Glow size={[0.016, 0.016, D]} pos={[-W / 2, TOP - 0.065, 0]} style={style} which="c" />
      <Glow size={[0.016, 0.016, D]} pos={[W / 2, TOP - 0.065, 0]} style={style} which="c" />
      <Glow size={[W - 0.5, 0.012, 0.4]} pos={[0, 0.02, 0]} style={style} which="a" />
    </group>
  );
}

function Lamp({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <Cyl rt={0.07} rb={0.08} h={0.02} pos={[0, 0.01, 0]} color={C.black} seg={10} />
      <Cyl rt={0.008} rb={0.008} h={0.3} pos={[0, 0.17, 0]} color={C.steelLight} seg={5} />
      <Cyl rt={0.008} rb={0.008} h={0.22} pos={[0.07, 0.32, 0]} rot={[0, 0, 1.1]} color={C.steelLight} seg={5} />
      <Cone r={0.08} h={0.09} pos={[0.17, 0.3, 0]} rot={[0, 0, Math.PI]} color="#E8A83A" seg={12} cast={false} />
      <Ball r={0.03} pos={[0.17, 0.27, 0]} color="#FFF1CF" emissive="#FFD79A" emissiveIntensity={1.4} cast={false} seg={8} />
    </group>
  );
}

function Mug({ pos, color = "#F2F3F7" }: { pos: V3; color?: string }) {
  return (
    <group position={pos}>
      <Cyl rt={0.04} rb={0.036} h={0.09} pos={[0, 0.045, 0]} color={color} seg={12} />
      <Cyl rt={0.036} rb={0.036} h={0.01} pos={[0, 0.085, 0]} color="#3A2418" seg={12} cast={false} />
    </group>
  );
}

function Books({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      {([["#C8553D", 0.3, 0.05], ["#3E6EA8", 0.27, 0.045], ["#E3B341", 0.25, 0.05]] as [string, number, number][]).map(([c, w, h], i) => (
        <Box key={i} size={[w, h, 0.2]} pos={[0.01 * i, h / 2 + i * 0.048, 0]} rot={[0, (i - 1) * 0.1, 0]} color={c} />
      ))}
    </group>
  );
}

function Plant({ pos, s = 1 }: { pos: V3; s?: number }) {
  return (
    <group position={pos} scale={s}>
      <Cyl rt={0.05} rb={0.04} h={0.08} pos={[0, 0.04, 0]} color="#D9D6CE" seg={8} />
      {[0, 1, 2, 3, 4].map(i => <Cone key={i} r={0.02} h={0.17} pos={[Math.sin(i * 1.3) * 0.03, 0.16, Math.cos(i * 1.3) * 0.03]} rot={[Math.cos(i * 1.3) * 0.5, 0, -Math.sin(i * 1.3) * 0.5]} color="#4F9A62" seg={5} />)}
    </group>
  );
}

/* One workstation: desk, PC, monitors and chair, laid out differently for every style. */
export function Desk({ x, y, z, agentId, style }: { x: number; y: number; z: number; agentId: string; style: DeskStyle }) {
  const status = useOfficeStore(s => s.agents[agentId].status);
  const inbox = useOfficeStore(s => s.agents[agentId].inbox);
  const color = STATUS[status].color;
  const chair = CHAIRS[style];

  return (
    <group position={[x, y, z]}>
      {/* status strip on the front edge, plus the inbox paper */}
      <Box size={[W - 0.4, 0.02, 0.02]} pos={[0, TOP + 0.005, D / 2 - 0.03]} color={color} emissive={color} emissiveIntensity={1.4} cast={false} />
      <Box size={[0.32, 0.03, 0.4]} pos={[-W / 2 + 0.35, TOP + 0.015, 0.2]} color="#FFFFFF" visible={inbox} />

      {style === "executive" && (<>
        <Frame style={style} top="#4A3426" />
        <Box size={[1.1, 0.06, 1.5]} pos={[-W / 2 - 0.4, TOP - 0.03, 0.4]} color="#4A3426" />
        <Box size={[0.07, TOP - 0.06, 1.4]} pos={[-W / 2 - 0.9, (TOP - 0.06) / 2, 0.4]} color={C.steel} />
        <Glow size={[1.1, 0.016, 0.016]} pos={[-W / 2 - 0.4, TOP - 0.065, 1.15]} style={style} />
        <Monitor pos={[0, TOP, 0.05]} w={0.78} h={0.4} curve={0.28} style={style} screen="#2A2210" bars="#FFC24A" />
        <Monitor pos={[-0.88, TOP, 0.2]} w={0.5} h={0.32} rotY={-0.55} style={style} screen="#2A2210" bars="#FFC24A" />
        <Monitor pos={[0.88, TOP, 0.2]} w={0.5} h={0.32} rotY={0.55} style={style} screen="#2A2210" bars="#FFC24A" />
        <Keyboard pos={[0, TOP, -0.34]} style={style} />
        <MousePad pos={[0.15, TOP, -0.34]} size={[1.0, 0.4]} color="#1B1710" style={style} />
        <PCTower pos={[-1.2, TOP, -0.1]} style={style} h={0.56} />
        <Headset pos={[1.2, TOP, -0.15]} style={style} />
        <Box size={[0.34, 0.06, 0.05]} pos={[0.2, TOP + 0.03, 0.55]} rot={[-0.35, 0, 0]} color={C.hazard} emissive="#C79A2B" emissiveIntensity={0.3} />
        <Cyl rt={0.045} rb={0.03} h={0.1} pos={[-W / 2 - 0.4, TOP + 0.05, 0.9]} color="#C79A2B" seg={10} />
        <Mug pos={[-W / 2 - 0.4, TOP, 0.2]} color="#3A2A24" />
      </>)}

      {style === "lab" && (<>
        <Frame style={style} top="#E9EEF3" />
        <Monitor pos={[-0.55, TOP, 0.12]} w={0.58} h={0.34} rotY={-0.25} style={style} screen="#14283A" bars="#7FE6FF" />
        <Monitor pos={[0.55, TOP, 0.12]} w={0.58} h={0.34} rotY={0.25} style={style} screen="#14283A" bars="#7FE6FF" />
        <Keyboard pos={[0, TOP, -0.34]} style={style} />
        <MousePad pos={[0.3, TOP, -0.34]} size={[0.8, 0.36]} color="#D6DCE4" style={style} />
        <PCTower pos={[1.15, TOP, 0.1]} style={style} fans={2} />
        {[0, 1].map(i => <mesh key={i} position={[1.15, TOP + 0.4 - i * 0.12, 0.27]} material={RGB[style].c}><torusGeometry args={[0.06 - i * 0.01, 0.006, 6, 18]} /></mesh>)}
        {/* test tube rack */}
        <Box size={[0.3, 0.04, 0.08]} pos={[-1.15, TOP + 0.02, 0.3]} color="#C3CCD6" />
        {(["#7CE3A8", "#FF8FB1", "#7CC4FF", "#FFD166"] as string[]).map((c, i) => <Cyl key={i} rt={0.014} rb={0.014} h={0.12} pos={[-1.26 + i * 0.075, TOP + 0.1, 0.3]} color={c} emissive={c} emissiveIntensity={0.6} seg={8} cast={false} />)}
        <Headset pos={[-1.2, TOP, -0.15]} style={style} />
      </>)}

      {style === "writer" && (<>
        <Frame style={style} top="#B08A62" edge="b" />
        <Monitor pos={[0, TOP, 0.08]} w={1.0} h={0.42} curve={0.3} style={style} screen="#2A1E24" bars="#FFB6C9" />
        <Keyboard pos={[0, TOP, -0.34]} style={style} />
        <MousePad pos={[0.5, TOP, -0.34]} size={[0.7, 0.34]} color="#E8DCCB" style={style} />
        <PCTower pos={[1.2, TOP, 0.15]} style={style} h={0.42} fans={2} />
        <Books pos={[-1.1, TOP, 0.2]} />
        <Lamp pos={[-1.3, TOP, -0.2]} />
        <Plant pos={[-0.85, TOP, 0.42]} s={1.2} />
        <Mug pos={[-0.55, TOP, -0.2]} color="#F4E1D2" />
        <Box size={[0.2, 0.016, 0.28]} pos={[-0.55, TOP + 0.008, -0.38]} rot={[0, 0.2, 0]} color="#FFFDF6" cast={false} />
        <Speaker pos={[-0.62, TOP, 0.35]} style={style} />
      </>)}

      {style === "backend" && (<>
        <Frame style={style} top="#1C1E24" />
        <Monitor pos={[0, TOP, 0.0]} w={0.9} h={0.36} curve={0.22} style={style} screen="#0C2418" bars="#39FF88" />
        <Monitor pos={[-0.78, TOP, 0.2]} w={0.52} h={0.3} vertical rotY={-0.4} style={style} screen="#0C2418" bars="#39FF88" />
        <Monitor pos={[0.78, TOP, 0.2]} w={0.52} h={0.3} vertical rotY={0.4} style={style} screen="#0C2418" bars="#39FF88" />
        <Keyboard pos={[-0.1, TOP, -0.34]} style={style} />
        <MousePad pos={[0.4, TOP, -0.34]} size={[0.7, 0.36]} color="#111317" style={style} />
        <PCTower pos={[-1.2, TOP, -0.1]} style={style} />
        <PCTower pos={[1.2, TOP, -0.1]} style={style} h={0.46} fans={2} />
        <Mug pos={[-0.5, TOP, -0.3]} color="#21A99A" />
        <Cyl rt={0.008} rb={0.008} h={0.4} pos={[0.62, TOP + 0.2, -0.3]} color={C.steelLight} seg={5} />
        <Ball r={0.03} pos={[0.62, TOP + 0.4, -0.18]} color="#1B1D22" seg={8} />
        <Headset pos={[-1.2, TOP, 0.3]} style={style} />
      </>)}

      {style === "frontend" && (<>
        <Frame style={style} top="#F2F4F8" edge="b" />
        <Monitor pos={[0, TOP, 0.05]} w={0.76} h={0.42} style={style} screen="#2A1730" bars="#FF7FB0" />
        <Monitor pos={[-0.78, TOP, 0.2]} w={0.46} h={0.28} rotY={-0.5} style={style} screen="#2A1730" bars="#7FE6FF" />
        <Monitor pos={[0.78, TOP, 0.2]} w={0.46} h={0.28} rotY={0.5} style={style} screen="#2A1730" bars="#7FE6FF" />
        <Keyboard pos={[0.1, TOP, -0.34]} style={style} />
        <Box size={[0.4, 0.014, 0.26]} pos={[-0.6, TOP + 0.007, -0.3]} rot={[0, 0.2, 0]} color="#16181D" />
        <Glow size={[0.4, 0.004, 0.012]} pos={[-0.6, TOP + 0.016, -0.18]} style={style} which="c" rot={[0, 0.2, 0]} />
        <PCTower pos={[1.2, TOP, -0.05]} style={style} />
        {([["#E0638A", -0.2], ["#7FE6FF", 0.0], ["#FFD166", 0.2]] as [string, number][]).map(([c, dx], i) => (
          <group key={i} position={[dx - 0.2, TOP, 0.5]}>
            <Cyl rt={0.03} rb={0.035} h={0.07} pos={[0, 0.035, 0]} color={c} seg={8} />
            <Ball r={0.04} pos={[0, 0.1, 0]} color="#FFE3CF" seg={8} />
          </group>
        ))}
        <Headset pos={[-1.2, TOP, 0.0]} style={style} />
        <Speaker pos={[0.5, TOP, 0.4]} style={style} />
      </>)}

      {style === "qa" && (<>
        <Frame style={style} top="#2E323A" topTex />
        <TBox size={[W, 0.012, 0.16]} pos={[0, TOP + 0.002, D / 2 - 0.1]} tex={TEX.hazard} tile={0.5} cast={false} />
        {[-1, 1].map(s => (
          <group key={s}>
            <Monitor pos={[s * 0.5, TOP, 0.08]} w={0.46} h={0.27} rotY={s * 0.15} style={style} screen="#2A1414" bars="#FF6B6B" />
            <Cyl rt={0.014} rb={0.014} h={0.3} pos={[s * 0.5, TOP + 0.4, 0.1]} color={C.steelLight} seg={6} />
            <Monitor pos={[s * 0.5, TOP + 0.32, 0.1]} w={0.46} h={0.27} rotY={s * 0.15} style={style} screen="#2A1414" bars="#FFFFFF" />
          </group>
        ))}
        <Keyboard pos={[0, TOP, -0.34]} style={style} w={0.46} />
        <MousePad pos={[0.45, TOP, -0.34]} size={[0.6, 0.34]} color="#1A1C20" style={style} />
        <PCTower pos={[1.2, TOP, -0.05]} style={style} />
        {/* phones and a tablet under test */}
        {[0, 1, 2, 3].map(i => (
          <group key={i} position={[-1.2 + i * 0.13, TOP, 0.35]} rotation={[0, 0.2, 0]}>
            <Box size={[0.08, 0.02, 0.1]} pos={[0, 0.01, 0]} color={C.black} />
            <Box size={[0.07, 0.13, 0.008]} pos={[0, 0.085, -0.02]} rot={[-0.25, 0, 0]} color={["#2A3B66", "#2A5640", "#5A2A3B", "#4A3A22"][i]} emissive={["#6FB6FF", "#39FF88", "#FF6B8A", "#FFB000"][i]} emissiveIntensity={0.8} cast={false} />
          </group>
        ))}
        {/* signal tower light */}
        <group position={[-1.3, TOP, -0.2]}>
          <Cyl rt={0.03} rb={0.04} h={0.04} pos={[0, 0.02, 0]} color={C.black} seg={10} />
          {(["#FF3B3B", "#FFC400", "#39FF88"] as string[]).map((c, i) => <Cyl key={i} rt={0.03} rb={0.03} h={0.05} pos={[0, 0.065 + i * 0.052, 0]} color={c} emissive={c} emissiveIntensity={0.9} seg={10} cast={false} />)}
        </group>
        <Headset pos={[-1.0, TOP, -0.15]} style={style} />
      </>)}

      <group position={[0, 0, -1.15]}><GamingChair main={chair.main} accent={chair.accent} leather={chair.leather} /></group>
    </group>
  );
}
