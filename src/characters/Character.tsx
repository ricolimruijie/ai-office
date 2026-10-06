import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import type { AgentConfig } from "../../shared/agents";
import { WALK_SPEED } from "../../shared/layout";
import { STATUS } from "../config/status";
import { setAnchor, sceneState } from "../scene/sceneState";
import { useOfficeStore } from "../state/officeStore";
import { AccessoryMesh, Hair, Hand, HeadExtras, INK, OutfitChest, shade, type FingerState } from "./CharacterParts";
import { stepMotion, type RobotMotion } from "./motion";
import { Blk, Caps, Cylr, Dome, outlineMat, Ring, Sph } from "./parts3d";
import { computePose, makePose } from "./pose";

const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOTION = reduceMotion ? 0.35 : 1;
const BODY_SCALE = 0.9;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function easeAngle(cur: number, target: number, k: number) {
  let d = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return cur + d * k;
}
const tmp = new Vector3();

/* Joint names. Each is a group in the skeleton; the pose moves them every frame. */
const JOINTS = [
  "body", "hips", "spine", "chest", "neck", "head", "skull",
  "shL", "shR", "elL", "elR", "wrL", "wrR", "thL", "thR", "knL", "knR", "anL", "anR", "t1", "t2", "t3",
  "eyeL", "eyeR", "pupL", "pupR", "lidL", "lidR", "browL", "browR", "smile", "mouthIn", "teeth", "cheekL", "cheekR",
  "gem", "doc", "cue", "padL", "padR", "cup", "sweat", "boneBlob"
] as const;
type JointName = (typeof JOINTS)[number];

interface Props { agent: AgentConfig; motion: RobotMotion }

/* A ghost or zombie with a full skeleton (pelvis, spine, chest, neck, head, shoulders, elbows, wrists with five-finger hands, hips,
   knees and ankles; ghosts get a swaying tail instead of legs) and a face that changes expression with what the character is doing.
   Everything is read each frame, so it never re-renders. */
