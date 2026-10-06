import { DataTexture, NearestFilter, RedFormat } from "three";

/* Three-step shading ramp, so lit surfaces get a soft cel-shaded look. */
export const toonGradient = (() => {
  const t = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
  t.minFilter = NearestFilter;
  t.magFilter = NearestFilter;
  t.needsUpdate = true;
  return t;
})();
