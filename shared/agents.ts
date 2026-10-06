export type CharacterKind = "ghost" | "zombie";
export type HairStyle = "none" | "messy" | "patchy" | "slick" | "spiky" | "bun" | "long";
export type Outfit = "suit" | "hoodie" | "labcoat" | "vest" | "scarf" | "none";
export type Accessory = "monocle" | "glasses" | "roundglasses" | "headphones" | "goggles" | "cap" | "beanie" | "tophat" | "none";
export type Extra = "stitches" | "bandage" | "bone" | "bowtie" | "tie";
export type DeskStyle = "executive" | "lab" | "writer" | "backend" | "frontend" | "qa";

/* How a character looks in the 3D office. Only `kind` is required. */
export interface Look {
  kind: CharacterKind;
  /** Body color: the sheet of a ghost, the skin of a zombie. */
  skin?: string;
  hair?: HairStyle;
  hairColor?: string;
  outfit?: Outfit;
  outfitColor?: string;
  pants?: string;
  accessory?: Accessory;
  extras?: Extra[];
}

export interface AgentConfig {
  id: string;
  /** Personal name. Also the @mention handle, e.g. @nika. */
  name: string;
  /** Job position, e.g. "Product Manager". Also works as a mention, e.g. @productmanager. */
  position: string;
  /** One-line description of what the agent does. */
  role: string;
  color: string;
  tasks: string[];
  /** Which division (room) the agent sits in. Matches an id in divisions.json. */
  division: string;
  /** Appearance of the 3D character. */
  look: Look;
  /** Layout and style of the agent's gaming workstation. */
  desk: DeskStyle;
  /** Optional avatar image URL for Discord. Defaults to a generated robot picture. */
  avatar?: string;
}

/* A division gets its own room. Level 0 is the ground floor, level 1 is the upper floor (reached by the lift). */
export interface DivisionConfig {
  id: string;
  name: string;
  level: number;
  theme: "executive" | "library" | "lab" | "developers" | "meeting";
  /** A shared room that nobody sits in permanently, like the meeting room. It exists even with no agents assigned. */
  shared?: boolean;
}
