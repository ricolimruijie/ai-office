import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";
import type { Layout } from "../../shared/layout";
import { Box } from "./parts";
import { sceneState, setAnchor } from "./sceneState";

const ROWS = 8, COLS = 3;

export function ModelRouter({ layout }: { layout: Layout }) {
  const { x, y, z } = layout.routerPos;
  setAnchor("router", x, y + 1.45, z);
  const mats = useRef<(MeshStandardMaterial | null)[]>([]);
  const leds = useMemo(() => Array.from({ length: ROWS * COLS }, () => ({ phase: Math.random() * 10, speed: 1 + Math.random() * 3 })), []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    sceneState.routerFlash = Math.max(0, sceneState.routerFlash - dt);
    mats.current.forEach((m, i) => {
      if (!m) return;
      const l = leds[i];
      m.emissiveIntensity = sceneState.routerFlash > 0 ? 1.4 : .25 + .35 * (Math.sin(t * l.speed + l.phase) > .6 ? 1 : 0);
    });
  });

  return (
    <group>
      <Box size={[1.0, 2.1, .7]} pos={[x, y, z]} color="#2B3142" />
      {leds.map((_, i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        return (
          <mesh key={i} position={[x - .26 + c * .26, y - .75 + r * .22, z + .36]} castShadow>
            <boxGeometry args={[.16, .05, .02]} />
            <meshStandardMaterial ref={(m: MeshStandardMaterial | null) => { mats.current[i] = m; }} color="#5CE0A0" emissive="#3FD18C" emissiveIntensity={.3} roughness={.8} />
          </mesh>
        );
      })}
    </group>
  );
}
