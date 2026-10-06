import { isOfficeEvent, type ClientMessage, type OfficeEvent } from "../../shared/events";
import type { ConnectionState } from "../state/officeStore";
import type { OfficeSource } from "./EventSource";

export function createWsSource(url: string): OfficeSource {
  const eventCbs = new Set<(ev: OfficeEvent) => void>();
  const connCbs = new Set<(s: ConnectionState) => void>();
  let ws: WebSocket | null = null;
  let stopped = true;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const setConn = (s: ConnectionState) => connCbs.forEach(cb => cb(s));

  function open() {
    setConn("connecting");
    const sock = new WebSocket(url);
    ws = sock;
    sock.onopen = () => { attempt = 0; setConn("connected"); };
    sock.onmessage = m => {
      try {
        const data = JSON.parse(String(m.data));
        if (isOfficeEvent(data)) eventCbs.forEach(cb => cb(data));
      } catch { /* ignore malformed frames */ }
    };
    sock.onerror = () => sock.close();
    sock.onclose = () => {
      if (ws === sock) ws = null;
      setConn("disconnected");
      if (!stopped) retry = setTimeout(open, Math.min(5000, 500 * 2 ** attempt++));
    };
  }

  return {
    start() { if (!stopped) return; stopped = false; open(); },
    stop() { stopped = true; clearTimeout(retry); ws?.close(); },
    send(msg: ClientMessage) { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); },
    onEvent(cb) { eventCbs.add(cb); return () => { eventCbs.delete(cb); }; },
    onConnection(cb) { connCbs.add(cb); return () => { connCbs.delete(cb); }; }
  };
}
