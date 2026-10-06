import { Color, MeshBasicMaterial } from "three";
import type { DeskStyle } from "../../../shared/agents";

/* Animated RGB lighting shared by every desk. Each style has three glow materials that cycle through its own colors,
   so hundreds of lights cost three material updates per desk. */
interface Palette { hue: number; range: number; sat: number; light: number; speed: number; offB: number; offC: number }
const PALETTES: Record<DeskStyle, Palette> = {
  executive: { hue: 0.11, range: 0.03, sat: 1.0, light: 0.55, speed: 0.6, offB: 0.02, offC: -0.06 },   // gold and amber
  lab:       { hue: 0.62, range: 0.12, sat: 1.0, light: 0.58, speed: 0.8, offB: 0.12, offC: -0.2 },    // cyan to violet
  writer:    { hue: 0.95, range: 0.07, sat: 0.85, light: 0.7, speed: 0.4, offB: 0.06, offC: 0.1 },     // soft pink and cream
  backend:   { hue: 0.36, range: 0.05, sat: 1.0, light: 0.5, speed: 1.1, offB: 0.04, offC: -0.04 },    // matrix green
  frontend:  { hue: 0.92, range: 0.22, sat: 1.0, light: 0.6, speed: 0.9, offB: -0.4, offC: -0.2 },     // pink and cyan
  qa:        { hue: 0.0, range: 0.02, sat: 1.0, light: 0.55, speed: 1.4, offB: 0.0, offC: 0.0 }        // alert red and white
};

export interface RgbSet { a: MeshBasicMaterial; b: MeshBasicMaterial; c: MeshBasicMaterial }
export const RGB = Object.fromEntries((Object.keys(PALETTES) as DeskStyle[]).map(k => [k, {
  a: new MeshBasicMaterial({ color: "#ffffff" }), b: new MeshBasicMaterial({ color: "#ffffff" }), c: new MeshBasicMaterial({ color: "#ffffff" })
}])) as Record<DeskStyle, RgbSet>;

const col = new Color();
const DIM = 0.5, DESAT = 0.75; // keep the RGB lighting subtle
export function keyColor(style: DeskStyle, t: number, x: number): Color {
  const p = PALETTES[style];
  const h = (p.hue + Math.sin(t * p.speed + x * 0.5) * p.range + 1) % 1;
  return col.setHSL(h, p.sat * DESAT, p.light * DIM * (0.7 + 0.3 * Math.sin(t * p.speed * 2 + x)));
}

export function updateRgb(t: number) {
  (Object.keys(PALETTES) as DeskStyle[]).forEach(k => {
    const p = PALETTES[k], s = RGB[k];
    const wave = Math.sin(t * p.speed) * p.range;
    s.a.color.setHSL((p.hue + wave + 1) % 1, p.sat * DESAT, p.light * DIM);
    s.b.color.setHSL((p.hue + p.offB + wave * 0.6 + 1) % 1, p.sat * DESAT, p.light * DIM);
    // QA alternates red and white like a warning light.
    if (k === "qa") s.c.color.setHSL(0, Math.sin(t * 3) > 0 ? 0.75 : 0, Math.sin(t * 3) > 0 ? 0.3 : 0.6);
    else s.c.color.setHSL((p.hue + p.offC + wave * 0.4 + 1) % 1, p.sat * DESAT, p.light * DIM);
  });
}
