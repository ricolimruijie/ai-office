/* Pure castle geometry, used by the 3D scene and by the mock server (flight-time estimates).
   World units are meters. x runs left to right, z toward the viewer, y is up.

   The plan is a cluster of separate stone buildings in two rows, joined by open lanes:
     back row  (opens onto the back alley):   Library | Common Room | Headmaster's Tower
     front row (opens onto the forecourt):    Charms Classroom | GREAT HALL | Potions Tower
   Passages between the front-row buildings lead from the forecourt to the alley. The Great Hall has the grand gate.
   The Headmaster's study is on the upper floor of its tower, reached by a spiral staircase inside the tower.
   Every desk faces +z, so each room opens to the south. */

export const WALK_SPEED = 2.4;
export const FAMILIAR_SPEED = 5.5;  // m/s of a summoned familiar in flight
export const SUMMON_S = 1.5;         // the sender casts the summoning spell
export const DELIVER_S = 1.0;        // the familiar lands, drops the letter and vanishes

export const UPPER_Y = 4.6;
export const WALL_H = 4.2;
export const CHAIR_DZ = 1.15;        // chair is this far behind the desk center
export const DESK_HALF_W = 1.5;
export const SIDE_STEP = 2.15;       // sideways step from the chair to clear the desk
const DESK_PITCH = 5.0;
const MIN_ROOM_W = 8.5;
const ROOM_D = 8.6;                  // depth of a tower or classroom
const GAP = 3.0;                     // width of the passage between two buildings
const LANE_IN = 1.6;                 // the walking lane inside a room sits this far behind its front wall
const LANE_OUT = 1.5;                // the walking lane outside sits this far in front of it

/* The two lanes everyone walks along, and where the rows sit. */
export const BACK_FRONT_Z = -8.9;    // front wall of the back row
export const FRONT_BACK_Z = -5.9;    // back wall of the front row
export const FRONT_FRONT_Z = FRONT_BACK_Z + ROOM_D;
export const ALLEY_Z = (BACK_FRONT_Z + FRONT_BACK_Z) / 2;   // lane along the back alley
export const COURT_Z = FRONT_FRONT_Z + LANE_OUT;            // lane along the forecourt

const LOUNGE_W = 15.7, LOUNGE_BACK_Z = -20.0;

export interface Pt { x: number; z: number; y?: number }
export type RouteStep = Pt;

export interface DivisionLike { id: string; level: number; theme: string; name: string; shared?: boolean }

export interface RoomRect {
  id: string; name: string; theme: string; level: number;
  minX: number; maxX: number; minZ: number; maxZ: number; y: number;
  /** x of the doorway in the room's front wall. */
  doorX: number;
  /** z of the walking lane just inside the front wall, and of the lane just outside it. */
  laneZ: number; outZ: number;
  row: "front" | "back";
}

export interface DeskSpot { x: number; y: number; z: number; room: number }

export type ActivityKind = "pool" | "tv" | "ps5" | "sim" | "arcade" | "bar" | "meeting";
export interface ActivitySpot {
  kind: ActivityKind;
  x: number; z: number; y: number;
  heading: number;   // direction the character faces (atan2(dx, dz))
  /** Index of the room the spot is in. */
  room: number;
  /** Waypoints from the room's doorway (just inside the front wall) to the spot, to avoid furniture. */
  via: Pt[];
}

export interface Stairs {
  x: number; z: number;          // center of the spiral
  radius: number;                // radius of the walking line
  topY: number;
  turns: number;                 // how many times the stair winds round on its way up
  climb: Pt[];                   // the walking line from the bottom step to the top step
  room: number;                  // the tower the stairs are in
}

