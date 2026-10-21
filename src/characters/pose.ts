import type { ActivityKind } from "../../shared/layout";
import type { AgentStatus } from "../../shared/events";
import type { CharacterKind } from "../../shared/agents";
import type { Pose as MotionPose } from "./motion";

/* The target skeleton pose and face for a character at one moment.
   Angles are radians. A negative shoulder or hip x swings the limb forward. A positive knee x bends the shin back. */
export interface Pose {
  hipsY: number;
  spineX: number; spineY: number; spineZ: number; chestX: number; chestZ: number;
  headX: number; headY: number; headZ: number;
  shLX: number; shLZ: number; elLX: number; wrLX: number;
  shRX: number; shRZ: number; elRX: number; wrRX: number;
  thLX: number; thLZ: number; knLX: number; anLX: number;
  thRX: number; thRZ: number; knRX: number; anRX: number;
  gripL: number; gripR: number; wiggle: number;
  tail1X: number; tail1Z: number; tail2X: number; tail2Z: number; tail3X: number; tail3Z: number;
  prop: "none" | "cue" | "pad" | "cup" | "wand";
  // face
  lid: number;            // 0 open, 1 closed, below 0 is wide open
  look: "camera" | "point";
  lookX: number; lookY: number;
  browRaise: number;      // -1 low, 1 high
  browLRaise: number;     // extra raise on the left brow only
  browAngry: number;      // positive angry or focused, negative worried
  mouthCurve: number;     // -1 frown, 1 big smile
  mouthOpen: number;      // 0 closed, 1 wide
  mouthW: number;         // width scale
  cheek: number;          // 0..1 blush
}

export const makePose = (): Pose => ({
  hipsY: 0.92, spineX: 0, spineY: 0, spineZ: 0, chestX: 0, chestZ: 0, headX: 0, headY: 0, headZ: 0,
  shLX: 0, shLZ: 0, elLX: 0, wrLX: 0, shRX: 0, shRZ: 0, elRX: 0, wrRX: 0,
  thLX: 0, thLZ: 0, knLX: 0, anLX: 0, thRX: 0, thRZ: 0, knRX: 0, anRX: 0,
  gripL: 0.3, gripR: 0.3, wiggle: 0, tail1X: 0, tail1Z: 0, tail2X: 0, tail2Z: 0, tail3X: 0, tail3Z: 0, prop: "none",
  lid: 0, look: "camera", lookX: 0, lookY: 0, browRaise: 0, browLRaise: 0, browAngry: 0, mouthCurve: 0.3, mouthOpen: 0, mouthW: 1, cheek: 0.4
});

export interface PoseCtx {
  kind: CharacterKind; status: AgentStatus; pose: MotionPose; activity: ActivityKind | null;
  t: number; walkPhase: number; since: number; carry: boolean; casting: boolean; seed: number; motionScale: number;
  /** True while this character is the one talking in a meeting. */
  speaking: boolean;
}

