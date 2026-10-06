// Send one raw office event to the mock server, which relays it to every open browser.
// Usage: npm run send -- '{"type":"agent.status","agentId":"atlas","status":"working","task":"Hello"}'
import { WebSocket } from "ws";

const raw = process.argv[2];
if (!raw) {
  console.error("Usage: npm run send -- '<event json>'");
  process.exit(1);
}
let event;
try { event = JSON.parse(raw); } catch { console.error("Not valid JSON."); process.exit(1); }

const url = process.env.EVENT_URL || "ws://localhost:8787";
const ws = new WebSocket(url);
ws.on("open", () => {
  ws.send(JSON.stringify({ ts: Date.now(), ...event }));
  setTimeout(() => { ws.close(); console.log("sent:", JSON.stringify(event)); }, 150);
});
ws.on("error", e => { console.error("Could not reach " + url + ": " + e.message); process.exit(1); });
