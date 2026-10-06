import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, Points, ShaderMaterial, type Mesh, type PointsMaterial } from "three";
import { effectiveHour } from "../state/clockStore";
import { rng } from "./rng";
import { makeSky, skyAt } from "./timeOfDay";
import { Ball } from "./parts";

const vertex = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const fragment = `uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vDir;
  void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(horizonColor, topColor, pow(h, 0.55)); gl_FragColor = vec4(c, 1.0); }`;

/* The sky dome, the sun or moon, stars and a few clouds, all following the time of day. */
export function Sky() {
  const sky = useMemo(() => makeSky(), []);
  const mat = useMemo(() => new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, side: BackSide, depthWrite: false, fog: false,
    uniforms: { topColor: { value: new Color() }, horizonColor: { value: new Color() } } }), []);
  const body = useRef<Mesh>(null), glow = useRef<Mesh>(null), stars = useRef<Points>(null);
  const starPos = useMemo(() => {
    const r = rng(42), a = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(0.05 + r() * 0.95), R = 280;
      a[i * 3] = Math.sin(ph) * Math.cos(th) * R; a[i * 3 + 1] = Math.cos(ph) * R; a[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * R;
    }
    return a;
  }, []);

  useFrame(({ scene }) => {
    skyAt(effectiveHour(), sky);
    mat.uniforms.topColor.value.copy(sky.top);
    mat.uniforms.horizonColor.value.copy(sky.horizon);
    if (scene.background instanceof Color) scene.background.copy(sky.horizon); else scene.background = new Color().copy(sky.horizon);
    if (scene.fog) scene.fog.color.copy(sky.horizon);
    if (body.current) {
      body.current.position.copy(sky.bodyPos);
      const m = body.current.material as unknown as { color: Color };
      m.color.set(sky.isMoon ? "#FFF3E0" : "#FFE9B0");
      body.current.scale.setScalar(sky.isMoon ? 1 : 1.5);
      body.current.visible = sky.bodyPos.y > 8;
    }
    if (glow.current) {
      glow.current.position.copy(sky.bodyPos);
      glow.current.visible = sky.bodyPos.y > 8;
      (glow.current.material as unknown as { color: Color }).color.set(sky.isMoon ? "#C8B0FF" : "#FFB868");
      glow.current.scale.setScalar(sky.isMoon ? 2.6 : 3.2);
    }
    if (stars.current) { (stars.current.material as PointsMaterial).opacity = sky.stars; stars.current.visible = sky.stars > 0.02; }
  });

  return (
    <group>
      <mesh renderOrder={-10} material={mat}><sphereGeometry args={[300, 24, 16]} /></mesh>
      <points ref={stars} frustumCulled={false}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[starPos, 3]} /></bufferGeometry>
        <pointsMaterial color="#FFFFFF" size={1.6} sizeAttenuation={false} transparent opacity={0} depthWrite={false} fog={false} />
      </points>
      <mesh ref={glow}><sphereGeometry args={[14, 16, 12]} /><meshBasicMaterial transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} fog={false} /></mesh>
      <mesh ref={body}><sphereGeometry args={[9, 20, 14]} /><meshBasicMaterial fog={false} /></mesh>
      <Cloud x={-90} y={60} z={-120} s={2.2} speed={1.1} seed={1} />
      <Cloud x={20} y={75} z={-150} s={2.8} speed={0.7} seed={2} />
      <Cloud x={110} y={55} z={-100} s={1.9} speed={1.3} seed={3} />
      <Cloud x={-30} y={50} z={-90} s={1.6} speed={0.9} seed={4} />
    </group>
  );
}

function Cloud({ x, y, z, s, speed, seed }: { x: number; y: number; z: number; s: number; speed: number; seed: number }) {
  const g = useRef<import("three").Group>(null);
  const puffs = useMemo(() => { const r = rng(seed); return Array.from({ length: 6 }, (_, i) => ({ x: (i - 2.5) * 2.4 * s, y: r() * 1.2 * s, r: (1.8 + r()) * s })); }, [seed, s]);
  useFrame((_, dt) => { if (g.current) { g.current.position.x += dt * speed; if (g.current.position.x > 190) g.current.position.x = -190; } });
  return (
    <group ref={g} position={[x, y, z]}>
      {puffs.map((p, i) => <Ball key={i} r={p.r} pos={[p.x, p.y, 0]} scale={[1.5, 0.7, 0.9]} color="#F4F6FA" cast={false} seg={10} />)}
    </group>
  );
}
