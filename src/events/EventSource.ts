import type { ClientMessage, OfficeEvent } from "../../shared/events";
import type { ConnectionState } from "../state/officeStore";

/* Anything that can feed the office. The 3D code never sees this, only ingest(). */
export interface OfficeSource {
  start(): void;
  stop(): void;
  send(msg: ClientMessage): void;
  onEvent(cb: (ev: OfficeEvent) => void): () => void;
  onConnection(cb: (s: ConnectionState) => void): () => void;
}
