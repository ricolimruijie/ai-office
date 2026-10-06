import { ChannelType, EmbedBuilder, type Client, type Webhook } from "discord.js";
import type { AgentConfig } from "../../shared/agents";
import { avatarFor } from "./pure";

const HOOK_NAME = "Agent Office";

/* Posts as a robot: through a webhook so the message shows the robot's own name and avatar.
   If webhooks are not allowed, falls back to a bot message with the robot as the author line.
   Messages are sent one at a time so they stay in order. */
export class Poster {
  private hooks = new Map<string, Webhook | null>();
  private tail: Promise<void> = Promise.resolve();

  constructor(private client: Client) {}

  say(channelId: string, agent: AgentConfig, text: string, threadId?: string): void {
    this.tail = this.tail.then(() => this.send(channelId, agent, text, threadId)).catch(() => {});
  }

  private async hookFor(channelId: string): Promise<Webhook | null> {
    if (this.hooks.has(channelId)) return this.hooks.get(channelId) ?? null;
    let hook: Webhook | null = null;
    try {
      const ch = await this.client.channels.fetch(channelId);
      if (ch?.type === ChannelType.GuildText) {
        const all = await ch.fetchWebhooks();
        hook = all.find(w => w.owner?.id === this.client.user?.id && w.name === HOOK_NAME) ?? await ch.createWebhook({ name: HOOK_NAME });
      }
    } catch { hook = null; }
    this.hooks.set(channelId, hook);
    return hook;
  }

  private async send(channelId: string, agent: AgentConfig, text: string, threadId?: string) {
    const color = parseInt(agent.color.slice(1), 16);
    const who = agent.name + " · " + agent.position;
    const hook = await this.hookFor(channelId);
    if (hook) {
      try {
        await hook.send({
          username: who, avatarURL: avatarFor(agent), threadId,
          embeds: [new EmbedBuilder().setColor(color).setDescription(text.slice(0, 4000))],
          allowedMentions: { parse: [] }
        });
        return;
      } catch { this.hooks.delete(channelId); } // webhook was removed; use the fallback now and look it up again next time
    }
    const target = await this.client.channels.fetch(threadId ?? channelId).catch(() => null);
    if (target?.isSendable()) {
      await target.send({
        embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: who, iconURL: avatarFor(agent) }).setDescription(text.slice(0, 4000))],
        allowedMentions: { parse: [] }
      }).catch(e => console.error("[discord] post failed:", e.message));
    }
  }
}
