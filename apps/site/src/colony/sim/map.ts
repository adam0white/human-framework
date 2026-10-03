/**
 * The village map for Twice at the Well (docs/games/colony.md §2): one 20×14 tile grid shared by both
 * panes. Pure data plus breadth-first pathing; no DOM.
 */

export const MAP_W = 20;
export const MAP_H = 14;
export const TILE_PX = 32;

export interface Tile {
  x: number;
  y: number;
}

export type TileKind =
  | 'ground'
  | 'path'
  | 'forest'
  | 'field'
  | 'apron'
  | 'well'
  | 'home'
  | 'kitchen'
  | 'site'
  | 'masjid'
  | 'wellhouse';

export type PlaceId =
  | 'forest'
  | 'cedar'
  | 'field'
  | 'well'
  | 'kitchen'
  | 'site'
  | 'masjid'
  | 'home-maryam'
  | 'home-yusuf'
  | 'home-idris'
  | 'wellhouse';

export interface Place {
  id: PlaceId;
  label: string;
  /** Footprint rectangle in tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Footprint tiles cannot be walked (buildings); open places (field, forest, site) can. */
  solid: boolean;
  /** Indoors: people working or resting here are sheltered from weather. */
  indoors: boolean;
  /** Tiles where people stand to use the place, in stable order. */
  spots: Tile[];
}

const homeSpots = (x: number, y: number): Tile[] => [
  { x, y: y + 2 },
  { x: x + 1, y: y + 2 },
];

/** Places in stable id order. Footprints match the spec's tile counts. */
export const PLACES: readonly Place[] = [
  {
    id: 'forest',
    label: 'Forest',
    x: 0,
    y: 0,
    w: 5,
    h: 4,
    solid: false,
    indoors: false,
    spots: [
      { x: 3, y: 2 },
      { x: 4, y: 1 },
      { x: 2, y: 3 },
      { x: 4, y: 3 },
      { x: 3, y: 0 },
      { x: 0, y: 3 },
    ],
  },
  {
    id: 'cedar',
    label: 'Big cedar',
    x: 1,
    y: 1,
    w: 1,
    h: 1,
    solid: false,
    indoors: false,
    spots: [
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
  },
  {
    id: 'field',
    label: 'Field',
    x: 14,
    y: 1,
    w: 4,
    h: 3,
    solid: false,
    indoors: false,
    spots: [
      { x: 14, y: 2 },
      { x: 15, y: 2 },
      { x: 16, y: 2 },
      { x: 17, y: 2 },
      { x: 15, y: 3 },
      { x: 16, y: 1 },
    ],
  },
  {
    id: 'masjid',
    label: 'Masjid · shelter',
    x: 9,
    y: 1,
    w: 2,
    h: 2,
    solid: true,
    indoors: true,
    spots: [
      { x: 9, y: 3 },
      { x: 10, y: 3 },
      { x: 8, y: 2 },
      { x: 11, y: 2 },
      { x: 8, y: 1 },
      { x: 11, y: 1 },
    ],
  },
  {
    id: 'well',
    label: 'Well',
    x: 9,
    y: 6,
    w: 1,
    h: 1,
    solid: true,
    indoors: false,
    spots: [
      { x: 9, y: 7 },
      { x: 8, y: 7 },
      { x: 10, y: 7 },
      { x: 8, y: 6 },
    ],
  },
  {
    id: 'wellhouse',
    label: 'Well-house',
    x: 11,
    y: 5,
    w: 1,
    h: 1,
    solid: true,
    indoors: true,
    spots: [{ x: 11, y: 6 }],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    x: 12,
    y: 9,
    w: 2,
    h: 2,
    solid: true,
    indoors: true,
    spots: [
      { x: 12, y: 11 },
      { x: 13, y: 11 },
      { x: 11, y: 10 },
      { x: 11, y: 9 },
      { x: 14, y: 11 },
      { x: 11, y: 11 },
    ],
  },
  {
    id: 'site',
    label: 'House',
    x: 15,
    y: 8,
    w: 3,
    h: 3,
    solid: false,
    indoors: false,
    spots: [
      { x: 15, y: 11 },
      { x: 16, y: 11 },
      { x: 17, y: 11 },
      { x: 18, y: 9 },
      { x: 18, y: 10 },
      { x: 18, y: 8 },
    ],
  },
  {
    id: 'home-maryam',
    label: 'Maryam & Tariq',
    x: 2,
    y: 8,
    w: 2,
    h: 2,
    solid: true,
    indoors: true,
    spots: homeSpots(2, 8),
  },
  {
    id: 'home-yusuf',
    label: 'Yusuf',
    x: 5,
    y: 10,
    w: 2,
    h: 2,
    solid: true,
    indoors: true,
    spots: homeSpots(5, 10),
  },
  {
    id: 'home-idris',
    label: 'Idris & Samira',
    x: 8,
    y: 10,
    w: 2,
    h: 2,
    solid: true,
    indoors: true,
    spots: homeSpots(8, 10),
  },
];

const KIND_OF_PLACE: Record<PlaceId, TileKind> = {
  forest: 'forest',
  cedar: 'forest',
  field: 'field',
  well: 'well',
  wellhouse: 'wellhouse',
  kitchen: 'kitchen',
  site: 'site',
  masjid: 'masjid',
  'home-maryam': 'home',
  'home-yusuf': 'home',
  'home-idris': 'home',
};

/** Decorative dirt paths (walkable, render only). */
const PATH_TILES: readonly Tile[] = [
  ...[5, 6, 7, 8].map((x) => ({ x, y: 3 })),
  ...[4, 5, 6, 7].map((y) => ({ x: 7, y })),
  ...[8, 9, 10, 11, 12, 13, 14, 15, 16].map((x) => ({ x, y: 8 })),
  ...[2, 3, 4, 5, 6, 7].map((x) => ({ x, y: 7 })),
  ...[12, 13, 14, 15, 16, 17].map((x) => ({ x, y: 4 })),
  ...[5, 6, 7].map((y) => ({ x: 13, y })),
];

export interface GameMap {
  w: number;
  h: number;
  kinds: TileKind[];
  /** Place id occupying each tile, or null. */
  owner: (PlaceId | null)[];
}

function buildMap(): GameMap {
  const kinds: TileKind[] = new Array(MAP_W * MAP_H).fill('ground');
  const owner: (PlaceId | null)[] = new Array(MAP_W * MAP_H).fill(null);
  for (const t of PATH_TILES) kinds[t.y * MAP_W + t.x] = 'path';
  for (const p of PLACES) {
    for (let y = p.y; y < p.y + p.h; y++) {
      for (let x = p.x; x < p.x + p.w; x++) {
        kinds[y * MAP_W + x] = KIND_OF_PLACE[p.id];
        // The cedar sits inside the forest; it owns its own tile.
        owner[y * MAP_W + x] = p.id;
      }
    }
  }
  // The well's stone apron: walkable ring around the well.
  const well = placeById('well');
  for (let y = well.y - 1; y <= well.y + 1; y++) {
    for (let x = well.x - 1; x <= well.x + 1; x++) {
      const i = y * MAP_W + x;
      if (kinds[i] !== 'well') kinds[i] = 'apron';
    }
  }
  return { w: MAP_W, h: MAP_H, kinds, owner };
}

export function placeById(id: PlaceId): Place {
  const p = PLACES.find((q) => q.id === id);
  if (!p) throw new Error(`unknown place ${id}`);
  return p;
}

export const MAP: GameMap = buildMap();

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}

