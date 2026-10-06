/* Pure office geometry, used by the 3D scene and by the mock server (walk-time estimates).
   World units are meters. x runs left to right, z toward the viewer, y is up.

   The floor plan is a closed industrial building.
   Ground floor: one glass-walled room per ground-floor division along a front corridor, plus a lift lobby at the right end.
   Upper floor (y = UPPER_Y): a block behind the ground floor holding the product suite and the game lounge.
   The two floors are joined by a glass lift in a shaft at the right end. */

export const WALK_SPEED = 2.4;
export const LIFT_TRIP_S = 16;       // estimated seconds for a lift trip (wait, doors, ride), used for timing

export const UPPER_Y = 4.6;
export const WALL_H = 3.8;
export const GROUND_BACK_Z = -8.0;   // back wall of the ground floor
export const PARTITION_Z = 0.6;      // glass wall between the rooms and the corridor
export const CORRIDOR_Z = 1.9;       // walking lane in the corridor
export const FRONT_WALL_Z = 3.4;     // front wall of the building
export const ROOM_LANE_Z = -1.0;     // walking lane inside a ground-floor room, just behind the partition
export const DESK_Z = -4.6;          // desk z on the ground floor
export const CHAIR_DZ = 1.15;        // chair is this far behind the desk center
export const DESK_HALF_W = 1.5;
export const SIDE_STEP = 2.15;       // sideways step from the chair to clear the desk
const DESK_PITCH = 5.0;
const MIN_ROOM_W = 8.5;
const LOBBY_W = 6;
const SUITE_W = 7.4;

export interface Pt { x: number; z: number; y?: number }
export interface LiftStep { lift: true; toY: number }
export type RouteStep = Pt | LiftStep;
export const isLiftStep = (s: RouteStep): s is LiftStep => "lift" in s;

export interface DivisionLike { id: string; level: number; theme: string; name: string; shared?: boolean }

export interface RoomRect {
  id: string; name: string; theme: string; level: number;
  minX: number; maxX: number; minZ: number; maxZ: number; y: number;
  /** x of the sliding door in this room's glass wall toward the corridor or aisle. */
  doorX: number;
}

export interface DeskSpot { x: number; y: number; z: number; room: number }

export type ActivityKind = "pool" | "tv" | "ps5" | "sim" | "arcade" | "bar" | "meeting";
export interface ActivitySpot {
  kind: ActivityKind;
  x: number; z: number; y: number;
  heading: number;   // direction the character faces (atan2(dx, dz))
  via: Pt[];         // waypoints from the lift landing to the spot, to avoid furniture
}

export interface Lift {
  x: number; z: number;          // center of the cab
  width: number;                 // inner size of the cab
  shaftMinX: number; shaftMaxX: number; shaftMinZ: number; shaftMaxZ: number;
  topY: number;
  groundWait: Pt;                // where a character waits for the ground doors (front, +z side)
  upperWait: Pt;                 // where a character waits for the upper doors (side, -x)
}

