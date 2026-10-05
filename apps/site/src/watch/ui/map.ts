/**
 * Canvas 2D drawing of the wall at night. Lanes run from the treeline (top) to the wall (bottom third), the
 * village sits below. The lantern lights one lane; every other lane is dark and shows only moving grass and
 * sounds at the foot of the wall. No numbers are drawn. The layout flexes to any size.
 *
 * Motion between sim minutes (owner's playtest, 2026-10-05: people "jump after some time when moving"): each frame
 * carries the pace (sim minutes per real second), so a threat's advance, the lantern and the dark motion glide from
 * where they were drawn to where they are over the real time that step takes at that pace, at every speed. A watcher
 * who changes place (to a post, off the wall to the hall or home) walks there over a couple of sim minutes. By day
 * the villagers' wandering runs on sim time, so Seasons visibly runs faster than Days.
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

/**
 * Where post `slot` of `count` on a stretch stands: spread evenly about the lane's middle (owner's playtest: a
 * raised stretch's third post was drawn on top of the second).
 */
export function postXY(l: Layout, section: SectionId, slot: number, count = 2): { x: number; y: number } {
  const i = SECTION_IDS.indexOf(section);
  const cx = (i + 0.5) * l.laneW;
  const gap = count >= 3 ? Math.min(46, l.laneW * 0.27) : Math.min(28, l.laneW * 0.22);
  const offset = count <= 1 ? 0 : count === 2 ? (slot === 0 ? -1 : 1) : slot - (count - 1) / 2;
  return { x: cx + offset * gap, y: l.yWall + l.wallH * 0.45 };
}

export type Hit = { kind: 'post'; post: string } | { kind: 'section'; section: SectionId } | null;

