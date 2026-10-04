/**
 * Canvas 2D drawing of the wall at night. Lanes run from the treeline (top) to the wall (bottom third), the
 * village sits below. The lantern lights one lane; every other lane is dark and shows only moving grass and
 * sounds at the foot of the wall. No numbers are drawn. The layout flexes to any size; positions ease between
 * sim minutes on the page's own animation clock.
 */
import { SECTION_IDS, type SectionId, type WatcherId } from '../sim/config.ts';
import type { Frame } from '../sim/view.ts';
import { LIGHT_EDGE } from '../sim/view.ts';

export interface Layout {
  w: number;
  h: number;
  laneW: number;
  yTree: number;
  yWall: number;
  wallH: number;
  yVillage: number;
}

export function layoutFor(w: number, h: number): Layout {
  const yTree = Math.round(h * 0.13);
  const yWall = Math.round(h * 0.7);
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
  for (const sec of f.sections) {
    for (const [slot, p] of sec.posts.entries()) {
      const at = postXY(l, sec.id, slot);
      if (Math.hypot(at.x - x, at.y - y) < 22) return { kind: 'post', post: p.id };
    }
  }
  const i = Math.floor(x / l.laneW);
  const section = SECTION_IDS[Math.max(0, Math.min(SECTION_IDS.length - 1, i))];
  if (!section || y > l.h) return null;
  return { kind: 'section', section };
}

const LOOK: Record<WatcherId, { body: string; scarf: string }> = {
  tamar: { body: '#7a5c44', scarf: '#d9c9a8' },
  kian: { body: '#4f6a7a', scarf: '#c2703f' },
  mara: { body: '#6b4f6b', scarf: '#8e3b46' },
};

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

  // Ground and sky.
  const sky = ctx.createLinearGradient(0, 0, 0, l.yTree);
  sky.addColorStop(0, f.phase === 'dusk' || f.phase === 'goal' ? '#3a2f4f' : '#0d1022');
  sky.addColorStop(1, f.phase === 'dusk' || f.phase === 'goal' ? '#c7794a' : '#1b2140');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, l.yTree);
  ctx.fillStyle = '#3c4a34';
  ctx.fillRect(0, l.yTree, w, l.yWall - l.yTree);

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
  ctx.fillStyle = '#1f2a1d';
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
  {
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
  if (f.lit) {
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
  const glow = ctx.createRadialGradient(lx, l.yWall, 2, lx, l.yWall, laneW * 0.8);
  glow.addColorStop(0, 'rgba(255, 210, 130, 0.55)');
  glow.addColorStop(1, 'rgba(255, 210, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lx - laneW, l.yWall - laneW, laneW * 2, laneW * 2);

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
    ctx.strokeStyle = 'rgba(200, 214, 170, 0.55)';
    ctx.lineWidth = 1.4;
    for (let s = -1; s <= 1; s++) {
      const sway = Math.sin(o.now / 140 + m.id + s) * 3;
      ctx.beginPath();
      ctx.moveTo(cx + s * 5, y + 5);
      ctx.quadraticCurveTo(cx + s * 5 + sway, y - 2, cx + s * 5 + sway * 1.6, y - 7);
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
    const isLit = sec.id === f.lit;
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

  // Posts and watchers.
  for (const sec of f.sections) {
    const isLit = sec.id === f.lit;
    for (const [slot, p] of sec.posts.entries()) {
      const at = postXY(l, sec.id, slot);
      if (!p.watcher) {
        ctx.strokeStyle = o.selected ? 'rgba(255, 222, 160, 0.9)' : 'rgba(255, 240, 210, 0.35)';
        ctx.lineWidth = o.selected ? 2 : 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(at.x, at.y, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }
      const watcher = f.watchers.find((x) => x.id === p.watcher);
      drawWatcher(ctx, at.x, at.y, p.watcher, isLit || f.phase !== 'night', watcher?.throwing ?? null);
      if (watcher?.throwing && watcher.target !== null) {
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
      ctx.fillText(watcher?.name ?? '', at.x, at.y + l.wallH * 0.55 + 10);
    }
  }

  // The Keeper with the lantern, below the wall.
  if (f.phase !== 'goal') {
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

function drawWatcher(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  id: WatcherId,
  seen: boolean,
  throwing: 'hit' | 'miss' | null,
): void {
  const look = LOOK[id];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = seen ? look.body : '#2a2c3a';
  ctx.fillRect(-4, -8, 8, 12);
  ctx.fillStyle = seen ? '#b07c5a' : '#2a2c3a';
  ctx.beginPath();
  ctx.arc(0, -11, 4, 0, Math.PI * 2);
  ctx.fill();
  if (seen) {
    ctx.fillStyle = look.scarf;
    ctx.fillRect(-4, -8, 8, 2.5);
  }
  if (throwing) {
    ctx.strokeStyle = seen ? look.body : '#2a2c3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(3, -6);
    ctx.lineTo(8, -15);
    ctx.stroke();
  }
  ctx.restore();
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
