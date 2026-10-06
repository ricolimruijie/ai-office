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
  })
};