export function hitTest(l: Layout, f: Frame, x: number, y: number): Hit {
  // The nearest post within reach: a generous target for a finger (posts sit close on a phone).
  const reach = Math.max(30, l.laneW * 0.3);
  let best: { post: string; d: number } | null = null;
  for (const sec of f.sections) {
    for (const [slot, p] of sec.posts.entries()) {
      const at = postXY(l, sec.id, slot, sec.posts.length);
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

/** A value moving from where it was drawn to its new target, over `dur` real milliseconds from `t0`. */
interface Tween {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t0: number;
  dur: number;
}

export interface Ease {
  /** Threat positions as drawn (lane units), for the throw lines. */
  pos: Map<number, number>;
  /** The last frame drawn, when it arrived, and the real time its step is drawn over. */
  frame: Frame | null;
  at: number;
  span: number;
  /** The sim minute of the frame before, for sim time between frames. */
  prevMinute: number;
  tweens: Map<string, Tween>;
}

export function newEase(): Ease {
  return { pos: new Map(), frame: null, at: 0, span: 0, prevMinute: 0, tweens: new Map() };
}

/** A sim step is drawn over at most this long (a card's 1/16 pace); a jump (a load, a page) at once. */
const MAX_SPAN_MS = 4000;
/** A watcher's walk to a new place takes about this many sim minutes, drawn over 0.35 to 2.5 real seconds. */
const WALK_MIN = 2;

/** Notes a new frame: how long its step should take to draw at its pace. */
function noteFrame(ease: Ease, f: Frame, now: number): void {
  if (ease.frame === f) return;
  const prev = ease.frame;
  const step = prev ? f.minute - prev.minute : 0;
  ease.prevMinute = prev ? prev.minute : f.minute;
  ease.span = step <= 0 || f.rate <= 0 ? 200 : Math.min(MAX_SPAN_MS, (step / f.rate) * 1000);
  // A long jump (a load, a page between seasons) is not drawn as motion.
  if (prev && (step < 0 || step > 4 * 1440)) ease.span = 0;
  ease.frame = f;
  ease.at = now;
}

/** How far through the current frame's step the drawing is (0..1). */
function stepProgress(ease: Ease, now: number): number {
  return ease.span <= 0 ? 1 : Math.max(0, Math.min(1, (now - ease.at) / ease.span));
}

/** The sim minute as drawn now: between the last two frames, continuous at every speed. */
function drawnMinute(ease: Ease, f: Frame, now: number): number {
  return ease.prevMinute + (f.minute - ease.prevMinute) * stepProgress(ease, now);
}

/**
 * Moves `key` toward (x, y): a new key starts there; a changed target starts from where it is drawn now.
 * Returns where to draw it.
 */
function tweenTo(
  ease: Ease,
  key: string,
  x: number,
  y: number,
  now: number,
  dur: number,
): { x: number; y: number } {
  const t = ease.tweens.get(key);
  if (!t) {
    ease.tweens.set(key, { fx: x, fy: y, tx: x, ty: y, t0: now, dur: 0 });
    return { x, y };
  }
  if (t.tx !== x || t.ty !== y) {
    const cur = tweenAt(t, now);
    t.fx = cur.x;
    t.fy = cur.y;
    t.tx = x;
    t.ty = y;
    t.t0 = now;
    t.dur = dur;
  }
  return tweenAt(t, now);
}

function tweenAt(t: Tween, now: number): { x: number; y: number; done: boolean } {
  const k = t.dur <= 0 ? 1 : Math.max(0, Math.min(1, (now - t.t0) / t.dur));
  return { x: t.fx + (t.tx - t.fx) * k, y: t.fy + (t.ty - t.fy) * k, done: k >= 1 };
}

/** Whether `key` is still on its way to its target. */
function moving(ease: Ease, key: string, now: number): boolean {
  const t = ease.tweens.get(key);
  return t !== undefined && !tweenAt(t, now).done;
}

/** Drops tweens this frame's drawing did not touch (threats gone, people gone). */
function sweep(ease: Ease, keep: Set<string>): void {
  for (const k of ease.tweens.keys()) if (!keep.has(k)) ease.tweens.delete(k);
}

function walkMs(f: Frame): number {
  if (f.rate <= 0) return 600;
  return Math.max(350, Math.min(2500, (WALK_MIN / f.rate) * 1000));
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
  noteFrame(ease, f, o.now);
  const span = ease.span;
  const touched = new Set<string>();
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
  touched.add('lantern');
  const lx = (tweenTo(ease, 'lantern', f.lantern.x, 0, o.now, span).x + 0.5) * laneW;
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
    const key = `m${m.id}`;
    touched.add(key);
    const y = laneY(l, tweenTo(ease, key, 0, m.pos, o.now, span).y);
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
  // At the foot and once in, they are drawn after the wall: climbing its face, then over into the village with
  // or without a sack (owner's playtest, 2026-10-05: a thief got in and "still can't steal" with nothing shown).
  const climbing: { t: (typeof f.seen)[number]; cx: number; y: number; alpha: number }[] = [];
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
    const key = `t${t.id}`;
    touched.add(key);
    const shown = tweenTo(ease, key, 0, target, o.now, span).y;
    ease.pos.set(t.id, shown);
    const cx = (i + 0.5) * laneW + (hash01(t.id) - 0.5) * laneW * 0.55;
    const y = shown > 1 ? l.yWall + (shown - 1) * (l.h - l.yWall) * 3 : laneY(l, shown);
    if (t.state === 'foot' || t.state === 'in') {
      climbing.push({ t, cx, y, alpha });
      continue;
    }
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
    // A raised stretch's name sits above its higher top.
    ctx.fillText(sec.name, (i + 0.5) * laneW, l.yWall - (sec.raised && !sec.fallen ? 22 : 12));
  }

  // The wall.
  ctx.fillStyle = '#8a7558';
  ctx.fillRect(0, l.yWall, w, l.wallH);
  ctx.fillStyle = '#a58b67';
  for (let x = 0; x < w; x += 16) ctx.fillRect(x, l.yWall - 5, 10, 6);
  // A stretch raised at a fair: a timber walk and higher merlons along it, so the upgrade shows.
  for (const [i, sec] of f.sections.entries()) {
    if (!sec.raised || sec.fallen) continue;
    const x0 = i * laneW + 4;
    const rw = laneW - 8;
    ctx.fillStyle = '#6b5236';
    ctx.fillRect(x0, l.yWall - 10, rw, 6);
    ctx.fillStyle = '#b89a70';
    for (let x = x0; x < x0 + rw - 6; x += 12) ctx.fillRect(x, l.yWall - 17, 8, 8);
    ctx.strokeStyle = '#4e3b26';
    ctx.lineWidth = 1.5;
    for (let x = x0 + 10; x < x0 + rw; x += Math.max(24, rw / 4)) {
      ctx.beginPath();
      ctx.moveTo(x, l.yWall - 4);
      ctx.lineTo(x, l.yWall + l.wallH);
      ctx.stroke();
    }
  }
  // The bell on its post by the Gate: the bigger bell, once bought, is drawn bigger.
  if (winterUI || f.bigBell) {
    const gi = SECTION_IDS.indexOf('gate');
    const bx = gi * laneW + laneW * 0.92;
    const by = l.yWall - 26;
    const r = f.bigBell ? 7 : 4.5;
    ctx.strokeStyle = '#4e3b26';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, l.yWall);
    ctx.lineTo(bx, by - r - 4);
    ctx.lineTo(bx - r - 3, by - r - 4);
    ctx.stroke();
    ctx.fillStyle = f.rope.snapped ? '#6e6252' : '#c9a24a';
    ctx.beginPath();
    ctx.moveTo(bx - r - 3 - r, by + r * 0.6);
    ctx.quadraticCurveTo(bx - r - 3, by - r * 1.6, bx - r - 3 + r, by + r * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  // A stretch that came down in the thaw: a gap in the wall top with rubble at its foot.
  for (const [i, sec] of f.sections.entries()) {
    if (!sec.fallen) continue;
    const x0 = i * laneW + laneW * 0.18;
    const gw = laneW * 0.64;
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(x0, l.yWall - 6, gw, l.wallH * 0.7 + 6);
    ctx.fillStyle = '#7a6850';
    for (let k = 0; k < 9; k++) {
      const rx = x0 + (((k * 37) % 100) / 100) * gw;
      const ry = l.yWall + l.wallH * 0.55 + ((k * 13) % 7);
      ctx.fillRect(rx, ry, 7 + (k % 3) * 3, 5);
    }
  }
  // Climbers on the wall face: a thief's rope from the top, the figure higher the further it has got.
  for (const { t, cx, y: inY, alpha } of climbing) {
    if (t.state === 'in') {
      ctx.globalAlpha = alpha;
      if (t.kind === 'wolf') drawWolf(ctx, cx, inY, laneW, false);
      else drawThief(ctx, cx, inY, laneW, t.hurt, t.took);
      ctx.globalAlpha = 1;
      continue;
    }
    const y = l.yWall + (1 - t.climb) * l.wallH * 0.7;
    if (t.kind === 'thief') {
      ctx.strokeStyle = 'rgba(200, 180, 140, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + 3, l.yWall - 4);
      ctx.lineTo(cx + 3, y);
      ctx.stroke();
      drawThief(ctx, cx, y, laneW, t.hurt, false);
    } else drawWolf(ctx, cx, y, laneW, false);
  }
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
      const at = postXY(l, sec.id, slot, sec.posts.length);
      // On a narrow map, or with three posts, neighbours' names would run together: the middle post's name sits
      // a line lower (G3-4 review, 360 px). Names are outlined so they stay readable over the huts.
      const stagger = laneW < 110 || sec.posts.length >= 3;
      const labelY = at.y + l.wallH * 0.55 + 10 + (stagger && slot % 2 === 1 ? 11 : 0);
      // Figures grow a little on tall maps so posture and signs stay readable.
      const size = Math.max(1, Math.min(1.7, l.wallH / 26));
      ctx.font = '600 11px "Instrument Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      if (!p.watcher) {
        if (p.posted) {
          // Given to someone who is not there: an empty ring in the warning colour, their name faint beneath.
          // No figure, so the post never looks held (G3-4 phone review).
          const gone = f.phase === 'night';
          ctx.strokeStyle = gone ? 'rgba(232, 140, 110, 0.75)' : 'rgba(255, 240, 210, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.arc(at.x, at.y, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = gone ? 'rgba(232, 160, 130, 0.55)' : 'rgba(255, 243, 220, 0.38)';
          nameLabel(ctx, f.watchers.find((x) => x.id === p.posted)?.name ?? '', at.x, labelY);
          if (p.empty) {
            // Why the post stands empty, in one word, under the name (owner's playtest, 2026-10-05); for the
            // first sim half hour after they left, a ring widens from the post so the moment is caught.
            ctx.font = 'italic 600 10px "Instrument Sans", system-ui, sans-serif';
            ctx.fillStyle = 'rgba(240, 170, 140, 0.9)';
            const half = ctx.measureText(p.empty.why).width / 2 + 3;
            nameLabel(ctx, p.empty.why, Math.min(w - half, Math.max(half, at.x)), labelY + 12);
            ctx.font = '600 11px "Instrument Sans", system-ui, sans-serif';
            const age = f.minute - p.empty.since;
            if (age >= 0 && age < 30) {
              const k = (o.now % 1200) / 1200;
              ctx.strokeStyle = `rgba(240, 150, 110, ${(0.7 * (1 - k)).toFixed(3)})`;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.arc(at.x, at.y, 9 + 12 * k, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
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
      // Walking up to the post: drawn on the way until they stand there.
      const key = `w${watcher.id}`;
      touched.add(key);
      const way = tweenTo(ease, key, at.x / w, at.y / h, o.now, walkMs(f));
      if (moving(ease, key, o.now)) {
        drawWalker(ctx, way.x * w, way.y * h, lookOf(watcher.look), watcher.age, watcher.limp, o.now);
        continue;
      }
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
      nameLabel(ctx, watcher.name, at.x, labelY);
    }
  }

  // Watchers off the wall at night: small dim figures by the hall (left of the granary) or by their homes, who
  // walk there from wherever they were drawn.
  if (f.phase === 'night' || f.phase === 'dusk') {
    const gw = Math.max(80, Math.min(140, w * 0.24));
    let hall = 0;
    for (const wt of f.watchers) {
      if (wt.post !== null) continue;
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
      const key = `w${wt.id}`;
      touched.add(key);
      const way = tweenTo(ease, key, x / w, y / h, o.now, walkMs(f));
      if (moving(ease, key, o.now)) {
        drawWalker(ctx, way.x * w, way.y * h, lookOf(wt.look), wt.age, wt.limp, o.now);
        continue;
      }
      if (f.phase !== 'night' || (wt.place !== 'hall' && wt.place !== 'home')) continue;
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

  if (day) drawVillagers(ctx, l, f, drawnMinute(ease, f, o.now) / 1440);
  sweep(ease, touched);

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

function drawThief(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  laneW: number,
  hurt: boolean,
  sack = true,
): void {
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
  if (sack) {
    ctx.fillStyle = '#b39b74';
    ctx.beginPath();
    ctx.ellipse(7, 2, 4, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
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

/** Someone walking between places: a dim figure with a stride, read only as a shape in the dark. */
function drawWalker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: Look,
  age: AgeBand,
  limp: boolean,
  now: number,
): void {
  const stride = Math.sin(now / 110) * 2.2;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.translate(x, y);
  ctx.scale(0.8, 0.8);
  drawWatcher(ctx, 0, 0, look, {
    seen: false,
    posture: 'figure',
    signs: null,
    throwing: null,
    commanded: false,
    age,
    limp,
  });
  ctx.strokeStyle = '#2a2c3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1.5, 4);
  ctx.lineTo(-1.5 - stride, 8);
  ctx.moveTo(1.5, 4);
  ctx.lineTo(1.5 + stride, 8);
  ctx.stroke();
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
  // One hut per household, then the burned-out ones (owner's playtest, 2026-10-05: "Can I count ... the home
  // quantity?"). Huts fill the ground either side of the granary, in a second row when the first is full.
  const homes = Math.max(1, f.homes);
  const huts = homes + f.ruins;
  const band = Math.max(50, w * 0.12) + 14;
  const side = w / 2 - band;
  const perRow = Math.max(2, 2 * Math.floor(side / 40));
  const rows = huts > perRow ? 2 : 1;
  for (let n = 0; n < huts; n++) {
    const row = rows === 2 && n >= Math.ceil(huts / 2) ? 1 : 0;
    const inRow = rows === 2 ? (row === 0 ? Math.ceil(huts / 2) : huts - Math.ceil(huts / 2)) : huts;
    const k = row === 0 ? n : n - Math.ceil(huts / 2);
    // Alternate left and right of the granary, outward from it.
    const left = k % 2 === 0;
    const perSide = Math.ceil(inRow / 2);
    const j = Math.floor(k / 2);
    const step = side / Math.max(1, perSide);
    const off = band + step * (j + 0.5) + (row === 1 ? step * 0.25 : 0);
    const x = left ? w / 2 - off : w / 2 + off;
    const y = top + (h - top) * (rows === 1 ? 0.62 : row === 0 ? 0.48 : 0.86);
    const sc = Math.min(1, step / 36);
    if (n >= homes) {
      // Burned out: a charred frame, no roof.
      ctx.fillStyle = '#3b3029';
      ctx.fillRect(x - 12 * sc, y - 4 * sc, 24 * sc, 12 * sc);
      ctx.strokeStyle = '#2a211c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 11 * sc, y - 4 * sc);
      ctx.lineTo(x - 6 * sc, y - 14 * sc);
      ctx.moveTo(x + 11 * sc, y - 4 * sc);
      ctx.lineTo(x + 8 * sc, y - 11 * sc);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#c9975b';
    ctx.fillRect(x - 12 * sc, y - 8 * sc, 24 * sc, 16 * sc);
    ctx.fillStyle = '#a8733d';
    ctx.beginPath();
    ctx.moveTo(x - 15 * sc, y - 8 * sc);
    ctx.lineTo(x, y - 18 * sc);
    ctx.lineTo(x + 15 * sc, y - 8 * sc);
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
  // Better seed from the fair shows as taller, closer rows until the harvest takes it in.
  if (f.seed && f.season !== 'autumn') height += 2;
  ctx.strokeStyle = colour;
  ctx.lineWidth = f.seed ? 1.8 : 1.4;
  const rows = Math.max(3, Math.floor((bottom - top) / (f.seed ? 9 : 12)));
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

/**
 * By day: every villager in the village near their home, wandering a little on sim time (`days`, continuous between
 * frames), so their pace shows the speed: a slow amble at Slow, a bustle at Seasons. Names only on roomy maps.
 */
function drawVillagers(ctx: CanvasRenderingContext2D, l: Layout, f: Frame, days: number): void {
  const top = l.yVillage;
  const span = l.h - top;
  if (span < 30) return;
  const size = Math.max(0.9, Math.min(1.5, span / 150));
  const crowd = f.villagers.length > 14;
  for (const v of f.villagers) {
    const i = SECTION_IDS.indexOf(v.home);
    const hx = hashId(v.id);
    const hy = hashId(`${v.id}:y`);
    // About one stroll to and fro every eight days, each villager at their own phase.
    const drift = Math.sin(days * ((2 * Math.PI) / 8) + hx * 40) * Math.min(14, l.laneW * 0.1);
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

/** A name on the map, outlined in the night colour so it reads over huts and wall. Uses the current fill and font. */
function nameLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(14, 16, 32, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}
