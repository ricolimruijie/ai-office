import { WebSocketServer, WebSocket } from "ws";
import agentsJson from "../agents.json";
import type { AgentConfig } from "../shared/agents";
import { WS_PORT, isClientMessage, isOfficeEvent, type OfficeEvent } from "../shared/events";
import { startDiscordBot } from "./discord/index";
import { MockSim } from "./mock";

const agents = agentsJson as AgentConfig[];
const wss = new WebSocketServer({ port: WS_PORT });

let bot: { onEvent: (ev: OfficeEvent) => void; stop: () => void } | null = null;

function broadcast(ev: OfficeEvent) {
  const data = JSON.stringify(ev);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(data); });
  bot?.onEvent(ev);
}

const sim = new MockSim(agents, broadcast);

/* Optional Discord bot. Needs DISCORD_TOKEN, DISCORD_GUILD_ID and DISCORD_CHANNEL_ID (see .env.example). */
async function maybeStartDiscord() {
  const { DISCORD_TOKEN: token, DISCORD_GUILD_ID: guildId, DISCORD_CHANNEL_ID: channelId } = process.env;
  if (!token) { console.log("[discord] off (no DISCORD_TOKEN in .env)"); return; }
  if (!guildId || !channelId) { console.log("[discord] off (set DISCORD_GUILD_ID and DISCORD_CHANNEL_ID in .env)"); return; }
  try {
    bot = await startDiscordBot({
      token, guildId, channelId, agents,
      allowedUsers: new Set((process.env.DISCORD_ALLOWED_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean)),
      feed: process.env.DISCORD_FEED === "all" ? "all" : "assigned",
      assign: (id, task) => sim.assign(id, task)
    });
  } catch (e) {
    console.error("[discord] could not start:", (e as Error).message);
  }
}

wss.on("connection", ws => {
  console.log("[mock] client connected (" + wss.clients.size + " total)");
  sim.snapshot().forEach(ev => ws.send(JSON.stringify(ev)));

  ws.on("message", raw => {
    let msg: unknown;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (isClientMessage(msg)) {
      if (msg.type === "task.assign") sim.assign(msg.agentId, msg.text);
      else sim.running = msg.type === "sim.resume";
    } else if (msg && typeof msg === "object" && isOfficeEvent({ ts: Date.now(), ...msg })) {
      // Handy for manual testing: any raw office event sent here is relayed to every client.
      broadcast({ ts: Date.now(), ...msg } as OfficeEvent);
    }
  });
  ws.on("close", () => console.log("[mock] client left (" + wss.clients.size + " total)"));
});

wss.on("listening", () => {
  console.log("[mock] event server on ws://localhost:" + WS_PORT);
  void maybeStartDiscord();
  sim.start();
});

const shutdown = () => { sim.stop(); bot?.stop(); wss.close(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
