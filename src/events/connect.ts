import { ingest } from "../state/ingest";
import { useOfficeStore } from "../state/officeStore";
import type { OfficeSource } from "./EventSource";

/* Wire any source into the store. Returns a disconnect function. */
export function connectSource(src: OfficeSource): () => void {
  const offEv = src.onEvent(ingest);
  const offConn = src.onConnection(c => {
    useOfficeStore.getState().setConnection(c);
    // The server keeps its own pause flag, so re-assert ours after a reconnect.
    if (c === "connected" && useOfficeStore.getState().paused) src.send({ type: "sim.pause" });
  });
  src.start();
  return () => { offEv(); offConn(); src.stop(); };
}
