import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3, type Group, type Mesh } from "three";
import { DELIVER_S, SUMMON_S, familiarEnds, familiarFlight, type Layout } from "../../shared/layout";
import { onSceneEvent } from "../state/ingest";
import { useOfficeStore } from "../state/officeStore";
import { shade } from "./CharacterParts";
import type { RobotMotion } from "./motion";
import { Blk, Cylr, Sph } from "./parts3d";

const SPARKS = 18;
const GOLD = "#FFE680";
const smooth = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

interface Cast { id: number; from: string; to: string }

/* Reacts to agent.handoff: the sender stays seated, casts a summoning spell, and a familiar (an owl) appears in a burst of
   sparks, flies over with the letter, lands on the other desk and vanishes. The mock server budgets that time from
   `deliveryTime()` in shared/layout.ts, so it can time the receiver's start. */
export function Familiars({ layout, motions }: { layout: Layout; motions: RobotMotion[] }) {
  const [casts, setCasts] = useState<Cast[]>([]);
  const seq = useRef(0);

  useEffect(() => onSceneEvent(e => {
    if (e.kind !== "handoff") return;
    const { order } = useOfficeStore.getState();
    const i = order.indexOf(e.from), j = order.indexOf(e.to);
    const m = motions[i];
    if (i < 0 || j < 0 || i === j || !m || m.pose !== "seated" || m.casting) return;
    setCasts(list => [...list, { id: ++seq.current, from: e.from, to: e.to }]);
  }), [motions]);

  return (
    <>
      {casts.map(c => (
        <FamiliarCast key={c.id} layout={layout} motions={motions} cast={c} onDone={() => setCasts(list => list.filter(x => x.id !== c.id))} />
      ))}
    </>
  );
}

interface CastProps { layout: Layout; motions: RobotMotion[]; cast: Cast; onDone: () => void }

