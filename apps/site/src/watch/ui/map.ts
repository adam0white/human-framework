/**
 * Canvas 2D drawing of the wall at night. Lanes run from the treeline (top) to the wall (bottom third), the
 * village sits below. The lantern lights one lane; every other lane is dark and shows only moving grass and
 * sounds at the foot of the wall. No numbers are drawn. The layout flexes to any size; positions ease between
 * sim minutes on the page's own animation clock.
 *
 * G3-3: by day (the open seasons and their pages) the land takes the season's colour, the fields above the wall
 * show shoots, ripe rows or stubble, the wall stands empty and the villagers are drawn in the village below, by
 * their homes: children small, the old stooped with grey hair and a stick, a limp with a stick and a short leg.
 */
import { SECTION_IDS, type SectionId, type WatcherId } from '../sim/config.ts';
import type { AgeBand, Frame, FrameWatcher, Posture } from '../sim/view.ts';
import { LIGHT_EDGE } from '../sim/view.ts';

/** Phases drawn in daylight, with the wall empty and the villagers below it. */
const DAY_PHASES = new Set(['spring', 'summer', 'autumn', 'thaw', 'fair', 'closed']);

export function isDay(f: Frame): boolean {
  return DAY_PHASES.has(f.phase);
}

export interface Layout {
  w: number;
  h: number;
  laneW: number;
  yTree: number;
  yWall: number;
  wallH: number;
  yVillage: number;
}

/** By day the village below the wall gets more room, for the people in it. */
export function layoutFor(w: number, h: number, day = false): Layout {
  const yTree = Math.round(h * 0.13);
  const yWall = Math.round(h * (day ? 0.5 : 0.7));
  const wallH = Math.max(18, Math.round(h * 0.055));
  return { w, h, laneW: w / SECTION_IDS.length, yTree, yWall, wallH, yVillage: yWall + wallH };
}

export function laneY(l: Layout, pos: number): number {
  return l.yTree + (l.yWall - l.yTree) * pos;
}

export function postXY(l: Layout, section: SectionId, slot: number): { x: number; y: number } {
  const i = SECTION_IDS.indexOf(section);
  const cx = (i + 0.5) * l.laneW;
  return { x: cx + (slot === 0 ? -1 : 1) * Math.min(28, l.laneW * 0.22), y: l.yWall + l.wallH * 0.45 };
}

export type Hit = { kind: 'post'; post: string } | { kind: 'section'; section: SectionId } | null;

export function hitTest(l: Layout, f: Frame, x: number, y: number): Hit {
  // The nearest post within reach: a generous target for a finger (posts sit close on a phone).
  const reach = Math.max(30, l.laneW * 0.3);
  let best: { post: string; d: number } | null = null;
  for (const sec of f.sections) {
    for (const [slot, p] of sec.posts.entries()) {
      const at = postXY(l, sec.id, slot);
      const d = Math.hypot(at.x - x, (at.y - y) * 0.8);
      if (d < reach && (!best || d < best.d)) best = { post: p.id, d };
    }
  }
  if (best) return { kind: 'post', post: best.post };
  const i = Math.floor(x / l.laneW);
  const section = SECTION_IDS[Math.max(0, Math.min(SECTION_IDS.length - 1, i))];
  if (!section || y > l.h) return null;
  return { kind: 'section', section };
}

/** Figure palette, indexed by a villager's `look`; it wraps for large casts. */
const LOOKS: readonly Look[] = [
  { body: '#7a5c44', scarf: '#d9c9a8' },
  { body: '#4f6a7a', scarf: '#c2703f' },
  { body: '#6b4f6b', scarf: '#8e3b46' },
  { body: '#5a4a3a', scarf: '#9a8a5a' },
  { body: '#8a7a68', scarf: '#e8e2d0' },
  { body: '#3f4a3a', scarf: '#6a7f8f' },
  { body: '#6e5a3c', scarf: '#b8574a' },
  { body: '#4a5a6e', scarf: '#d6b56a' },
  { body: '#5e4652', scarf: '#9fb0a0' },
  { body: '#73664e', scarf: '#5f7a9a' },
  { body: '#47524a', scarf: '#c99a7a' },
  { body: '#665046', scarf: '#a8a4c8' },
];

