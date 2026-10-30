# Architecture

Agent Office is split into three layers that only talk through one contract.

```
 event source  ──►  ingest(event)  ──►  Zustand store  ──►  React UI + 3D scene
 (WebSocket)        (single door)       (domain state)
                         │
                         └──► scene effects (handoff familiar, light pulse)
```

## The event contract

`shared/events.ts` is the only definition of what can change the office. It is a generated copy of the backend's `contract/events.ts` (run `npm run sync-contract`, never edit it here):

| Event | Effect |
| --- | --- |
| `agent.status` | Sets an agent's status and optionally its task. `idle` clears the task and inbox. |
| `agent.log` | Adds a line to that agent's activity log. |
| `agent.handoff` | The sender casts a spell and a familiar (an owl) flies the document to the receiver's desk. |
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
- The clock (`src/state/clockStore.ts`) is read inside `useFrame`, so the sky and lamps change without re-rendering.

Characters read the store with `getState()` inside `useFrame`, so a status change never re-renders a 3D component.

## Layout, routes and delivery timing

`shared/layout.ts` is pure geometry used by the 3D scene. It turns `agents.json` and `divisions.json` into a castle:

- **Two rows of buildings.** The front row (Charms Classroom, Great Hall, Potions Tower) faces the forecourt lane (`COURT_Z`). The back row (Library, Common Room, Headmaster's Tower) faces the alley lane (`ALLEY_Z`) behind them. The `theme` of a division picks its row and its order. The common room always exists and stands straight behind the Great Hall.
- **Passages.** Gaps between the front-row buildings (`layout.passages`) join the forecourt to the alley. Everyone walks along those two lanes and the passages.
- **Rooms.** `layout.rooms` lists every building as a `RoomRect` with its doorway (`doorX`), the walking lane just inside (`laneZ`) and the lane just outside (`outZ`). All desks face +z, so every building opens to the south.
- **The Headmaster's Tower.** The only upper-floor room (`level: 1`, `UPPER_Y` high). Its spiral staircase (`layout.stairs`) is a list of points that climb, so walking up is just a path with rising heights.
- **Great Hall.** Sized so one table seats every agent. `layout.meeting` holds the table and one seat per agent, each an `ActivitySpot`.
- **Routes.** `routeToSpot`, `routeFromSpot` and `routeSpotToSpot` build a path from the chair out of the room (down the stairs for a tower), along the lanes (through the nearest passage when the rows differ), and into the spot's room. Each spot's `via` list starts just inside its doorway.
- `deliveryTime()` estimates how long a familiar delivery takes: the summoning spell, the flight (`familiarFlight`, a straight arc at `FAMILIAR_SPEED`) and the landing.

The backend does not know about this geometry. The frontend plays the cast and the owl flight (about 4 to 10 s) whenever a `agent.handoff` event arrives, and the mock backend waits a random 4 to 10 s before starting the receiver.

**Behavior away from the desk** (`src/characters/LoungeBehavior.tsx`): a throttled loop that watches each agent's status and the `meeting` flag. After an idle spell it sends the character to a free lounge spot, switches spots now and then, and sends it home when its status leaves idle. When a meeting is called every character goes to its seat (from the desk or from the lounge) and goes home when it ends. It never touches the event contract.

**Inside and outside view.** The store's `viewMode` is read each frame by `Cutaway` (walls stay full height outside, drop when seen from outside inside) and `Roofs` (roofs slide up and away inside, settle on outside). The name tags hide through a CSS class.

## The 3D scene

The look is cel-shaded: every material is a `MeshToonMaterial` with a 3-step gradient (`scene/toon.ts`), and characters add ink outlines using a back-faced, slightly larger copy of each shape (`characters/parts3d.tsx`). Brick, concrete, corrugated metal, wood and hazard stripes are canvas-drawn textures (`scene/textures.ts`), repeating once per real-world meter via `TBox`.

| Area | Files |
| --- | --- |
| Floors, walls, arcaded fronts, turrets, ceiling beams | `Building.tsx`, `Arches.tsx` |
| Walls that drop when seen from outside | `Cutaway.tsx` |
| Oak gates that swing open | `Doors.tsx` |
| The spiral staircase in the Headmaster's Tower | `StairTower.tsx` |
| Grounds: lawns, lake and bridge, forest, hut, Quidditch pitch, mountains | `Environment.tsx` |
| Sun, moon, sky dome, stars, clouds | `timeOfDay.ts`, `Sky.tsx`, `Lighting.tsx` |
| Gaming workstations (six styles) and RGB lighting | `desk/Desk.tsx`, `desk/gear.tsx`, `desk/rgb.ts` |
| Room furniture, forecourt fountain, headmaster's study | `decor/Rooms.tsx`, `decor/props.tsx`, `decor/magic.tsx` |
| Common room | `decor/Lounge.tsx` |
| Great Hall table and chairs | `decor/Rooms.tsx` (`GreatHallDecor`) |
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

## Name tags

Tags are plain DOM buttons (`src/ui/NameTags.tsx`) moved each frame by `TagProjector`, which projects each 3D anchor to screen space. drei's `<Html>` was avoided because its portal root fails to render under React 19 here.

## Swapping the backend

Set `VITE_EVENT_URL` to point at another server, or implement `OfficeSource` (`src/events/EventSource.ts`) and export it from `src/events/index.ts`. Nothing in `scene/`, `characters/`, `ui/` or `state/` needs to change.

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
| Change the floor plan, doors or routes | `shared/layout.ts`, then `Building.tsx` and `Roofs.tsx` |
| Change the staircase | `shared/layout.ts` (`climb`), `StairTower.tsx` (look) |
| Change the meeting room or its seating | `shared/layout.ts` (`meeting`), `decor/Rooms.tsx` |
| Change the sky, sun or lamps by time | `scene/timeOfDay.ts`, `Lighting.tsx` |
| Add an event type | backend `contract/events.ts`, `npm run sync-contract`, then `ingest.ts` |
| Change what an event does | `src/state/ingest.ts` |
| Change a status color or label | `src/config/status.ts` |
| Change how @mentions are matched | `shared/mentions.ts` |
| Change events, mention parsing, mock behavior or Discord | the backend repo (`contract/`, `server/`), then `npm run sync-contract` here |
| Change panels or theme | `src/ui/*.tsx`, `theme.css`, `panels.css` |
