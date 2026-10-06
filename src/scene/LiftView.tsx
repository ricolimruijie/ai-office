import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { UPPER_Y, type Layout } from "../../shared/layout";
import { SlideDoor } from "./Doors";
import { liftState, updateLift } from "./lift";
import { lampMat } from "./materials";
import { C } from "./palette";
import { Box, Cyl, Glass } from "./parts";

/* The glass lift: a steel shaft you can see through, a cab that really travels between floors, and doors that open and close with it. */
export function LiftView({ layout }: { layout: Layout }) {
  const lf = layout.lift!;
  const cab = useRef<Group>(null), cable = useRef<Mesh>(null), lamp = useRef<Mesh>(null), arrow = useRef<Group>(null);
  const top = lf.topY, sx0 = lf.shaftMinX, sx1 = lf.shaftMaxX, sz0 = lf.shaftMinZ, sz1 = lf.shaftMaxZ;
  const w = sx1 - sx0, d = sz1 - sz0, cx = (sx0 + sx1) / 2, cz = (sz0 + sz1) / 2;
  const levels = [0.1, 2.4, UPPER_Y + 0.1, UPPER_Y + 2.4, top];
  const cabH = 2.7;

  useFrame((state, dt) => {
    updateLift(Math.min(dt, 0.1));
    if (cab.current) cab.current.position.y = liftState.cabY;
    if (cable.current) {
      const len = top - (liftState.cabY + cabH);
      cable.current.scale.y = Math.max(0.01, len);
      cable.current.position.y = liftState.cabY + cabH + len / 2;
    }
    if (lamp.current) lamp.current.visible = liftState.moving ? Math.sin(state.clock.elapsedTime * 10) > 0 : true;
    if (arrow.current) { arrow.current.visible = liftState.moving; arrow.current.scale.y = liftState.dir >= 0 ? 1 : -1; }
  });

  return (
    <group>
      {/* frame */}
      {[[sx0, sz0], [sx1, sz0], [sx0, sz1], [sx1, sz1]].map(([x, z], i) => (
        <group key={i}>
          <Box size={[0.22, top, 0.22]} pos={[x, top / 2, z]} color={C.steel} />
          {Array.from({ length: Math.floor(top / 1.2) }, (_, k) => <Box key={k} size={[0.26, 0.3, 0.26]} pos={[x, 0.6 + k * 1.2, z]} color={k % 2 ? C.black : C.hazard} cast={false} />)}
        </group>
      ))}
      {levels.map(y => (
        <group key={y}>
          <Box size={[w, 0.14, 0.14]} pos={[cx, y, sz0]} color={C.steelMid} cast={false} />
          <Box size={[w, 0.14, 0.14]} pos={[cx, y, sz1]} color={C.steelMid} cast={false} />
          <Box size={[0.14, 0.14, d]} pos={[sx0, y, cz]} color={C.steelMid} cast={false} />
          <Box size={[0.14, 0.14, d]} pos={[sx1, y, cz]} color={C.steelMid} cast={false} />
        </group>
      ))}
      {/* glass on all four sides */}
      <Glass size={[w, top, 0.05]} pos={[cx, top / 2, sz0]} opacity={0.22} />
      <Glass size={[0.05, top, d]} pos={[sx1, top / 2, cz]} opacity={0.22} />
      <Glass size={[0.05, top, d]} pos={[sx0, top / 2, cz]} opacity={0.22} />
      <Glass size={[w, top - 2.9, 0.05]} pos={[cx, 2.9 + (top - 2.9) / 2, sz1]} opacity={0.22} />
      {/* landing doors: ground (front) and upstairs (side), open only while the cab is on that floor */}
      <SlideDoor axis="x" x={lf.x} z={sz1} y0={0} width={1.8} height={2.7} mode="ctrl" ctrl={() => (liftState.cabY < 0.4 ? liftState.front : 0)} />
      <SlideDoor axis="z" x={sx0} z={lf.z} y0={UPPER_Y} width={1.8} height={2.7} mode="ctrl" ctrl={() => (Math.abs(liftState.cabY - UPPER_Y) < 0.4 ? liftState.side : 0)} />
      <Box size={[0.12, 2.8, 0.12]} pos={[lf.x - 1.0, 1.4, sz1]} color={C.hazard} />
      <Box size={[0.12, 2.8, 0.12]} pos={[lf.x + 1.0, 1.4, sz1]} color={C.hazard} />
      {/* floor indicator over the ground doors */}
      <Box size={[0.7, 0.3, 0.08]} pos={[lf.x, 3.2, sz1]} color={C.black} />
      <group position={[lf.x, 3.2, sz1 + 0.06]} ref={arrow}>
        <mesh rotation={[0, 0, 0]}><coneGeometry args={[0.09, 0.16, 3]} /><meshBasicMaterial color={C.neonGreen} /></mesh>
      </group>
      {/* machinery */}
      <Box size={[w - 0.2, 0.6, d - 0.2]} pos={[cx, top + 0.3, cz]} color={C.steelBlue} />
      <mesh ref={lamp} position={[cx, top + 0.7, cz]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color={C.neonRed} /></mesh>
      <Cyl rt={0.3} rb={0.3} h={0.5} pos={[cx, top + 0.85, cz]} rot={[0, 0, Math.PI / 2]} color={C.hazard} seg={12} />
      <mesh ref={cable} position={[lf.x, top - 0.5, lf.z]}>
        <cylinderGeometry args={[0.025, 0.025, 1, 6]} /><meshToonMaterial color={C.black} />
      </mesh>

      {/* cab */}
      <group ref={cab} position={[lf.x, 0, lf.z]}>
        <Box size={[lf.width, 0.14, lf.width]} pos={[0, 0.07, 0]} color={C.steelMid} />
        <Box size={[lf.width - 0.3, 0.02, lf.width - 0.3]} pos={[0, 0.15, 0]} color={C.concreteDark} cast={false} />
        <Box size={[lf.width, 0.1, lf.width]} pos={[0, cabH, 0]} color={C.steelBlue} />
        <mesh position={[0, cabH - 0.07, 0]} material={lampMat}><boxGeometry args={[1.5, 0.04, 1.5]} /></mesh>
        <Box size={[lf.width, cabH, 0.07]} pos={[0, cabH / 2, -lf.width / 2]} color={C.steelMid} />
        <Box size={[0.07, cabH, lf.width]} pos={[lf.width / 2, cabH / 2, 0]} color={C.steelMid} />
        <Box size={[lf.width - 0.4, 0.05, 0.05]} pos={[0, 1.0, -lf.width / 2 + 0.1]} color={C.steelLight} cast={false} />
        <Box size={[0.05, 0.05, lf.width - 0.4]} pos={[lf.width / 2 - 0.1, 1.0, 0]} color={C.steelLight} cast={false} />
        <Box size={[0.08, 0.5, 0.3]} pos={[lf.width / 2 - 0.1, 1.5, 0.8]} color={C.black} />
        {[0, 1].map(i => <Box key={i} size={[0.03, 0.07, 0.07]} pos={[lf.width / 2 - 0.15, 1.6 - i * 0.14, 0.8]} color={i ? C.neonAmber : C.neonGreen} emissive={i ? C.neonAmber : C.neonGreen} emissiveIntensity={1.6} cast={false} />)}
        {/* cab doors: front (ground floor) and side (upstairs) */}
        <SlideDoor axis="x" x={0} z={lf.width / 2 + 0.0} y0={0.05} width={1.8} height={2.5} mode="ctrl" ctrl={() => liftState.front} />
        <SlideDoor axis="z" x={-lf.width / 2} z={0} y0={0.05} width={1.8} height={2.5} mode="ctrl" ctrl={() => liftState.side} />
        <Glass size={[lf.width, cabH - 0.2, 0.05]} pos={[0, cabH / 2, lf.width / 2]} opacity={0.12} />
      </group>
    </group>
  );
}