export function tileKind(map: GameMap, x: number, y: number): TileKind | undefined {
  return inBounds(x, y) ? map.kinds[y * map.w + x] : undefined;
}

export function placeAt(map: GameMap, x: number, y: number): PlaceId | null {
  if (!inBounds(x, y)) return null;
  return map.owner[y * map.w + x] ?? null;
}

const SOLID_PLACES = new Set(PLACES.filter((p) => p.solid).map((p) => p.id));

export function walkable(map: GameMap, x: number, y: number): boolean {
  if (!inBounds(x, y)) return false;
  const owner = map.owner[y * map.w + x];
  if (owner === 'cedar') return false; // the trunk
  return owner === null || owner === undefined || !SOLID_PLACES.has(owner);
}

const DIRS: readonly Tile[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * Shortest 4-connected path from `from` to `to`, excluding `from`, including `to`. Deterministic: neighbours
 * are expanded in fixed N, E, S, W order. Returns null when unreachable; [] when already there.
 */
export function findPath(map: GameMap, from: Tile, to: Tile): Tile[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (!walkable(map, to.x, to.y)) return null;
  const n = map.w * map.h;
  const prev = new Int32Array(n).fill(-1);
  const start = from.y * map.w + from.x;
  const goal = to.y * map.w + to.x;
  prev[start] = start;
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++] ?? 0;
    if (cur === goal) break;
    const cx = cur % map.w;
    const cy = (cur - cx) / map.w;
    for (const d of DIRS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!walkable(map, nx, ny)) continue;
      const ni = ny * map.w + nx;
      if ((prev[ni] ?? -1) !== -1) continue;
      prev[ni] = cur;
      queue[tail++] = ni;
    }
  }
  if ((prev[goal] ?? -1) === -1) return null;
  const path: Tile[] = [];
  let cur = goal;
  while (cur !== start) {
    const x = cur % map.w;
    path.push({ x, y: (cur - x) / map.w });
    cur = prev[cur] ?? start;
  }
  return path.reverse();
}

/** Travel minutes at one tile per sim minute; Infinity when unreachable. */
export function pathLength(map: GameMap, from: Tile, to: Tile): number {
  const p = findPath(map, from, to);
  return p ? p.length : Number.POSITIVE_INFINITY;
}

/** The place spot a given person uses: spots are assigned by villager index so co-workers spread out. */
export function spotFor(placeId: PlaceId, villagerIndex: number): Tile {
  const p = placeById(placeId);
  const s = p.spots[villagerIndex % p.spots.length] ?? p.spots[0];
  if (!s) throw new Error(`place ${placeId} has no spots`);
  return s;
}