export interface Layout {
  desks: DeskSpot[];             // one per agent, same order as agents.json
  rooms: RoomRect[];             // ground-floor rooms, left to right
  lobby: { minX: number; maxX: number };
  suite: RoomRect | null;        // product suite (upper floor, left)
  lounge: RoomRect | null;       // game lounge (upper floor, right)
  lift: Lift | null;
  spots: ActivitySpot[];
  meeting: { room: RoomRect; table: { x: number; z: number; len: number; wid: number }; seats: ActivitySpot[] } | null;
  building: { minX: number; maxX: number; minZ: number; maxZ: number };
  upper: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
  aisleZ: number;                // walking lane along the front of the upper floor
  routerPos: { x: number; y: number; z: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: { x: number; z: number };
}

export function computeLayout(agents: { division: string }[], divisions: DivisionLike[]): Layout {
  const ground = divisions.filter(d => d.level === 0 && (d.shared || agents.some(a => a.division === d.id)));
  const upperDivs = divisions.filter(d => d.level > 0 && agents.some(a => a.division === d.id));
  const countIn = (id: string) => agents.filter(a => a.division === id).length;

  // Ground floor: rooms side by side, then the lift lobby at the right end.
  // The meeting room is sized so one table seats everybody.
  const tableLen = Math.ceil(agents.length / 2) * 1.5 + 1.0;
  const widths = ground.map(d => d.theme === "meeting" ? Math.max(9.5, tableLen + 3.8) : Math.max(MIN_ROOM_W, countIn(d.id) * DESK_PITCH + 1.6));
  const total = widths.reduce((s, w) => s + w, 0) + LOBBY_W;
  const minX = -total / 2, maxX = total / 2;
  let cursor = minX;
  const rooms: RoomRect[] = ground.map((d, i) => {
    const r: RoomRect = {
      id: d.id, name: d.name, theme: d.theme, level: 0,
      minX: cursor, maxX: cursor + widths[i], minZ: GROUND_BACK_Z, maxZ: PARTITION_Z, y: 0, doorX: cursor + widths[i] / 2
    };
    cursor += widths[i];
    return r;
  });
  const building = { minX, maxX, minZ: GROUND_BACK_Z, maxZ: FRONT_WALL_Z };
  const lobby = { minX: maxX - LOBBY_W, maxX };

  // Upper floor and lift.
  const hasUpper = upperDivs.length > 0;
  const sx = maxX - 3.8;
  const lift: Lift | null = hasUpper ? {
    x: sx, z: -9.8, width: 2.8,
    shaftMinX: sx - 1.6, shaftMaxX: sx + 1.6, shaftMinZ: -11.6, shaftMaxZ: GROUND_BACK_Z,
    topY: UPPER_Y + WALL_H + 0.4,
    groundWait: { x: sx, z: -6.6, y: 0 },
    upperWait: { x: sx - 1.6 - 1.3, z: -9.8, y: UPPER_Y }
  } : null;

  let upper: Layout["upper"] = null, suite: RoomRect | null = null, lounge: RoomRect | null = null;
  const aisleZ = -9.8;
  if (hasUpper && lift) {
    const uMaxX = lift.shaftMinX - 0.3, uMinX = uMaxX - (SUITE_W + 15.7);
    upper = { minX: uMinX, maxX: uMaxX, minZ: -20.0, maxZ: -8.9 };
    suite = { id: upperDivs[0].id, name: upperDivs[0].name, theme: upperDivs[0].theme, level: upperDivs[0].level, minX: uMinX, maxX: uMinX + SUITE_W, minZ: -20.0, maxZ: -8.9, y: UPPER_Y, doorX: uMinX + SUITE_W };
    lounge = { id: "lounge", name: "Game Lounge", theme: "lounge", level: 1, minX: uMinX + SUITE_W, maxX: uMaxX, minZ: -20.0, maxZ: -8.9, y: UPPER_Y, doorX: uMinX + SUITE_W };
  }

  // Desks.
  const roomIndex = new Map(rooms.map((r, i) => [r.id, i]));
  const placed = new Map<string, number>();
  const desks: DeskSpot[] = agents.map(a => {
    const n = countIn(a.division), k = placed.get(a.division) ?? 0;
    placed.set(a.division, k + 1);
    const ri = roomIndex.get(a.division);
    if (ri !== undefined) {
      const r = rooms[ri];
      return { x: (r.minX + r.maxX) / 2 + (k - (n - 1) / 2) * DESK_PITCH, y: 0, z: DESK_Z, room: ri };
    }
    return { x: (suite!.minX + suite!.maxX) / 2 + (k - (n - 1) / 2) * DESK_PITCH, y: UPPER_Y, z: -15.4, room: -1 };
  });

  // Lounge activity spots. `via` points are waypoints from the lift landing, chosen to dodge the furniture.
  const spots: ActivitySpot[] = [];
  if (lounge && lift) {
    const Y = UPPER_Y, u = (d: number) => lounge.minX + d, A = aisleZ;
    const add = (kind: ActivityKind, x: number, z: number, heading: number, via: Pt[]) => spots.push({ kind, x, z, y: Y, heading, via });
    const at = (x: number, z: number): Pt => ({ x, z, y: Y });
    // arcade cabinets stand along the glass wall on the left; players face them (west)
    add("arcade", u(1.3), -11.8, -Math.PI / 2, [at(u(1.3), A)]);
    add("arcade", u(1.3), -13.0, -Math.PI / 2, [at(u(1.3), A)]);
    // billiard table in the middle, players at both ends
    add("pool", u(3.4), -13.4, Math.PI / 2, [at(u(3.4), A)]);
    add("pool", u(9.0), -13.4, -Math.PI / 2, [at(u(9.0), A)]);
    // sim racing rigs along the back wall, facing the wall
    add("sim", u(2.8), -18.0, Math.PI, [at(u(2.2), A), at(u(2.2), -16.8), at(u(2.8), -16.8)]);
    add("sim", u(5.5), -18.0, Math.PI, [at(u(2.2), A), at(u(2.2), -16.8), at(u(5.5), -16.8)]);
    // a TV nook between the rigs and the PlayStation corner
    add("tv", u(8.7), -17.2, Math.PI, [at(u(8.7), A), at(u(8.7), -15.4)]);
    // PlayStation sofa facing the TV on the back wall
    add("ps5", u(11.6), -16.3, Math.PI, [at(u(11.6), A), at(u(11.6), -15.0)]);
    add("ps5", u(13.0), -16.3, Math.PI, [at(u(13.0), A), at(u(13.0), -15.0)]);
    // bar stools in front of the bar counter
    add("bar", u(11.4), -11.0, Math.PI, [at(u(11.4), A)]);
    add("bar", u(12.8), -11.0, Math.PI, [at(u(12.8), A)]);
  }

  // The meeting room: one long table, with everybody seated around it (the first agent at the middle of the back row).
  let meeting: Layout["meeting"] = null;
  const mr = rooms.find(r => r.theme === "meeting");
  if (mr) {
    const tx = (mr.minX + mr.maxX) / 2, tz = -4.3, wid = 1.5;
    const n = agents.length, backN = Math.ceil(n / 2), frontN = n - backN, xEnd = tx + tableLen / 2 + 0.95;
    const seats: ActivitySpot[] = [];
    const lane = (x: number): Pt[] => [{ x: mr.doorX, z: CORRIDOR_Z, y: 0 }, { x: mr.doorX, z: ROOM_LANE_Z, y: 0 }, { x, z: ROOM_LANE_Z, y: 0 }];
    for (let k = 0; k < backN; k++) { // back row faces the viewer, so walk round the end of the table
      const x = tx + (k - (backN - 1) / 2) * 1.5, z = tz - wid / 2 - 0.45;
      seats.push({ kind: "meeting", x, z, y: 0, heading: 0, via: [...lane(xEnd), { x: xEnd, z, y: 0 }, { x, z, y: 0 }] });
    }
    for (let k = 0; k < frontN; k++) {
      const x = tx + (k - (frontN - 1) / 2) * 1.5, z = tz + wid / 2 + 0.45;
      seats.push({ kind: "meeting", x, z, y: 0, heading: Math.PI, via: lane(x) });
    }
    meeting = { room: mr, table: { x: tx, z: tz, len: tableLen, wid }, seats };
  }

  const last = rooms[rooms.length - 1];
  const routerPos = { x: (last?.maxX ?? 6) - 1.1, y: 1.05, z: GROUND_BACK_Z + 1.1 };

  const bounds = {
    minX: Math.min(minX, upper?.minX ?? minX) - 4, maxX: maxX + 4,
    minZ: (upper?.minZ ?? GROUND_BACK_Z) - 2, maxZ: FRONT_WALL_Z + 6
  };
  return {
    desks, rooms, lobby, suite, lounge, lift, spots, meeting, building, upper, aisleZ, routerPos, bounds,
    center: { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 }
  };
}

export const chairPos = (d: DeskSpot): Pt => ({ x: d.x, z: d.z - CHAIR_DZ, y: d.y });

/* ---------- routes ---------- */

/* From the chair out to the first shared lane (corridor on the ground, aisle upstairs). */
function leaveDesk(l: Layout, i: number): RouteStep[] {
  const d = l.desks[i], y = d.y;
  const side: Pt = { x: d.x + SIDE_STEP, z: d.z - CHAIR_DZ, y };
  if (y === 0) {
    const room = l.rooms[d.room];
    return [side, { x: side.x, z: ROOM_LANE_Z, y }, { x: room.doorX, z: ROOM_LANE_Z, y }, { x: room.doorX, z: CORRIDOR_Z, y }];
  }
  const s = l.suite!;
  return [side, { x: side.x, z: l.aisleZ, y }, { x: s.doorX, z: l.aisleZ, y }];
}

/* From the shared lane to just in front of a desk. */
function arriveDesk(l: Layout, j: number): RouteStep[] {
  const d = l.desks[j], y = d.y;
  const front: Pt = { x: d.x + 0.7, z: d.z + 1.15, y };
  const lane: Pt = { x: d.x + SIDE_STEP, z: d.z + 1.15, y };
  if (y === 0) {
    const room = l.rooms[d.room];
    return [{ x: room.doorX, z: CORRIDOR_Z, y }, { x: room.doorX, z: ROOM_LANE_Z, y }, { x: lane.x, z: ROOM_LANE_Z, y }, lane, front];
  }
  const s = l.suite!;
  return [{ x: s.doorX, z: l.aisleZ, y }, { x: lane.x, z: l.aisleZ, y }, lane, front];
}

/* The lane leading to the lift on a floor, ending at the lift's waiting spot. */
function toLift(l: Layout, y: number): RouteStep[] {
  const lf = l.lift!;
  return y === 0
    ? [{ x: lf.x, z: CORRIDOR_Z, y: 0 }, lf.groundWait]
    : [{ x: lf.upperWait.x, z: l.aisleZ, y }, lf.upperWait];
}

/* From the lift, out to the shared lane on a floor. */
function fromLift(l: Layout, y: number): RouteStep[] {
  const lf = l.lift!;
  return y === 0
    ? [lf.groundWait, { x: lf.x, z: CORRIDOR_Z, y: 0 }]
    : [lf.upperWait];
}

export function routeTo(l: Layout, i: number, j: number): RouteStep[] {
  const yi = l.desks[i].y, yj = l.desks[j].y;
  if (yi === yj) {
    const a = leaveDesk(l, i), b = arriveDesk(l, j);
    return [...a, ...b];
  }
  return [...leaveDesk(l, i), ...toLift(l, yi), { lift: true, toY: yj }, ...fromLift(l, yj), ...arriveDesk(l, j)];
}

export function routeHome(l: Layout, i: number, j: number): RouteStep[] {
  // The way back is the same trip from the delivery spot to the chair.
  const yi = l.desks[i].y, yj = l.desks[j].y;
  const back: RouteStep[] = [];
  const dj = l.desks[j];
  if (yj === 0) {
    const room = l.rooms[dj.room];
    back.push({ x: dj.x + SIDE_STEP, z: dj.z + 1.15, y: 0 }, { x: dj.x + SIDE_STEP, z: ROOM_LANE_Z, y: 0 }, { x: room.doorX, z: ROOM_LANE_Z, y: 0 }, { x: room.doorX, z: CORRIDOR_Z, y: 0 });
  } else {
    const s = l.suite!;
    back.push({ x: dj.x + SIDE_STEP, z: dj.z + 1.15, y: yj }, { x: dj.x + SIDE_STEP, z: l.aisleZ, y: yj }, { x: s.doorX, z: l.aisleZ, y: yj });
  }
  const home = chairPos(l.desks[i]);
  const tail = arriveDesk(l, i).slice(0, -1);
  const mid = yi === yj ? [] : [...toLift(l, yj), { lift: true as const, toY: yi }, ...fromLift(l, yi)];
  return [...back, ...mid, ...tail, home];
}

/* A trip from a desk to any activity spot (lounge or meeting room). Going to another floor uses the lift. */
export function routeToSpot(l: Layout, i: number, s: ActivitySpot): RouteStep[] {
  const d = l.desks[i], out = leaveDesk(l, i), end: Pt = { x: s.x, z: s.z, y: s.y };
  if (d.y === s.y) return [...out, ...s.via, end];
  return [...out, ...toLift(l, d.y), { lift: true, toY: s.y }, ...fromLift(l, s.y), ...s.via, end];
}

/* The trip from a spot back to the chair. */
export function routeFromSpot(l: Layout, i: number, s: ActivitySpot): RouteStep[] {
  const d = l.desks[i], back = [...s.via].reverse(), home = chairPos(d);
  if (d.y === s.y) {
    const tail = d.y === 0 ? arriveDesk(l, i).slice(0, -1) : [{ x: l.suite!.doorX, z: l.aisleZ, y: d.y } as Pt, ...arriveDesk(l, i).slice(1, -1)];
    return [...back, ...tail, home];
  }
  return [...back, ...toLift(l, s.y), { lift: true, toY: d.y }, ...fromLift(l, d.y), ...arriveDesk(l, i).slice(0, d.y === 0 ? -1 : -1), home];
}

/* A trip between two spots, on the same floor or not. */
export function routeSpotToSpot(l: Layout, a: ActivitySpot, b: ActivitySpot): RouteStep[] {
  const end: Pt = { x: b.x, z: b.z, y: b.y }, back = [...a.via].reverse();
  if (a.y === b.y) return [...back, ...b.via, end];
  return [...back, ...toLift(l, a.y), { lift: true, toY: b.y }, ...fromLift(l, b.y), ...b.via, end];
}

function pathLen(start: Pt, steps: RouteStep[]): number {
  let d = 0, p = start;
  for (const q of steps) {
    if (isLiftStep(q)) continue;
    d += Math.hypot(q.x - p.x, q.z - p.z, (q.y ?? 0) - (p.y ?? 0));
    p = q;
  }
  return d;
}

/* Seconds for agent i to walk from its chair to the front of desk j, lift trips included. */
export function walkTime(l: Layout, i: number, j: number): number {
  const steps = routeTo(l, i, j);
  const trips = steps.filter(isLiftStep).length;
  return pathLen(chairPos(l.desks[i]), steps) / WALK_SPEED + trips * LIFT_TRIP_S;
}
