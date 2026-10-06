import { useFrame } from "@react-three/fiber";
import { updateRgb } from "./rgb";

/* Advances every desk's RGB lighting once per frame. */
export function RgbTicker() {
  useFrame(({ clock }) => updateRgb(clock.elapsedTime), -3);
  return null;
}
