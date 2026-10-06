import {
  Client, Events, GatewayIntentBits, MessageFlags, OAuth2Scopes, PermissionFlagsBits, SlashCommandBuilder, type Message
} from "discord.js";
import type { AgentConfig } from "../../shared/agents";
import type { OfficeEvent } from "../../shared/events";
import { suggest } from "../../shared/mentions";
import { Board } from "./board";
import { Poster } from "./poster";
import { boardLines, routeText, stepText, threadTitle, type AgentState } from "./pure";
import { ensureStructure, type Structure } from "./structure";

export { routeText } from "./pure";

export type AssignResult = "started" | "queued" | "busy" | "unknown";

export interface DiscordOptions {
  token: string;
  guildId: string;
  /** The channel where "@name task" messages work and where the bot posts when it has nowhere better. */
  channelId: string;
  /** Discord user ids allowed to give tasks. Empty means anyone in the server. */
  allowedUsers: Set<string>;
  /** "assigned": only report tasks given from Discord. "all": also post the random mock activity to the feed channel. */
  feed: "assigned" | "all";
  agents: AgentConfig[];
  assign: (agentId: string, task: string) => AssignResult;
}

/* Where a Discord task lives: the channel it was given in and its thread (if one could be made). */
interface Ctx { channelId: string; threadId?: string }

const P = PermissionFlagsBits;
const NEEDED = {
  ViewChannel: P.ViewChannel, SendMessages: P.SendMessages, SendMessagesInThreads: P.SendMessagesInThreads,
  CreatePublicThreads: P.CreatePublicThreads, EmbedLinks: P.EmbedLinks, AddReactions: P.AddReactions,
  ReadMessageHistory: P.ReadMessageHistory, ManageChannels: P.ManageChannels, ManageWebhooks: P.ManageWebhooks, ManageMessages: P.ManageMessages, PinMessages: P.PinMessages
};

const TASK_COMMAND = new SlashCommandBuilder()
  .setName("task").setDescription("Give a task to one of the office robots")
  .addStringOption(o => o.setName("agent").setDescription("Who should do it").setRequired(true).setAutocomplete(true))
  .addStringOption(o => o.setName("task").setDescription("What to do").setRequired(true).setMaxLength(500));
const AGENTS_COMMAND = new SlashCommandBuilder().setName("agents").setDescription("Show what every robot is doing");

