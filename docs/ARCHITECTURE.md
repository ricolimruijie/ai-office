# Architecture

Agent Office is split into three layers that only talk through one contract.

```
 event source  ──►  ingest(event)  ──►  Zustand store  ──►  React UI + 3D scene
 (WebSocket)        (single door)       (domain state)
                         │
                         └──► scene effects (handoff walk, light pulse)
```

## The event contract

`shared/events.ts` is the only definition of what can change the office:

| Event | Effect |
| --- | --- |
| `agent.status` | Sets an agent's status and optionally its task. `idle` clears the task and inbox. |
| `agent.log` | Adds a line to that agent's activity log. |
| `agent.handoff` | The sender walks to the receiver's desk with a document. |
| `model.call` | Increments the router counter and sends a light pulse to the rack. |

Every event carries `ts` (ms). `isOfficeEvent()` validates incoming data at runtime.
Messages from the browser to the server (`task.assign`, `sim.pause`, `sim.resume`) are a separate type, `ClientMessage`, and are not office events.

## Data flow

1. An `OfficeSource` (`src/events/wsSource.ts`) receives a JSON frame, validates it, and calls back.
2. `connectSource()` (`src/events/connect.ts`) passes each event to `ingest()` and mirrors connection state into the store.
3. `ingest()` (`src/state/ingest.ts`) is the only function that changes domain state (agents, feed, router calls). It also fires transient **scene events** (`handoff`, `call`) to listeners.
4. React UI reads the store with selectors. The 3D scene reads the store inside `useFrame` (no re-render) and listens for scene events.

## Two kinds of state

| Kind | Where | Changed by |
| --- | --- | --- |
| Domain state: agents, status, task, log, feed, router calls | `useOfficeStore` | `ingest()` only |
| View state: selected agent, paused, connection, camera reset, inbox paper, walk label | `useOfficeStore` actions | UI and scene |

The inbox paper and walk label are view state because they depend on animation timing (the paper appears after the sender arrives), not on the event itself.

## Per-frame state

Anything that changes every frame stays out of React state:

- `RobotMotion` (`src/characters/motion.ts`): position (including height), pose, heading, walking path, and the lounge activity of each character.
- `sceneState` (`src/scene/sceneState.ts`): router flash, tag anchors and elements, and every character's motion (so doors know who is near).
- `liftState` (`src/scene/lift.ts`): the lift cab height and door openings.
- The clock (`src/state/clockStore.ts`) is read inside `useFrame`, so the sky and lamps change without re-rendering.

Characters read the store with `getState()` inside `useFrame`, so a status change never re-renders a 3D component.

## Layout, floors, routes and handoff timing

`shared/layout.ts` is pure geometry used by both sides (the 3D scene and the mock server). It turns `agents.json` and `divisions.json` into a floor plan:

- **Ground floor:** one glass-walled room per `level: 0` division (including `shared` ones like the meeting room), side by side in the order of `divisions.json`, each with a sliding door onto the front corridor. A lift lobby sits at the right end.
- **Meeting room:** sized so one table seats every agent. `layout.meeting` holds the table and one seat per agent, each an `ActivitySpot` with its own approach path.
- **Upper floor:** a block behind the ground floor (`UPPER_Y` high) with the product suite and the game lounge.
- **Lift:** a glass shaft joining the two floors. Its ground doors face the lobby and its upper doors face the lounge.
- **Routes:** `routeTo(i, j)` is the walking path between two desks. A route is a list of steps: points (which can carry a height) and `{ lift: true, toY }` steps. `routeHome` is the way back. `routeToSpot`, `routeFromSpot` and `routeSpotToSpot` do the same for any activity spot (lounge or meeting seat), across floors if needed.
- `walkTime` estimates a trip's duration, adding `LIFT_TRIP_S` per lift step.

The mock server calls `walkTime()` to decide when the receiver starts working, so the frontend never has to report arrival. The hand-over pause (1.2 s) is a constant in `Handoffs.tsx`, mirrored in `server/mock.ts`.