export interface Layout {
  desks: DeskSpot[];             // one per agent, same order as agents.json
  rooms: RoomRect[];
  stairs: Stairs | null;
  /** x of each passage between two front-row buildings (they join the forecourt to the back alley). */
  passages: number[];
  spots: ActivitySpot[];
  meeting: { room: RoomRect; table: { x: number; z: number; len: number; wid: number }; seats: ActivitySpot[] } | null;
  lounge: RoomRect | null;
  /** Extents of everything built. */
  site: { minX: number; maxX: number; minZ: number; maxZ: number };
  routerPos: { x: number; y: number; z: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: { x: number; z: number };
}

const FRONT_ORDER = ["developers", "meeting", "lab"];
const BACK_ORDER = ["library", "lounge", "executive"];

export function computeLayout(agents: { division: string }[], divisions: DivisionLike[]): Layout {
  const countIn = (id: string) => agents.filter(a => a.division === id).length;
  const tableLen = Math.ceil(agents.length / 2) * 1.5 + 1.0;

  // Every division that has agents or is shared becomes a building. The common room always exists.
  const defs: DivisionLike[] = divisions.filter(d => d.shared || agents.some(a => a.division === d.id));
  if (!defs.some(d => d.theme === "lounge")) defs.push({ id: "lounge", name: "Common Room", level: 0, theme: "lounge" });
  const widthOf = (d: DivisionLike) =>
    d.theme === "meeting" ? Math.max(15, tableLen + 6.5)
    : d.theme === "lounge" ? LOUNGE_W
    : d.level > 0 ? Math.max(11, countIn(d.id) * DESK_PITCH + 7)
    : Math.max(MIN_ROOM_W, countIn(d.id) * DESK_PITCH + 1.6);
  const rank = (d: DivisionLike, order: string[]) => { const k = order.indexOf(d.theme); return k < 0 ? order.length : k; };
  const isBack = (d: DivisionLike) => BACK_ORDER.includes(d.theme);
  const front = defs.filter(d => !isBack(d)).sort((a, b) => rank(a, FRONT_ORDER) - rank(b, FRONT_ORDER));
  const back = defs.filter(isBack).sort((a, b) => rank(a, BACK_ORDER) - rank(b, BACK_ORDER));

  const mk = (d: DivisionLike, minX: number, row: "front" | "back"): RoomRect => {
    const w = widthOf(d), isLounge = d.theme === "lounge";
    const maxZ = row === "front" ? FRONT_FRONT_Z : BACK_FRONT_Z;
    const minZ = isLounge ? LOUNGE_BACK_Z : maxZ - ROOM_D;
    const tower = d.level > 0;
    const doorX = tower ? minX + w - 2.4 : minX + w / 2;
    return {
      id: d.id, name: d.name, theme: d.theme, level: d.level, minX, maxX: minX + w, minZ, maxZ, y: 0, doorX,
      laneZ: maxZ - LANE_IN, outZ: row === "front" ? COURT_Z : ALLEY_Z, row
    };
  };

  // Front row, centered on x = 0. Passages sit between neighbours.
  const frontW = front.reduce((s, d) => s + widthOf(d), 0) + GAP * Math.max(0, front.length - 1);
  let cursor = -frontW / 2;
  const frontRooms = front.map(d => { const r = mk(d, cursor, "front"); cursor = r.maxX + GAP; return r; });
  const passages = frontRooms.slice(0, -1).map((r, i) => (r.maxX + frontRooms[i + 1].minX) / 2);

  // Back row: the common room sits straight behind the Great Hall, the others either side of it.
  const hall = frontRooms.find(r => r.theme === "meeting");
  const lounge0 = back.find(d => d.theme === "lounge");
  const anchorX = hall ? (hall.minX + hall.maxX) / 2 : 0;
  const loungeMinX = anchorX - LOUNGE_W / 2;
  const backRooms: RoomRect[] = [];
  const li = lounge0 ? back.indexOf(lounge0) : -1;
  if (lounge0) {
    let west = loungeMinX - GAP, east = loungeMinX + LOUNGE_W + GAP;
    back.forEach((d, i) => {
      if (i === li) backRooms.push(mk(d, loungeMinX, "back"));
    });
    for (let i = li - 1; i >= 0; i--) { const w = widthOf(back[i]); backRooms.push(mk(back[i], west - w, "back")); west -= w + GAP; }
    for (let i = li + 1; i < back.length; i++) { const w = widthOf(back[i]); backRooms.push(mk(back[i], east, "back")); east += w + GAP; }
  } else {
    let x = anchorX - 10;
    back.forEach(d => { const r = mk(d, x, "back"); backRooms.push(r); x = r.maxX + GAP; });
  }
  backRooms.sort((a, b) => a.minX - b.minX);

  const rooms: RoomRect[] = [...backRooms, ...frontRooms];
  const roomIndex = new Map(rooms.map((r, i) => [r.id, i]));

  // The staircase lives in the tallest tower (an upper-floor division).
  const towerIdx = rooms.findIndex(r => r.level > 0);
  let stairs: Stairs | null = null;
  if (towerIdx >= 0) {
    const t = rooms[towerIdx], sx = t.doorX, sz = t.minZ + 3.6, R = 1.15, N = 28, turns = 1.25;
    t.y = UPPER_Y;
    const climb: Pt[] = [];
    for (let k = 0; k <= N; k++) {
      const f = k / N, a = -f * turns * Math.PI * 2;
      climb.push({ x: sx + R * Math.sin(a), z: sz + R * Math.cos(a), y: UPPER_Y * f });
    }
    stairs = { x: sx, z: sz, radius: R, turns, topY: UPPER_Y + WALL_H, climb, room: towerIdx };
  }

  // Desks.
  const placed = new Map<string, number>();
  const desks: DeskSpot[] = agents.map(a => {
    const n = countIn(a.division), k = placed.get(a.division) ?? 0;
    placed.set(a.division, k + 1);
    const ri = roomIndex.get(a.division) ?? 0, r = rooms[ri];
    const x = r.level > 0 ? r.minX + 3.2 + k * DESK_PITCH : (r.minX + r.maxX) / 2 + (k - (n - 1) / 2) * DESK_PITCH;
    return { x, y: r.level > 0 ? UPPER_Y : 0, z: r.minZ + 3.4, room: ri };
  });

  // Lounge activity spots. `via` runs from just inside the doorway, along the lane, to dodge the furniture.
  const spots: ActivitySpot[] = [];
  const loungeRoom = rooms.findIndex(r => r.theme === "lounge");
  const L = loungeRoom >= 0 ? rooms[loungeRoom] : null;
  if (L) {
    const u = (d: number) => L.minX + d, A = L.laneZ, at = (x: number, z: number): Pt => ({ x, z, y: 0 });
    const door = at(L.doorX, A);
    const add = (kind: ActivityKind, x: number, z: number, heading: number, via: Pt[]) => spots.push({ kind, x, z, y: 0, heading, room: loungeRoom, via: [door, ...via] });
    // Exploding Snap tables stand along the wall on the left; players face them (west)
    add("arcade", u(1.3), -11.8, -Math.PI / 2, [at(u(1.3), A)]);
    add("arcade", u(1.3), -13.0, -Math.PI / 2, [at(u(1.3), A)]);
    // the chess board in the middle, players at both ends
    add("pool", u(3.4), -13.4, Math.PI / 2, [at(u(3.4), A)]);
    add("pool", u(9.0), -13.4, -Math.PI / 2, [at(u(9.0), A)]);
    // broom practice mounts along the back wall, facing the wall
    add("sim", u(2.8), -18.0, Math.PI, [at(u(2.2), A), at(u(2.2), -16.8), at(u(2.8), -16.8)]);
    add("sim", u(5.5), -18.0, Math.PI, [at(u(2.2), A), at(u(2.2), -16.8), at(u(5.5), -16.8)]);
    // armchairs facing the fireplace
    add("tv", u(8.7), -17.2, Math.PI, [at(u(8.7), A), at(u(8.7), -15.4)]);
    // the scrying nook sofa
    add("ps5", u(11.6), -16.3, Math.PI, [at(u(11.6), A), at(u(11.6), -15.0)]);
    add("ps5", u(13.0), -16.3, Math.PI, [at(u(13.0), A), at(u(13.0), -15.0)]);
    // stools in front of the butterbeer bar
    add("bar", u(11.4), -11.0, Math.PI, [at(u(11.4), A)]);
    add("bar", u(12.8), -11.0, Math.PI, [at(u(12.8), A)]);
  }

  // The Great Hall: one long table, with everybody seated around it (the first agent at the middle of the back row).
  let meeting: Layout["meeting"] = null;
  const hallIdx = rooms.findIndex(r => r.theme === "meeting");
  if (hallIdx >= 0) {
    const mr = rooms[hallIdx];
    const tx = (mr.minX + mr.maxX) / 2, tz = mr.minZ + 3.7, wid = 1.5;
    const n = agents.length, backN = Math.ceil(n / 2), frontN = n - backN, xEnd = tx + tableLen / 2 + 0.95;
    const seats: ActivitySpot[] = [];
    const lane = (x: number): Pt[] => [{ x: mr.doorX, z: mr.laneZ, y: 0 }, { x, z: mr.laneZ, y: 0 }];
    for (let k = 0; k < backN; k++) { // back row faces the viewer, so walk round the end of the table
      const x = tx + (k - (backN - 1) / 2) * 1.5, z = tz - wid / 2 - 0.45;
      seats.push({ kind: "meeting", x, z, y: 0, heading: 0, room: hallIdx, via: [...lane(xEnd), { x: xEnd, z, y: 0 }, { x, z, y: 0 }] });
    }
    for (let k = 0; k < frontN; k++) {
      const x = tx + (k - (frontN - 1) / 2) * 1.5, z = tz + wid / 2 + 0.45;
      seats.push({ kind: "meeting", x, z, y: 0, heading: Math.PI, room: hallIdx, via: lane(x) });
    }
    meeting = { room: mr, table: { x: tx, z: tz, len: tableLen, wid }, seats };
  }

  const lastFront = frontRooms.find(r => r.theme === "lab") ?? frontRooms[frontRooms.length - 1];
  const routerPos = { x: (lastFront?.maxX ?? 6) - 0.9, y: 1.05, z: (lastFront?.minZ ?? FRONT_BACK_Z) + 3.4 };

  const site = {
    minX: Math.min(...rooms.map(r => r.minX)), maxX: Math.max(...rooms.map(r => r.maxX)),
    minZ: Math.min(...rooms.map(r => r.minZ)), maxZ: FRONT_FRONT_Z
  };
  const bounds = { minX: site.minX - 6, maxX: site.maxX + 6, minZ: site.minZ - 4, maxZ: site.maxZ + 14 };
  return {
    desks, rooms, stairs, passages, spots, meeting, lounge: L, site, routerPos, bounds,
    center: { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 }
  };
}

export const chairPos = (d: DeskSpot): Pt => ({ x: d.x, z: d.z - CHAIR_DZ, y: d.y });

/* ---------- routes ---------- */

/* The lane point outside a room's doorway, on the forecourt or in the alley. */
const doorNode = (r: RoomRect): Pt => ({ x: r.doorX, z: r.outZ, y: 0 });

/* From the chair out to the doorway of the room. A tower room goes down the spiral stairs first. */
function leaveDesk(l: Layout, i: number): RouteStep[] {
  const d = l.desks[i], r = l.rooms[d.room];
  const side: Pt = { x: d.x + SIDE_STEP, z: d.z - CHAIR_DZ, y: d.y };
  if (r.level === 0 || !l.stairs) return [side, { x: side.x, z: r.laneZ, y: 0 }, { x: r.doorX, z: r.laneZ, y: 0 }, doorNode(r)];
  const down = [...l.stairs.climb].reverse(), top = l.stairs.climb[l.stairs.climb.length - 1];
  return [side, { x: side.x, z: top.z, y: d.y }, ...down, { x: r.doorX, z: r.laneZ, y: 0 }, doorNode(r)];
}

/* From the doorway of a room to its chair (the doorway point itself is not included). */
function enterRoom(l: Layout, i: number): RouteStep[] {
  const d = l.desks[i], r = l.rooms[d.room], home = chairPos(d);
  const sideX = d.x + SIDE_STEP;
  if (r.level === 0 || !l.stairs) return [{ x: r.doorX, z: r.laneZ, y: 0 }, { x: sideX, z: r.laneZ, y: 0 }, { x: sideX, z: home.z, y: 0 }, home];
  const top = l.stairs.climb[l.stairs.climb.length - 1];
  return [{ x: r.doorX, z: r.laneZ, y: 0 }, ...l.stairs.climb, { x: sideX, z: top.z, y: d.y }, { x: sideX, z: home.z, y: d.y }, home];
}

/* Along the lanes from one doorway to another (the first doorway is not included). Between rows it uses the nearest passage. */
function betweenDoors(l: Layout, a: RoomRect, b: RoomRect): RouteStep[] {
  const A = doorNode(a), B = doorNode(b);
  if (a === b) return [];
  if (a.row === b.row) return [B];
  const g = l.passages.length ? l.passages.reduce((best, x) => (Math.abs(x - A.x) + Math.abs(x - B.x) < Math.abs(best - A.x) + Math.abs(best - B.x) ? x : best)) : (a.minX + b.maxX) / 2;
  return [{ x: g, z: A.z, y: 0 }, { x: g, z: B.z, y: 0 }, B];
}

/* A trip from a desk to any activity spot (common room or Great Hall). */
export function routeToSpot(l: Layout, i: number, s: ActivitySpot): RouteStep[] {
  const from = l.rooms[l.desks[i].room], to = l.rooms[s.room], end: Pt = { x: s.x, z: s.z, y: s.y };
  return [...leaveDesk(l, i), ...betweenDoors(l, from, to), ...s.via, end];
}

/* The trip from a spot back to the chair. */
export function routeFromSpot(l: Layout, i: number, s: ActivitySpot): RouteStep[] {
  const from = l.rooms[s.room], to = l.rooms[l.desks[i].room];
  return [...[...s.via].reverse(), doorNode(from), ...betweenDoors(l, from, to), ...enterRoom(l, i)];
}

/* A trip between two spots, in the same room or not. */
export function routeSpotToSpot(l: Layout, a: ActivitySpot, b: ActivitySpot): RouteStep[] {
  const end: Pt = { x: b.x, z: b.z, y: b.y }, back = [...a.via].reverse();
  if (a.room === b.room) return [...back, ...b.via, end];
  return [...back, doorNode(l.rooms[a.room]), ...betweenDoors(l, l.rooms[a.room], l.rooms[b.room]), ...b.via, end];
}

/* Where a familiar appears above desk i and where it lands on desk j. */
export function familiarEnds(l: Layout, i: number, j: number): { from: Required<Pt>; to: Required<Pt> } {
  const a = l.desks[i], b = l.desks[j];
  return { from: { x: a.x, y: a.y + 1.7, z: a.z - 0.3 }, to: { x: b.x - 0.9, y: b.y + 1.0, z: b.z + 0.1 } };
}

/* Seconds a familiar needs to fly from desk i to desk j. */
export function familiarFlight(l: Layout, i: number, j: number): number {
  const { from, to } = familiarEnds(l, i, j);
  return Math.max(1.6, Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / FAMILIAR_SPEED);
}

/* Seconds from the spell being cast to the letter landing on desk j. */
export function deliveryTime(l: Layout, i: number, j: number): number {
  return SUMMON_S + familiarFlight(l, i, j) + DELIVER_S;
}