function FamiliarCast({ layout, motions, cast, onDone }: CastProps) {
  const { order, agents } = useOfficeStore.getState();
  const i = order.indexOf(cast.from), j = order.indexOf(cast.to);
  const color = agents[cast.from].cfg.color, toName = agents[cast.to].cfg.name;
  const { from, to } = useMemo(() => familiarEnds(layout, i, j), [layout, i, j]);
  const flight = useMemo(() => familiarFlight(layout, i, j), [layout, i, j]);
  const ctrl = useMemo(() => new Vector3((from.x + to.x) / 2, Math.max(from.y, to.y) + 1.4 + Math.hypot(to.x - from.x, to.z - from.z) * 0.1, (from.z + to.z) / 2), [from, to]);
  const p0 = useMemo(() => new Vector3(from.x, from.y, from.z), [from]);
  const p1 = useMemo(() => new Vector3(to.x, to.y, to.z), [to]);
  const tmp = useMemo(() => new Vector3(), []);

  const owl = useRef<Group>(null), wingL = useRef<Group>(null), wingR = useRef<Group>(null), letter = useRef<Group>(null);
  const ringA = useRef<Mesh>(null), ringB = useRef<Mesh>(null);
  const sparks = useRef<(Mesh | null)[]>([]);
  const clock = useRef(0), phase = useRef<"summon" | "fly" | "land" | "done">("summon");
  const heading = useRef(0);

  const bezier = (u: number, out: Vector3) => {
    const a = 1 - u;
    return out.set(0, 0, 0).addScaledVector(p0, a * a).addScaledVector(ctrl, 2 * a * u).addScaledVector(p1, u * u);
  };

  useEffect(() => {
    const m = motions[i], { setWalkLabel } = useOfficeStore.getState();
    m.casting = true;
    setWalkLabel(cast.from, "Summoning a familiar for " + toName);
    return () => { m.casting = false; useOfficeStore.getState().setWalkLabel(cast.from, null); };
  }, [motions, i, cast.from, toName]);

  useFrame((_, rawDt) => {
    if (phase.current === "done") return;
    const dt = Math.min(rawDt, 0.1);
    const t = (clock.current += dt);
    const flyEnd = SUMMON_S + flight, endT = flyEnd + DELIVER_S;
    const m = motions[i];
    const o = owl.current;
    if (!o) return;

    // the spell: a rune circle blooms under the sender's wand, then the owl is pulled out of the sparks
    if (t >= SUMMON_S && m.casting) m.casting = false;
    const ring = (mesh: Mesh | null, x: number, y: number, z: number, k: number) => {
      if (!mesh) return;
      mesh.position.set(x, y, z);
      mesh.rotation.z = t * 1.6;
      mesh.scale.setScalar(Math.max(0.001, k));
      mesh.visible = k > 0.01;
    };
    const da = layout.desks[i], db = layout.desks[j];
    ring(ringA.current, da.x, da.y + 1.35, da.z - 0.3, t < SUMMON_S ? smooth(clamp01(t / 0.6)) : Math.max(0, 1 - (t - SUMMON_S) / 0.5));
    const landK = clamp01((t - flyEnd) / 0.4);
    ring(ringB.current, db.x - 0.9, db.y + 0.8, db.z + 0.1, t > flyEnd - 0.2 && t < endT - 0.2 ? smooth(landK) : 0);

    // the owl
    let flying = false;
    if (t < SUMMON_S * 0.55) {
      o.visible = false;
    } else if (t < SUMMON_S) {
      o.visible = true; o.position.copy(p0);
      o.scale.setScalar(smooth(clamp01((t - SUMMON_S * 0.55) / (SUMMON_S * 0.45))));
      flying = true; // flaps as it pops out
      phase.current = "summon";
    } else if (t < flyEnd) {
      const u = smooth((t - SUMMON_S) / flight);
      o.visible = true; o.scale.setScalar(1); flying = true; phase.current = "fly";
      bezier(u, o.position);
      bezier(Math.min(1, u + 0.02), tmp).sub(o.position);
      if (Math.hypot(tmp.x, tmp.z) > 1e-4) heading.current = Math.atan2(tmp.x, tmp.z);
      o.rotation.x = -clamp01(tmp.y * 6 + 0.1) * 0.4 + clamp01(-tmp.y * 6) * 0.4;
    } else if (t < endT) {
      phase.current = "land";
      o.visible = true; o.position.copy(p1); o.rotation.x = 0;
      o.scale.setScalar(t > endT - 0.35 ? Math.max(0.001, (endT - t) / 0.35) : 1);
    } else {
      phase.current = "done";
      o.visible = false;
      useOfficeStore.getState().setWalkLabel(cast.from, null);
      onDone();
      return;
    }
    o.rotation.y = heading.current;
    const a = flying ? Math.sin(t * 24) * 0.75 : -1.1;
    if (wingL.current) wingL.current.rotation.z = a;
    if (wingR.current) wingR.current.rotation.z = -a;
    if (letter.current) letter.current.visible = t < flyEnd;

    // the letter lands on the desk the moment the owl touches down
    if (t >= flyEnd && t - dt < flyEnd) useOfficeStore.getState().setInbox(cast.to, true);

    // sparks: swirl up during the spell, trail behind the owl in flight, burst when it vanishes
    for (let k = 0; k < SPARKS; k++) {
      const s = sparks.current[k];
      if (!s) continue;
      const f = k / SPARKS;
      let vis = 0;
      if (t < SUMMON_S + 0.4) {
        const age = ((t * 0.8 + f) % 1), ang = f * 12 + t * 5, r = 0.55 * (1 - age * 0.6);
        s.position.set(p0.x + Math.cos(ang) * r, da.y + 1.0 + age * 0.9, p0.z + Math.sin(ang) * r);
        vis = Math.sin(age * Math.PI) * (t < SUMMON_S ? 1 : 1 - (t - SUMMON_S) / 0.4);
      } else if (t < flyEnd) {
        const u = smooth(clamp01((t - SUMMON_S) / flight)), lag = Math.max(0, u - (0.015 + f * 0.09));
        bezier(lag, s.position);
        s.position.x += Math.sin(t * 7 + k * 3) * 0.06; s.position.y += Math.cos(t * 6 + k * 2) * 0.06 - 0.05;
        vis = (1 - f) * 0.9;
      } else if (t > endT - 0.45) {
        const age = clamp01((t - (endT - 0.45)) / 0.45), ang = f * 6.28 * 3, up = (k % 3) * 0.3 + 0.2;
        s.position.set(p1.x + Math.cos(ang) * age * 0.9, p1.y + up * age + 0.1, p1.z + Math.sin(ang) * age * 0.9);
        vis = 1 - age;
      }
      s.visible = vis > 0.02;
      s.scale.setScalar(Math.max(0.001, vis) * (k % 2 ? 0.7 : 1));
    }
  });

  const body = shade(color, 0.85), wing = shade(color, 0.65), belly = "#F4EAD2";
  return (
    <group>
      <group ref={owl} visible={false}>
        <group scale={1.1}>
          <Sph r={0.12} pos={[0, 0, 0]} scale={[1, 1.15, 0.95]} color={body} />
          <Sph r={0.085} pos={[0, -0.02, 0.06]} scale={[1, 1.2, 0.7]} color={belly} outline={false} />
          <Sph r={0.1} pos={[0, 0.17, 0.01]} color={body} />
          <Sph r={0.03} pos={[-0.04, 0.18, 0.085]} color="#FFFFFF" outline={false} seg={10}>
            <Sph r={0.016} pos={[0, 0, 0.02]} color="#201428" outline={false} seg={8} />
          </Sph>
          <Sph r={0.03} pos={[0.04, 0.18, 0.085]} color="#FFFFFF" outline={false} seg={10}>
            <Sph r={0.016} pos={[0, 0, 0.02]} color="#201428" outline={false} seg={8} />
          </Sph>
          <Cylr rt={0.001} rb={0.022} h={0.05} pos={[0, 0.15, 0.11]} rot={[Math.PI / 2, 0, 0]} color="#E8A93A" seg={6} />
          <Cylr rt={0.001} rb={0.02} h={0.06} pos={[-0.065, 0.26, 0]} rot={[0, 0, 0.35]} color={wing} seg={6} />
          <Cylr rt={0.001} rb={0.02} h={0.06} pos={[0.065, 0.26, 0]} rot={[0, 0, -0.35]} color={wing} seg={6} />
          <Blk size={[0.09, 0.015, 0.16]} pos={[0, -0.1, -0.16]} rot={[0.25, 0, 0]} color={wing} />
          <group ref={wingL} position={[0.1, 0.03, 0]}>
            <Sph r={0.1} pos={[0.12, 0, -0.02]} scale={[1.25, 0.14, 0.75]} color={wing} />
          </group>
          <group ref={wingR} position={[-0.1, 0.03, 0]}>
            <Sph r={0.1} pos={[-0.12, 0, -0.02]} scale={[1.25, 0.14, 0.75]} color={wing} />
          </group>
          <group ref={letter} position={[0, -0.18, 0.06]}>
            <Blk size={[0.17, 0.012, 0.115]} color="#FBF5E4" outline />
            <Sph r={0.018} pos={[0, 0.012, 0]} color="#B5232F" outline={false} seg={8} />
          </group>
        </group>
        <pointLight color={GOLD} intensity={1.2} distance={2.5} />
      </group>

      {[ringA, ringB].map((r, k) => (
        <mesh key={k} ref={r} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.55, 0.62, 48]} />
          <meshBasicMaterial color={k ? GOLD : color} transparent opacity={0.85} depthWrite={false} />
          <mesh>
            <ringGeometry args={[0.32, 0.35, 6]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        </mesh>
      ))}

      {Array.from({ length: SPARKS }, (_, k) => (
        <mesh key={k} ref={el => { sparks.current[k] = el; }} visible={false}>
          <octahedronGeometry args={[0.05, 0]} />
          <meshBasicMaterial color={k % 3 === 0 ? color : GOLD} />
        </mesh>
      ))}
    </group>
  );
}
