import { source } from "./index";

/* What the UI can ask of the event source. The UI never touches the socket directly. */
export const assignTask = (agentId: string, text: string) => source.send({ type: "task.assign", agentId, text });
export const setSimPaused = (paused: boolean) => source.send({ type: paused ? "sim.pause" : "sim.resume" });
