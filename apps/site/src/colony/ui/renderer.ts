/**
 * Canvas renderer for one pane. Human: warm flat colour, no outlines, long shadows that swing with the
 * sun, lanterns at night. Classic: a blueprint, desaturated slate, white pawns, crisp hp/hunger bars.
 * Draws in logical 640×448 pixels; the caller sets the transform for size and device pixel ratio.
 */
import type { WorldView } from '../sim/game.ts';
import type { VillagerState } from '../sim/human-side.ts';
import { MAP, MAP_H, MAP_W, PLACES, type Place, type PlaceId, TILE_PX } from '../sim/map.ts';
import { BEAM_STAGE, clockOf, type VillagerId, type Weather } from '../sim/world-types.ts';

export const LOGICAL_W = MAP_W * TILE_PX;
export const LOGICAL_H = MAP_H * TILE_PX;

export type Side = 'classic' | 'human';

export interface DrawPerson {
  id: VillagerId;
  /** Interpolated tile coordinates. */
  x: number;
  y: number;
  state: VillagerState;
  carriedBy: VillagerId | null;
  hp: number;
  /** Classic only. */
  hunger?: number;
  protest?: boolean;
}

export interface SceneInput {
  side: Side;
  minute: number;
  darkness: number;
  weather: Weather;
  world: WorldView;
  people: DrawPerson[];
  selectedId: VillagerId | null;
  hoverPlace: PlaceId | null;
  /** Show every place label (a villager is selected and the player is choosing a place). */
  showPlaceLabels: boolean;
  /** Real time in ms, for rain and lantern flicker only. */
  realTime: number;
  cooking: boolean;
}

interface Look {
  body: string;
  skin: string;
  sash: string;
  hat?: { kind: 'scarf' | 'cap'; color: string };
  short?: boolean;
}

export const LOOKS: Record<VillagerId, Look> = {
  maryam: { body: '#5e4b6b', skin: '#b07c5a', sash: '#c98a2b', hat: { kind: 'scarf', color: '#ece0c8' } },
  yusuf: { body: '#7a5c44', skin: '#a9754f', sash: '#a8552f' },
  tariq: { body: '#94724f', skin: '#b9875e', sash: '#c2703f', short: true },
  idris: { body: '#55604a', skin: '#9c6b48', sash: '#4f7a4a' },
  samira: { body: '#3f5d70', skin: '#c08b63', sash: '#3e7c8a', hat: { kind: 'scarf', color: '#8e3b46' } },
  danyal: { body: '#6e6a63', skin: '#c9a07a', sash: '#3e7c8a', hat: { kind: 'cap', color: '#4a4038' } },
};

const HUMAN = {
  ground: '#e4d3ae',
  groundDot: 'rgba(120, 92, 52, 0.08)',
  path: '#efe2c4',
  field: '#d9b65c',
  fieldRow: '#c79f45',
  forestFloor: '#cdbf92',
  canopy: '#4f7a4a',
  canopyDark: '#3d6339',
  cedar: '#2f4f33',
  apron: '#d6c9ad',
  water: '#3e7c8a',
  mudbrick: '#c9975b',
  roof: '#d8aa70',
  door: '#7a5232',
  white: '#f6f1e6',
  whiteRoof: '#fffaf0',
  siteDirt: '#cdb48e',
  shadow: 'rgba(60, 40, 20, 0.2)',
  ink: '#2b2622',
};

const BLUE = {
  ground: '#2c3846',
  grid: 'rgba(160, 185, 210, 0.07)',
  place: '#364556',
  placeLine: 'rgba(170, 195, 220, 0.55)',
  label: 'rgba(205, 220, 235, 0.78)',
  tree: 'rgba(170, 195, 220, 0.35)',
  water: '#7f98b2',
  pawn: '#f4f6f8',
  pawnShade: '#c3ccd6',
  hp: '#8fe0b5',
  hunger: '#f2c14e',
  barBg: 'rgba(0, 0, 0, 0.45)',
};