**The lift** (`src/scene/lift.ts`): when a character reaches a lift step, `stepMotion` hands it to the lift controller, which puts it in a line near the doors (`queueSpot`). The controller runs one trip at a time: close the doors and bring the cab to the floor of the first person waiting, open the door, and let everyone queued for that floor walk into their own slot inside the cab (up to `CAPACITY`). It holds the doors while people are still stepping in or running up to the line, then closes, rides, opens on the other side, and lets the riders out one by one. People waiting on the arrival floor can board right away, because the cab is already there with its door open. `LiftView.tsx` only draws what `liftState` says.

**Behavior away from the desk** (`src/characters/LoungeBehavior.tsx`): a throttled loop that watches each agent's status and the `meeting` flag. After an idle spell it sends the character to a free lounge spot, switches spots now and then, and sends it home when its status leaves idle. When a meeting is called every character goes to its seat (from the desk or from the lounge) and goes home when it ends. It never touches the event contract.

**Inside and outside view.** The store's `viewMode` is read each frame by `Cutaway` (walls stay full height outside, drop when seen from outside inside) and `Roofs` (roofs slide up and away inside, settle on outside). The name tags hide through a CSS class.

## The 3D scene

The look is cel-shaded: every material is a `MeshToonMaterial` with a 3-step gradient (`scene/toon.ts`), and characters add ink outlines using a back-faced, slightly larger copy of each shape (`characters/parts3d.tsx`). Brick, concrete, corrugated metal, wood and hazard stripes are canvas-drawn textures (`scene/textures.ts`), repeating once per real-world meter via `TBox`.

| Area | Files |
| --- | --- |
| Floors, exterior walls, partitions, ceiling beams | `Building.tsx` |
| Walls that drop when seen from outside | `Cutaway.tsx` |
| Glass partitions and sliding doors | `GlassWall.tsx`, `Doors.tsx` |
| The glass lift (cab, doors, shaft) and its controller | `LiftView.tsx`, `lift.ts` |
| Yard: asphalt, containers, chimney, silos, trees, skyline | `Environment.tsx` |
| Sun, moon, sky dome, stars, clouds | `timeOfDay.ts`, `Sky.tsx`, `Lighting.tsx` |
| Gaming workstations (six styles) and RGB lighting | `desk/Desk.tsx`, `desk/gear.tsx`, `desk/rgb.ts` |
| Room furniture, corridor, lobby, product suite | `decor/Rooms.tsx`, `decor/props.tsx` |
| Game lounge | `decor/Lounge.tsx` |
| Meeting room table and chairs | `decor/Rooms.tsx` (`MeetingDecor`) |
| Roofs for the outside view | `Roofs.tsx` |
| Characters: skeleton, face, hands, hair, outfits | `characters/Character.tsx`, `CharacterParts.tsx` |
| Poses and emotions per status and activity | `characters/pose.ts` |
| Fading of ceiling and foreground structure | `NearFade.tsx` |
| Camera (orbit, W A S D, follow) | `CameraRig.tsx` |

**Time of day.** `timeOfDay.ts` blends between hand-tuned moments (night, dawn, morning, noon, afternoon, golden hour, dusk) for sky, sun, sky light, and how much the windows and lamps glow. The sun crosses from east to west between 6:00 and 19:00. Shared materials for windows and lamps (`materials.ts`) are updated once per frame, so every window lights up together.

**Characters.** `Character.tsx` builds one skeleton from groups (joints). Each frame `computePose()` returns the target angle for every joint and every face control from the character's status, pose and activity, and the joints ease toward it. Ghost and zombie differ only in body parts and a few pose tweaks (ghosts float, have a tail and fly when they travel, zombies walk with arms out). `Hand` animates five fingers with two joints each.

**Cost.** The whole scene is roughly 4,000 draw calls, a third of them in the shadow pass, so small props do not cast shadows. Outlines and fingers are switched off when the camera is far, ceiling pieces fade, and the shadow map is smaller on phones.

