import { useEffect, useState } from "react";

const read = () => getComputedStyle(document.documentElement).getPropertyValue("--scene-bg").trim() || "#DCDFEA";

/* Scene background follows the CSS theme (system dark mode or a data-theme override). */
export function useSceneBg(): string {
  const [bg, setBg] = useState(read);
  useEffect(() => {
    const update = () => setBg(read());
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", update); mo.disconnect(); };
  }, []);
  return bg;
}

/* True when the page is showing its dark theme (system preference or a data-theme override). */
export function useDark(): boolean {
  const read = () => {
    const forced = document.documentElement.getAttribute("data-theme");
    return forced ? forced === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const update = () => setDark(read());
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", update); mo.disconnect(); };
  }, []);
  return dark;
}
