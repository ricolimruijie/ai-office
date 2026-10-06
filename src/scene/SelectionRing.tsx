import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { useOfficeStore } from "../state/officeStore";
import { sceneState } from "./sceneState";

/* Ring on the floor under the selected agent. Follows it while it walks. */
export function SelectionRing() {
  const ring = useRef<Mesh>(null);
  useFrame(() => {
    const r = ring.current;
    if (!r) return;
    const id = useOfficeStore.getState().selected;
    const a = id ? sceneState.anchors.get(id) : null;
    r.visible = !!a;
    if (a) { r.position.x = a.x; r.position.z = a.z; r.position.y = a.y - 2.0 + .03; }
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]} visible={false}>
      <ringGeometry args={[.48, .58, 40]} />
      <meshBasicMaterial color="#FF9F4A" transparent opacity={.85} />
    </mesh>
  );
}