## Command bar

`src/ui/CommandBar.tsx` turns `@nika create a new project` into a `task.assign` message. The parsing is in `shared/mentions.ts` (pure functions: `parseCommand`, `findAgent`, `suggest`). A mention matches name, then id, then position, ignoring case and punctuation. It sends through `assignTask()` in `src/events/actions.ts` like the drawer form does, so the command bar and the event source stay decoupled.

## Discord bot

`server/discord/` is a second front end for the same flow, not a new source of truth. It runs in the server process and is split by job:

| File | Job |
| --- | --- |
| `index.ts` | Connects, handles messages and slash commands, follows each task, reacts to events |
| `structure.ts` | Finds or creates the Agent Office category, `#status-board`, `#alerts` and one channel per agent |
| `poster.ts` | Posts as a agent (webhook with its name and avatar, bot message as fallback), in order |
| `board.ts` | The pinned live status message and the bot's presence text |
| `pure.ts` | No Discord objects: `routeText`, `boardLines`, `stepText`, `avatarFor`. Easy to test |

How it flows:

- Discord to office: `/task`, `@name ...` in the feed channel, or any message in a agent channel calls `sim.assign()`, exactly like the web `task.assign` message. A thread is opened under the message first, because `assign()` fires its events before it returns.
- Office to Discord: every broadcast event is also passed to `bot.onEvent()`. Each running Discord task has a context (channel and thread). Events for that agent are posted into its thread, with short lines mirrored to the agent's own channel and `#alerts`. A handoff moves the context to the receiver, so one thread follows the whole chain. Queued tasks wait in a per-agent list that matches the mock's queue.
- Missing permissions never crash it. It logs what is missing plus an invite link, and falls back (no channels means feed only, no webhook means bot messages, no thread means the channel).
- With a real agent backend later, keep the bot, feed it that backend's events, and replace `assign` with a call to it.

## Name tags

Tags are plain DOM buttons (`src/ui/NameTags.tsx`) moved each frame by `TagProjector`, which projects each 3D anchor to screen space. drei's `<Html>` was avoided because its portal root fails to render under React 19 here.

## Swapping the backend

Implement `OfficeSource` (`src/events/EventSource.ts`) and export it from `src/events/index.ts`, or set `VITE_EVENT_URL`. Nothing in `scene/`, `characters/`, `ui/` or `state/` needs to change.

## Where to change things

| I want to... | Edit |
| --- | --- |
| Add or change an agent, or change who sits where | `agents.json` (file order is seat order) |
| Move an agent to another room | `agents.json` (`division`) |
| Add a division or change a room's theme | `divisions.json`, then `decor/Rooms.tsx` for new furniture |
| Change how a character looks | `agents.json` (`look`), `characters/CharacterParts.tsx` for new hair, outfits or accessories |
| Change a character's desk | `agents.json` (`desk`), `desk/Desk.tsx` |
| Change how a character moves or emotes | `characters/pose.ts` |
| Add or change a lounge activity | `shared/layout.ts` (spots), `decor/Lounge.tsx`, `characters/pose.ts` |
| Change the floor plan, doors or routes | `shared/layout.ts`, then `Building.tsx` |
| Change the lift | `scene/lift.ts` (behavior), `LiftView.tsx` (look) |
| Change the meeting room or its seating | `shared/layout.ts` (`meeting`), `decor/Rooms.tsx` |
| Change the sky, sun or lamps by time | `scene/timeOfDay.ts`, `Lighting.tsx` |
| Add an event type | `shared/events.ts`, then `ingest.ts`, then `isOfficeEvent` |
| Change what an event does | `src/state/ingest.ts` |
| Change a status color or label | `src/config/status.ts` |
| Change how @mentions are matched | `shared/mentions.ts` |
| Change mock behavior | `server/mock.ts` |
| Change Discord commands, channels or what gets posted | `server/discord/` |
| Change panels or theme | `src/ui/*.tsx`, `theme.css`, `panels.css` |
