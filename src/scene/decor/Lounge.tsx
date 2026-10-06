import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { UPPER_Y, type Layout } from "../../../shared/layout";
import { Glow } from "../desk/gear";
import { NearFade } from "../NearFade";
import { C } from "../palette";
import { Box, Cyl } from "../parts";
import {
  ArcadeCabinet, BarCounter, BeanBag, BilliardTable, CoffeeTable, FloorLamp, Neon, PottedPlant, Rug, SimRig, Sofa, Stool, StringLights, TV
} from "./props";
import type { Group } from "three";

/* The game lounge: arcade, billiards, sim racing, a bar, and two TV corners. The place everyone drifts to when there is nothing to do. */
export function Lounge({ layout }: { layout: Layout }) {
  const L = layout.lounge!, Y = UPPER_Y, u = (d: number) => L.minX + d;
  const ball = useRef<Group>(null);
  useFrame(({ clock }) => { if (ball.current) ball.current.rotation.y = clock.elapsedTime * 0.5; });
  const back = L.minZ + 0.15;

  return (
    <group>
      {/* arcade along the glass wall */}
      {[-11.8, -13.0, -14.2].map((z, i) => <ArcadeCabinet key={z} pos={[u(0.55), Y, z]} rotY={Math.PI / 2} color={["#8A5CFF", "#FF2E93", "#2DE2E6"][i]} />)}

      {/* billiards */}
      <Rug pos={[u(6.2), Y + 0.03, -13.4]} size={[5.6, 3.8]} color="#2B2236" border="#8A5CFF" />
      <BilliardTable pos={[u(6.2), Y, -13.4]} />

      {/* sim racing rigs, facing the wall */}
      <SimRig pos={[u(2.8), Y, -18.0]} color="#E5484D" />
      <SimRig pos={[u(5.5), Y, -18.0]} color="#2DE2E6" />
      <Box size={[6.2, 0.012, 0.1]} pos={[u(4.15), Y + 0.045, -16.6]} color={C.hazard} cast={false} />

      {/* TV nook with bean bags */}
      <TV pos={[u(8.7), Y + 1.7, back]} w={2.3} h={1.3} hue={0.55} />
      <Rug pos={[u(8.7), Y + 0.03, -17.3]} size={[3.0, 2.6]} color="#23304A" border="#3C7DFF" />
      <BeanBag pos={[u(8.7), Y, -17.2]} color="#C8553D" />
      <BeanBag pos={[u(7.5), Y, -17.8]} color="#2F8F8A" />
      <BeanBag pos={[u(9.9), Y, -17.7]} color="#E3B341" />

      {/* PlayStation corner */}
      <TV pos={[u(12.3), Y + 1.75, back]} w={2.9} h={1.6} hue={0.95} />
      <Box size={[2.6, 0.5, 0.5]} pos={[u(12.3), Y + 0.25, back - 0.0 + 0.3]} color="#1B1E26" />
      <Box size={[0.4, 0.07, 0.3]} pos={[u(12.3), Y + 0.54, back + 0.3]} color="#F4F6FA" />
      <Box size={[0.4, 0.015, 0.31]} pos={[u(12.3), Y + 0.59, back + 0.3]} color={C.neonCyan} emissive={C.neonCyan} emissiveIntensity={1.6} cast={false} />
      <Rug pos={[u(12.3), Y + 0.03, -17.0]} size={[4.0, 3.6]} color="#3A1F2E" border="#FF2E93" />
      <Sofa pos={[u(12.3), Y, -16.3]} rotY={Math.PI} w={3.0} color="#2B2E3A" accent="#FF2E93" />
      <CoffeeTable pos={[u(12.3), Y, -17.9]} w={1.4} d={0.7} />

      {/* bar */}
      <BarCounter pos={[u(12.1), Y, -12.4]} w={3.4} />
      {[u(11.4), u(12.8), u(10.0)].map(x => <Stool key={x} pos={[x, Y, -11.0]} color={x === u(10.0) ? "#2F8F8A" : "#C8553D"} />)}

      {/* mood: neon, string lights, a mirror ball, plants and lamps */}
      <NearFade min={14} max={26}>
      <Glow size={[L.maxX - L.minX - 0.4, 0.03, 0.03]} pos={[(L.minX + L.maxX) / 2, Y + 3.5, L.minZ + 0.35]} style="frontend" which="a" />
      <Glow size={[L.maxX - L.minX - 0.4, 0.03, 0.03]} pos={[(L.minX + L.maxX) / 2, Y + 3.5, L.maxZ - 0.35]} style="frontend" which="b" />
      <Glow size={[0.03, 0.03, L.maxZ - L.minZ - 0.4]} pos={[L.maxX - 0.3, Y + 3.5, (L.minZ + L.maxZ) / 2]} style="frontend" which="c" />
      <Glow size={[0.03, 0.03, L.maxZ - L.minZ - 0.4]} pos={[L.minX + 0.3, Y + 3.5, (L.minZ + L.maxZ) / 2]} style="lab" which="a" />
      <Neon size={[0.04, 1.4, 0.04]} pos={[L.minX + 0.2, Y + 1.5, -10.4]} color={C.neonPurple} />
      <StringLights a={[L.minX + 0.3, Y + 3.3, -10.0]} b={[L.maxX - 0.3, Y + 3.3, -10.0]} count={18} sag={0.4} />
      <StringLights a={[L.minX + 0.3, Y + 3.3, -16.0]} b={[L.maxX - 0.3, Y + 3.3, -16.0]} count={18} sag={0.4} />
      <group ref={ball} position={[u(6.2), Y + 3.0, -13.4]}>
        <mesh castShadow><icosahedronGeometry args={[0.32, 1]} /><meshStandardMaterial color="#DFE6F2" flatShading metalness={0.6} roughness={0.25} emissive="#9DB4FF" emissiveIntensity={0.35} /></mesh>
        <Cyl rt={0.008} rb={0.008} h={0.6} pos={[0, 0.5, 0]} color={C.black} seg={4} cast={false} />
      </group>
      </NearFade>
      <PottedPlant pos={[u(0.6), Y, L.minZ + 0.8]} scale={1.3} seed={31} />
      <PottedPlant pos={[L.maxX - 0.7, Y, L.minZ + 0.8]} scale={1.3} seed={32} />
      <PottedPlant pos={[u(7.0), Y, -9.2]} scale={1.1} seed={33} />
      <FloorLamp pos={[u(14.8), Y, -17.2]} color="#FF9AD0" />
      <FloorLamp pos={[u(0.8), Y, -17.5]} color="#7FE6FF" />
    </group>
  );
}
