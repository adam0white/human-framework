import { memo, type RefObject, useEffect, useRef, useState } from 'react';
import { MAP, PLACES, type PlaceId, placeAt } from '../sim/map.ts';
import type { VillagerId } from '../sim/world-types.ts';
import type { BubbleManager, ShownBubble } from './bubbles.ts';
import type { Frame } from './contract.ts';
import { type MapPoint, type MapView, mapPoint, mapView } from './map-view.ts';
import { shortName } from './parts.tsx';
import {
  type DrawPerson,
  drawScene,
  headAnchor,
  LOGICAL_H,
  LOGICAL_W,
  type PersonLabel,
  type Side,
} from './renderer.ts';
import type { FrameStore } from './useColony.ts';

export interface PaneProps {
  side: Side;
  store: RefObject<FrameStore>;
  selectedId: VillagerId | null;
  hoverPlace: PlaceId | null;
  /** Prepared destination while composing; confirmed destination while watching. Hover never moves the camera. */
  destination: PlaceId | null;
  /** Track only after confirmation or an explicit Follow. Composition preserves the displayed camera. */
  following?: boolean;
  /** Fit worker and destination inside the phone scene after the sheet consumes its inset. */
  frameSelection?: boolean;
  /** Shared stage scene inset; invalidates selection framing when a sheet snaps. */
  sceneHeight?: number;
  /** Increment to discard a manual pan and frame a confirmed order. */
  followKey?: number;
  /** Increment whenever a picker opens to hold the displayed camera, including after local Follow. */
  holdKey?: number;
  onSelect(id: VillagerId): void;
  onPlace(place: PlaceId): void;
  onHoverPlace(place: PlaceId | null): void;
  bubbles?: BubbleManager;
}

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
    person.name = p.name;
    person.label = p.label;
    if ('action' in p) person.action = p.action;
    if ('placeId' in p) person.placeId = p.placeId;
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

/** Hit radius in logical px: 18, widened on touch to at least 22 CSS px however small the map is drawn. */
function hitRadius(e: React.PointerEvent): number {
  if (e.pointerType !== 'touch') return 18;
  const w = (e.currentTarget as HTMLElement).getBoundingClientRect().width;
  return w > 0 ? Math.max(18, (22 * LOGICAL_W) / w) : 18;
}