function lookOf(look: number | undefined): Look {
  const n = LOOKS.length;
  return LOOKS[(((look ?? 0) % n) + n) % n] as Look;
}

export interface Ease {
  pos: Map<number, number>;
  lantern: number;
  last: number;
}

export function newEase(): Ease {
  return { pos: new Map(), lantern: -1, last: 0 };
}

function hash01(n: number): number {
  let h = Math.imul(n ^ 0x2545f491, 0x9e3779b1);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** 0 = daylight, 1 = deep night. */
function darkness(f: Frame): number {
  if (isDay(f)) return 0;
  if (f.phase === 'goal' || f.phase === 'dusk')
    return 0.35 + 0.35 * Math.max(0, Math.min(1, (f.clock - 17 * 60) / 60));
  if (f.phase === 'dawn' || f.phase === 'fallen') return 0.25;
  const p = f.nightProgress;
  return p > 0.92 ? 0.95 - (p - 0.92) * 6 : 0.95;
}

export interface DrawOpts {
  selected: WatcherId | null;
  now: number;
}

export function drawMap(ctx: CanvasRenderingContext2D, l: Layout, f: Frame, ease: Ease, o: DrawOpts): void {
  const { w, h, laneW } = l;
  const dt = ease.last ? Math.min(0.1, (o.now - ease.last) / 1000) : 0;
  ease.last = o.now;
  const k = Math.min(1, dt * 6);
  const dark = darkness(f);
  const day = isDay(f);
  const winterUI = !day;

  // Ground and sky.
  const sky = ctx.createLinearGradient(0, 0, 0, l.yTree);
  if (day) {
    sky.addColorStop(0, f.season === 'autumn' ? '#8fa3b8' : '#7fa8cf');
    sky.addColorStop(1, f.season === 'autumn' ? '#e2c9a2' : '#d8e4ea');
  } else {
    sky.addColorStop(0, f.phase === 'dusk' || f.phase === 'goal' ? '#3a2f4f' : '#0d1022');
    sky.addColorStop(1, f.phase === 'dusk' || f.phase === 'goal' ? '#c7794a' : '#1b2140');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, l.yTree);
  ctx.fillStyle = landColour(f);
  ctx.fillRect(0, l.yTree, w, l.yWall - l.yTree);
  if (day) {
    drawSun(ctx, l, f);
    drawFields(ctx, l, f);
  }

  // Moon along an arc through the night.
  if (f.phase === 'night') {
    const p = Math.max(0, Math.min(1, f.nightProgress));
    const mx = w * (0.1 + 0.8 * p);
    const my = l.yTree * (0.75 - 0.5 * Math.sin(Math.PI * p));
    ctx.fillStyle = '#f3e9d6';
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(5, l.yTree * 0.16), 0, Math.PI * 2);
    ctx.fill();
  }

  // Treeline.
  ctx.fillStyle = day ? treeColour(f) : '#1f2a1d';
  for (let x = -10; x < w + 20; x += 18) {
    const t = l.yTree - 6 - hash01(Math.floor(x)) * 14;
    ctx.beginPath();
    ctx.moveTo(x - 12, l.yTree + 4);
    ctx.lineTo(x, t);
    ctx.lineTo(x + 12, l.yTree + 4);
    ctx.fill();
  }

  // Lane dividers (paths in the grass).
  for (let i = 0; i < SECTION_IDS.length; i++) {
    const cx = (i + 0.5) * laneW;
    ctx.strokeStyle = 'rgba(180, 160, 120, 0.22)';
    ctx.lineWidth = Math.max(6, laneW * 0.12);
    ctx.beginPath();
    ctx.moveTo(cx, l.yTree);
    ctx.lineTo(cx, l.yWall);
    ctx.stroke();
  }

  // The scout's tracks on the warned approach.
  if (winterUI) {
    const i = SECTION_IDS.indexOf(f.warned);
    const cx = (i + 0.5) * laneW;
    const alpha = f.phase === 'dusk' || f.phase === 'goal' ? 0.85 : 0.35;
    ctx.fillStyle = `rgba(236, 224, 200, ${alpha})`;
    for (let n = 0; n < 7; n++) {
      const y = l.yTree + 10 + n * ((l.yWall - l.yTree) * 0.05);
      const x = cx + (n % 2 === 0 ? -5 : 5);
      ctx.beginPath();
      ctx.ellipse(x, y, 2.4, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Night over everything above the wall.
  ctx.fillStyle = `rgba(8, 10, 24, ${dark * 0.8})`;
  ctx.fillRect(0, l.yTree, w, l.yWall - l.yTree);

  // The lantern's light up the lit lane.
  const targetX = f.lantern.x;
  ease.lantern = ease.lantern < 0 ? targetX : ease.lantern + (targetX - ease.lantern) * k;
  const lx = (ease.lantern + 0.5) * laneW;
  const lanternOut = f.phase === 'dusk' || f.phase === 'night';
  if (f.lit && f.phase === 'night') {
    const i = SECTION_IDS.indexOf(f.lit);
    const x0 = i * laneW;
    const yEdge = laneY(l, LIGHT_EDGE);
    const g = ctx.createLinearGradient(0, l.yWall, 0, yEdge);
    g.addColorStop(0, 'rgba(255, 196, 110, 0.42)');
    g.addColorStop(0.7, 'rgba(255, 196, 110, 0.16)');
    g.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, yEdge, laneW, l.yWall - yEdge);
  }
  if (lanternOut) {
    const glow = ctx.createRadialGradient(lx, l.yWall, 2, lx, l.yWall, laneW * 0.8);
    glow.addColorStop(0, 'rgba(255, 210, 130, 0.55)');
    glow.addColorStop(1, 'rgba(255, 210, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - laneW, l.yWall - laneW, laneW * 2, laneW * 2);
  }

  // Motion in the dark: grass moving, a sound at the foot of the wall.
  for (const m of f.motion) {
    const i = SECTION_IDS.indexOf(m.section);
    const cx = (i + 0.5) * laneW + (hash01(m.id) - 0.5) * laneW * 0.5;
    if (m.foot) {
      const y = l.yWall - 4;
      const r = 6 + ((o.now / 90) % 14);
      ctx.strokeStyle = `rgba(236, 224, 200, ${0.5 - r / 40})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, y, r, Math.PI, 2 * Math.PI);
      ctx.stroke();
      continue;
    }
    const y = laneY(l, m.pos);
    // A soft pulse where the grass moves, then the stalks themselves.
    const pulse = 0.12 + 0.1 * Math.sin(o.now / 260 + m.id);
    const halo = ctx.createRadialGradient(cx, y, 1, cx, y, laneW * 0.32);
    halo.addColorStop(0, `rgba(200, 214, 170, ${pulse})`);
    halo.addColorStop(1, 'rgba(200, 214, 170, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - laneW * 0.32, y - laneW * 0.32, laneW * 0.64, laneW * 0.64);
    ctx.strokeStyle = 'rgba(214, 226, 186, 0.75)';
    ctx.lineWidth = 2;
    for (let s = -2; s <= 2; s++) {
      const sway = Math.sin(o.now / 140 + m.id + s) * 4;
      ctx.beginPath();
      ctx.moveTo(cx + s * 6, y + 8);
      ctx.quadraticCurveTo(cx + s * 6 + sway, y - 2, cx + s * 6 + sway * 1.6, y - 11);
      ctx.stroke();
    }
  }

  // Seen threats in the lit lane.
  const seenIds = new Set<number>();
  for (const t of f.seen) {
    seenIds.add(t.id);
    const i = SECTION_IDS.indexOf(t.section);
    let target = t.pos;
    let alpha = 1;
    if (t.state === 'fled') {
      target = Math.max(0, t.pos - t.age * 0.08);
      alpha = Math.max(0, 1 - t.age / 8);
    } else if (t.state === 'in') {
      target = 1.12 + t.age * 0.02;
      alpha = Math.max(0, 1 - t.age / 6);
    }
    const prev = ease.pos.get(t.id) ?? target;
    const shown = prev + (target - prev) * k;
    ease.pos.set(t.id, shown);
    const cx = (i + 0.5) * laneW + (hash01(t.id) - 0.5) * laneW * 0.55;
    const y = shown > 1 ? l.yWall + (shown - 1) * (l.h - l.yWall) * 3 : laneY(l, shown);
    ctx.globalAlpha = alpha;
    if (t.kind === 'wolf') drawWolf(ctx, cx, y, laneW, t.state === 'fled');
    else drawThief(ctx, cx, y, laneW, t.hurt);
    ctx.globalAlpha = 1;
  }
  for (const id of [...ease.pos.keys()]) if (!seenIds.has(id)) ease.pos.delete(id);

  // The village and the granary.
  drawVillage(ctx, l, f);
  ctx.fillStyle = `rgba(8, 10, 24, ${dark * 0.45})`;
  ctx.fillRect(0, l.yVillage, w, h - l.yVillage);

  // Section names, just above the wall.
  ctx.font = '600 12px "Instrument Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [i, sec] of f.sections.entries()) {
    const isLit = !day && sec.id === f.lit;
    ctx.fillStyle = isLit ? 'rgba(255, 236, 200, 0.95)' : 'rgba(236, 224, 200, 0.55)';
    ctx.fillText(sec.name, (i + 0.5) * laneW, l.yWall - 12);
  }

  // The wall.
  ctx.fillStyle = '#8a7558';
  ctx.fillRect(0, l.yWall, w, l.wallH);
  ctx.fillStyle = '#a58b67';
  for (let x = 0; x < w; x += 16) ctx.fillRect(x, l.yWall - 5, 10, 6);
  if (f.roused) {
    for (let i = 0; i < 9; i++) {
      const x = ((i + 0.5) / 9) * w;
      const flick = 0.6 + 0.4 * Math.sin(o.now / 70 + i * 2);
      ctx.fillStyle = `rgba(255, 170, 70, ${flick})`;
      ctx.beginPath();
      ctx.arc(x, l.yWall - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Posts and watchers: someone standing; a post someone was given but has left (a faint outline of them);
  // or an empty post (a dashed ring). By day the wall stands empty.
  for (const sec of winterUI ? f.sections : []) {
    const isLit = sec.id === f.lit;
    for (const [slot, p] of sec.posts.entries()) {
      const at = postXY(l, sec.id, slot);
      const labelY = at.y + l.wallH * 0.55 + 10;
      // Figures grow a little on tall maps so posture and signs stay readable.
      const size = Math.max(1, Math.min(1.7, l.wallH / 26));
      ctx.font = '600 11px "Instrument Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      if (!p.watcher) {
        if (p.posted) {
          drawGhost(ctx, at.x, at.y, lookOf(f.watchers.find((x) => x.id === p.posted)?.look), size);
          ctx.fillStyle = 'rgba(255, 243, 220, 0.38)';
          ctx.fillText(f.watchers.find((x) => x.id === p.posted)?.name ?? '', at.x, labelY);
        } else {
          ctx.strokeStyle = o.selected ? 'rgba(255, 222, 160, 0.9)' : 'rgba(255, 240, 210, 0.35)';
          ctx.lineWidth = o.selected ? 2 : 1.2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(at.x, at.y, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        continue;
      }
      const watcher = f.watchers.find((x) => x.id === p.watcher);
      if (!watcher) continue;
      const seen = f.phase !== 'night' || watcher.lit;
      drawWatcher(
        ctx,
        at.x,
        at.y,
        lookOf(watcher.look),
        {
          seen,
          // Off the night the light is not the limit: a figure is simply standing.
          posture: watcher.posture === 'figure' && seen ? 'stand' : watcher.posture,
          signs: watcher.signs,
          throwing: watcher.throwing,
          commanded: watcher.commanded,
          age: watcher.age,
          limp: watcher.limp,
        },
        size,
      );
      if (watcher.throwing && watcher.target !== null) {
        const tPos = ease.pos.get(watcher.target);
        if (tPos !== undefined) {
          const i = SECTION_IDS.indexOf(sec.id);
          const tx = (i + 0.5) * laneW + (hash01(watcher.target) - 0.5) * laneW * 0.55;
          const ty = laneY(l, Math.min(1, tPos));
          ctx.strokeStyle =
            watcher.throwing === 'hit' ? 'rgba(255, 236, 190, 0.9)' : 'rgba(255, 236, 190, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(at.x, at.y - 12);
          ctx.quadraticCurveTo((at.x + tx) / 2, Math.min(at.y, ty) - 30, tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.font = '600 11px "Instrument Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isLit || f.phase !== 'night' ? '#fff3dc' : 'rgba(255, 243, 220, 0.5)';
      ctx.fillText(watcher.name, at.x, labelY);
    }
  }

  // Watchers who left the wall at night: small dim figures by the hall (left of the granary) or by their homes.
  if (f.phase === 'night') {
    const gw = Math.max(80, Math.min(140, w * 0.24));
    let hall = 0;
    for (const wt of f.watchers) {
      if (wt.place !== 'hall' && wt.place !== 'home') continue;
      let x: number;
      let y: number;
      if (wt.place === 'hall') {
        x = w / 2 - gw / 2 - 14 - hall * 16;
        y = l.yVillage + (h - l.yVillage) * 0.4;
        hall++;
      } else {
        const home = wt.home;
        x = (SECTION_IDS.indexOf(home) + 0.5) * laneW + (hashId(wt.id) - 0.5) * 20;
        y = l.yVillage + (h - l.yVillage) * 0.85;
      }
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.translate(x, y);
      ctx.scale(0.7, 0.7);
      drawWatcher(ctx, 0, 0, lookOf(wt.look), {
        seen: false,
        posture: 'figure',
        signs: null,
        throwing: null,
        commanded: false,
        age: wt.age,
        limp: wt.limp,
      });
      ctx.restore();
    }
  }

  if (day) drawVillagers(ctx, l, f, o.now);

  // The Keeper with the lantern, below the wall.
  if (winterUI && f.phase !== 'goal') {
    const ky = l.yVillage + 14;
    ctx.fillStyle = '#2b2622';
    ctx.beginPath();
    ctx.arc(lx, ky - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(lx - 4, ky - 2, 8, 11);
    const flame = 0.8 + 0.2 * Math.sin(o.now / 60);
    ctx.fillStyle = `rgba(255, 200, 100, ${flame})`;
    ctx.beginPath();
    ctx.arc(lx + 8, ky + 1, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWolf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  laneW: number,
  fleeing: boolean,
): void {
  const s = Math.max(0.8, Math.min(1.3, laneW / 90));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, fleeing ? -s : s);
  ctx.fillStyle = '#9a9a92';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.lineTo(0, 15);
  ctx.lineTo(4, 6);
  ctx.fill();
  ctx.fillStyle = '#ffcf5a';
  ctx.fillRect(-2.5, 10, 1.6, 1.6);
  ctx.fillRect(1, 10, 1.6, 1.6);
  ctx.restore();
}

function drawThief(ctx: CanvasRenderingContext2D, x: number, y: number, laneW: number, hurt: boolean): void {
  const s = Math.max(0.8, Math.min(1.3, laneW / 90));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (hurt) ctx.rotate(0.25);
  ctx.fillStyle = '#2d2a33';
  ctx.beginPath();
  ctx.moveTo(-7, 10);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.lineTo(7, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b39b74';
  ctx.beginPath();
  ctx.ellipse(7, 2, 4, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

interface Look {
  body: string;
  scarf: string;
}

interface WatcherDraw {
  seen: boolean;
  posture: Posture;
  signs: FrameWatcher['signs'];
  throwing: 'hit' | 'miss' | null;
  commanded: boolean;
  /** Children are drawn small; the old stoop, with grey hair (in the light) and a stick. */
  age?: AgeBand;
  /** A limp for life: a short leg and a stick. */
  limp?: boolean;
}

/** Someone given this post who is not on it: an outline in their colours. */
function drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, look: Look, size = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(20, 22, 36, 0.35)';
  ctx.fillRect(-4, -8, 8, 12);
  ctx.strokeStyle = look.scarf;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(-4, -8, 8, 12);
  ctx.beginPath();
  ctx.arc(0, -11, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * A watcher in simple strokes. In the light: posture (stand, sit, doze, eat, pray, down, frozen, carry) and
 * signs (tired slumps the head, afraid hunches and turns toward the steps, hurt adds a bandage and a short leg).
 * In the dark: a dim figure only. Prayer is drawn as a quiet kneel, nothing more. A child is drawn small; the
 * old stoop, lean on a stick and (in the light) show grey hair; a limp for life adds the stick and a short leg.
 */
function drawWatcher(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: Look,
  d: WatcherDraw,
  size = 1,
): void {
  const seen = d.seen && d.posture !== 'figure';
  const dim = '#2a2c3a';
  const body = seen ? look.body : dim;
  const skin = seen ? '#b07c5a' : dim;
  const s = d.signs;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  if (d.age === 'child') ctx.scale(0.68, 0.68);
  ctx.lineCap = 'round';
  const old = d.age === 'old';

  if (d.posture === 'down') {
    // Lying along the wall.
    ctx.fillStyle = body;
    ctx.fillRect(-8, -1, 13, 5);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(8, 1.5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (seen) {
      ctx.fillStyle = look.scarf;
      ctx.fillRect(3, -1, 2.5, 5);
    }
    if (seen && s?.hurt) drawBandage(ctx, 8, 1.5);
    ctx.restore();
    return;
  }

  const low = d.posture === 'sit' || d.posture === 'doze' || d.posture === 'pray';
  const hunch = seen && (s?.afraid || d.posture === 'frozen') ? 1 : 0;
  const slump = seen && s?.tired ? 1 : 0;
  const stoop = old && !low ? 1 : 0;
  const bodyH = low ? 7 : 12 - hunch * 2 - stoop;
  const top = 4 - bodyH;
  // Head: lower when sitting, forward when slumped, tucked when hunched, bowed in prayer.
  let hx = slump * 1.5;
  let hy = top - 3 + slump * 2 + hunch * 1.5;
  if (d.posture === 'pray') {
    hx += 2;
    hy += 1.5;
  }
  if (d.posture === 'doze') {
    hx += 2.5;
    hy += 2;
  }
  // Afraid: turned toward the steps, drawn as the head leaning that way.
  if (seen && s?.afraid) hx -= 1.5;
  // Stooped with age: head forward and down.
  if (stoop) {
    hx += 2.2;
    hy += 1.5;
  }

  ctx.fillStyle = body;
  if ((slump || stoop) && !low) {
    ctx.save();
    ctx.transform(1, 0, -0.12 - stoop * 0.12, 1, 0, 0);
    ctx.fillRect(-4, top, 8, bodyH);
    ctx.restore();
  } else {
    ctx.fillRect(-4, top, 8, bodyH);
  }
  if (low) {
    // Legs out along the walk, or folded under for prayer.
    ctx.strokeStyle = body;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (d.posture === 'pray') {
      ctx.moveTo(-3, 4);
      ctx.lineTo(4, 4);
    } else {
      ctx.moveTo(2, 4);
      ctx.lineTo(9, 4);
    }
    ctx.stroke();
  } else if (seen && (s?.hurt || d.limp)) {
    // A limp: one leg short.
    ctx.strokeStyle = body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(-2, 7);
    ctx.moveTo(2, 4);
    ctx.lineTo(3, 5.5);
    ctx.stroke();
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, 4, 0, Math.PI * 2);
  ctx.fill();
  if (seen && old) {
    // Grey hair over the crown.
    ctx.fillStyle = '#d8d4cc';
    ctx.beginPath();
    ctx.arc(hx, hy, 4.2, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
  }
  if ((old || d.limp) && !low) {
    // A stick in the forward hand.
    ctx.strokeStyle = seen ? '#9a7a4e' : dim;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(6, top + 3);
    ctx.lineTo(7.5, 4.5);
    ctx.stroke();
  }
  if (seen) {
    ctx.fillStyle = look.scarf;
    ctx.fillRect(-4, top, 8, 2.5);
  }
  if (seen && s?.afraid) {
    // Arms drawn in close.
    ctx.strokeStyle = body;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, top + 3);
    ctx.lineTo(-1, top + 6);
    ctx.moveTo(4, top + 3);
    ctx.lineTo(1, top + 6);
    ctx.stroke();
  }
  if (seen && d.posture === 'frozen') {
    // Arms rigid at the sides.
    ctx.strokeStyle = body;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5.5, top + 1);
    ctx.lineTo(-5.5, top + bodyH);
    ctx.moveTo(5.5, top + 1);
    ctx.lineTo(5.5, top + bodyH);
    ctx.stroke();
  }
  if (seen && d.posture === 'eat') {
    ctx.fillStyle = '#d9c9a8';
    ctx.beginPath();
    ctx.ellipse(0, top + 5, 3.5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (seen && d.posture === 'carry') {
    // Someone across the shoulders.
    ctx.fillStyle = '#6a5a4a';
    ctx.fillRect(-8, top - 2, 16, 3.5);
  }
  if (seen && s?.hurt) drawBandage(ctx, hx, hy);
  if (d.throwing) {
    ctx.strokeStyle = body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(3, top + 2);
    ctx.lineTo(8, top - 7);
    ctx.stroke();
  }
  if (d.commanded) {
    // Under the bell's order: a short bright stroke over the head.
    ctx.strokeStyle = seen ? 'rgba(255, 196, 110, 0.9)' : 'rgba(255, 196, 110, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy, 7, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBandage(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = '#f2ece0';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 1.5);
  ctx.lineTo(x + 4, y - 0.5);
  ctx.stroke();
}

function drawVillage(ctx: CanvasRenderingContext2D, l: Layout, f: Frame): void {
  const { w, h } = l;
  const top = l.yVillage;
  ctx.fillStyle = '#5a4a36';
  ctx.fillRect(0, top, w, h - top);
  // Houses.
  const houses = Math.max(4, Math.floor(w / 70));
  for (let i = 0; i < houses; i++) {
    const x = ((i + 0.5) / houses) * w;
    if (Math.abs(x - w / 2) < Math.max(50, w * 0.12)) continue;
    const y = top + (h - top) * 0.62;
    ctx.fillStyle = '#c9975b';
    ctx.fillRect(x - 12, y - 8, 24, 16);
    ctx.fillStyle = '#a8733d';
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 8);
    ctx.lineTo(x, y - 18);
    ctx.lineTo(x + 15, y - 8);
    ctx.fill();
  }
  // The granary, its sacks drawn.
  const gw = Math.max(80, Math.min(140, w * 0.24));
  const gx = w / 2 - gw / 2;
  const gy = top + (h - top) * 0.36;
  const gh = (h - top) * 0.56;
  ctx.fillStyle = '#7a5c44';
  ctx.fillRect(gx, gy, gw, gh);
  ctx.fillStyle = '#3a2c20';
  ctx.fillRect(gx + 4, gy + 4, gw - 8, gh - 8);
  const sackW = Math.min(14, (gw - 12) / 5);
  const cols = Math.floor((gw - 8) / (sackW + 2));
  const lost = Math.max(0, f.grainAtDusk - f.grain);
  const total = f.grain + lost;
  for (let n = 0; n < total; n++) {
    const col = n % cols;
    const row = Math.floor(n / cols);
    const sx = gx + 6 + col * (sackW + 2) + sackW / 2;
    const sy = gy + gh - 8 - row * (sackW * 0.9) - sackW / 2;
    if (sy < gy + 6) break;
    const gone = n >= f.grain;
    ctx.fillStyle = gone ? 'rgba(212, 190, 150, 0.15)' : '#d4be96';
    ctx.strokeStyle = gone ? 'rgba(212, 190, 150, 0.4)' : '#8a7050';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sackW / 2, sackW * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** A stable 0..1 hash of a string id, for placing people by day. */
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return hash01(h);
}

type RGB = [number, number, number];
/** The land by season: winter as the nights have it, spring green, summer gold, autumn rust. */
const LAND: Record<Frame['season'], RGB> = {
  winter: [60, 74, 52],
  spring: [92, 128, 66],
  summer: [150, 140, 70],
  autumn: [140, 92, 50],
};
const TREES: Record<Frame['season'], RGB> = {
  winter: [31, 42, 29],
  spring: [46, 82, 44],
  summer: [52, 78, 38],
  autumn: [120, 62, 34],
};
const NEXT: Record<Frame['season'], Frame['season']> = {
  winter: 'spring',
  spring: 'summer',
  summer: 'autumn',
  autumn: 'winter',
};

const SEASON_START: Record<Frame['season'], number> = { winter: 0, spring: 90, summer: 180, autumn: 270 };

/** How far into its season the day is, 0..1 (seasons start on days 0, 90, 180 and 270 of 365). */
function seasonInto(f: Frame): number {
  const day = f.yearProgress * 365;
  const len = f.season === 'autumn' ? 95 : 90;
  return Math.max(0, Math.min(1, (day - SEASON_START[f.season]) / len));
}

/** The season's colour, turning toward the next one in the last third of the season. */
function seasonal(table: Record<Frame['season'], RGB>, f: Frame): string {
  const into = seasonInto(f);
  const t = Math.max(0, (into - 0.66) / 0.34);
  const a = table[f.season];
  const b = table[NEXT[f.season]];
  const mix = (i: 0 | 1 | 2) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

function landColour(f: Frame): string {
  return isDay(f) ? seasonal(LAND, f) : '#3c4a34';
}

function treeColour(f: Frame): string {
  return seasonal(TREES, f);
}

function drawSun(ctx: CanvasRenderingContext2D, l: Layout, f: Frame): void {
  const r = Math.max(6, l.yTree * 0.2);
  ctx.fillStyle = f.season === 'summer' ? 'rgba(255, 236, 170, 0.95)' : 'rgba(255, 244, 214, 0.85)';
  ctx.beginPath();
  ctx.arc(l.w * 0.82, l.yTree * 0.42, r, 0, Math.PI * 2);
  ctx.fill();
}

/** The fields between the trees and the wall: shoots in spring, ripe rows in summer, stubble after the harvest. */
function drawFields(ctx: CanvasRenderingContext2D, l: Layout, f: Frame): void {
  const top = l.yTree + (l.yWall - l.yTree) * 0.25;
  const bottom = l.yWall - 18;
  if (bottom <= top) return;
  const into = seasonInto(f);
  let colour = 'rgba(160, 200, 110, 0.55)';
  let height = 3;
  if (f.season === 'spring') height = 2 + into * 4;
  if (f.season === 'summer') {
    colour = 'rgba(222, 196, 104, 0.8)';
    height = 6 + into * 3;
  }
  if (f.season === 'autumn') {
    // Cut at the harvest, early in autumn.
    colour = into < 0.17 ? 'rgba(222, 186, 96, 0.8)' : 'rgba(196, 160, 100, 0.55)';
    height = into < 0.17 ? 9 : 2;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.4;
  const rows = Math.max(3, Math.floor((bottom - top) / 12));
  for (let r = 0; r < rows; r++) {
    const y = top + ((r + 0.5) / rows) * (bottom - top);
    ctx.beginPath();
    for (let x = 6 + (r % 2) * 5; x < l.w - 4; x += 10) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1, y - height);
    }
    ctx.stroke();
  }
}

/** By day: every villager in the village near their home, wandering a little. Names only on roomy maps. */
function drawVillagers(ctx: CanvasRenderingContext2D, l: Layout, f: Frame, now: number): void {
  const top = l.yVillage;
  const span = l.h - top;
  if (span < 30) return;
  const size = Math.max(0.9, Math.min(1.5, span / 150));
  const crowd = f.villagers.length > 14;
  for (const v of f.villagers) {
    const i = SECTION_IDS.indexOf(v.home);
    const hx = hashId(v.id);
    const hy = hashId(`${v.id}:y`);
    const drift = Math.sin(now / 2600 + hx * 40) * Math.min(10, l.laneW * 0.08);
    const x = Math.max(8, Math.min(l.w - 8, (i + 0.5) * l.laneW + (hx - 0.5) * l.laneW * 0.8 + drift));
    const y = top + span * (0.3 + hy * 0.6);
    drawWatcher(
      ctx,
      x,
      y,
      lookOf(v.look),
      {
        seen: true,
        posture: 'stand',
        signs: null,
        throwing: null,
        commanded: false,
        age: v.age,
        limp: v.limp,
      },
      size,
    );
    if (!crowd && l.w >= 420 && v.age !== 'child') {
      ctx.font = '600 10px "Instrument Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 243, 220, 0.85)';
      ctx.fillText(v.name, x, y + 16 * size);
    }
  }
}
