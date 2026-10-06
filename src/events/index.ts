import { WS_PORT } from "../../shared/events";
import type { OfficeSource } from "./EventSource";
import { createWsSource } from "./wsSource";

/* To use a real agent backend, point VITE_EVENT_URL at it, or return a different OfficeSource here. */
const url = import.meta.env.VITE_EVENT_URL ?? `ws://${location.hostname}:${WS_PORT}`;
export const source: OfficeSource = createWsSource(url);
export { connectSource } from "./connect";