/* Hip heights (in character units, before the 0.9 body scale) for the different seats. */
const SEAT = 0.545;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function computePose(c: PoseCtx, P: Pose): Pose {
  const z = c.kind === "zombie", m = c.motionScale, t = c.t, ph = c.walkPhase;
  const walking = c.pose === "walking", seated = c.pose === "seated", act = c.pose === "activity";
  const breathe = Math.sin(t * 1.8 + c.seed) * 0.012 * m;
  const sway = Math.sin(t * 0.8 + c.seed);

  // ---- relaxed standing (the base everything else adjusts) ----
  Object.assign(P, makePose());
  P.hipsY = z ? 0.92 : 1.0 + Math.sin(t * 1.6 + c.seed) * 0.03 * m;     // ghosts hover and bob
  P.spineX = z ? 0.1 : 0.03; P.chestX = z ? 0.08 : 0; P.headX = z ? 0.12 : 0.03;
  P.spineZ = sway * 0.025 * m;
  P.shLX = 0.06 + sway * 0.05 * m; P.shRX = 0.06 - sway * 0.05 * m;
  P.shLZ = 0.1; P.shRZ = -0.1; P.elLX = -0.2; P.elRX = -0.2;
  if (z) { P.shLX = -0.25 + sway * 0.06 * m; P.shRX = -0.2 - sway * 0.06 * m; P.elLX = -0.5; P.elRX = -0.45; P.gripL = 0.55; P.gripR = 0.5; }
  P.thLZ = 0.03; P.thRZ = -0.03; P.knLX = 0.03; P.knRX = 0.03;
  P.tail1X = 0.1 + breathe; P.tail2X = 0.16; P.tail3X = 0.22;
  P.tail1Z = Math.sin(t * 1.4 + c.seed) * 0.12 * m; P.tail2Z = Math.sin(t * 1.4 + c.seed - 0.8) * 0.18 * m; P.tail3Z = Math.sin(t * 1.4 + c.seed - 1.6) * 0.26 * m;

  // ---- walking ----
  if (walking) {
    if (walking) {
      const s = Math.sin(ph), co = Math.cos(ph);
      P.hipsY = (z ? 0.92 - Math.abs(s) * 0.035 : 1.0 + Math.sin(ph * 0.5) * 0.035) * 1;
      P.spineX = z ? 0.17 : 0.2; P.chestX = z ? 0.1 : 0.05; P.spineZ = s * (z ? 0.09 : 0.04) * m;
      P.headX = z ? 0.18 : 0.02; P.headZ = Math.sin(ph * 0.5) * 0.1 * m;
      P.thLX = s * 0.55 * m; P.thRX = -s * 0.55 * m;
      P.knLX = Math.max(0, -s) * 0.95 * m + 0.1; P.knRX = Math.max(0, s) * 0.95 * m + 0.1;
      P.anLX = -s * 0.25; P.anRX = s * 0.25;
      if (z) { // arms stretched out in front
        P.shLX = -1.15 + co * 0.12 * m; P.shRX = -1.15 - co * 0.12 * m; P.elLX = -0.25; P.elRX = -0.25; P.wrLX = 0.2; P.wrRX = 0.2; P.gripL = 0.6; P.gripR = 0.6;
      } else {
        // A ghost does not step: it glides, leaning into the flight, its tail streaming behind and its arms trailing.
        const fly = Math.sin(t * 2.2 + c.seed), flutter = Math.sin(t * 3.4 + c.seed);
        P.hipsY = 1.12 + fly * 0.045 * m;
        P.spineX = 0.5; P.chestX = 0.12; P.headX = -0.3; P.headZ = Math.sin(t * 1.1 + c.seed) * 0.06 * m; P.spineZ = Math.sin(t * 1.6 + c.seed) * 0.05 * m;
        P.shLX = 0.45 + flutter * 0.1 * m; P.shRX = 0.45 - flutter * 0.1 * m; P.shLZ = 0.55; P.shRZ = -0.55; P.elLX = -0.15; P.elRX = -0.15; P.gripL = P.gripR = 0.15;
        P.tail1X = 0.95 + flutter * 0.08; P.tail2X = 1.15 + Math.sin(t * 3.4 + c.seed - 0.7) * 0.12; P.tail3X = 1.3 + Math.sin(t * 3.4 + c.seed - 1.4) * 0.16;
        P.tail1Z = Math.sin(t * 4.2 + c.seed) * 0.12; P.tail2Z = Math.sin(t * 4.2 + c.seed - 0.9) * 0.2; P.tail3Z = Math.sin(t * 4.2 + c.seed - 1.8) * 0.3;
      }
    }
    if (c.carry) { P.shLX = P.shRX = -1.25; P.elLX = P.elRX = -0.55; P.wrLX = P.wrRX = 0.1; P.gripL = P.gripR = 0.45; P.shLZ = 0.05; P.shRZ = -0.05; }
  }

  // ---- seated at the desk ----
  if (seated) {
    P.hipsY = SEAT;
    P.spineX = 0.06; P.chestX = 0.04; P.headX = 0.03;
    P.thLX = P.thRX = -Math.PI / 2; P.thLZ = 0.06; P.thRZ = -0.06; P.knLX = P.knRX = Math.PI / 2; P.anLX = P.anRX = 0.1;
    if (!z) { P.tail1X = -1.35; P.tail2X = 0.85; P.tail3X = 0.9; P.tail1Z = P.tail2Z = P.tail3Z = 0; } // tail drapes over the seat front
    P.shLX = -0.55; P.shRX = -0.55; P.elLX = -0.85; P.elRX = -0.85; P.wrLX = 0.1; P.wrRX = 0.1; P.shLZ = 0.12; P.shRZ = -0.12;
    switch (c.status) {
      case "working":
        P.spineX = 0.17; P.chestX = 0.08; P.headX = 0.14;
        P.shLX = -1.12 + Math.sin(t * 15 * m) * 0.05 * m; P.shRX = -1.12 + Math.sin(t * 15 * m + 1.9) * 0.05 * m;
        P.elLX = -0.62; P.elRX = -0.62; P.wrLX = 0.28; P.wrRX = 0.28; P.shLZ = 0.05; P.shRZ = -0.05;
        P.gripL = P.gripR = 0.35; P.wiggle = 1;
        break;
      case "thinking":
        P.shRX = -1.3; P.elRX = -2.3; P.wrRX = 0.3; P.shRZ = -0.15; P.gripR = 0.6;
        P.shLX = -0.75; P.elLX = -1.3; P.wrLX = 0.1;
        P.headZ = Math.sin(t * 1.5) * 0.14 * m; P.headX = -0.08; P.spineX = 0.02;
        break;
      case "done":
        P.shLX = -2.85; P.shRX = -2.85; P.shLZ = 0.32; P.shRZ = -0.32; P.elLX = P.elRX = -0.15; P.wrLX = P.wrRX = 0; P.gripL = P.gripR = 0.1;
        P.headX = -0.18; P.spineX = -0.06;
        break;
      case "error":
        P.shLX = -2.3; P.shRX = -2.3; P.shLZ = 0.22; P.shRZ = -0.22; P.elLX = P.elRX = -2.1; P.wrLX = P.wrRX = 0.2; P.gripL = P.gripR = 0.7;
        P.spineX = -0.14; P.headX = 0.2; P.headY = Math.sin(t * 28) * (c.since < 1.4 ? 0.2 : 0.02) * m;
        break;
      default: // idle at the desk: arms resting, glancing around
        P.headY = Math.sin(t * 0.5 + c.seed) * 0.35 * m; P.headX = 0.02;
        P.shLX = -0.5; P.shRX = -0.5; P.elLX = -1.0; P.elRX = -1.0; P.gripL = P.gripR = 0.3;
    }
  }

  // ---- casting a summoning spell: the wand arm rises and flicks, the other hand steadies the body ----
  if (seated && c.casting) {
    const flick = Math.sin(t * 9) * 0.22 * m;
    P.spineX = 0.0; P.chestX = -0.05; P.headX = -0.12; P.headY = 0;
    P.shRX = -2.3 + flick; P.shRZ = -0.25; P.elRX = -0.45 - flick * 0.8; P.wrRX = 0.2 + flick; P.gripR = 0.85; P.prop = "wand";
    P.shLX = -0.9; P.elLX = -1.1; P.gripL = 0.4;
    P.look = "point"; P.lookX = 0.1; P.lookY = 0.45; P.lid = 0.15; P.browAngry = 0.25; P.mouthCurve = 0.25; P.mouthW = 0.8;
  }

  // ---- lounge activities ----
  if (act && c.activity) {
    const a = c.activity;
    if (a === "tv" || a === "ps5" || a === "sim" || a === "bar" || a === "meeting") {
      P.hipsY = a === "bar" ? 0.9 : a === "sim" ? 0.5 : SEAT;
      P.thLX = P.thRX = a === "bar" ? -1.1 : -Math.PI / 2; P.knLX = P.knRX = a === "bar" ? 0.9 + Math.sin(t * 1.5 + c.seed) * 0.1 * m : Math.PI / 2;
      P.thLZ = 0.08; P.thRZ = -0.08; P.anLX = P.anRX = 0.1;
      if (!z) { P.tail1X = -1.35; P.tail2X = 0.85; P.tail3X = 0.9; P.tail1Z = P.tail2Z = P.tail3Z = 0; }
    }
    if (a === "tv") { // sofa: leaning back, one arm along the backrest
      P.spineX = -0.22; P.chestX = -0.1; P.headX = -0.04; P.headY = Math.sin(t * 0.4 + c.seed) * 0.2 * m;
      P.shLX = -0.35; P.elLX = -0.9; P.shRX = -0.2; P.shRZ = -0.55; P.elRX = -0.4; P.gripL = P.gripR = 0.3;
    } else if (a === "ps5") { // holding a controller, thumbs busy
      P.spineX = 0.14; P.headX = 0.1;
      P.shLX = -0.95; P.shRX = -0.95; P.elLX = -1.15; P.elRX = -1.15; P.wrLX = 0.2; P.wrRX = 0.2; P.shLZ = 0.12; P.shRZ = -0.12;
      P.gripL = P.gripR = 0.75; P.wiggle = 0.8; P.prop = "pad";
      P.spineZ = Math.sin(t * 2.1 + c.seed) * 0.05 * m;
    } else if (a === "sim") { // hands on the wheel, feet on pedals
      P.thLX = P.thRX = -1.3; P.knLX = 0.7; P.knRX = 0.55; P.anLX = -0.3; P.anRX = -0.2;
      P.spineX = 0.1; P.headX = 0.08;
      const steer = Math.sin(t * 1.3 + c.seed) * 0.5 * m;
      P.shLX = -1.2; P.shRX = -1.2; P.shLZ = 0.22 + steer * 0.3; P.shRZ = -0.22 + steer * 0.3; P.elLX = -0.6; P.elRX = -0.6; P.gripL = P.gripR = 0.9;
      P.spineZ = steer * 0.12; P.headZ = steer * 0.1;
    } else if (a === "bar") { // one elbow on the counter, a drink in hand
      P.spineX = 0.1; P.headY = Math.sin(t * 0.5 + c.seed) * 0.3 * m;
      P.shRX = -0.95; P.elRX = -1.3 + Math.max(0, Math.sin(t * 0.7 + c.seed)) * -0.5 * m; P.gripR = 0.8; P.prop = "cup";
      P.shLX = -0.8; P.elLX = -1.0;
    } else if (a === "pool") { // bent over the table, cue stroking
      const stroke = Math.max(0, Math.sin(t * 1.1 + c.seed)) ** 2;
      P.hipsY = 0.9; P.spineX = 0.85; P.chestX = 0.25; P.headX = -0.55;
      P.thLX = -0.28; P.thRX = 0.12; P.knLX = 0.3; P.knRX = 0.06;
      P.shLX = -1.35; P.elLX = -0.15; P.shLZ = 0.1; P.wrLX = 0.2; P.gripL = 0.2;
      P.shRX = -1.0 + stroke * 0.5; P.elRX = -1.0 - stroke * 0.3; P.shRZ = -0.25; P.gripR = 0.85; P.prop = "cue";
    } else if (a === "meeting") { // seated at the table: hands on it, nodding, or talking with gestures
      P.spineX = 0.08; P.chestX = 0.03; P.shLZ = 0.12; P.shRZ = -0.12;
      P.shLX = -0.8; P.elLX = -0.85; P.wrLX = 0.15; P.gripL = 0.4;
      if (c.speaking) {
        const g1 = Math.sin(t * 2.6 + c.seed), g2 = Math.sin(t * 3.4 + c.seed * 2);
        P.shRX = -1.15 + g1 * 0.4; P.elRX = -0.95 + g2 * 0.35; P.shRZ = -0.32 + g1 * 0.14; P.wrRX = 0.1 + g2 * 0.2; P.gripR = 0.25;
        P.shLX = -0.95 + g2 * 0.15; P.elLX = -1.0 + g1 * 0.2;
        P.headY = Math.sin(t * 1.3 + c.seed) * 0.28; P.headX = -0.02 + g2 * 0.06; P.spineX = 0.04;
      } else {
        P.shRX = -0.8; P.elRX = -0.85; P.wrRX = 0.15; P.gripR = 0.4;
        P.headX = 0.06 + Math.sin(t * 1.6 + c.seed) * 0.07; P.headY = Math.sin(t * 0.5 + c.seed) * 0.12;
      }
    } else if (a === "arcade") { // mashing buttons
      P.spineX = 0.1; P.headX = 0.1;
      const mash = Math.sin(t * 13 + c.seed);
      P.shLX = -1.05; P.shRX = -1.05 + mash * 0.08; P.elLX = -1.2 + mash * 0.12; P.elRX = -1.3; P.wrLX = 0.25; P.wrRX = 0.25; P.gripL = 0.7; P.gripR = 0.4; P.wiggle = 1;
      P.spineZ = mash * 0.03;
    }
  }

  // ---- face: emotion from what the character is doing ----
  P.look = "camera"; P.lookX = 0; P.lookY = 0;
  const calm = c.status === "idle" && !act && !walking;
  if (calm || walking) { P.mouthCurve = 0.35; P.browRaise = 0.1; P.cheek = z ? 0.2 : 0.7; }
  switch (c.status) {
    case "thinking":
      P.look = "point"; P.lookX = -0.5; P.lookY = 0.55; P.browLRaise = 0.7; P.browRaise = 0.1; P.browAngry = -0.15;
      P.mouthCurve = -0.05; P.mouthW = 0.65; P.mouthOpen = 0.06 + Math.max(0, Math.sin(t * 0.9)) * 0.08;
      break;
    case "working":
      P.look = "point"; P.lookX = Math.sin(t * 1.2) * 0.25; P.lookY = -0.4; P.lid = 0.28; P.browAngry = 0.45; P.browRaise = -0.2;
      P.mouthCurve = -0.1; P.mouthW = 0.95;
      break;
    case "done":
      P.lid = 0.5; P.browRaise = 0.7; P.mouthCurve = 1; P.mouthOpen = 0.4; P.mouthW = 1.45; P.cheek = 1;
      break;
    case "error":
      P.lid = -0.35; P.browRaise = 0.8; P.browAngry = -0.9; P.mouthCurve = -0.85; P.mouthOpen = 0.55 + Math.sin(t * 20) * 0.08; P.mouthW = 0.85; P.cheek = 0;
      P.look = "point"; P.lookX = Math.sin(t * 18) * 0.3; P.lookY = 0.1;
      break;
  }
  if (act && c.activity) {
    const laugh = Math.max(0, Math.sin(t * 0.55 + c.seed * 2)) ** 6;      // bursts of laughter now and then
    const a = c.activity;
    P.browRaise = 0.2; P.mouthCurve = 0.55; P.cheek = z ? 0.3 : 0.9;
    if (a === "tv") { P.mouthCurve = 0.7 + laugh * 0.3; P.mouthOpen = laugh * (0.5 + Math.sin(t * 16) * 0.12); P.mouthW = 1.2 + laugh * 0.3; P.lid = 0.1 + laugh * 0.4; P.look = "point"; P.lookY = 0.05; }
    if (a === "ps5" || a === "arcade") { P.look = "point"; P.lookY = 0.1; P.lookX = Math.sin(t * 1.7) * 0.2; P.browAngry = 0.35; P.mouthCurve = 0.25 + laugh * 0.7; P.mouthOpen = 0.12 + laugh * 0.45; P.mouthW = 1.1; }
    if (a === "sim") { P.look = "point"; P.lookY = 0.05; P.lid = 0.3; P.browAngry = 0.6; P.browRaise = -0.1; P.mouthCurve = -0.05 + laugh * 0.6; P.mouthOpen = 0.14 + laugh * 0.4; P.mouthW = 0.9; }
    if (a === "pool") { P.look = "point"; P.lookY = -0.35; P.lid = 0.25; P.browAngry = 0.4; P.mouthCurve = 0.1; P.mouthW = 0.9; P.mouthOpen = laugh * 0.5; }
    if (a === "bar") { P.mouthCurve = 0.7 + laugh * 0.3; P.mouthOpen = laugh * 0.5; P.mouthW = 1.25; }
    if (a === "meeting") {
      if (c.speaking) { P.mouthCurve = 0.3; P.mouthOpen = 0.1 + Math.abs(Math.sin(t * 9 + c.seed)) * 0.28; P.mouthW = 1.1; P.browRaise = 0.35; P.look = "camera"; }
      else { P.mouthCurve = 0.3 + laugh * 0.5; P.mouthOpen = laugh * 0.3; P.browRaise = 0.2; P.look = "point"; P.lookX = Math.sin(t * 0.4 + c.seed) * 0.3; P.lookY = 0.05; }
    }
  }
  return P;
}
