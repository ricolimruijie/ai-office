# Agent Office

A local 3D office where each character is one of your AI agents. This is the 3D layer only. Everything is driven by mock events from a small WebSocket server, so a real agent backend can replace it later without touching the 3D code.

`agent-office.html` is the original single-file prototype, kept for reference.

## Run it

```bash
npm install
npm run dev
```

This starts both processes:

| Process | URL | What it is |
| --- | --- | --- |
| Web app (Vite) | http://localhost:5173 | The office |
| Mock event server | ws://localhost:8787 | Random agent activity |

The top bar shows a connection indicator (Live, Connecting, Offline). If the server is down the app keeps retrying. `npm run build` makes a production build and `npm run typecheck` runs the type checker.

## Use it

**Looking around**

- Mouse: drag to orbit, right-drag to pan, wheel to zoom. Touch: one finger orbits, two fingers pan and pinch.
- Keyboard: **W A S D** (or the arrow keys) walk the camera across the floor, **Q** and **E** turn it, **R** and **F** go up and down, **Shift** is faster.
- Click a character, its name tag, or its row in the list to fly to it. The camera follows it as it walks (the lift and stairs included) until you move by hand. "Reset view" shows the whole building again.
- Walls on the side facing the camera drop to a low base so you can always see in. Ceiling beams and hanging lamps fade when you look down on them or zoom close.

**Giving tasks**

- **By name.** Use the command bar at the bottom: `@nika i do wanna create a new project`, then Enter. Typing `@` lists the agents (arrow keys and Tab or Enter to pick). You can mention an agent by name (`@nika`), id (`@backend`) or position (`@product-manager`, `@technical-writer`, `@r&d`), and the mention can sit anywhere in the sentence.
- Or select an agent, type a task in the right panel and press Assign. Both ways run through the same flow as the random tasks.
- "Pause auto activity" stops the server from starting new random tasks. Tasks you assign still run. With nothing to do, everyone drifts to the lounge (see below).

**Inside and outside view.** The "Inside view" button in the top bar (or the **V** key) switches to the outside view, like the Sims: the roofs settle onto the building, the walls stay full height on every side, and the people's name tags hide. Switch back and the roofs lift away and the walls facing the camera drop low again, so you can see in.

**Meetings.** "Call meeting" in the top bar sends everyone to the meeting room: the product manager rides the lift down, and all six sit around one long table. Each takes a turn to speak (the mouth moves, they gesture) while the others listen and nod. "End meeting" sends everyone back. The table seats however many agents you have.

**Time of day**

The sky, sun, shadows and lights follow your computer's clock. By day the sun crosses from east to west with warm light in the morning and neutral light at noon. At dusk the sky goes orange, then at night there is moonlight, stars, glowing windows, warm interior lamps and a neon lounge. The panels switch to a dark theme after sunset. The chip in the top bar shows the phase and time. Click it to preview morning, afternoon and night, and once more to return to the real time.

**Preview switches** (add to the address, for example `http://localhost:5173/?hour=21&lounge=instant`)

| Switch | Effect |
| --- | --- |
| `?hour=14.5` | Pin the time of day (hours, 0 to 24) |
| `?lounge=instant` | Idle characters appear in the lounge at once, no waiting or walking |
| `?lounge=off` | No trips to the lounge (meetings still work) |
| `?meeting=1` | Start with a meeting already called |

## Discord

The office can be driven from a Discord server. The bot runs inside the mock server and connects outward to Discord, so no public URL is needed.

**Setup (once)**

1. Create the bot at https://discord.com/developers/applications and invite it to your server (scopes `bot` and `applications.commands`). Turn on **Message Content Intent** on the Bot tab.
2. Open `.env` (created from `.env.example`) and paste the bot token after `DISCORD_TOKEN=`. The server and channel ids are already filled in. Never commit `.env` or share the token.
3. Recommended: add your own Discord user id to `DISCORD_ALLOWED_USER_IDS` (comma-separated for several people) so only they can give tasks.
4. Restart `npm run dev`. The log should say `[discord] ready as ...`.
5. The bot needs these permissions: View Channels, Send Messages, Send Messages in Threads, Create Public Threads, Embed Links, Add Reactions, Read Message History, Manage Channels, Manage Webhooks, Manage Messages, Pin Messages. If any are missing, the log prints a ready-made invite link. Open it and authorize again, then restart `npm run dev`.

**What the bot sets up**

On start it creates (or reuses) an **Agent Office** category with:

