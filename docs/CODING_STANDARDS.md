# Coding standards

These describe how the code is already written. Match them when you add code.

## Formatting

Enforced by `.editorconfig`; the rest is convention.

- 2 spaces, LF line endings, final newline, no trailing whitespace.
- Double quotes, semicolons, no trailing commas.
- Aim for under about 140 characters per line. Break long JSX props onto separate lines.
- Use `const`. Use `let` only when reassigned. Never `var`.

## TypeScript

- `strict` is on. Do not use `any`. Use `unknown` plus a guard for untrusted data, as `isOfficeEvent` does.
- Use `interface` for object shapes and `type` for unions and aliases.
- Use `import type` for type-only imports.
- Share types across web and server through `shared/`. Do not redeclare them.
- Avoid non-null `!` except for `document.getElementById("root")!`.

## Naming and files

| Thing | Convention | Example |
| --- | --- | --- |
| React component file | `PascalCase.tsx`, one main component | `AgentDrawer.tsx` |
| Hook, util, store, config | `camelCase.ts` | `officeStore.ts` |
| Components, interfaces, types | `PascalCase` | `RobotMotion`, `LiftStep` |
| Functions, variables | `camelCase` | `routeHome` |
| Module-level constants | `UPPER_SNAKE_CASE` | `WALK_SPEED` |
| Event types | `domain.action` string | `"agent.handoff"` |
| CSS classes | lowercase, hyphenated | `agent-btn` |

- Use named exports. Default exports are only for tool config files (`vite.config.ts`).
- Group files by role: `scene/`, `characters/`, `ui/`, `state/`, `events/`, `config/`. `shared/` must not import from `src/` or `server/`.

## Imports

Order, with a blank line between groups: external packages, then `shared/`, then local modules. Keep relative paths short. Do not create circular imports.

## State and events

- **Domain state changes only through `ingest()`.** Never call `setState` on agents, feed or router calls from UI or scene code.
- View-only changes (selection, pause, connection, camera reset) use the store actions.
- New event type checklist: add it to `shared/events.ts`, extend `isOfficeEvent`, handle it in `ingest()`, emit it from `server/mock.ts`, document it in the README.
- Do not read `Date.now()` for event time in the frontend. Use `ev.ts`.
- Never hardcode agent or division data in components. Read it from `agents.json` and `divisions.json` through `src/config/`.
- Preview switches (`?hour=`, `?lounge=`) are read once at start-up and never change behavior in production use.

## React

- Function components with hooks only.
- Select the smallest slice of the store: `useOfficeStore(s => s.agents[id].status)`, not the whole store.
- Effects that subscribe to something return a cleanup.
- Keep components small. Move logic into hooks or plain functions when a component grows past about 100 lines.
- Use semantic elements (`button`, `label`, `aside`, `header`) and `aria-label` on icon-only buttons.

## Three.js and react-three-fiber

- **No React state for per-frame values.** Use refs, `RobotMotion`, `sceneState`, `liftState`, or the clock store read with `getState()`, and update them in `useFrame`.
- In `useFrame`, read the store with `useOfficeStore.getState()`. Do not subscribe with the hook.
- Do not allocate in `useFrame`. Reuse `Vector3`s and other objects created outside the loop.
- Dispose geometry and materials you create by hand.
- Honor reduced motion by scaling animation through `MOTION` in `Character.tsx`.
- Colors are sRGB hex strings from `scene/palette.ts` (or the agent's own `look`). Do not change the color pipeline per component.
- Use the toon helpers (`scene/parts.tsx`, `characters/parts3d.tsx`) instead of raw `meshStandardMaterial`, so everything shares the cel-shaded look. Characters get ink outlines through those helpers. Textured surfaces use `TBox` so the texture scale stays in real meters.
- Positions are in world units (meters). Rooms, desks, doors, the lift and routes come from `shared/layout.ts`, not magic numbers in components. Anything a character walks on needs a matching `y` in the route, and a trip between floors must go through a `{ lift: true }` step.
- Decor that needs randomness uses `scene/rng.ts` (seeded), never `Math.random()` in render.
- Animated things (fans, agent arm, TVs, neon, clouds, doors) update in `useFrame` through refs, with no React state. Light that is shared by many objects (window glass, lamps, desk RGB) lives in one shared material that a single component updates.
- Furniture is placed relative to its room, the doors and the desks (`r.minX`, `r.doorX`, `layout.desks`), never at hard-coded world coordinates, so a changed floor plan cannot leave a plant in front of a door. Keep the corridor lane, the room lane behind the glass and a door's clear zone (about 1.3 m each side) free.
- Anything that can block the camera (ceiling beams, hanging lamps, front beams) is wrapped in `NearFade`.
- Keep draw calls in check: use instanced meshes for many small identical shapes (books, keys, LEDs, petals), switch off detail that is invisible from far away (outlines, fingers), and keep tiny meshes out of the shadow pass.
- Anything that loads a file at runtime needs a fallback, so a missing file never breaks the scene.
- A new pose or emotion goes in `characters/pose.ts`, as target angles. Do not rotate joints directly from other files.

## Styling

- Colors, spacing tokens and theme live in CSS variables in `theme.css`. Never hardcode a theme color in a component. Status colors come from `src/config/status.ts`.
- Every new color token needs a light and a dark value.
- Mobile rules go in the `@media (max-width: 760px)` block in `panels.css`.
- Respect `prefers-reduced-motion` and keep focus outlines visible.

## Server and mock

- `server/` may import from `shared/` only.
- Validate every incoming message with `isClientMessage` or `isOfficeEvent`. Ignore anything else.
- Use `later()` for timers in `MockSim` so `stop()` can clear them.
- Log with a `[mock]` prefix.

## Comments

- Comment why, not what. A short block comment above a function that explains its role is enough.
- No commented-out code and no stale TODOs.
- Write comments and docs in English.

## Before you commit

1. `npm run typecheck` passes.
2. `npm run build` passes.
3. `npm run dev` starts, the indicator shows "Live", and a test event works (`npm run send -- '...'`).
4. Check light, dark and a narrow (mobile) window if you touched UI.
5. Update `README.md` or `docs/` if you changed the contract, scripts or folder layout.

## Commits

Short imperative subject line (`Add handoff walk timing`). One logical change per commit. Explain why in the body when it is not obvious.
