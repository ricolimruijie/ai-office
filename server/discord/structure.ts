import { ChannelType, PermissionFlagsBits, type Client, type Guild } from "discord.js";
import type { AgentConfig } from "../../shared/agents";
import { handleOf } from "../../shared/mentions";

export interface Structure {
  statusId?: string;
  alertsId?: string;
  robot: Map<string, string>;  // agent id -> that robot's channel
  owner: Map<string, string>;  // channel id -> agent id
}

const CATEGORY = "Agent Office";

/* Finds or creates the "Agent Office" category with #status-board, #alerts and one channel per robot.
   Existing channels with the same names are reused, so this is safe to run on every start. */
export async function ensureStructure(client: Client, guild: Guild, agents: AgentConfig[]): Promise<Structure> {
  const s: Structure = { robot: new Map(), owner: new Map() };
  await guild.channels.fetch();
  const find = (type: ChannelType, name: string) => guild.channels.cache.find(c => c.type === type && c.name.toLowerCase() === name.toLowerCase());

  const category = find(ChannelType.GuildCategory, CATEGORY)
    ?? await guild.channels.create({ name: CATEGORY, type: ChannelType.GuildCategory });

  const readOnly = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] },
    { id: client.user!.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
  ];
  const text = async (name: string, topic: string, locked: boolean): Promise<string | undefined> => {
    try {
      const existing = find(ChannelType.GuildText, name);
      if (existing) return existing.id;
      const ch = await guild.channels.create({
        name, type: ChannelType.GuildText, parent: category.id, topic, permissionOverwrites: locked ? readOnly : undefined
      });
      return ch.id;
    } catch (e) {
      console.error("[discord] could not create #" + name + ":", (e as Error).message);
      return undefined;
    }
  };

  s.statusId = await text("status-board", "Live status of every robot. Updates by itself.", true);
  s.alertsId = await text("alerts", "Errors from the robots show up here.", true);
  for (const a of agents) {
    const id = await text(handleOf(a), a.position + " · " + a.role + ". Type here to give " + a.name + " a task.", false);
    if (id) { s.robot.set(a.id, id); s.owner.set(id, a.id); }
  }
  return s;
}
