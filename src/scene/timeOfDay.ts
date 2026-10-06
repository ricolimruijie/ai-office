import { Color, Vector3 } from "three";

/* Sky and light for any hour of the day, blended between a few hand-tuned moments. */
interface Key {
  h: number; top: string; horizon: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number;
  windows: number; lamps: number; stars: number;
}
const KEYS: Key[] = [
  { h: 0,    top: "#0C0A1E", horizon: "#2A1F3A", sun: "#B0A4F0", sunI: 0.6,  hemiSky: "#6A5A9A", hemiGround: "#2A1C24", hemiI: 1.3,  windows: 1,   lamps: 1,   stars: 1 },
  { h: 4.8,  top: "#14102E", horizon: "#3E2A48", sun: "#B0A4F0", sunI: 0.55, hemiSky: "#6A5A9A", hemiGround: "#2A1C24", hemiI: 1.3,  windows: 1,   lamps: 1,   stars: 1 },
  { h: 5.9,  top: "#4A4A8C", horizon: "#FFB48A", sun: "#FFA070", sunI: 0.9,  hemiSky: "#B09AB8", hemiGround: "#5A4048", hemiI: 1.3,  windows: 0.8, lamps: 0.9, stars: 0.2 },
  { h: 7.6,  top: "#7AB0E8", horizon: "#FFE3BE", sun: "#FFD39A", sunI: 2.6,  hemiSky: "#FFE6CC", hemiGround: "#A08468", hemiI: 1.7,  windows: 0.1, lamps: 0.45, stars: 0 },
  { h: 12,   top: "#5A9AE6", horizon: "#FFEFD8", sun: "#FFEBCC", sunI: 3.2,  hemiSky: "#FFF0DC", hemiGround: "#A8906E", hemiI: 1.9,  windows: 0,   lamps: 0.4, stars: 0 },
  { h: 16.5, top: "#6AA0E0", horizon: "#FFE2B8", sun: "#FFD8A8", sunI: 2.9,  hemiSky: "#FFE8CC", hemiGround: "#A58A68", hemiI: 1.8,  windows: 0,   lamps: 0.5, stars: 0 },
  { h: 18.4, top: "#5A6AB0", horizon: "#FF9A5E", sun: "#FF8A44", sunI: 2.0,  hemiSky: "#E0A890", hemiGround: "#704C48", hemiI: 1.5,  windows: 0.5, lamps: 0.8, stars: 0 },
  { h: 19.8, top: "#2E3470", horizon: "#D06A7A", sun: "#C8607A", sunI: 0.9,  hemiSky: "#7A5E9A", hemiGround: "#3A2830", hemiI: 1.3,  windows: 0.9, lamps: 1,   stars: 0.5 },
  { h: 21.5, top: "#0E0C2E", horizon: "#2E2244", sun: "#B0A4F0", sunI: 0.6,  hemiSky: "#6A5A9A", hemiGround: "#2A1C24", hemiI: 1.3,  windows: 1,   lamps: 1,   stars: 1 },
  { h: 24,   top: "#0C0A1E", horizon: "#2A1F3A", sun: "#B0A4F0", sunI: 0.6,  hemiSky: "#6A5A9A", hemiGround: "#2A1C24", hemiI: 1.3,  windows: 1,   lamps: 1,   stars: 1 }
];
const parsed = KEYS.map(k => ({ ...k, c: [k.top, k.horizon, k.sun, k.hemiSky, k.hemiGround].map(s => new Color(s)) }));

export interface SkyState {
  top: Color; horizon: Color; sun: Color; sunI: number; hemiSky: Color; hemiGround: Color; hemiI: number;
  windows: number; lamps: number; stars: number;
  sunPos: Vector3;     // where the light comes from (sun by day, moon by night)
  sunUp: number;       // 0..1, how high the sun is
  bodyPos: Vector3;    // where the visible sun or moon disc sits in the sky
  isMoon: boolean;
}
export const makeSky = (): SkyState => ({
  top: new Color(), horizon: new Color(), sun: new Color(), sunI: 1, hemiSky: new Color(), hemiGround: new Color(), hemiI: 1,
  windows: 0, lamps: 0, stars: 0, sunPos: new Vector3(), sunUp: 0, bodyPos: new Vector3(), isMoon: false
});

const MOON = new Vector3(-20, 30, 12);

/* Fill `out` with the sky for an hour (0 to 24). */
export function skyAt(hour: number, out: SkyState): SkyState {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < parsed.length - 2 && h >= parsed[i + 1].h) i++;
  const a = parsed[i], b = parsed[i + 1], t = (h - a.h) / (b.h - a.h);
  const s = t * t * (3 - 2 * t);
  out.top.lerpColors(a.c[0], b.c[0], s);
  out.horizon.lerpColors(a.c[1], b.c[1], s);
  out.sun.lerpColors(a.c[2], b.c[2], s);
  out.hemiSky.lerpColors(a.c[3], b.c[3], s);
  out.hemiGround.lerpColors(a.c[4], b.c[4], s);
  out.sunI = a.sunI + (b.sunI - a.sunI) * s;
  out.hemiI = a.hemiI + (b.hemiI - a.hemiI) * s;
  out.windows = a.windows + (b.windows - a.windows) * s;
  out.lamps = a.lamps + (b.lamps - a.lamps) * s;
  out.stars = a.stars + (b.stars - a.stars) * s;

  // The sun crosses the sky from east (+x) at 6:00 to west (-x) at 19:00.
  const e = Math.PI * (h - 6) / 13;
  const sinE = Math.sin(e);
  const day = h >= 6 && h <= 19;
  out.sunUp = day ? Math.min(1, Math.max(0, sinE * 3)) : 0;
  const sunPos = new Vector3(Math.cos(e) * 34, Math.max(sinE, 0.05) * 30 + 1.5, 14);
  out.isMoon = out.sunUp < 0.15;
  out.sunPos.copy(out.isMoon ? MOON : sunPos);
  out.bodyPos.copy(out.isMoon ? MOON : sunPos).normalize().multiplyScalar(260);
  return out;
}