export function Character({ agent, motion }: Props) {
  const look = agent.look;
  const ghost = look.kind === "ghost";
  const skin = look.skin ?? (ghost ? "#E6ECFF" : "#8FC48A");
  const hairStyle = look.hair ?? "none", hairColor = look.hairColor ?? "#2B2B33";
  const outfit = look.outfit ?? "none", outfitColor = look.outfitColor ?? agent.color;
  const pants = look.pants ?? "#2F3547", accessory = look.accessory ?? "none", extras = look.extras ?? [];
  const sleeve = outfit === "suit" || outfit === "hoodie" || outfit === "labcoat" ? outfitColor : skin;
  const longSleeve = outfit === "suit" || outfit === "hoodie" || outfit === "labcoat";
  const bodyOpacity = ghost ? 0.93 : undefined;
  const glow = ghost ? skin : undefined;

  const J = useMemo(() => Object.fromEntries(JOINTS.map(n => [n, { current: null as Group | null }])) as Record<JointName, { current: Group | null }>, []);
  const root = useRef<Group>(null);
  const gemMat = useRef<MeshStandardMaterial>(null);
  const smileMesh = useRef<Mesh>(null), mouthMesh = useRef<Mesh>(null);
  const P = useMemo(() => makePose(), []);
  const fingerL = useMemo<FingerState>(() => ({ grip: 0.3, wiggle: 0 }), []);
  const fingerR = useMemo<FingerState>(() => ({ grip: 0.3, wiggle: 0 }), []);
  const select = useOfficeStore(s => s.select);
  const seed = useMemo(() => Math.random() * 10, []);
  const shown = useRef("");
  const tint = useMemo(() => new Color(), []);
  const lookNow = useRef({ x: 0, y: 0 });

  useEffect(() => {
    sceneState.walkers.set(agent.id, motion);
    return () => { sceneState.walkers.delete(agent.id); };
  }, [agent.id, motion]);

  useFrame((state, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.1), t = state.clock.elapsedTime, m = MOTION;
    const a = useOfficeStore.getState().agents[agent.id];
    const k = 1 - Math.exp(-13 * dt), kf = 1 - Math.exp(-20 * dt);
    // Ink outlines are a detail you only see up close, so skip drawing them from far away (saves a lot of draw calls).
    outlineMat.visible = state.camera.position.distanceTo(g.position) < 38;
    const walkingNow = stepMotion(motion, dt, WALK_SPEED * motion.speedMul) || motion.pose === "walking";
    const since = (performance.now() - a.statusSince) / 1000;

    // In a meeting everyone takes turns to speak, a few seconds each, in seat order.
    const { order } = useOfficeStore.getState();
    const speaking = motion.pose === "activity" && motion.activity === "meeting" && Math.floor(t / 4.5) % order.length === order.indexOf(agent.id);
    computePose({
      kind: look.kind, status: a.status, pose: motion.pose, activity: motion.activity, t, walkPhase: motion.walkPhase, since,
      carry: motion.carry, seed, motionScale: m, speaking
    }, P);

    // root: position, heading, a hop of joy when a task is done
    const hop = a.status === "done" && since < 1.3 && motion.pose === "seated" ? Math.abs(Math.sin(since * 7)) * 0.04 * m : 0;
    g.position.set(motion.x, motion.y + hop, motion.z);
    g.rotation.y = easeAngle(g.rotation.y, motion.heading, k);

    const rot = (j: JointName, x: number, y: number, z: number, kk = k) => {
      const o = J[j].current;
      if (!o) return;
      o.rotation.x += (x - o.rotation.x) * kk; o.rotation.y += (y - o.rotation.y) * kk; o.rotation.z += (z - o.rotation.z) * kk;
    };

    // skeleton
    const hips = J.hips.current;
    if (hips) hips.position.y += (P.hipsY - hips.position.y) * k;
    rot("spine", P.spineX, P.spineY, P.spineZ); rot("chest", P.chestX, 0, P.chestZ);
    rot("head", P.headX, P.headY, P.headZ);
    rot("shL", P.shLX, 0, P.shLZ); rot("shR", P.shRX, 0, P.shRZ);
    rot("elL", P.elLX, 0, 0); rot("elR", P.elRX, 0, 0); rot("wrL", P.wrLX, 0, 0); rot("wrR", P.wrRX, 0, 0);
    if (!ghost) {
      rot("thL", P.thLX, 0, P.thLZ); rot("thR", P.thRX, 0, P.thRZ);
      rot("knL", P.knLX, 0, 0); rot("knR", P.knRX, 0, 0); rot("anL", P.anLX, 0, 0); rot("anR", P.anRX, 0, 0);
    } else {
      rot("t1", P.tail1X, 0, P.tail1Z); rot("t2", P.tail2X, 0, P.tail2Z); rot("t3", P.tail3X, 0, P.tail3Z);
    }
    fingerL.grip += (P.gripL - fingerL.grip) * k; fingerR.grip += (P.gripR - fingerR.grip) * k;
    fingerL.wiggle = P.wiggle; fingerR.wiggle = P.wiggle;
    if (J.cue.current) J.cue.current.visible = P.prop === "cue";
    if (J.padL.current) J.padL.current.visible = P.prop === "pad";
    if (J.padR.current) J.padR.current.visible = P.prop === "pad";
    if (J.cup.current) J.cup.current.visible = P.prop === "cup";
    if (J.doc.current) J.doc.current.visible = motion.carry;
    if (J.sweat.current) J.sweat.current.visible = a.status === "error";

    // eyes: follow the camera when relaxed, otherwise look where the mood says
    let lx = P.lookX, ly = P.lookY;
    const skull = J.skull.current;
    if (P.look === "camera" && skull) {
      tmp.copy(state.camera.position); skull.worldToLocal(tmp);
      const len = tmp.length() || 1;
      lx = tmp.z > 0 ? clamp(tmp.x / len * 2.4, -1, 1) : 0; ly = tmp.z > 0 ? clamp((tmp.y - 0.0) / len * 2.4, -1, 1) : 0;
    }
    lookNow.current.x += (lx - lookNow.current.x) * kf; lookNow.current.y += (ly - lookNow.current.y) * kf;
    for (const side of ["L", "R"] as const) {
      const pup = J[("pup" + side) as JointName].current;
      if (pup) pup.position.set(lookNow.current.x * 0.02, lookNow.current.y * 0.018, 0);
    }
    // eyelids: blink every few seconds, narrow when focused, wide when startled
    const period = 3.4 + (seed % 2), phase = (t + seed) % period;
    const blink = phase < 0.15 ? Math.sin((phase / 0.15) * Math.PI) : 0;
    const lid = clamp(P.lid, -0.5, 1), closed = clamp(Math.max(lid, 0) + blink, 0, 1);
    const lidAngle = -1.45 + closed * 2.8;
    for (const side of ["L", "R"] as const) {
      const lo = J[("lid" + side) as JointName].current, eye = J[("eye" + side) as JointName].current;
      if (lo) lo.rotation.x += (lidAngle - lo.rotation.x) * kf;
      if (eye) eye.scale.setScalar(1 + Math.max(0, -lid) * 0.35);
    }
    // brows
    const bL = J.browL.current, bR = J.browR.current;
    if (bL) { bL.position.y += (0.128 + (P.browRaise + P.browLRaise) * 0.026 - bL.position.y) * kf; bL.rotation.z += (-P.browAngry * 0.45 - bL.rotation.z) * kf; }
    if (bR) { bR.position.y += (0.128 + P.browRaise * 0.026 - bR.position.y) * kf; bR.rotation.z += (P.browAngry * 0.45 - bR.rotation.z) * kf; }
    // mouth: a curve that flips from smile to frown, and an opening
    const sm = J.smile.current, mi = J.mouthIn.current, teeth = J.teeth.current;
    const cy = Math.abs(P.mouthCurve) < 0.1 ? (P.mouthCurve < 0 ? -0.1 : 0.1) : P.mouthCurve;
    if (sm) {
      sm.scale.x += (P.mouthW - sm.scale.x) * kf; sm.scale.y += (cy * 0.9 - sm.scale.y) * kf;
      sm.position.y = -0.095 + 0.058 * sm.scale.y * 0.5;
    }
    if (mi) {
      mi.scale.x += (P.mouthW * 0.95 - mi.scale.x) * kf;
      mi.scale.y += (Math.max(0.001, P.mouthOpen * 1.5) - mi.scale.y) * kf;
      mi.visible = P.mouthOpen > 0.03;
      mi.position.y = -0.1 - P.mouthOpen * 0.01;
    }
    if (teeth) teeth.visible = P.mouthOpen > 0.18;
    const cl = J.cheekL.current, cr = J.cheekR.current;
    if (cl) cl.scale.setScalar(Math.max(0.001, P.cheek)); if (cr) cr.scale.setScalar(Math.max(0.001, P.cheek));

    // status gem above the head
    if (shown.current !== a.status) {
      shown.current = a.status;
      tint.set(STATUS[a.status].color);
      gemMat.current?.color.copy(tint); gemMat.current?.emissive.copy(tint);
    }
    const gem = J.gem.current;
    if (gem) { gem.rotation.y = t * 1.8; gem.position.y = 2.15 + Math.sin(t * 2.2 + seed) * 0.05 * m; }
    if (gemMat.current) gemMat.current.emissiveIntensity = a.status === "error" ? (Math.sin(t * 10) > 0 ? 1.6 : 0.3) : a.status === "thinking" ? 0.6 + 0.4 * Math.sin(t * 6) : 0.9;

    void walkingNow;
    setAnchor(agent.id, motion.x, g.position.y + 2.5, motion.z);
  });

  const body = (o?: number) => ({ opacity: o, emissive: glow, emissiveIntensity: glow ? 0.28 : undefined });
  const eye = (s: -1 | 1) => {
    const z = !ghost;
    return (
      <group position={[s * 0.095, 0.03, 0.205]} scale={z ? (s < 0 ? 1.22 : 0.9) : 1}>
        <group ref={J[s < 0 ? "eyeL" : "eyeR"]}>
          {z ? <>
            <Ring r={0.068} tube={0.014} pos={[0, 0, -0.012]} color={shade(skin, 0.55)} />
            <Sph r={0.062} color="#E9F2C6" outline={false} seg={14} />
          </> : <Sph r={0.066} scale={[0.85, 1.2, 0.6]} color={INK} outline={false} seg={14} />}
          <group ref={J[s < 0 ? "pupL" : "pupR"]}>
            {z ? <>
              <Sph r={0.032} pos={[0, 0, 0.05]} color="#2A3320" outline={false} seg={10} />
              <Sph r={0.012} pos={[0.01, 0.012, 0.078]} color="#FFFFFF" outline={false} seg={6} />
            </> : <>
              <Sph r={0.02} pos={[0.02, 0.035, 0.038]} color="#FFFFFF" outline={false} seg={8} />
              <Sph r={0.011} pos={[-0.018, -0.022, 0.04]} color="#FFFFFF" outline={false} seg={6} />
            </>}
          </group>
          <group ref={J[s < 0 ? "lidL" : "lidR"]} rotation={[-1.45, 0, 0]}>
            <Dome r={z ? 0.07 : 0.075} theta={Math.PI * 0.5} color={skin} outline={false} />
          </group>
        </group>
      </group>
    );
  };
  const brow = (s: -1 | 1) => (
    <group ref={J[s < 0 ? "browL" : "browR"]} position={[s * 0.095, 0.128, 0.205]}>
      <Blk size={[0.088, z2(ghost) ? 0.014 : 0.022, 0.02]} pos={[0, 0, 0]} color={ghost ? INK : shade(hairColor === "#2B2B33" ? "#3A3A44" : hairColor, 0.9)} />
    </group>
  );
  const armColor = (s: -1 | 1) => (s ? sleeve : sleeve);

  return (
    <group ref={root} position={[motion.x, motion.y, motion.z]} onClick={e => { e.stopPropagation(); select(agent.id); }}>
      <group ref={J.body} scale={BODY_SCALE}>
        <group ref={J.hips} position={[0, 0.92, 0]}>
          {/* pelvis, and legs (zombie) or a swaying tail (ghost) */}
          {ghost ? (<>
            <Sph r={0.2} scale={[1, 0.85, 0.95]} color={skin} {...body(bodyOpacity)} />
            <group ref={J.t1} position={[0, -0.06, 0]}>
              <Cylr rt={0.19} rb={0.15} h={0.26} pos={[0, -0.13, 0]} color={skin} {...body(bodyOpacity)} />
              <group ref={J.t2} position={[0, -0.26, 0]}>
                <Cylr rt={0.15} rb={0.1} h={0.24} pos={[0, -0.12, 0]} color={skin} {...body(bodyOpacity)} />
                <group ref={J.t3} position={[0, -0.24, 0]}>
                  <Cylr rt={0.1} rb={0.03} h={0.28} pos={[0, -0.14, 0]} color={skin} {...body(bodyOpacity)} />
                  <Sph r={0.03} pos={[0, -0.29, 0]} color={skin} seg={8} {...body(bodyOpacity)} />
                </group>
              </group>
            </group>
          </>) : (<>
            <Sph r={0.17} scale={[1.05, 0.75, 0.85]} color={pants} />
            {([-1, 1] as const).map(s => (
              <group key={s} ref={J[s < 0 ? "thL" : "thR"]} position={[s * 0.1, -0.03, 0]}>
                <Cylr rt={0.085} rb={0.07} h={0.4} pos={[0, -0.2, 0]} color={pants} />
                <group ref={J[s < 0 ? "knL" : "knR"]} position={[0, -0.4, 0]}>
                  <Sph r={0.07} color={pants} seg={10} outline={false} />
                  <Cylr rt={0.066} rb={0.055} h={0.44} pos={[0, -0.22, 0]} color={pants} />
                  {s < 0 && <Cylr rt={0.058} rb={0.05} h={0.14} pos={[0, -0.37, 0]} color={skin} />}
                  <group ref={J[s < 0 ? "anL" : "anR"]} position={[0, -0.44, 0]}>
                    <Blk size={[0.115, 0.075, 0.27]} pos={[0, -0.03, 0.06]} color="#2A2D36" outline />
                    <Blk size={[0.12, 0.025, 0.28]} pos={[0, -0.07, 0.06]} color="#E9E6DC" />
                  </group>
                </group>
              </group>
            ))}
          </>)}

          <group ref={J.spine} position={[0, 0.06, 0]}>
            <group ref={J.chest} position={[0, 0.14, 0]}>
              <Caps r={ghost ? 0.19 : 0.17} len={0.14} pos={[0, 0.1, 0]} color={skin} {...body(bodyOpacity)} />
              <OutfitChest outfit={outfit} color={outfitColor} accent={skin} ghost={ghost} />
              {extras.includes("bowtie") && (
                <group position={[0, 0.3, ghost ? 0.17 : 0.15]}>
                  {[-1, 1].map(s => <mesh key={s} position={[s * 0.045, 0, 0]} rotation={[0, 0, s * Math.PI / 2]} castShadow><coneGeometry args={[0.04, 0.07, 6]} /><meshToonMaterial color="#C8423A" /></mesh>)}
                  <Sph r={0.02} color="#9E2F2A" outline={false} seg={8} />
                </group>
              )}
              {/* arms */}
              {([-1, 1] as const).map(s => (
                <group key={s} ref={J[s < 0 ? "shL" : "shR"]} position={[s * (ghost ? 0.23 : 0.22), 0.24, 0]}>
                  <Sph r={0.07} color={armColor(s)} seg={10} outline={false} {...(longSleeve ? {} : body(bodyOpacity))} />
                  <Cylr rt={0.06} rb={0.052} h={0.3} pos={[0, -0.15, 0]} color={armColor(s)} {...(longSleeve ? {} : body(bodyOpacity))} />
                  {extras.includes("bone") && s > 0 && (
                    <group position={[0.045, -0.13, 0.04]} rotation={[0, 0, -0.5]}>
                      <Caps r={0.016} len={0.1} color="#F4F1E6" outline={false} />
                      <Sph r={0.026} pos={[0, 0.07, 0]} color="#F4F1E6" outline={false} seg={8} />
                    </group>
                  )}
                  <group ref={J[s < 0 ? "elL" : "elR"]} position={[0, -0.3, 0]}>
                    <Sph r={0.052} color={armColor(s)} seg={10} outline={false} {...(longSleeve ? {} : body(bodyOpacity))} />
                    <Cylr rt={0.05} rb={0.042} h={0.28} pos={[0, -0.14, 0]} color={longSleeve ? sleeve : skin} {...(longSleeve ? {} : body(bodyOpacity))} />
                    <group ref={J[s < 0 ? "wrL" : "wrR"]} position={[0, -0.28, 0]}>
                      <Hand side={s} skin={skin} ghost={ghost} state={s < 0 ? fingerL : fingerR} nail={ghost ? undefined : shade(skin, 0.6)} />
                      {s > 0 && (
                        <group ref={J.cue} visible={false}>
                          <Cylr rt={0.009} rb={0.016} h={1.4} pos={[0, -0.25, 0.01]} color="#C9A27A" seg={8} />
                          <Cylr rt={0.01} h={0.04} pos={[0, -0.97, 0.01]} color="#3E6AA8" seg={8} outline={false} />
                        </group>
                      )}
                      {s > 0 && (
                        <group ref={J.cup} visible={false}>
                          <Cylr rt={0.04} rb={0.032} h={0.1} pos={[0, -0.09, 0.04]} color="#F2F3F7" seg={10} />
                          <Cylr rt={0.036} rb={0.03} h={0.04} pos={[0, -0.075, 0.04]} color="#E3A33A" seg={10} outline={false} />
                        </group>
                      )}
                      <group ref={J[s < 0 ? "padL" : "padR"]} visible={false}>
                        <Blk size={[0.1, 0.045, 0.075]} pos={[0, -0.085, 0.045]} rot={[0.9, 0, 0]} color="#2A2D36" outline />
                        <Sph r={0.012} pos={[s * 0.025, -0.07, 0.07]} color="#7FE6FF" outline={false} seg={6} emissive="#7FE6FF" emissiveIntensity={1} />
                      </group>
                    </group>
                  </group>
                </group>
              ))}

              <group ref={J.neck} position={[0, 0.3, 0]}>
                <Cylr rt={0.07} h={0.14} pos={[0, 0.02, 0]} color={skin} {...body(bodyOpacity)} />
                <group ref={J.head} position={[0, 0.08, 0]}>
                  <group ref={J.skull} position={[0, 0.2, 0]}>
                    <Sph r={0.25} scale={[1, 1.03, 0.98]} color={skin} seg={28} {...body(bodyOpacity)} />
                    {!ghost && [-1, 1].map(s => <Sph key={s} r={0.045} pos={[s * 0.245, -0.01, 0]} scale={[0.6, 1, 0.8]} color={skin} seg={8} />)}
                    {eye(-1)}{eye(1)}
                    {brow(-1)}{brow(1)}
                    {!ghost
                      ? <Sph r={0.03} pos={[0, -0.025, 0.238]} scale={[1, 1.1, 0.9]} color={shade(skin, 0.92)} seg={10} />
                      : <Sph r={0.011} pos={[0, -0.02, 0.243]} color={INK} outline={false} seg={6} />}
                    {[-1, 1].map(s => (
                      <group key={s} ref={J[s < 0 ? "cheekL" : "cheekR"]} position={[s * 0.165, -0.06, 0.17]} rotation={[0, s * 0.6, 0]}>
                        <Sph r={0.045} scale={[1, 0.6, 0.25]} color="#F59AA8" outline={false} seg={10} />
                      </group>
                    ))}
                    <group position={[0, 0, 0.228]} rotation={[-0.12, 0, 0]}>
                      <group ref={J.smile} rotation={[0, 0, Math.PI]} position={[0, -0.095, 0]}>
                        <mesh ref={smileMesh} castShadow><torusGeometry args={[0.058, 0.011, 6, 18, Math.PI]} /><meshToonMaterial color="#7A2E3A" /></mesh>
                      </group>
                      <group ref={J.mouthIn} position={[0, -0.1, -0.004]} visible={false}>
                        <mesh ref={mouthMesh}><sphereGeometry args={[0.04, 12, 10]} /><meshBasicMaterial color="#4A1820" /></mesh>
                      </group>
                      <group ref={J.teeth} position={[0, -0.085, 0.012]} visible={false}>
                        <Blk size={[0.06, 0.012, 0.01]} pos={[0, 0, 0]} color="#F6F3E8" />
                        {!ghost && [-0.02, 0.02].map(x => <mesh key={x} position={[x, -0.012, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.008, 0.016, 4]} /><meshBasicMaterial color="#E9E4D0" /></mesh>)}
                      </group>
                    </group>
                    <Hair style={hairStyle} color={hairColor} />
                    <AccessoryMesh kind={accessory} accent={agent.color} outfit={outfitColor} />
                    <HeadExtras extras={extras} />
                    <group ref={J.sweat} position={[0.27, 0.12, 0.12]} visible={false}>
                      <Sph r={0.035} scale={[1, 1.2, 1]} color="#7FC8FF" outline={false} seg={8} />
                      <mesh position={[0, 0.055, 0]}><coneGeometry args={[0.026, 0.06, 8]} /><meshToonMaterial color="#7FC8FF" /></mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      <group ref={J.doc} position={[0, 0.95, 0.5]} rotation={[-0.3, 0, 0]} visible={false}>
        <Blk size={[0.27, 0.02, 0.35]} pos={[0, 0, 0]} color="#FFFFFF" outline />
        {[-0.1, -0.03, 0.04, 0.11].map(z => <Blk key={z} size={[0.18, 0.004, 0.012]} pos={[0, 0.012, z]} color="#9AA3B8" />)}
      </group>

      <group ref={J.gem} position={[0, 2.15, 0]}>
        <mesh scale={[1, 1.6, 1]}>
          <octahedronGeometry args={[0.115]} />
          <meshStandardMaterial ref={gemMat} color={STATUS.idle.color} emissive={STATUS.idle.color} emissiveIntensity={0.9} flatShading />
        </mesh>
      </group>
    </group>
  );
}

const z2 = (ghost: boolean) => ghost;