/** Deterministic hash → [0,1) for decoration placement. */
function h01(a: number, b: number, c = 0): number {
  let x = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const T = TILE_PX;
const placeRect = (p: Place) => ({ x: p.x * T, y: p.y * T, w: p.w * T, h: p.h * T });
const place = (id: PlaceId) => PLACES.find((p) => p.id === id) as Place;

// ---------------------------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------------------------

interface Sun {
  dx: number;
  dy: number;
  strength: number;
}

function sunAt(minute: number, darkness: number): Sun {
  const mod = clockOf(minute).minuteOfDay;
  const t = Math.max(0, Math.min(1, (mod - 300) / (1170 - 300)));
  const swing = (t - 0.5) * 2; // −1 morning (shadows west) … +1 evening (shadows east)
  const len = 8 + 30 * Math.abs(swing);
  return { dx: swing * len, dy: 7 + 4 * (1 - Math.abs(swing)), strength: 1 - darkness };
}

type Pt = [number, number];

function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2] as Pt, lower[lower.length - 1] as Pt, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i] as Pt;
    while (upper.length >= 2 && cross(upper[upper.length - 2] as Pt, upper[upper.length - 1] as Pt, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function rectShadow(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; w: number; h: number },
  sun: Sun,
  height: number,
) {
  const ox = sun.dx * height;
  const oy = sun.dy * height;
  const pts: Pt[] = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
    [r.x + ox, r.y + oy],
    [r.x + r.w + ox, r.y + oy],
    [r.x + ox, r.y + r.h + oy],
    [r.x + r.w + ox, r.y + r.h + oy],
  ];
  const hp = hull(pts);
  ctx.beginPath();
  hp.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// Static-ish layers
// ---------------------------------------------------------------------------------------------

const TREES: { x: number; y: number; r: number }[] = (() => {
  const out: { x: number; y: number; r: number }[] = [];
  const f = place('forest');
  for (let ty = f.y; ty < f.y + f.h; ty++) {
    for (let tx = f.x; tx < f.x + f.w; tx++) {
      if (tx === 1 && ty === 1) continue;
      const n = h01(tx, ty) < 0.5 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        out.push({
          x: tx * T + 6 + h01(tx, ty, k + 1) * 20,
          y: ty * T + 6 + h01(ty, tx, k + 7) * 20,
          r: 7 + h01(tx + k, ty + 3) * 5,
        });
      }
    }
  }
  return out;
})();

