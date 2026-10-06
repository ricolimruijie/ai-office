import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, MeshToonMaterial } from "three";
import { C } from "./palette";
import { Box, Glass } from "./parts";
import { sceneState } from "./sceneState";
import { toonGradient } from "./toon";

type V3 = [number, number, number];
export type DoorMode = "sensor" | "auto" | "ctrl";

interface DoorProps {
  axis: "x" | "z";             // direction the wall runs, which is also the direction the panels slide
  x: number; z: number; y0?: number;
  width?: number; height?: number;
  mode?: DoorMode;
  /** For mode "ctrl": returns how open the door is, from 0 to 1. */
  ctrl?: () => number;
  sensorY?: number;
}

const RADIUS = 1.9;

/* A sliding glass door in two panels. It opens by itself when anyone walks up to it ("sensor"),
   on a timer ("auto"), or as told by the lift ("ctrl"). */
export function SlideDoor({ axis, x, z, y0 = 0, width = 1.8, height = 2.7, mode = "sensor", ctrl }: DoorProps) {
  const l = useRef<Group>(null), r = useRef<Group>(null), led = useRef<MeshToonMaterial>(null);
  const open = useRef(0);
  const half = width / 2;

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    let target = 0;
    if (mode === "sensor") {
      sceneState.walkers.forEach(m => { if (Math.abs(m.y - y0) < 1.5 && Math.hypot(m.x - x, m.z - z) < RADIUS) target = 1; });
    } else if (mode === "auto") {
      target = (clock.elapsedTime % 24) < 4.5 ? 1 : 0;
    } else if (ctrl) {
      open.current = ctrl();
    }
    if (mode !== "ctrl") open.current += (target - open.current) * Math.min(1, dt * 4.5);
    const o = open.current, slide = half * 0.5 + o * half * 0.92;
    if (l.current) l.current.position.x = -slide;
    if (r.current) r.current.position.x = slide;
    if (led.current) { const on = o > 0.5; led.current.color.set(on ? C.neonGreen : C.neonRed); led.current.emissive.set(on ? C.neonGreen : C.neonRed); }
  });

  const panel = (side: -1 | 1) => (
    <group ref={side < 0 ? l : r} position={[side * half * 0.5, 0, side * 0.045]}>
      <Glass size={[half, height - 0.1, 0.03]} pos={[0, height / 2, 0]} opacity={0.28} tint="#BFE3F0" />
      <Box size={[half, 0.07, 0.07]} pos={[0, height - 0.04, 0]} color={C.steel} cast={false} />
      <Box size={[half, 0.07, 0.07]} pos={[0, 0.05, 0]} color={C.steel} cast={false} />
      <Box size={[0.07, height, 0.07]} pos={[side * (half / 2 - 0.035), height / 2, 0]} color={C.steel} cast={false} />
      <Box size={[0.07, height, 0.07]} pos={[-side * (half / 2 - 0.035), height / 2, 0]} color={C.steel} cast={false} />
      <Box size={[0.04, 0.5, 0.06]} pos={[-side * (half / 2 - 0.12), 1.1, 0.0]} color={C.steelLight} cast={false} />
    </group>
  );

  return (
    <group position={[x, y0, z]} rotation={[0, axis === "x" ? 0 : Math.PI / 2, 0]}>
      {panel(-1)}{panel(1)}
      <Box size={[width + 0.2, 0.18, 0.18]} pos={[0, height + 0.12, 0]} color={C.steel} />
      <mesh position={[0, height + 0.12, 0.1]}>
        <boxGeometry args={[0.36, 0.05, 0.03]} />
        <meshToonMaterial ref={led} color={C.neonRed} emissive={C.neonRed} emissiveIntensity={1.4} gradientMap={toonGradient} />
      </mesh>
    </group>
  );
}

export type { V3 };
