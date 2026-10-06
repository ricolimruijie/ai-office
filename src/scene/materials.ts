import { MeshToonMaterial } from "three";
import { toonGradient } from "./toon";

/* Materials shared by many meshes so the time of day can change them all at once. */
export const windowMat = new MeshToonMaterial({ color: "#9CCFE4", emissive: "#FFD9A0", emissiveIntensity: 0, gradientMap: toonGradient, transparent: true, opacity: 0.75 });
export const lampMat = new MeshToonMaterial({ color: "#FFE8C0", emissive: "#FFC27A", emissiveIntensity: 0, gradientMap: toonGradient });

windowMat.userData.shared = true;
lampMat.userData.shared = true;