- `#status-board`: one pinned message that updates itself every few seconds with every agent's status and task. The bot's own status line also shows how many agents are working.
- `#alerts`: errors from any agent.
- One channel per agent (`#nika`, `#nova`, `#lyra`, `#atlas`, `#pixel`, `#sentry`). Everything you type in a agent's channel is a task for that agent, no `@` needed.

Your original feed channel keeps working too: type `@nika ...` there.

**Use it**

- Type `@nika i do wanna create a new project` in the feed channel, or just `create a new project` in `#nika`. Or use `/task agent:nika task:...` (the agent list autocompletes). `/agents` shows what every agent is doing.
- Every task gets its **own thread** under your message. Progress (picked up, steps, handoffs, finished) is posted there, and the thread follows the work when a agent hands off to another. Threads archive themselves after an hour.
- Messages come from each agent under its own **name and avatar**, for example "Nika · Product Manager". Avatars are generated pictures from the free DiceBear service, which Discord loads for you. To use your own, add `"avatar": "https://..."` to an agent in `agents.json`.
- A agent's own channel keeps a short history of its tasks even when you gave them elsewhere, and errors also appear in `#alerts`.
- 👀 means started, ⏳ means the agent was busy and the task is queued (it starts by itself, up to 5 waiting per agent), ❌ means its queue is full, 🚫 means you are not allowed.
- By default only tasks given from Discord are reported. Set `DISCORD_FEED=all` to also post the random mock activity to the feed channel.
- Without a permission the bot cannot get, it falls back gracefully (for example to the feed channel when it cannot create channels).

Settings live in `.env` (see `.env.example`). Without `DISCORD_TOKEN` the bot stays off and everything else works as before.

## Send a test event

With `npm run dev` running:

```bash
npm run send -- '{"type":"agent.status","agentId":"backend","status":"error","task":"Test"}'
npm run send -- '{"type":"agent.log","agentId":"qa","message":"Hello from the terminal"}'
npm run send -- '{"type":"agent.handoff","from":"qa","to":"pm","task":"Release sign-off"}'
npm run send -- '{"type":"model.call","agentId":"frontend","tier":"free"}'
```

`ts` is added for you if you leave it out. The server relays any valid office event to every open browser. Handoffs only play when the sending agent is seated.

## Event contract

Defined once in `shared/events.ts`. Every event has `ts` (ms since epoch).

```ts
{ type: "agent.status",  agentId, status: "idle" | "thinking" | "working" | "done" | "error", task? }
{ type: "agent.log",     agentId, message }
{ type: "agent.handoff", from, to, task }
{ type: "model.call",    agentId, tier? }
```

The browser also sends these messages to the server (they are not office events): `task.assign { agentId, text }`, `sim.pause`, `sim.resume`.

All office state changes go through one function, `ingest(event)` in `src/state/ingest.ts`.

## Agents

Each agent is a character with a personal name and a position. Edit `agents.json`. `name` is the `@handle` you type in the command bar and must be unique.

| Name | Position | Character | Division | Desk |
| --- | --- | --- | --- | --- |
| Nika | Product Manager | Ghost in a top hat and bow tie, with a monocle | Product Suite (upper floor) | Executive: L-shaped walnut desk, three curved monitors, gold RGB |
| Nova | R&D | Zombie in a lab coat with goggles and stitches | R&D Lab | Lab: white bench, dual monitors, test tubes, violet RGB |
| Lyra | Technical Writer | Ghost with a hair bun, round glasses and a scarf | Docs Library | Writer: oak desk, curved ultrawide, lamp, books, soft pink RGB |
| Atlas | Backend | Zombie in a hoodie with headphones and an exposed bone | Developers Hall | Backend: two vertical monitors and an ultrawide, two PCs, green RGB |
| Pixel | Frontend | Ghost in a pink hoodie and beanie | Developers Hall | Frontend: three monitors, drawing tablet, figurines, pink and cyan RGB |
| Sentry | QA | Zombie in a hi-vis vest, cap and bandage | Developers Hall | QA: 2x2 monitor wall, phones under test, signal tower, red and white RGB |

Fields: `id`, `name`, `position`, `role`, `color`, `tasks`, `division`, `desk` (`executive`, `lab`, `writer`, `backend`, `frontend`, `qa`) and `look`.

**Look.** `look.kind` is `ghost` or `zombie`. The rest is optional: `skin` (the sheet of a ghost, the skin of a zombie), `hair` (`none`, `messy`, `patchy`, `slick`, `spiky`, `bun`, `long`), `hairColor`, `outfit` (`suit`, `hoodie`, `labcoat`, `vest`, `scarf`, `none`), `outfitColor`, `pants`, `accessory` (`monocle`, `glasses`, `roundglasses`, `headphones`, `goggles`, `cap`, `beanie`, `tophat`, `none`) and `extras` (`stitches`, `bandage`, `bone`, `bowtie`, `tie`).