function hitPeople(people: DrawPerson[], lx: number, ly: number, radius = 18): VillagerId[] {
  const hits: VillagerId[] = [];
  for (const p of people) {
    if (p.state === 'asleep' || p.carriedBy) continue;
    const px = (p.x + 0.5) * 32;
    const py = (p.y + 0.5) * 32 - 6;
    const d = (px - lx) ** 2 + (py - ly) ** 2;
    if (d <= radius * radius) hits.push(p.id);
  }
  return hits;
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
  const labels = useRef<PersonLabel[]>([]);
  const view = useRef<MapView>({ x: 0, y: 0, width: LOGICAL_W, height: LOGICAL_H });
  const pan = useRef<MapPoint | null>(null);
  const drag = useRef<{ x: number; y: number; start: MapView; moved: boolean } | null>(null);
  const [panned, setPanned] = useState(false);
  const localFollow = useRef(false);
  const displayedSize = useRef<{ width: number; height: number } | null>(null);
  type Choice = { person: VillagerId; label: string } | { place: PlaceId; label: string };
  const [choices, setChoices] = useState<Choice[]>([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A confirmed order explicitly resets the camera.
  useEffect(() => {
    pan.current = null;
    localFollow.current = false;
    setPanned(false);
  }, [props.followKey, props.sceneHeight]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new composition ends a local Follow override.
  useEffect(() => {
    if (props.following === false) localFollow.current = false;
    setChoices([]);
  }, [props.selectedId, props.destination, props.following, props.holdKey]);

  useEffect(() => {
    const c = canvas.current;
    const w = wrap.current;
    if (!c || !w) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const rect = w.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
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
      destination: PlaceId | null;
      following: boolean | undefined;
      followKey: number | undefined;
      tracking: boolean;
      moving: boolean;
      pan: MapPoint | null;
    } | null = null;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const s = store.current;
      const f = s.curr;
      if (!f || cssW <= 0 || cssH <= 0) return;
      const p = live.current;
      const cooking = cookingNow(f, side);
      const tracking =
        p.following !== false ||
        localFollow.current ||
        (p.frameSelection === true && window.matchMedia('(max-width: 899px)').matches);
      // Moving people (interpolation), the hover outline, kitchen smoke, sleepers' z, lantern flicker and rain
      // animate on real time; anything else only changes with a new frame, a selection, a hover or a resize.
      const moving = s.prev !== null && now - s.at < s.interval;
      const animated =
        moving ||
        p.selectedId !== null ||
        pan.current !== null ||
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
        drawn.hoverPlace === p.hoverPlace &&
        drawn.destination === p.destination &&
        drawn.following === p.following &&
        drawn.followKey === p.followKey &&
        drawn.tracking === tracking &&
        drawn.pan === pan.current;
      if (!still) {
        dirty = false;
        drawn = {
          f,
          selectedId: p.selectedId,
          hoverPlace: p.hoverPlace,
          destination: p.destination,
          following: p.following,
          followKey: p.followKey,
          tracking,
          moving,
          pan: pan.current,
        };
        const world = side === 'classic' ? f.classicWorld : f.humanWorld;
        people.current = interpolate(s, side, now);
        const selected = people.current.find((q) => q.id === p.selectedId);
        const who = selected?.carriedBy ? people.current.find((q) => q.id === selected.carriedBy) : selected;
        const target = PLACES.find((q) => q.id === p.destination);
        const previousSize = displayedSize.current;
        const box =
          previousSize && (!tracking || pan.current)
            ? {
                x: pan.current?.x ?? view.current.x,
                y: pan.current?.y ?? view.current.y,
                width: (view.current.width * cssW) / previousSize.width,
                height: (view.current.height * cssH) / previousSize.height,
              }
            : mapView(
                cssW,
                cssH,
                tracking && who ? { x: (who.x + 0.5) * 32, y: (who.y + 0.5) * 32 } : null,
                tracking && target
                  ? { x: (target.x + target.w / 2) * 32, y: (target.y + target.h / 2) * 32 }
                  : null,
                pan.current,
              );
        view.current = box;
        displayedSize.current = { width: cssW, height: cssH };
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = side === 'human' ? '#d6caa9' : '#222c38';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.setTransform(
          c.width / box.width,
          0,
          0,
          c.height / box.height,
          (-box.x * c.width) / box.width,
          (-box.y * c.height) / box.height,
        );
        labels.current =
          drawScene(ctx, {
            side,
            minute: f.minute,
            darkness: f.darkness,
            weather: f.weather,
            world,
            people: people.current,
            selectedId: p.selectedId,
            hoverPlace: p.hoverPlace,
            showPlaceLabels: true,
            realTime: now,
            cooking,
            labelScale: box.width / cssW,
          }) ?? [];
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
          const anchor = mapPoint(a, view.current, cssW, cssH);
          if (anchor.x < 0 || anchor.x > cssW || anchor.y < 0 || anchor.y > cssH) {
            el.style.visibility = 'hidden';
            continue;
          }
          items.push({
            el,
            kind: sb.bubble.kind,
            ax: anchor.x,
            ay: anchor.y,
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
          y = Math.max(4, Math.min(cssH - bh - 4, y));
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
      lx: view.current.x + ((e.clientX - r.left) * view.current.width) / r.width,
      ly: view.current.y + ((e.clientY - r.top) * view.current.height) / r.height,
    };
  };

  const choose = (choice: Choice) => {
    setChoices([]);
    if ('person' in choice) props.onSelect(choice.person);
    else props.onPlace(choice.place);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasDrag = drag.current?.moved;
    drag.current = null;
    if (wasDrag) return;
    const { lx, ly } = toLogical(e);
    const radius = (hitRadius(e) * view.current.width) / LOGICAL_W;
    const personIds = new Set(hitPeople(people.current, lx, ly, radius));
    for (const label of labels.current) {
      if (lx >= label.x && lx <= label.x + label.w && ly >= label.y && ly <= label.y + label.h)
        personIds.add(label.id);
    }
    const hits: Choice[] = [...personIds].map((person) => ({
      person,
      label: shortName(person),
    }));
    if (props.selectedId) {
      for (const place of PLACES) {
        const rectangles = [
          { x: place.x, y: place.y, w: place.w, h: place.h },
          ...(place.solid ? place.spots.map((s) => ({ ...s, w: 1, h: 1 })) : []),
        ];
        if (
          rectangles.some((r) => {
            const dx = Math.max(r.x * 32 - lx, 0, lx - (r.x + r.w) * 32);
            const dy = Math.max(r.y * 32 - ly, 0, ly - (r.y + r.h) * 32);
            return dx * dx + dy * dy <= radius * radius;
          })
        )
          hits.push({ place: place.id, label: place.label });
      }
    }
    if (hits.length > 1) setChoices(hits);
    else {
      setChoices([]);
      const hit = hits[0];
      if (hit) choose(hit);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const held = drag.current;
    if (held && e.buttons) {
      const dx = e.clientX - held.x;
      const dy = e.clientY - held.y;
      if (Math.hypot(dx, dy) > 8) held.moved = true;
      if (held.moved) {
        const rect = e.currentTarget.getBoundingClientRect();
        pan.current = {
          x: held.start.x - (dx * held.start.width) / rect.width,
          y: held.start.y - (dy * held.start.height) / rect.height,
        };
        setPanned(true);
      }
      return;
    }
    if (e.pointerType === 'touch') return;
    const { lx, ly } = toLogical(e);
    const who = hitPeople(people.current, lx, ly, (hitRadius(e) * view.current.width) / LOGICAL_W).length > 0;
    const label = labels.current.some((r) => lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h);
    e.currentTarget.style.cursor =
      who || label || (props.selectedId && placeUnder(lx, ly)) ? 'pointer' : 'default';
    const pl = props.selectedId ? placeUnder(lx, ly) : null;
    if (pl !== props.hoverPlace) props.onHoverPlace(pl);
  };

  return (
    <div className={`pane-canvas pane-canvas-${side}`} ref={wrap}>
      <span className="map-hint">Drag to look around</span>
      <canvas
        ref={canvas}
        aria-label={side === 'classic' ? 'Classic village map' : 'Human village map'}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, start: view.current, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerUp={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onPointerMove={onPointerMove}
        onPointerLeave={() => props.hoverPlace && props.onHoverPlace(null)}
      />
      {choices.length > 1 && (
        <fieldset className="map-choices" aria-label="Choose map target">
          <legend>Choose a person or place</legend>
          {choices.map((choice) => (
            <button
              type="button"
              key={'person' in choice ? choice.person : choice.place}
              onClick={() => choose(choice)}
            >
              {choice.label}
            </button>
          ))}
          <button type="button" onClick={() => setChoices([])}>
            Cancel
          </button>
        </fieldset>
      )}
      {(panned || props.following === false) && (
        <button
          type="button"
          className="map-follow"
          onClick={() => {
            pan.current = null;
            localFollow.current = true;
            setChoices([]);
            setPanned(false);
          }}
        >
          {props.selectedId ? `Follow ${shortName(props.selectedId)}` : 'Centre village'}
        </button>
      )}
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
              onClick={() => props.onSelect(sb.bubble.personId)}
              title={`Select ${shortName(sb.bubble.personId)}`}
              aria-label={
                sb.phase === 'typing'
                  ? `${shortName(sb.bubble.personId)} is answering`
                  : `${shortName(sb.bubble.personId)}: “${sb.bubble.text}” Select worker`
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
