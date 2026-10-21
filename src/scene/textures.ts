import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { rng } from "./rng";

/* Small procedural textures drawn on a canvas, so the scene needs no image files. */
function make(draw: (g: CanvasRenderingContext2D, s: number) => void, size = 256): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const noise = (g: CanvasRenderingContext2D, s: number, count: number, seed: number, alpha: number, light = false) => {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const v = light ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
  }
};

export const TEX = {
  brick: make((g, s) => {
    const r = rng(3), rows = 8, bh = s / rows, bw = s / 4;
    g.fillStyle = "#6B4338"; g.fillRect(0, 0, s, s);
    for (let y = 0; y < rows; y++) for (let x = -1; x < 5; x++) {
      const off = y % 2 ? bw / 2 : 0, shade = 0.82 + r() * 0.3;
      g.fillStyle = `rgb(${Math.round(190 * shade)},${Math.round(98 * shade)},${Math.round(78 * shade)})`;
      g.fillRect(x * bw + off + 2, y * bh + 2, bw - 4, bh - 4);
    }
    noise(g, s, 500, 4, 0.18);
  }),
  concrete: make((g, s) => {
    g.fillStyle = "#B4B7BB"; g.fillRect(0, 0, s, s);
    noise(g, s, 1400, 5, 0.16); noise(g, s, 700, 6, 0.1, true);
    g.strokeStyle = "rgba(60,62,66,0.35)"; g.lineWidth = 2; g.strokeRect(0, 0, s, s);
  }),
  panel: make((g, s) => {   // formwork concrete with tie holes
    g.fillStyle = "#A7AAAF"; g.fillRect(0, 0, s, s);
    noise(g, s, 900, 7, 0.14);
    g.strokeStyle = "rgba(50,52,56,0.4)"; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
    g.fillStyle = "rgba(40,42,46,0.55)";
    [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]].forEach(([x, y]) => { g.beginPath(); g.arc(x * s, y * s, 3.5, 0, 7); g.fill(); });
  }),
  corrugated: make((g, s) => {
    for (let x = 0; x < s; x += 16) {
      const grd = g.createLinearGradient(x, 0, x + 16, 0);
      grd.addColorStop(0, "#7C838D"); grd.addColorStop(0.5, "#C2C8D0"); grd.addColorStop(1, "#6A717B");
      g.fillStyle = grd; g.fillRect(x, 0, 16, s);
    }
    noise(g, s, 500, 8, 0.12);
  }),
  wood: make((g, s) => {
    const r = rng(9), n = 6, ph = s / n;
    for (let i = 0; i < n; i++) {
      const sh = 0.85 + r() * 0.3;
      g.fillStyle = `rgb(${Math.round(150 * sh)},${Math.round(112 * sh)},${Math.round(76 * sh)})`;
      g.fillRect(0, i * ph, s, ph);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, i * ph, s, 2);
      for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(60,36,20,0.18)"; g.fillRect(r() * s, i * ph + r() * ph, 30 + r() * 60, 1); }
    }
  }),
  hazard: make((g, s) => {
    g.fillStyle = "#F2C230"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#16181D";
    for (let i = -s; i < s * 2; i += 64) { g.beginPath(); g.moveTo(i, s); g.lineTo(i + 32, s); g.lineTo(i + 32 + s, 0); g.lineTo(i + s, 0); g.fill(); }
  }),
  tile: make((g, s) => {
    g.fillStyle = "#D6DCE3"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(90,105,125,0.55)"; g.lineWidth = 3;
    g.strokeRect(0, 0, s, s); g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
    noise(g, s, 300, 10, 0.06);
  }),
  diamond: make((g, s) => {  // steel diamond plate
    g.fillStyle = "#6F7782"; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.fillStyle = "rgba(210,216,224,0.55)";
      g.save(); g.translate(x * 32 + 16, y * 32 + 16); g.rotate(((x + y) % 2 ? 1 : -1) * 0.7); g.fillRect(-9, -2.5, 18, 5); g.restore();
    }
  }),
  stone: make((g, s) => {   // castle ashlar: irregular blocks with dark mortar and moss
    const r = rng(31), rows = 6, bh = s / rows;
    g.fillStyle = "#4F4B49"; g.fillRect(0, 0, s, s);
    for (let y = 0; y < rows; y++) {
      let x = -(r() * 60);
      while (x < s) {
        const w = 70 + r() * 60, sh = 0.82 + r() * 0.3;
        g.fillStyle = `rgb(${Math.round(150 * sh)},${Math.round(145 * sh)},${Math.round(140 * sh)})`;
        g.fillRect(x + 2, y * bh + 2, w - 4, bh - 4);
        x += w;
      }
    }
    noise(g, s, 900, 32, 0.2); noise(g, s, 300, 33, 0.12, true);
    g.fillStyle = "rgba(70,100,60,0.18)";
    for (let i = 0; i < 18; i++) g.fillRect(r() * s, r() * s, 6 + r() * 14, 3 + r() * 5);
  }),
  flag: make((g, s) => {    // flagstone floor
    const r = rng(41), n = 4, c = s / n;
    g.fillStyle = "#3A3836"; g.fillRect(0, 0, s, s);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const sh = 0.8 + r() * 0.35;
      g.fillStyle = `rgb(${Math.round(128 * sh)},${Math.round(124 * sh)},${Math.round(122 * sh)})`;
      g.fillRect(x * c + 3, y * c + 3, c - 6, c - 6);
    }
    noise(g, s, 700, 42, 0.18);
  }),
  slate: make((g, s) => {   // roof slates in scales
    const r = rng(51), rows = 8, rh = s / rows, cw = s / 6;
    g.fillStyle = "#1F2430"; g.fillRect(0, 0, s, s);
    for (let y = 0; y < rows; y++) for (let x = -1; x < 7; x++) {
      const off = y % 2 ? cw / 2 : 0, sh = 0.8 + r() * 0.4;
      g.fillStyle = `rgb(${Math.round(58 * sh)},${Math.round(68 * sh)},${Math.round(92 * sh)})`;
      g.beginPath(); g.moveTo(x * cw + off + 2, y * rh); g.lineTo((x + 1) * cw + off - 2, y * rh);
      g.lineTo((x + 1) * cw + off - 2, y * rh + rh * 0.55); g.lineTo(x * cw + off + cw / 2, (y + 1) * rh); g.lineTo(x * cw + off + 2, y * rh + rh * 0.55); g.fill();
    }
  }),
  carpet: make((g, s) => {  // deep red runner with a gold border pattern
    g.fillStyle = "#7B1E2B"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#D9A441"; g.lineWidth = 6; g.strokeRect(10, 10, s - 20, s - 20);
    g.strokeStyle = "rgba(217,164,65,0.6)"; g.lineWidth = 2; g.strokeRect(26, 26, s - 52, s - 52);
    g.fillStyle = "#D9A441";
    for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(s / 2, s * (0.3 + i * 0.4)); g.lineTo(s * 0.62, s * (0.4 + i * 0.4)); g.lineTo(s / 2, s * (0.5 + i * 0.4)); g.lineTo(s * 0.38, s * (0.4 + i * 0.4)); g.fill(); }
    noise(g, s, 500, 61, 0.14);
  }),
  grass: make((g, s) => {
    const r = rng(71);
    g.fillStyle = "#4F7A47"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() > 0.5 ? "rgba(110,160,80,0.35)" : "rgba(30,70,40,0.3)"; g.fillRect(r() * s, r() * s, 2, 3 + r() * 4); }
  })
};
