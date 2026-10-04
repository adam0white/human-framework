import { memo, type RefObject, useEffect, useRef, useState } from 'react';
import type { Bubble } from '../sim/human-side.ts';
import { MAP, PLACES, type PlaceId, placeAt } from '../sim/map.ts';
import type { VillagerId } from '../sim/world-types.ts';
import type { BubbleManager, ShownBubble } from './bubbles.ts';
import type { Frame } from './contract.ts';
import { shortName } from './parts.tsx';
import { type DrawPerson, drawScene, headAnchor, LOGICAL_H, LOGICAL_W, type Side } from './renderer.ts';
import type { FrameStore } from './useColony.ts';

export interface PaneProps {
  side: Side;
  store: RefObject<FrameStore>;
  selectedId: VillagerId | null;
  hoverPlace: PlaceId | null;
  onSelect(id: VillagerId): void;
  onPlace(place: PlaceId): void;
  onHoverPlace(place: PlaceId | null): void;
  /** Long press on a unit (any pointer): open the inspector. */
  onInspect(id: VillagerId): void;
  bubbles?: BubbleManager;
  onBubble?(b: Bubble): void;
}

const LONG_PRESS_MS = 500;

/** Interpolated people for one side. */
export function interpolate(store: FrameStore, side: Side, now: number): DrawPerson[] {
  const curr = store.curr;
  if (!curr) return [];
  const alpha = Math.max(0, Math.min(1, (now - store.at) / store.interval));
  const prevList = store.prev ? (side === 'classic' ? store.prev.classic : store.prev.human) : [];
  const list = side === 'classic' ? curr.classic : curr.human;
  return list.map((p) => {
    const q = prevList.find((r) => r.id === p.id);
    let x = p.x;
    let y = p.y;
    if (q && Math.abs(q.x - p.x) + Math.abs(q.y - p.y) <= 2) {
      x = q.x + (p.x - q.x) * alpha;
      y = q.y + (p.y - q.y) * alpha;
    }
    const person: DrawPerson = { id: p.id, x, y, state: p.state, carriedBy: p.carriedBy, hp: p.hp };
    if ('hunger' in p) person.hunger = p.hunger;
    if ('protest' in p) person.protest = p.protest;
    return person;
  });
}

/** Place under a logical point, counting each place's standing spots as part of it. */
export function placeUnder(lx: number, ly: number): PlaceId | null {
  const tx = Math.floor(lx / 32);
  const ty = Math.floor(ly / 32);
  const owned = placeAt(MAP, tx, ty);
  if (owned) return owned;
  for (const p of PLACES) {
    if (p.spots.some((s) => s.x === tx && s.y === ty) && p.solid) return p.id;
  }
  return null;
}

