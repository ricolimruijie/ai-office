import type { Layout } from "../../../shared/layout";
import { C } from "../palette";
import {
  Banner, BroomMount, ButterbeerBar, ChessTable, Chandelier, Fireplace, FloatingCandles, Pensieve, SnapTable, Torch, WoodStool
} from "./magic";
import { CoffeeTable, FloorLamp, PottedPlant, Rug, Sofa } from "./props";

/* The common room: Exploding Snap tables, a wizard chess board, broom practice mounts, a roaring fireplace, a butterbeer bar and a scrying nook.
   The place everyone drifts to when there is nothing to do. */
export function Lounge({ layout }: { layout: Layout }) {
  const L = layout.lounge!, Y = L.y, u = (d: number) => L.minX + d;
  const back = L.minZ + 0.15;

  return (
    <group>
      {/* Exploding Snap along the left wall */}
      {[-11.8, -13.0, -14.2].map((z, i) => <SnapTable key={z} pos={[u(0.6), Y, z]} color={["#FF8A4C", "#9C8CFF", "#6CFF8A"][i]} />)}

      {/* wizard chess in the middle */}
      <Rug pos={[u(6.2), Y + 0.03, -13.4]} size={[5.6, 3.8]} color="#2B1F3A" border="#D9A441" />
      <ChessTable pos={[u(6.2), Y, -13.4]} />

      {/* broom practice mounts along the back wall */}
      <BroomMount pos={[u(2.8), Y, -18.0]} color={C.crimson} />
      <BroomMount pos={[u(5.5), Y, -18.0]} color={C.sapphire} />

      {/* the fireplace nook with armchairs */}
      <Fireplace pos={[u(8.7), Y, back]} w={3.0} h={2.4} />
      <Rug pos={[u(8.7), Y + 0.03, -17.3]} size={[3.0, 2.6]} color="#5C1A24" border="#D9A441" />
      <Sofa pos={[u(7.7), Y, -16.4]} rotY={Math.PI} w={1.3} color="#7A1F2B" accent="#D9A441" />
      <Sofa pos={[u(9.7), Y, -16.4]} rotY={Math.PI} w={1.3} color="#7A1F2B" accent="#D9A441" />

      {/* the scrying nook */}
      <Pensieve pos={[u(12.3), Y, back + 1.4]} />
      <Rug pos={[u(12.3), Y + 0.03, -17.0]} size={[4.0, 3.6]} color="#1F2F5A" border="#9C8CFF" />
      <Sofa pos={[u(12.3), Y, -16.3]} rotY={Math.PI} w={3.0} color="#2B3A6A" accent="#9C8CFF" />
      <CoffeeTable pos={[u(12.3), Y, -17.9]} w={1.4} d={0.7} />

      {/* butterbeer bar */}
      <ButterbeerBar pos={[u(12.1), Y, -12.4]} w={3.4} />
      {[u(11.4), u(12.8), u(10.0)].map(x => <WoodStool key={x} pos={[x, Y, -11.0]} />)}

      {/* mood: banners, torches, candles and chandeliers */}
      <Banner pos={[L.minX + 0.3, Y + 2.4, -16.5]} rotY={Math.PI / 2} color={C.crimson} />
      <Banner pos={[L.maxX - 0.3, Y + 2.4, -14.0]} rotY={-Math.PI / 2} color={C.crimson} />
      <Torch pos={[u(4.2), Y + 2.2, back]} /><Torch pos={[u(14.2), Y + 2.2, back]} />
      <Chandelier pos={[u(6.2), Y + 3.7, -13.4]} r={0.8} n={8} drop={0.8} />
      <Chandelier pos={[u(11.5), Y + 3.7, -14.5]} r={0.7} n={8} drop={0.8} />
      <FloatingCandles area={[L.minX + 0.8, L.maxX - 0.8, L.minZ + 0.8, L.maxZ - 0.8]} y={Y + 3.0} count={26} seed={17} />
      <PottedPlant pos={[u(0.6), Y, L.minZ + 0.8]} scale={1.3} seed={31} />
      <PottedPlant pos={[L.maxX - 0.7, Y, L.minZ + 0.8]} scale={1.3} seed={32} />
      <PottedPlant pos={[u(7.0), Y, -9.2]} scale={1.1} seed={33} />
      <FloorLamp pos={[u(14.8), Y, -17.2]} color="#FFB36B" />
    </group>
  );
}