**The characters.** Every character has a full skeleton: pelvis, spine, chest, neck and head, shoulders, elbows, wrists, five-finger hands, and hips, knees and ankles. Ghosts have a swaying tail instead of legs: they float, and when they travel they fly, leaning into the flight with the tail streaming behind and the arms trailing, instead of stepping. Zombies still walk, arms out in front. The face has eyelids that blink, pupils that follow the camera, eyebrows, cheeks and a mouth that curves from smile to frown and opens. Expression follows what the character is doing: calm and curious when idle, a raised brow and a glance up when thinking, narrowed eyes while working, a big grin when done, wide eyes, worried brows and a sweat drop on an error, and laughing fits while playing in the lounge.

**Divisions and rooms.** Each agent's `division` matches an id in `divisions.json`. Every ground-floor division (`level: 0`) gets its own glass-walled room (the order in `divisions.json` is the order along the corridor: Docs, R&D, the Meeting Room, then Developers). A division with `"shared": true`, like the meeting room, exists even with nobody assigned to it, with a sliding door onto the corridor, sized by how many agents sit in it. A `level: 1` division goes in the upper block behind the building. The `theme` (`executive`, `library`, `lab`, `developers`) picks the floor and furniture. Desks, room sizes and walking routes are generated from this data (`shared/layout.ts`), so moving an agent to another division just works.

**The building.** A closed industrial building, warmly lit (golden daylight, warm wooden floors, lamps that glow even by day, a purple-and-amber night): brick ground floor with factory windows, a concrete upper block on a formwork base, steel beams and pendant lamps, hazard-stripe markings, and a yard with containers, a chimney and silos. Glass partitions separate the rooms. The sliding doors open by themselves when someone walks up to them (a green light above shows it). A glass lift at the right-hand end joins the floors: its cab really travels and its doors open and close. Characters line up near the doors while they wait. When the doors open, everyone queued for that floor steps in and rides together (up to four), the lift holds the doors a moment for anyone running up behind, and they step out one after another at the other end. Handoffs between floors use it, and take noticeably longer.

**The game lounge.** On the upper floor: arcade cabinets, a billiard table, two sim-racing rigs, a bar with stools, a TV nook with bean bags and a PlayStation corner with a sofa, plus neon signs, string lights and a mirror ball. When a character has been idle for several seconds it gets up, rides the lift and picks an activity: it shoots pool with a cue, grips a sim-racing wheel, thumbs a controller, mashes arcade buttons, sips a drink at the bar or laughs at the TV. After a while it may wander to something else. When work arrives it hurries back to its desk.

## Docs

- [Architecture](docs/ARCHITECTURE.md): data flow, state rules, where to change things.
- [Coding standards](docs/CODING_STANDARDS.md): formatting, naming, state and 3D rules, pre-commit checklist.

## Project layout

```
agents.json            agent config (name, position, division, look, desk, tasks)
divisions.json         divisions, their level and room theme
shared/                code used by both web app and server
  events.ts            the event contract and runtime guards
  mentions.ts          @name parsing (web command bar and Discord)
  layout.ts            floor plan, desks, lift, lounge spots, walking routes, walk time
server/                mock WebSocket server (ws)
  index.ts, mock.ts    the random activity simulation
  discord/             optional Discord bot (commands, channels, threads, status board)
src/
  state/               Zustand store and ingest()
  events/              swappable event source (WebSocket implementation)
  scene/               building, lift, doors, camera, sky and lighting, yard
    desk/              gaming workstations and the shared RGB lighting
    decor/             room furniture and the game lounge
  characters/          rigged ghost and zombie, poses and emotions, walking, lounge behavior
  ui/                  top bar, agent list, agent panel, name tags, CSS
scripts/send-event.mjs test event sender
docs/                  architecture and coding standards
```

## Connect a real backend later

The scene and UI only know `ingest(event)` and the `OfficeSource` interface (`src/events/EventSource.ts`).

- If your backend speaks the same events over WebSocket, set `VITE_EVENT_URL=wss://your-backend/events` and remove `dev:server` from the `dev` script.
- Otherwise write another `OfficeSource` (SSE, polling, anything) and export it from `src/events/index.ts`. It must call back with valid events and accept `task.assign`, `sim.pause` and `sim.resume` in `send()`.
- Handoff timing: the mock server waits for the walk using `walkTime()` from `shared/layout.ts` (plus a 1.2 s hand-over). A real backend can do the same, or simply not care, since the sender walks whenever a handoff event arrives.
