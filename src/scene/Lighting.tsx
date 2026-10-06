import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { DirectionalLight, HemisphereLight, PointLight } from "three";
import type { Layout } from "../../shared/layout";
import { effectiveHour } from "../state/clockStore";
import { lampMat, windowMat } from "./materials";
import { makeSky, skyAt } from "./timeOfDay";

const SHADOW: [number, number] = typeof innerWidth === "number" && innerWidth < 760 ? [2048, 2048] : [4096, 4096];

/* Sun or moon, sky light, and the building's own lamps, all following the time of day.
   At night the windows and the interior lights come on. */
export function Lighting({ layout }: { layout: Layout }) {
  const sky = useMemo(() => makeSky(), []);
  const sun = useRef<DirectionalLight>(null), hemi = useRef<HemisphereLight>(null);
  const lamps = useRef<(PointLight | null)[]>([]);

  const spots = useMemo(() => {
    const out: [number, number, number][] = [];
    layout.rooms.forEach(r => { const cx = (r.minX + r.maxX) / 2, w = r.maxX - r.minX; out.push([cx - w * 0.22, 3.1, -3.4], [cx + w * 0.22, 3.1, -5.4]); });
    out.push([0, 3.0, 1.9], [layout.lobby.minX + 3, 3.0, -2]);
    if (layout.suite) out.push([(layout.suite.minX + layout.suite.maxX) / 2, layout.suite.y + 3.1, -14.5]);
    if (layout.lounge) {
      const l = layout.lounge, y = l.y + 3.2;
      out.push([l.minX + 4, y, -15], [l.minX + 10, y, -16], [l.minX + 7, y, -11.5], [l.minX + 13, y, -12.5]);
    }
    return out;
  }, [layout]);

  useFrame(() => {
    skyAt(effectiveHour(), sky);
    if (sun.current) {
      sun.current.position.copy(sky.sunPos);
      sun.current.color.copy(sky.sun);
      sun.current.intensity = sky.sunI;
    }
    if (hemi.current) { hemi.current.color.copy(sky.hemiSky); hemi.current.groundColor.copy(sky.hemiGround); hemi.current.intensity = sky.hemiI; }
    windowMat.emissiveIntensity = sky.windows * 1.1;
    lampMat.emissiveIntensity = 0.7 + sky.lamps * 1.5;       // lamps always glow a little, so rooms feel lived in
    lamps.current.forEach(l => { if (l) l.intensity = 9 + sky.lamps * 26; });
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#ffffff", "#8a93ad", 1]} />
      <directionalLight
        ref={sun} position={[12, 22, 14]} castShadow
        shadow-mapSize={SHADOW} shadow-bias={-0.0004}
        shadow-camera-left={-42} shadow-camera-right={42} shadow-camera-top={42} shadow-camera-bottom={-42}
        shadow-camera-near={1} shadow-camera-far={140}
      />
      {spots.map((s, i) => (
        <pointLight key={i} ref={el => { lamps.current[i] = el; }} position={s} color="#FFBE7F" intensity={0} distance={14} decay={2} />
      ))}
    </>
  );
}
