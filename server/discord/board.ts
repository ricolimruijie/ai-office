import { ActivityType, EmbedBuilder, type Client, type Message } from "discord.js";

const TITLE = "🏢 Agent Office, live";

/* One pinned message that edits itself to show every robot's status. Edits are limited to one per 5 seconds. */
export class Board {
  private msg: Message | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private dirty = true;
  private last = "";
  private presenceAt = 0;
  private presence = "";

  constructor(private client: Client, private channelId: string, private render: () => { text: string; working: number }) {}

  async start() {
    const ch = await this.client.channels.fetch(this.channelId).catch(() => null);
    if (!ch || !ch.isSendable() || !("messages" in ch)) return;
    const recent = await ch.messages.fetch({ limit: 20 }).catch(() => null);
    this.msg = recent?.find(m => m.author.id === this.client.user?.id && m.embeds[0]?.title === TITLE) ?? null;
    if (!this.msg) {
      this.msg = await ch.send({ embeds: [this.embed("Starting…")] }).catch(() => null);
      await this.msg?.pin().catch(() => console.log("[discord] could not pin the status board (needs the Pin Messages permission). It still updates."));
    }
    this.timer = setInterval(() => void this.flush(), 5000);
    await this.flush(true);
  }

  touch() { this.dirty = true; }
  stop() { clearInterval(this.timer); }

  private embed(text: string) {
    return new EmbedBuilder().setColor(0x4b5bd6).setTitle(TITLE).setDescription(text).setFooter({ text: "Updates automatically" }).setTimestamp();
  }

  private async flush(force = false) {
    if (!this.msg || (!this.dirty && !force)) return;
    this.dirty = false;
    const { text, working } = this.render();
    if (text !== this.last || force) {
      this.last = text;
      await this.msg.edit({ embeds: [this.embed(text)] }).catch(e => console.error("[discord] board edit failed:", e.message));
    }
    // Presence updates are rate-limited by Discord, so change it at most every 15 seconds.
    const name = working ? working + (working === 1 ? " robot" : " robots") + " working" : "the office is quiet";
    if (name !== this.presence && Date.now() - this.presenceAt > 15000) {
      this.presence = name; this.presenceAt = Date.now();
      this.client.user?.setPresence({ status: "online", activities: [{ name, type: ActivityType.Watching }] });
    }
  }
}
