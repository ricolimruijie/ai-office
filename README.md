# AI Office Frontend

A local 3D office where each character is one of your AI agents. This repo is the 3D layer only. It listens to a WebSocket event stream, and the backend lives in its own repo, [ai-office-backend](https://github.com/ricolimruijie/ai-office-backend) (a mock simulation plus an optional Discord bot). Any server that speaks the event contract below can replace it without touching the 3D code.

`agent-office.html` is the original single-file prototype, kept for reference.

## Run it

```bash
# 1. Backend (separate repo)
git clone https://github.com/ricolimruijie/ai-office-backend && cd ai-office-backend
npm install && npm run dev        # ws://localhost:8787

# 2. Frontend (this repo)
npm install
npm run dev                       # http://localhost:5173
```

The top bar shows a connection indicator (Live, Connecting, Offline). If the backend is down the app keeps retrying. To use another backend URL, set `VITE_EVENT_URL` (for example `VITE_EVENT_URL=wss://your-backend/events npm run dev`). `npm run build` makes a production build and `npm run typecheck` runs the type checker.

## Use it

**Looking around**

- Mouse: drag to orbit, right-drag to pan, wheel to zoom. Touch: one finger orbits, two fingers pan and pinch.
- Keyboard: **W A S D** (or the arrow keys) walk the camera across the floor, **Q** and **E** turn it, **R** and **F** go up and down, **Shift** is faster.
- Click a character, its name tag, or its row in the list to fly to it. The camera follows it as it walks (the tower stairs included) until you move by hand. "Reset view" shows the whole castle again.
- Walls on the side facing the camera drop to a low base so you can always see in. Ceiling beams and hanging lamps fade when you look down on them or zoom close.

**Giving tasks**

- **By name.** Use the command bar at the bottom: `@nika i do wanna create a new project`, then Enter. Typing `@` lists the agents (arrow keys and Tab or Enter to pick). You can mention an agent by name (`@nika`), id (`@backend`) or position (`@product-manager`, `@technical-writer`, `@r&d`), and the mention can sit anywhere in the sentence.
- Or select an agent, type a task in the right panel and press Assign. Both ways run through the same flow as the random tasks.
- "Pause auto activity" stops the server from starting new random tasks. Tasks you assign still run. With nothing to do, everyone drifts to the common room (see below).

**Inside and outside view.** The "Inside view" button in the top bar (or the **V** key) switches to the outside view, like the Sims: the roofs settle onto the castle, the walls stay full height on every side, and the people's name tags hide. Switch back and the roofs lift away and the walls facing the camera drop low again, so you can see in.

**Meetings.** "Call meeting" in the top bar sends everyone to the Great Hall: the product manager comes down the tower stairs, and all six sit around one long table. Each takes a turn to speak (the mouth moves, they gesture) while the others listen and nod. "End meeting" sends everyone back. The table seats however many agents you have.

**Time of day**

The sky, sun, shadows and lights follow your computer's clock. By day the sun crosses from east to west with warm light in the morning and neutral light at noon. At dusk the sky goes orange, then at night there is moonlight, stars, glowing windows, warm interior lamps and a neon lounge. The panels switch to a dark theme after sunset. The chip in the top bar shows the phase and time. Click it to preview morning, afternoon and night, and once more to return to the real time.

**Preview switches** (add to the address, for example `http://localhost:5173/?hour=21&lounge=instant`)

| Switch | Effect |
| --- | --- |
| `?hour=14.5` | Pin the time of day (hours, 0 to 24) |
| `?lounge=instant` | Idle characters appear in the lounge at once, no waiting or walking |
| `?lounge=off` | No trips to the lounge (meetings still work) |
| `?meeting=1` | Start with a meeting already called |

## Send a test event

Test events are sent from the backend repo (`npm run send -- '<event json>'`, see its README). The server relays any valid office event to every open browser. A handoff is delivered by magic: the sender stays seated, casts a spell with a wand, and a familiar (an owl) flies the letter to the receiver's desk. It only plays when the sending agent is seated.

## Event contract

Owned by the backend repo (`contract/events.ts`) and copied here to `shared/events.ts` by `npm run sync-contract`. Never edit the copy. Every event has `ts` (ms since epoch).

```ts
{ type: "agent.status",  agentId, status: "idle" | "thinking" | "working" | "done" | "error", task? }
{ type: "agent.log",     agentId, message }
{ type: "agent.handoff", from, to, task }
{ type: "model.call",    agentId, tier? }
```

The browser also sends these messages to the backend (they are not office events): `task.assign { agentId, text }`, `sim.pause`, `sim.resume`.

All office state changes go through one function, `ingest(event)` in `src/state/ingest.ts`.

## Agents

Each agent is a character with a personal name and a position. Edit `agents.json`. `name` is the `@handle` you type in the command bar and must be unique. The backend has its own `agents.json` with the same `id`, `name`, `position`, `role` and `color`; keep them in sync.

| Name | Position | Character | Division | Desk |
| --- | --- | --- | --- | --- |
| Nika | Product Manager | Ghost in a top hat and bow tie, with a monocle | Headmaster's Tower (upper floor) | Executive: L-shaped walnut desk, three curved monitors, gold RGB |
| Nova | R&D | Zombie in a lab coat with goggles and stitches | Potions Dungeon | Lab: white bench, dual monitors, test tubes, violet RGB |
| Lyra | Technical Writer | Ghost with a hair bun, round glasses and a scarf | The Library | Writer: oak desk, curved ultrawide, lamp, books, soft pink RGB |
| Atlas | Backend | Zombie in a hoodie with headphones and an exposed bone | Charms Classroom | Backend: two vertical monitors and an ultrawide, two PCs, green RGB |
| Pixel | Frontend | Ghost in a pink hoodie and beanie | Charms Classroom | Frontend: three monitors, drawing tablet, figurines, pink and cyan RGB |
| Sentry | QA | Zombie in a hi-vis vest, cap and bandage | Charms Classroom | QA: 2x2 monitor wall, phones under test, signal tower, red and white RGB |

Fields: `id`, `name`, `position`, `role`, `color`, `tasks`, `division`, `desk` (`executive`, `lab`, `writer`, `backend`, `frontend`, `qa`) and `look`.

**Look.** `look.kind` is `ghost` or `zombie`. The rest is optional: `skin` (the sheet of a ghost, the skin of a zombie), `hair` (`none`, `messy`, `patchy`, `slick`, `spiky`, `bun`, `long`), `hairColor`, `outfit` (`suit`, `hoodie`, `labcoat`, `vest`, `scarf`, `none`), `outfitColor`, `pants`, `accessory` (`monocle`, `glasses`, `roundglasses`, `headphones`, `goggles`, `cap`, `beanie`, `tophat`, `none`) and `extras` (`stitches`, `bandage`, `bone`, `bowtie`, `tie`).

**The characters.** Every character has a full skeleton: pelvis, spine, chest, neck and head, shoulders, elbows, wrists, five-finger hands, and hips, knees and ankles. Ghosts have a swaying tail instead of legs: they float, and when they travel they fly, leaning into the flight with the tail streaming behind and the arms trailing, instead of stepping. Zombies still walk, arms out in front. The face has eyelids that blink, pupils that follow the camera, eyebrows, cheeks and a mouth that curves from smile to frown and opens. Expression follows what the character is doing: calm and curious when idle, a raised brow and a glance up when thinking, narrowed eyes while working, a big grin when done, wide eyes, worried brows and a sweat drop on an error, and laughing fits while playing in the lounge.

**Divisions and rooms.** Each agent's `division` matches an id in `divisions.json`. Every division becomes its own stone building, in one of two rows (the `theme` decides which). The front row faces the forecourt: Charms Classroom (`developers`), the Great Hall (`meeting`) and the Potions Tower (`lab`). The back row faces a lane behind them: the Library (`library`), the Common Room (always there) and the Headmaster's Tower (`executive`, a `level: 1` division whose study is on the upper floor, reached by a spiral staircase inside the tower). A division with `"shared": true`, like the Great Hall, exists even with nobody assigned to it. Building sizes, desks and walking routes are generated from this data (`shared/layout.ts`), so moving an agent to another division just works.

**The castle.** A cluster of separate stone buildings joined by open lanes and passages, warmly lit (golden daylight, dark oak beams, candles that hover in the air, torches on the walls, glowing windows and a purple dusk). Each building has an arched doorway in an open arcaded front, so you can always see in; the Great Hall has a grand gate with steps, banners and torches. Round turrets stand on the outer corners and every roof is slate: gabled over the halls, pointed over the towers. The grounds have a fountain in the forecourt, a stone bridge over the black lake, a dark pine forest, a gamekeeper's hut with pumpkins, a willow, a Quidditch pitch with stands and hoops, and far mountains. Handoffs fly over all of it, so only trips to the common room and the Great Hall use the lanes.

**The common room.** Behind the Great Hall: Exploding Snap tables, a wizard chess board, two broom practice mounts, armchairs round a fireplace, a scrying nook with a pensieve and a butterbeer bar, under floating candles. When a character has been idle for several seconds it gets up, walks there and picks an activity: it directs the chess pieces with a long wand, grips the broom, holds a crystal in the scrying nook, plays Exploding Snap, sips butterbeer at the bar or relaxes by the fire. After a while it may wander to something else. When work arrives it hurries back to its desk.

## Docs

- [Architecture](docs/ARCHITECTURE.md): data flow, state rules, where to change things.
- [Coding standards](docs/CODING_STANDARDS.md): formatting, naming, state and 3D rules, pre-commit checklist.

## Project layout

```
agents.json            agent config (name, position, division, look, desk, tasks)
divisions.json         divisions, their level and room theme
shared/                code that does not depend on React
  events.ts            GENERATED copy of the backend's event contract
  mentions.ts          GENERATED copy of the backend's @name parsing
  agents.ts            agent, look and division types
  layout.ts            the castle plan, desks, common-room spots, lane routes, familiar flight time
src/
  state/               Zustand store and ingest()
  events/              swappable event source (WebSocket implementation)
  scene/               buildings, arches, doors, roofs, stair tower, camera, sky and lighting, grounds
    desk/              gaming workstations and the shared RGB lighting
    decor/             room furniture, magical props and the common room
  characters/          rigged ghost and zombie, poses and emotions, walking, lounge behavior
  ui/                  top bar, agent list, agent panel, name tags, CSS
scripts/sync-contract.mjs  copies the contract from ../ai-office-backend
docs/                  architecture and coding standards
```

## Connect a real backend

The scene and UI only know `ingest(event)` and the `OfficeSource` interface (`src/events/EventSource.ts`).

- If your backend speaks the same events over WebSocket, set `VITE_EVENT_URL=wss://your-backend/events`.
- Otherwise write another `OfficeSource` (SSE, polling, anything) and export it from `src/events/index.ts`. It must call back with valid events and accept `task.assign`, `sim.pause` and `sim.resume` in `send()`.
- Handoff timing: the frontend plays the cast and the owl flight (about 4 to 10 s, from `deliveryTime()` in `shared/layout.ts`) whenever a handoff event arrives. The backend can start the receiver whenever it likes.
