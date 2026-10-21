import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { C } from "./palette";
import { Box } from "./parts";
import { sceneState } from "./sceneState";

export type DoorMode = "sensor" | "auto";

interface DoorProps {
  axis: "x" | "z";             // direction the wall runs
  x: number; z: number; y0?: number;
  width?: number; height?: number;
  mode?: DoorMode;
}

const RADIUS = 2.2;

/* Heavy oak double gates with iron straps. They swing open by themselves when anyone walks up ("sensor") or on a timer ("auto"). */
export function GateDoor({ axis, x, z, y0 = 0, width = 2.4, height = 3.0, mode = "sensor" }: DoorProps) {
  const l = useRef<Group>(null), r = useRef<Group>(null);
  const open = useRef(0);
  const half = width / 2;

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    let target = 0;
    if (mode === "sensor") {
      sceneState.walkers.forEach(m => { if (Math.abs(m.y - y0) < 1.5 && Math.hypot(m.x - x, m.z - z) < RADIUS) target = 1; });
    } else {
      target = (clock.elapsedTime % 24) < 4.5 ? 1 : 0;
    }
    open.current += (target - open.current) * Math.min(1, dt * 3.5);
    const a = open.current * 1.75;
    if (l.current) l.current.rotation.y = -a;
    if (r.current) r.current.rotation.y = a;
  });

  const leaf = (side: -1 | 1) => (
    <group ref={side < 0 ? l : r} position={[side * half, 0, 0]}>
      <group position={[-side * half / 2, 0, 0]}>
        <Box size={[half, height, 0.1]} pos={[0, height / 2, 0]} color="#5C3B26" />
        {[0.28, 0.72].map(f => <Box key={f} size={[half - 0.04, 0.09, 0.13]} pos={[0, height * f, 0]} color={C.iron} cast={false} />)}
        {[-0.28, 0.28].map(dx => <Box key={dx} size={[0.05, height - 0.1, 0.12]} pos={[dx * half, height / 2, 0]} color="#47301F" cast={false} />)}
        <Box size={[0.1, 0.1, 0.16]} pos={[-side * (half / 2 - 0.12), 1.2, 0]} color={C.gold} cast={false} />
      </group>
    </group>
  );

  return (
    <group position={[x, y0, z]} rotation={[0, axis === "x" ? 0 : Math.PI / 2, 0]}>
      {leaf(-1)}{leaf(1)}
    </group>
  );
}