export async function startDiscordBot(opts: DiscordOptions): Promise<{ onEvent: (ev: OfficeEvent) => void; stop: () => void }> {
  const { agents } = opts;
  const byId = (id: string) => agents.find(a => a.id === id);
  const allowed = (userId: string) => opts.allowedUsers.size === 0 || opts.allowedUsers.has(userId);

  const state = new Map<string, AgentState>();
  const current = new Map<string, Ctx>();   // agent -> the Discord task it is running now
  const waiting = new Map<string, Ctx[]>(); // agent -> Discord tasks queued behind it
  let incoming: { agentId: string; ctx: Ctx } | null = null; // set while assign() runs, because its events fire before it returns
  let structure: Structure = { robot: new Map(), owner: new Map() };

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  const poster = new Poster(client);
  let board: Board | null = null;

  const link = (ctx: Ctx) => (ctx.threadId ? " ↗ <#" + ctx.threadId + ">" : "");

  async function openThread(anchor: Message, agent: AgentConfig, task: string): Promise<string | undefined> {
    try { return (await anchor.startThread({ name: threadTitle(agent, task), autoArchiveDuration: 60 })).id; }
    catch { return undefined; } // no permission, or already inside a thread: carry on in the channel
  }

  /* The shared path for "@name task", a robot channel message, and /task. */
  async function give(agent: AgentConfig, task: string, channelId: string, anchor: Message): Promise<AssignResult> {
    const threadId = await openThread(anchor, agent, task);
    const ctx: Ctx = { channelId, threadId };
    incoming = { agentId: agent.id, ctx };
    const result = opts.assign(agent.id, task);
    incoming = null;
    if (result === "queued") waiting.set(agent.id, [...(waiting.get(agent.id) ?? []), ctx]);
    if (result === "queued") poster.say(channelId, agent, "⏳ " + agent.name + " is busy. Queued: " + task, threadId);
    if ((result === "busy" || result === "unknown") && threadId) {
      // The task was refused, so remove the thread that was opened for it.
      const t = await client.channels.fetch(threadId).catch(() => null);
      if (t?.isThread()) await t.delete().catch(() => {});
    }
    board?.touch();
    return result;
  }

  client.once(Events.ClientReady, async c => {
    try {
      await c.application.commands.set([TASK_COMMAND.toJSON(), AGENTS_COMMAND.toJSON()], opts.guildId);
      console.log("[discord] ready as " + c.user.tag + ", commands registered for the server");
    } catch (e) { console.error("[discord] could not register commands:", (e as Error).message); }

    const guild = await c.guilds.fetch(opts.guildId).catch(() => null);
    if (!guild) { console.error("[discord] the bot is not in server " + opts.guildId + ". Invite it first."); return; }

    const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
    const missing = Object.entries(NEEDED).filter(([, bit]) => !me?.permissions.has(bit)).map(([name]) => name);
    if (missing.length) {
      const url = c.generateInvite({ scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands], permissions: Object.values(NEEDED) });
      console.log("[discord] missing permissions: " + missing.join(", ") + ".\n[discord] Open this link and authorize again to add them:\n" + url);
    }

    try { structure = await ensureStructure(c, guild, agents); }
    catch (e) { console.error("[discord] could not set up channels (needs Manage Channels). Using the single feed channel:", (e as Error).message); }

    if (structure.statusId) {
      board = new Board(c, structure.statusId, () => boardLines(agents, state, id => waiting.get(id)?.length ?? 0));
      await board.start().catch(e => console.error("[discord] status board failed:", e.message));
    }
    console.log("[discord] channels: " + (structure.robot.size ? structure.robot.size + " robot channels" : "feed only") + (structure.statusId ? ", status board" : "") + (structure.alertsId ? ", alerts" : ""));
  });

  client.on(Events.MessageCreate, async m => {
    if (m.author.bot || m.guildId !== opts.guildId || !m.content.trim()) return;

    let agent: AgentConfig | undefined;
    let task = "";
    const robotId = structure.owner.get(m.channelId);
    if (robotId) {
      // In a robot's own channel everything you write is a task for that robot.
      agent = byId(robotId);
      const r = routeText(m.content, agents);
      task = agent && r.kind === "assign" && r.agent.id === agent.id ? r.task : m.content.trim();
    } else if (m.channelId === opts.channelId) {
      const r = routeText(m.content, agents);
      if (r.kind === "ignore") return;
      if (r.kind === "error") {
        if (allowed(m.author.id)) await m.reply({ content: r.text, allowedMentions: { repliedUser: false } }).catch(() => {});
        return;
      }
      agent = r.agent; task = r.task;
    } else return;
    if (!agent) return;

    if (!allowed(m.author.id)) { await m.react("🚫").catch(() => {}); return; }
    const result = await give(agent, task, m.channelId, m);
    if (result === "started") await m.react("👀").catch(() => {});
    else if (result === "queued") await m.react("⏳").catch(() => {});
    else {
      await m.react("❌").catch(() => {});
      await m.reply({ content: agent.name + " has too many tasks waiting. Try again in a bit.", allowedMentions: { repliedUser: false } }).catch(() => {});
    }
  });

  client.on(Events.InteractionCreate, async i => {
    if (i.guildId !== opts.guildId) return;
    if (i.isAutocomplete()) {
      const typed = String(i.options.getFocused());
      await i.respond(suggest(agents, typed).slice(0, 25).map(a => ({ name: a.name + " · " + a.position, value: a.id }))).catch(() => {});
      return;
    }
    if (!i.isChatInputCommand()) return;
    if (!allowed(i.user.id)) { await i.reply({ content: "You are not allowed to give tasks.", flags: MessageFlags.Ephemeral }); return; }

    if (i.commandName === "agents") {
      const { text } = boardLines(agents, state, id => waiting.get(id)?.length ?? 0);
      await i.reply({ content: text, flags: MessageFlags.Ephemeral });
    } else if (i.commandName === "task") {
      const agent = byId(i.options.getString("agent", true));
      const task = i.options.getString("task", true).trim();
      if (!agent) { await i.reply({ content: "No such agent. Pick one from the list.", flags: MessageFlags.Ephemeral }); return; }
      await i.deferReply();
      const anchor = await i.fetchReply();
      const channelId = i.channel?.isThread() ? i.channel.parentId ?? i.channelId : i.channelId;
      const result = await give(agent, task, channelId, anchor);
      if (result === "started" || result === "queued") {
        await i.editReply({ content: "📌 " + i.user.toString() + " gave **" + agent.name + "** (" + agent.position + ") a task: " + task + (result === "queued" ? "\n⏳ " + agent.name + " is busy, queued." : ""), allowedMentions: { parse: [] } });
      } else {
        await i.editReply({ content: agent.name + " has too many tasks waiting. Try again in a bit." });
      }
    }
  });

  client.on(Events.Error, e => console.error("[discord] error:", e.message));
  await client.login(opts.token);

  function onEvent(ev: OfficeEvent) {
    if (ev.type === "agent.status") {
      const prev = state.get(ev.agentId);
      state.set(ev.agentId, { status: ev.status, task: ev.status === "idle" ? undefined : ev.task ?? prev?.task });
      board?.touch();
      if (ev.status === "thinking" && incoming?.agentId === ev.agentId && !current.has(ev.agentId)) current.set(ev.agentId, incoming.ctx);
    }
    const agentId = ev.type === "agent.handoff" ? ev.from : "agentId" in ev ? ev.agentId : undefined;
    const agent = agentId ? byId(agentId) : undefined;
    if (!agent) return;
    const ctx = current.get(agent.id);
    const text = stepText(ev, agents, id => state.get(id)?.task);
    const robotCh = structure.robot.get(agent.id);

    if (text) {
      if (ctx) {
        poster.say(ctx.channelId, agent, text, ctx.threadId);
        // The robot's own channel keeps a short history of its tasks, even when they were given elsewhere.
        const major = ev.type === "agent.handoff" || (ev.type === "agent.status" && ev.status !== "working");
        if (major && robotCh && robotCh !== ctx.channelId) poster.say(robotCh, agent, text + link(ctx));
        if (ev.type === "agent.status" && ev.status === "error" && structure.alertsId) {
          poster.say(structure.alertsId, agent, "⚠️ " + agent.name + " hit an error on: " + (state.get(agent.id)?.task ?? "task") + link(ctx));
        }
      } else if (opts.feed === "all" && ev.type !== "agent.log") {
        poster.say(opts.channelId, agent, text);
      }
    }

    if (ev.type === "agent.handoff" && ctx) {
      // The thread follows the work: the receiver continues in the same thread.
      current.set(ev.to, ctx);
      const toAgent = byId(ev.to), toCh = structure.robot.get(ev.to);
      if (toAgent && toCh && toCh !== ctx.channelId) poster.say(toCh, toAgent, "📥 Incoming from " + agent.name + ": " + ev.task + link(ctx));
    }
    if (ev.type === "agent.status" && ev.status === "idle") {
      // Next queued Discord task (if any) starts on this agent in a moment, so move its thread in now.
      const next = waiting.get(agent.id)?.shift();
      if (next) current.set(agent.id, next); else current.delete(agent.id);
    }
  }

  return {
    onEvent,
    stop() { board?.stop(); void client.destroy(); }
  };
}