function hitPerson(people: DrawPerson[], lx: number, ly: number): VillagerId | null {
  let best: VillagerId | null = null;
  let bestD = 18 * 18;
  for (const p of people) {
    if (p.state === 'asleep' || p.carriedBy) continue;
    const px = (p.x + 0.5) * 32;
    const py = (p.y + 0.5) * 32 - 6;
    const d = (px - lx) ** 2 + (py - ly) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}

function cookingNow(frame: Frame | null, side: Side): boolean {
  if (!frame) return false;
  return side === 'classic'
    ? frame.classic.some((u) => u.label === 'Cooking')
    : frame.human.some((v) => v.action === 'cook' && v.state === 'working');
}

export const Pane = memo(function Pane(props: PaneProps) {
  const { side, store, bubbles } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;
  const bubbleEls = useRef(new Map<string, HTMLButtonElement>());
  const [shown, setShown] = useState<ShownBubble[]>([]);
  const people = useRef<DrawPerson[]>([]);

  useEffect(() => {
    const c = canvas.current;
    const w = wrap.current;
    if (!c || !w) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let cssW = 0;
    const resize = () => {
      const rect = w.getBoundingClientRect();
      cssW = rect.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
    };
    resize();
    // Resizing clears the canvas; a font arriving changes the labels. Either needs a fresh draw.
    let dirty = true;
    const ro = new ResizeObserver(() => {
      resize();
      dirty = true;
    });
    ro.observe(w);
    document.fonts?.ready.then(() => {
      dirty = true;
    });

    let raf = 0;
    let lastFrame: Frame | null = null;
    let lastVersion = -1;
    /** What the canvas last showed; a still scene with the same inputs is not drawn again (perf review V18). */
    let drawn: {
      f: Frame;
      selectedId: VillagerId | null;
      hoverPlace: PlaceId | null;
      moving: boolean;
    } | null = null;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const s = store.current;
      const f = s.curr;
      if (!f) return;
      const p = live.current;
      const cooking = cookingNow(f, side);
      // Moving people (interpolation), the hover outline, kitchen smoke, sleepers' z, lantern flicker and rain
      // animate on real time; anything else only changes with a new frame, a selection, a hover or a resize.
      const moving = s.prev !== null && now - s.at < s.interval;
      const animated =
        moving ||
        p.hoverPlace !== null ||
        (side === 'human' && (cooking || f.darkness > 0)) ||
        f.weather.kind === 'storm' ||
        f.weather.kind === 'squall' ||
        (side === 'classic' ? f.classic : f.human).some((u) => u.state === 'asleep');
      const still =
        !dirty &&
        !animated &&
        drawn !== null &&
        !drawn.moving && // one more draw once people settle, at their final spots
        drawn.f === f &&
        drawn.selectedId === p.selectedId &&
        drawn.hoverPlace === p.hoverPlace;
      if (!still) {
        dirty = false;
        drawn = { f, selectedId: p.selectedId, hoverPlace: p.hoverPlace, moving };
        const world = side === 'classic' ? f.classicWorld : f.humanWorld;
        people.current = interpolate(s, side, now);
        ctx.setTransform(c.width / LOGICAL_W, 0, 0, c.height / LOGICAL_H, 0, 0);
        drawScene(ctx, {
          side,
          minute: f.minute,
          darkness: f.darkness,
          weather: f.weather,
          world,
          people: people.current,
          selectedId: p.selectedId,
          hoverPlace: p.hoverPlace,
          showPlaceLabels: p.selectedId !== null,
          realTime: now,
          cooking,
        });
      }

      if (bubbles) {
        if (f !== lastFrame) {
          bubbles.ingest(f.human, now);
          lastFrame = f;
        }
        const list = bubbles.tick(now);
        if (bubbles.version !== lastVersion) {
          lastVersion = bubbles.version;
          setShown(list);
        }
        const k = cssW / LOGICAL_W;
        const placed: { x: number; y: number; w: number; h: number }[] = [];
        const ordered = [...list].sort(
          (p1, p2) => Number(p1.bubble.kind === 'thought') - Number(p2.bubble.kind === 'thought'),
        );
        // Read every size first, then place and write: interleaving reads with transform writes would force a
        // layout per bubble per frame.
        const items: {
          el: HTMLButtonElement;
          kind: string;
          ax: number;
          ay: number;
          bw: number;
          bh: number;
        }[] = [];
        for (const sb of ordered) {
          const el = bubbleEls.current.get(sb.bubble.id);
          const who = people.current.find((q) => q.id === sb.bubble.personId);
          if (!el || !who) continue;
          const a = headAnchor(who.x, who.y, who.id);
          items.push({
            el,
            kind: sb.bubble.kind,
            ax: a.x * k,
            ay: a.y * k,
            bw: el.offsetWidth,
            bh: el.offsetHeight,
          });
        }
        for (const { el, kind, ax, ay, bw, bh } of items) {
          const x = Math.max(4, Math.min(cssW - bw - 4, ax - bw / 2));
          let y = ay - bh - 6;
          // Verdicts stack upward past bubbles already placed this frame; a colliding thought
          // is hidden instead, so a crowd of idle thoughts never buries an answer.
          const overlaps = () =>
            placed.find((r) => x < r.x + r.w && x + bw > r.x && y < r.y + r.h && y + bh > r.y);
          if (kind === 'thought' && overlaps()) {
            el.style.visibility = 'hidden';
            continue;
          }
          el.style.visibility = '';
          for (let guard = 0; guard < 6; guard++) {
            const hit = overlaps();
            if (!hit) break;
            y = hit.y - bh - 3;
          }
          if (y < 4) {
            // No room above: drop below the head instead.
            y = Math.max(4, ay + 22);
          }
          placed.push({ x, y, w: bw, h: bh });
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          const tail = Math.max(10, Math.min(bw - 10, ax - x));
          el.style.setProperty('--tail', `${tail.toFixed(1)}px`);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [side, store, bubbles]);

  const toLogical = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      lx: ((e.clientX - r.left) * LOGICAL_W) / r.width,
      ly: ((e.clientY - r.top) * LOGICAL_H) / r.height,
    };
  };

  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const endPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
  };
  useEffect(
    () => () => {
      if (press.current) window.clearTimeout(press.current.timer);
    },
    [],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    endPress();
    const { lx, ly } = toLogical(e);
    const who = hitPerson(people.current, lx, ly);
    if (!who) {
      press.current = null;
      return;
    }
    const state = { timer: 0, x: e.clientX, y: e.clientY, fired: false };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      live.current.onInspect(who);
    }, LONG_PRESS_MS);
    press.current = state;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    endPress();
    const fired = press.current?.fired ?? false;
    press.current = null;
    if (fired) return;
    const { lx, ly } = toLogical(e);
    const who = hitPerson(people.current, lx, ly);
    if (who) {
      props.onSelect(who);
      return;
    }
    const pl = placeUnder(lx, ly);
    if (pl && props.selectedId) props.onPlace(pl);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = press.current;
    if (pr && !pr.fired && Math.abs(e.clientX - pr.x) + Math.abs(e.clientY - pr.y) > 10) {
      endPress();
      press.current = null;
    }
    if (e.pointerType === 'touch') return;
    const { lx, ly } = toLogical(e);
    const who = hitPerson(people.current, lx, ly);
    e.currentTarget.style.cursor = who || (props.selectedId && placeUnder(lx, ly)) ? 'pointer' : 'default';
    const pl = props.selectedId ? placeUnder(lx, ly) : null;
    if (pl !== props.hoverPlace) props.onHoverPlace(pl);
  };

  return (
    <div className={`pane-canvas pane-canvas-${side}`} ref={wrap}>
      <canvas
        ref={canvas}
        aria-label={side === 'classic' ? 'Classic village map' : 'Human village map'}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          endPress();
          press.current = null;
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerMove={onPointerMove}
        onPointerLeave={() => props.hoverPlace && props.onHoverPlace(null)}
      />
      {bubbles && (
        <div className="bubble-layer">
          {shown.map((sb) => (
            <button
              key={sb.bubble.id}
              type="button"
              className={`bubble bubble-${sb.bubble.kind} ${sb.phase === 'typing' ? 'is-typing' : ''}`}
              ref={(el) => {
                if (el) bubbleEls.current.set(sb.bubble.id, el);
                else bubbleEls.current.delete(sb.bubble.id);
              }}
              onClick={() => props.onBubble?.(sb.bubble)}
              title="Why?"
              aria-label={
                sb.phase === 'typing'
                  ? `${shortName(sb.bubble.personId)} is answering`
                  : `${shortName(sb.bubble.personId)}: “${sb.bubble.text}” Why?`
              }
            >
              <BubbleBody shown={sb} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

/** The line already contains the counter-offer ("After I pray Fajr, then I will." / "after I pray Fajr"). */
export function saysIt(text: string, counter: string): boolean {
  return text.toLowerCase().includes(counter.toLowerCase());
}

function BubbleBody({ shown }: { shown: ShownBubble }) {
  const b = shown.bubble;
  if (shown.phase === 'typing') {
    return (
      <span className="dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  }
  if (b.kind === 'complied') {
    return (
      <span>
        <s>{b.orderText ?? b.text}</s> …fine.
      </span>
    );
  }
  return (
    <span>
      {b.text}
      {b.counterOffer && !saysIt(b.text, b.counterOffer) && <em> {b.counterOffer}</em>}
    </span>
  );
}