function drawGround(ctx: CanvasRenderingContext2D, side: Side) {
  if (side === 'classic') {
    ctx.fillStyle = BLUE.ground;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.strokeStyle = BLUE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= MAP_W; x++) {
      ctx.moveTo(x * T + 0.5, 0);
      ctx.lineTo(x * T + 0.5, LOGICAL_H);
    }
    for (let y = 0; y <= MAP_H; y++) {
      ctx.moveTo(0, y * T + 0.5);
      ctx.lineTo(LOGICAL_W, y * T + 0.5);
    }
    ctx.stroke();
    return;
  }
  ctx.fillStyle = HUMAN.ground;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const kind = MAP.kinds[y * MAP_W + x];
      if (kind === 'path') {
        ctx.fillStyle = HUMAN.path;
        ctx.fillRect(x * T, y * T, T, T);
      } else if (kind === 'apron') {
        ctx.fillStyle = HUMAN.apron;
        ctx.fillRect(x * T, y * T, T, T);
      } else if (kind === 'forest') {
        ctx.fillStyle = HUMAN.forestFloor;
        ctx.fillRect(x * T, y * T, T, T);
      }
      if (kind === 'ground' || kind === 'path') {
        ctx.fillStyle = HUMAN.groundDot;
        for (let k = 0; k < 3; k++) {
          ctx.fillRect(x * T + h01(x, y, k) * 30, y * T + h01(y, x, k + 5) * 30, 2, 2);
        }
      }
    }
  }
  // Field rows.
  const f = placeRect(place('field'));
  ctx.fillStyle = HUMAN.field;
  roundRect(ctx, f.x + 2, f.y + 2, f.w - 4, f.h - 4, 6);
  ctx.fill();
  ctx.fillStyle = HUMAN.fieldRow;
  for (let i = 0; i < 9; i++) ctx.fillRect(f.x + 8, f.y + 8 + i * 10, f.w - 16, 3);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBuildingsHuman(ctx: CanvasRenderingContext2D, input: SceneInput, sun: Sun) {
  const { world } = input;
  // Shadows first.
  if (sun.strength > 0.02) {
    ctx.fillStyle = `rgba(60, 40, 20, ${0.2 * sun.strength})`;
    for (const p of PLACES) {
      if (!p.solid || p.id === 'well') continue;
      rectShadow(ctx, insetRect(placeRect(p), 3), sun, p.id === 'masjid' ? 1.15 : 0.9);
    }
    const site = placeRect(place('site'));
    if (world.houseStage > 0) rectShadow(ctx, insetRect(site, 10), sun, 0.08 * world.houseStage);
    for (const t of TREES) {
      ctx.beginPath();
      ctx.ellipse(t.x + sun.dx * 0.7, t.y + sun.dy * 0.7 + 3, t.r, t.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!world.cedarFelled) {
      ctx.beginPath();
      ctx.ellipse(1.5 * T + sun.dx * 1.2, 1.5 * T + sun.dy * 1.2, 18, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Well.
  const well = placeRect(place('well'));
  ctx.fillStyle = '#b9ab8e';
  ctx.beginPath();
  ctx.arc(well.x + T / 2, well.y + T / 2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HUMAN.water;
  ctx.beginPath();
  ctx.arc(well.x + T / 2, well.y + T / 2, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(well.x + T / 2 - 3, well.y + T / 2 - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Mudbrick houses, kitchen, well-house.
  for (const p of PLACES) {
    if (!p.solid || p.id === 'well' || p.id === 'masjid') continue;
    const r = insetRect(placeRect(p), 3);
    ctx.fillStyle = HUMAN.mudbrick;
    roundRect(ctx, r.x, r.y, r.w, r.h, 5);
    ctx.fill();
    ctx.fillStyle = HUMAN.roof;
    roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 12, 3);
    ctx.fill();
    ctx.fillStyle = HUMAN.door;
    ctx.fillRect(r.x + r.w / 2 - 4, r.y + r.h - 9, 8, 9);
    if (p.id === 'kitchen') {
      ctx.fillStyle = '#9a6a3c';
      ctx.fillRect(r.x + r.w - 16, r.y + 6, 8, 8);
      if (input.cooking) {
        for (let k = 0; k < 3; k++) {
          const t = (((input.realTime / 1400 + k / 3) % 1) + 1) % 1;
          ctx.fillStyle = `rgba(255, 250, 240, ${0.55 * (1 - t)})`;
          ctx.beginPath();
          ctx.arc(r.x + r.w - 12 + Math.sin(t * 6 + k) * 3, r.y + 4 - t * 22, 3 + t * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Masjid: whitewashed, small dome.
  const m = insetRect(placeRect(place('masjid')), 3);
  ctx.fillStyle = HUMAN.white;
  roundRect(ctx, m.x, m.y, m.w, m.h, 5);
  ctx.fill();
  ctx.fillStyle = '#e9e1d0';
  ctx.beginPath();
  ctx.arc(m.x + m.w / 2, m.y + m.h / 2 - 3, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HUMAN.whiteRoof;
  ctx.beginPath();
  ctx.arc(m.x + m.w / 2 - 2, m.y + m.h / 2 - 5, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7d8a8f';
  ctx.beginPath();
  ctx.roundRect(m.x + m.w / 2 - 5, m.y + m.h - 11, 10, 11, [5, 5, 0, 0]);
  ctx.fill();

  drawSiteHuman(ctx, world);

  // Forest canopy.
  for (const t of TREES) {
    ctx.fillStyle = HUMAN.canopyDark;
    ctx.beginPath();
    ctx.arc(t.x, t.y + 1.5, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = HUMAN.canopy;
    ctx.beginPath();
    ctx.arc(t.x - 1.5, t.y - 1, t.r * 0.82, 0, Math.PI * 2);
    ctx.fill();
  }
  const cx = 1.5 * T;
  const cy = 1.5 * T;
  if (world.cedarFelled) {
    ctx.fillStyle = '#8a6a48';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b89470';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = HUMAN.cedar;
    ctx.beginPath();
    ctx.arc(cx, cy, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3c6140';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 13, 0, Math.PI * 2);
    ctx.fill();
  }
}

function insetRect(r: { x: number; y: number; w: number; h: number }, d: number) {
  return { x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d };
}

function drawSiteHuman(ctx: CanvasRenderingContext2D, world: WorldView) {
  const s = placeRect(place('site'));
  ctx.fillStyle = HUMAN.siteDirt;
  roundRect(ctx, s.x + 2, s.y + 2, s.w - 4, s.h - 4, 6);
  ctx.fill();
  const r = insetRect(s, 12);
  ctx.strokeStyle = 'rgba(90, 62, 43, 0.35)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([]);
  const walls = Math.min(world.houseStage, BEAM_STAGE - 1);
  if (walls > 0) {
    const th = 2 + walls * 1.6;
    ctx.fillStyle = HUMAN.mudbrick;
    ctx.fillRect(r.x, r.y, r.w, th);
    ctx.fillRect(r.x, r.y + r.h - th, r.w, th);
    ctx.fillRect(r.x, r.y, th, r.h);
    ctx.fillRect(r.x + r.w - th, r.y, th, r.h);
    ctx.fillStyle = 'rgba(120, 80, 40, 0.35)';
    for (let i = 1; i < walls; i++) ctx.fillRect(r.x, r.y + i * 1.6 + 1, r.w, 0.7);
  }
  if (world.houseStage >= BEAM_STAGE) {
    ctx.fillStyle = '#5a3e2b';
    ctx.fillRect(r.x - 4, r.y + r.h / 2 - 3, r.w + 8, 6);
  }
  if (world.houseStage >= 8) {
    ctx.strokeStyle = '#7a5232';
    ctx.lineWidth = 2;
    for (let i = 0; i < (world.houseStage - 7) * 3; i++) {
      const x = r.x + 6 + i * ((r.w - 12) / 8);
      ctx.beginPath();
      ctx.moveTo(x, r.y + 2);
      ctx.lineTo(x, r.y + r.h - 2);
      ctx.stroke();
    }
  }
  if (world.houseStage >= 10) {
    ctx.fillStyle = HUMAN.roof;
    roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 4);
    ctx.fill();
    ctx.fillStyle = HUMAN.door;
    ctx.fillRect(r.x + r.w / 2 - 5, r.y + r.h - 8, 10, 10);
  }
  if (world.shuttered) {
    ctx.strokeStyle = 'rgba(70, 50, 30, 0.75)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(r.x - 3, r.y + 4 + i * ((r.h - 8) / 5));
      ctx.lineTo(r.x + r.w + 3, r.y + 4 + i * ((r.h - 8) / 5));
      ctx.stroke();
    }
  }
}

function drawPlacesClassic(ctx: CanvasRenderingContext2D, world: WorldView) {
  ctx.lineWidth = 1;
  for (const p of PLACES) {
    if (p.id === 'cedar') continue;
    const r = insetRect(placeRect(p), 2);
    ctx.fillStyle = BLUE.place;
    ctx.strokeStyle = BLUE.placeLine;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
  // Trees as outline circles.
  ctx.strokeStyle = BLUE.tree;
  for (const t of TREES) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = BLUE.placeLine;
  ctx.beginPath();
  ctx.arc(1.5 * T, 1.5 * T, world.cedarFelled ? 5 : 15, 0, Math.PI * 2);
  ctx.stroke();
  // Well water.
  const w = placeRect(place('well'));
  ctx.fillStyle = BLUE.water;
  ctx.beginPath();
  ctx.arc(w.x + T / 2, w.y + T / 2, 8, 0, Math.PI * 2);
  ctx.fill();
  // Site progress: ten ticks.
  const s = insetRect(placeRect(place('site')), 10);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i < world.houseStage ? 'rgba(205, 220, 235, 0.85)' : 'rgba(205, 220, 235, 0.15)';
    ctx.fillRect(s.x + (i % 5) * (s.w / 5) + 2, s.y + (i < 5 ? 10 : s.h / 2 + 4), s.w / 5 - 4, 14);
  }
  if (world.shuttered) {
    ctx.strokeStyle = BLUE.label;
    ctx.strokeRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
  }
}

const SHORT_LABEL: Partial<Record<PlaceId, string>> = {
  forest: 'FOREST',
  field: 'FIELD',
  masjid: 'MASJID',
  well: 'WELL',
  kitchen: 'KITCHEN',
  site: 'HOUSE',
  wellhouse: 'WELL-HSE',
  'home-maryam': 'HOME',
  'home-yusuf': 'HOME',
  'home-idris': 'HOME',
  cedar: 'CEDAR',
};

function drawLabels(ctx: CanvasRenderingContext2D, input: SceneInput) {
  const classic = input.side === 'classic';
  ctx.font = '600 8.5px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of PLACES) {
    // Human labels are always drawn (so the house can be found before the first tap), faint until choosing.
    const strong = classic || input.showPlaceLabels || input.hoverPlace === p.id;
    const r = placeRect(p);
    const label = SHORT_LABEL[p.id] ?? p.label;
    const x = r.x + r.w / 2;
    const y = p.id === 'cedar' ? r.y - 4 : p.id === 'well' ? r.y - 10 : r.y + 9;
    if (classic) {
      ctx.fillStyle = BLUE.label;
      ctx.fillText(label, x, y);
    } else {
      const wdt = ctx.measureText(label).width + 10;
      ctx.globalAlpha = strong ? 1 : 0.45;
      ctx.fillStyle = input.hoverPlace === p.id ? HUMAN.ink : 'rgba(43, 38, 34, 0.72)';
      roundRect(ctx, x - wdt / 2, y - 7, wdt, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#f3e9d6';
      ctx.fillText(label, x, y + 0.5);
      ctx.globalAlpha = 1;
    }
  }
}

function drawHover(ctx: CanvasRenderingContext2D, input: SceneInput) {
  if (!input.hoverPlace) return;
  const p = place(input.hoverPlace);
  const r = insetRect(placeRect(p), 1);
  ctx.strokeStyle = input.side === 'classic' ? '#f4f6f8' : '#a8552f';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.lineDashOffset = -input.realTime / 60;
  roundRect(ctx, r.x, r.y, r.w, r.h, 6);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------------------------

function drawPersonHuman(ctx: CanvasRenderingContext2D, p: DrawPerson, sun: Sun, selected: boolean) {
  const look = LOOKS[p.id];
  const px = (p.x + 0.5) * T;
  const py = (p.y + 0.5) * T;
  ctx.save();
  ctx.translate(px, py + 10);
  const s = look.short ? 0.84 : 1;
  ctx.scale(s, s);
  if (p.state === 'dead') {
    ctx.fillStyle = 'rgba(60, 50, 40, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, -4, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9e1d0';
    ctx.beginPath();
    ctx.ellipse(0, -6, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const lying = p.state === 'down' || p.state === 'carried';
  if (selected) {
    ctx.strokeStyle = '#a8552f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow.
  ctx.fillStyle = `rgba(60, 40, 20, ${0.12 + 0.12 * sun.strength})`;
  ctx.beginPath();
  ctx.ellipse(
    lying ? 0 : sun.dx * 0.25,
    lying ? -2 : 1 + sun.dy * 0.1,
    lying ? 14 : 8,
    3.5,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  if (p.state === 'carried') ctx.translate(0, -18);
  if (lying) ctx.rotate(-Math.PI / 2);
  // Body.
  ctx.fillStyle = look.body;
  roundRect(ctx, -7, -18, 14, 18, 6);
  ctx.fill();
  // Sash.
  ctx.strokeStyle = look.sash;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, -16);
  ctx.lineTo(6, -5);
  ctx.stroke();
  // Head.
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(0, -23.5, 6, 0, Math.PI * 2);
  ctx.fill();
  if (look.hat?.kind === 'scarf') {
    ctx.fillStyle = look.hat.color;
    ctx.beginPath();
    ctx.arc(0, -24, 7, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(6.5, -17);
    ctx.lineTo(-6.5, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(0, -22.5, 3.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.hat?.kind === 'cap') {
    ctx.fillStyle = look.hat.color;
    roundRect(ctx, -7, -30.5, 14, 4.5, 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#2f241c';
    ctx.beginPath();
    ctx.arc(0, -25, 6, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
  }
  if (p.protest) {
    ctx.fillStyle = '#d9932b';
    ctx.beginPath();
    ctx.arc(8, -30, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPersonClassic(ctx: CanvasRenderingContext2D, p: DrawPerson, selected: boolean) {
  const look = LOOKS[p.id];
  const px = (p.x + 0.5) * T;
  const py = (p.y + 0.5) * T;
  ctx.save();
  ctx.translate(px, py + 10);
  const s = look.short ? 0.84 : 1;
  ctx.scale(s, s);
  if (p.state === 'dead') {
    ctx.strokeStyle = BLUE.pawnShade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(6, 0);
    ctx.moveTo(6, -12);
    ctx.lineTo(-6, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const lying = p.state === 'down' || p.state === 'carried';
  if (selected) {
    ctx.strokeStyle = '#f4f6f8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, lying ? -2 : 1, lying ? 14 : 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.state === 'carried') ctx.translate(0, -18);
  if (lying) ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = BLUE.pawnShade;
  roundRect(ctx, -7, -18, 14, 18, 6);
  ctx.fill();
  ctx.fillStyle = BLUE.pawn;
  roundRect(ctx, -7, -18, 11, 18, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -23.5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (p.state !== 'carried' && p.state !== 'asleep') {
    const bx = px - 11;
    const by = py - (look.short ? 25 : 29);
    ctx.fillStyle = BLUE.barBg;
    ctx.fillRect(bx - 1, by - 1, 24, 8);
    ctx.fillStyle = BLUE.hp;
    ctx.fillRect(bx, by, (22 * Math.max(0, p.hp)) / 100, 2.5);
    ctx.fillStyle = (p.hunger ?? 0) >= 80 ? '#ff7a59' : BLUE.hunger;
    ctx.fillRect(bx, by + 3.5, (22 * Math.min(100, p.hunger ?? 0)) / 100, 2.5);
  }
}

function drawSleepers(ctx: CanvasRenderingContext2D, input: SceneInput, people: DrawPerson[]) {
  const homes = new Map<string, number>();
  for (const p of people) {
    if (p.state !== 'asleep') continue;
    const key = `${Math.round(p.x)},${Math.round(p.y)}`;
    homes.set(key, (homes.get(key) ?? 0) + 1);
  }
  ctx.font = 'italic 600 11px "Fraunces", Georgia, serif';
  ctx.textAlign = 'center';
  for (const key of homes.keys()) {
    const [x = 0, y = 0] = key.split(',').map(Number);
    const t = (input.realTime / 1800) % 1;
    ctx.fillStyle =
      input.side === 'classic'
        ? `rgba(220, 230, 240, ${0.8 - t * 0.6})`
        : `rgba(255, 244, 214, ${0.95 - t * 0.6})`;
    ctx.fillText('z', (x + 0.5) * T + t * 6, (y - 0.6) * T - t * 10);
    ctx.fillText('z', (x + 0.5) * T + 8 + t * 6, (y - 1) * T - t * 10);
  }
}

// ---------------------------------------------------------------------------------------------
// Atmosphere
// ---------------------------------------------------------------------------------------------

const LANTERNS: [number, number][] = PLACES.filter((p) => p.solid && p.id !== 'well').map((p) => [
  (p.x + p.w / 2) * T,
  (p.y + p.h) * T + 2,
]);

function drawAtmosphere(ctx: CanvasRenderingContext2D, input: SceneInput) {
  const { darkness, weather, side } = input;
  if (weather.kind !== 'clear') {
    const a = weather.kind === 'storm' ? 0.3 : weather.kind === 'squall' ? 0.18 : 0.14;
    ctx.fillStyle = side === 'classic' ? `rgba(10, 14, 20, ${a})` : `rgba(92, 102, 114, ${a + 0.08})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }
  if (darkness > 0) {
    ctx.fillStyle =
      side === 'classic' ? `rgba(8, 12, 20, ${0.45 * darkness})` : `rgba(27, 33, 64, ${0.6 * darkness})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    if (side === 'human') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      LANTERNS.forEach(([x, y], i) => {
        const flicker = 0.85 + 0.15 * Math.sin(input.realTime / 180 + i * 1.7);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 46);
        g.addColorStop(0, `rgba(255, 190, 110, ${0.42 * darkness * flicker})`);
        g.addColorStop(1, 'rgba(255, 190, 110, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 46, y - 46, 92, 92);
      });
      ctx.restore();
      LANTERNS.forEach(([x, y]) => {
        ctx.fillStyle = `rgba(255, 214, 150, ${0.9 * darkness})`;
        ctx.beginPath();
        ctx.arc(x, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  if (weather.kind === 'storm' || weather.kind === 'squall') {
    const n = weather.kind === 'storm' ? 140 : 70;
    const speed = weather.kind === 'storm' ? 0.9 : 0.6;
    ctx.strokeStyle = side === 'classic' ? 'rgba(200, 215, 230, 0.35)' : 'rgba(225, 235, 245, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const fx = h01(i, 11);
      const fy = h01(i, 23);
      const y = (fy * LOGICAL_H + input.realTime * speed) % (LOGICAL_H + 20);
      const x = ((fx * (LOGICAL_W + 80) + input.realTime * speed * 0.35) % (LOGICAL_W + 80)) - 40;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 12);
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------------------------

export function drawScene(ctx: CanvasRenderingContext2D, input: SceneInput): void {
  const sun = input.side === 'human' ? sunAt(input.minute, input.darkness) : { dx: 0, dy: 0, strength: 0 };
  drawGround(ctx, input.side);
  if (input.side === 'human') drawBuildingsHuman(ctx, input, sun);
  else drawPlacesClassic(ctx, input.world);
  drawHover(ctx, input);

  const visible = input.people
    .filter((p) => p.state !== 'asleep' && p.carriedBy === null)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const carried = input.people.filter((p) => p.carriedBy !== null);
  for (const p of visible) {
    if (input.side === 'human') drawPersonHuman(ctx, p, sun, p.id === input.selectedId);
    else drawPersonClassic(ctx, p, p.id === input.selectedId);
    for (const c of carried) {
      if (c.carriedBy !== p.id) continue;
      const shown = { ...c, x: p.x, y: p.y };
      if (input.side === 'human') drawPersonHuman(ctx, shown, sun, c.id === input.selectedId);
      else drawPersonClassic(ctx, shown, c.id === input.selectedId);
    }
  }
  drawAtmosphere(ctx, input);
  drawSleepers(ctx, input, input.people);
  drawLabels(ctx, input);
}

/** Bubble anchor in logical pixels (above the head). */
export function headAnchor(x: number, y: number, id: VillagerId): { x: number; y: number } {
  const short = LOOKS[id].short ? 5 : 0;
  return { x: (x + 0.5) * T, y: (y + 0.5) * T - 26 + short };
}
