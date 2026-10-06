import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { sceneState } from "./sceneState";

const v = new Vector3();

/* Projects each 3D anchor to screen space and moves the matching DOM tag. */
export function TagProjector() {
  useFrame(({ camera, size }) => {
    sceneState.tagEls.forEach((el, key) => {
      const a = sceneState.anchors.get(key);
      if (!a) { el.style.visibility = "hidden"; return; }
      v.copy(a).project(camera);
      if (v.z > 1) { el.style.visibility = "hidden"; return; }
      el.style.visibility = "visible";
      const sx = (v.x + 1) / 2 * size.width, sy = (1 - v.y) / 2 * size.height;
      el.style.transform = `translate(${(sx - el.offsetWidth / 2).toFixed(1)}px,${(sy - el.offsetHeight).toFixed(1)}px)`;
    });
  });
  return null;
}
