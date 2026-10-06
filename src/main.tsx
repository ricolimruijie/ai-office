import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./ui/theme.css";
import "./ui/panels.css";

// The 3D view uses the wheel and pinch gestures to zoom the camera, so stop them from also zooming the whole page,
// which magnifies the screen and cuts off the right and bottom edges.
addEventListener("wheel", e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
for (const ev of ["gesturestart", "gesturechange", "gestureend"]) addEventListener(ev, e => e.preventDefault());

createRoot(document.getElementById("root")!).render(<App />);
