import { memo, type RefObject, useEffect, useRef, useState } from 'react';
import { MAP, PLACES, type PlaceId, placeAt } from '../sim/map.ts';
import type { VillagerId } from '../sim/world-types.ts';
import type { BubbleManager, ShownBubble } from './bubbles.ts';
import type { Frame } from './contract.ts';
import { layoutSceneTargets, type MapPoint, type MapView, mapPoint, mapView } from './map-view.ts';
import { latestPersonOrder, personOrderStatus } from './order-status.ts';
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
import { wellWords as settingWords } from './words.ts';

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
  /** Ordinary orders offered directly at their scene destinations. */
  scenePlaces?: { placeId: PlaceId; label: string; answer: string }[];
  onSelect(id: VillagerId): void;
  onPlace(place: PlaceId): void;
  onMorePlaces?(): void;
  onShowVillage?(): void;
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
    const card = latestPersonOrder(curr.cards, p.id);
    person.orderStatus = card ? personOrderStatus(card, side, true) : undefined;
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

function utteranceKey(sb: ShownBubble): string {
  return `${sb.bubble.id}:${sb.bubble.minute}`;
}

export const Pane = memo(function Pane(props: PaneProps) {
  const { side, store, bubbles } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const placeEls = useRef(new Map<PlaceId, HTMLButtonElement>());
  const placeLinks = useRef(new Map<PlaceId, SVGLineElement>());
  const overflowRef = useRef<PlaceId[]>([]);
  const [overflowPlaces, setOverflowPlaces] = useState<PlaceId[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;
  const bubbleEls = useRef(new Map<string, HTMLButtonElement>());
  const dismissed = useRef(new Set<string>());
  const [shown, setShown] = useState<ShownBubble[]>([]);
  const people = useRef<DrawPerson[]>([]);
  const labels = useRef<PersonLabel[]>([]);
  const view = useRef<MapView>({ x: 0, y: 0, width: LOGICAL_W, height: LOGICAL_H });
  const pan = useRef<MapPoint | null>(null);
  const scenePress = useRef<{
    pointerId: number;
    placeId: PlaceId;
    x: number;
    y: number;
    send(place: PlaceId): void;
  } | null>(null);
  type Choice = { person: VillagerId; label: string } | { place: PlaceId; label: string };
  const drag = useRef<{
    x: number;
    y: number;
    pointerId: number;
    start: MapView;
    moved: boolean;
    hits: Choice[];
    choose(choice: Choice): void;
  } | null>(null);
  const [panned, setPanned] = useState(false);
  const localFollow = useRef(false);
  const displayedSize = useRef<{ width: number; height: number } | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const choiceAction = useRef<((choice: Choice) => void) | null>(null);
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
      const tracking = p.following !== false || localFollow.current || p.frameSelection === true;
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
                (p.scenePlaces?.length ?? 0) > 0,
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
            visibleBounds: { x: box.x, y: box.y, w: box.width, h: box.height },
            focusLabels: Boolean(p.destination),
          }) ?? [];
      }

      const occupied: { x: number; y: number; w: number; h: number }[] = [];
      // A reply may move or hide, but must not cover the person being addressed.
      for (const person of people.current) {
        const point = mapPoint(headAnchor(person.x, person.y, person.id), view.current, cssW, cssH);
        occupied.push({ x: point.x - 22, y: point.y - 10, w: 44, h: 48 });
      }
      for (const label of labels.current) {
        const point = mapPoint(label, view.current, cssW, cssH);
        occupied.push({
          x: point.x,
          y: point.y,
          w: (label.w * cssW) / view.current.width,
          h: (label.h * cssH) / view.current.height,
        });
      }
      if (bubbles) {
        if (f !== lastFrame) {
          bubbles.ingest(f.human, now);
          lastFrame = f;
        }
        const list = latestReply(bubbles.tick(now)).filter((sb) => !dismissed.current.has(utteranceKey(sb)));
        if (bubbles.version !== lastVersion) {
          lastVersion = bubbles.version;
          setShown(list);
        }

        const placed = occupied;
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

          items.push({
            el,
            kind: sb.bubble.kind,
            ax: anchor.x,
            ay: anchor.y,
            bw: el.offsetWidth,
            bh: el.offsetHeight,
          });
        }
        for (const { el, ax, ay, bw, bh } of items) {
          const x = Math.max(4, Math.min(cssW - bw - 4, ax - bw / 2));
          const candidates = [
            { x, y: ay - bh - 6 },
            { x, y: ay + 42 },
            { x: ax + 26, y: ay - bh / 2 },
            { x: ax - bw - 26, y: ay - bh / 2 },
          ];
          // Search the remaining scene too. In a short sheet scene the persistent reply
          // lives in the person's order panel; it must not bury workers to stay on the map.
          for (let cy = 4; cy + bh <= cssH - 4; cy += 12) {
            for (let cx = 4; cx + bw <= cssW - 4; cx += 12) candidates.push({ x: cx, y: cy });
          }
          const position = candidates.find(
            (r) =>
              r.x >= 4 &&
              r.y >= 4 &&
              r.x + bw <= cssW - 4 &&
              r.y + bh <= cssH - 4 &&
              !placed.some((o) => r.x < o.x + o.w && r.x + bw > o.x && r.y < o.y + o.h && r.y + bh > o.y),
          );
          if (!position) {
            el.style.visibility = 'hidden';
            continue;
          }
          el.style.visibility = '';
          const { x: placedX, y } = position;
          placed.push({ x: placedX, y, w: bw, h: bh });
          el.style.transform = `translate(${placedX.toFixed(1)}px, ${y.toFixed(1)}px)`;
          const tail = Math.max(10, Math.min(bw - 10, ax - placedX));
          el.style.setProperty('--tail', `${tail.toFixed(1)}px`);
        }
      }
      // Speech claims space first. Place actions then avoid every visible worker and each other.
      for (const person of people.current) {
        const point = mapPoint(headAnchor(person.x, person.y, person.id), view.current, cssW, cssH);
        occupied.push({ x: point.x - 24, y: point.y - 12, w: 48, h: 55 });
      }
      for (const label of labels.current) {
        const point = mapPoint({ x: label.x, y: label.y }, view.current, cssW, cssH);
        occupied.push({
          x: point.x - 3,
          y: point.y - 3,
          w: (label.w * cssW) / view.current.width + 6,
          h: (label.h * cssH) / view.current.height + 6,
        });
      }
      const targets = (p.scenePlaces ?? []).flatMap((item) => {
        const place = PLACES.find((q) => q.id === item.placeId);
        const el = placeEls.current.get(item.placeId);
        if (!place || !el) return [];
        const point = mapPoint(
          { x: (place.x + place.w / 2) * 32, y: (place.y + place.h / 2) * 32 },
          view.current,
          cssW,
          cssH,
        );
        return [{ id: item.placeId, ...point, w: el.offsetWidth || 108, h: el.offsetHeight || 60 }];
      });
      // Keep the last painted card geometry until this press ends. Camera and people may
      // continue moving; they cannot replace the destination beneath a held finger.
      if (scenePress.current || drag.current) return;
      const positions = layoutSceneTargets(cssW, cssH, targets, occupied);
      const overflow: PlaceId[] = [];
      for (const target of targets) {
        const el = placeEls.current.get(target.id);
        if (!el) continue;
        const position = positions.get(target.id);
        el.style.visibility = position ? '' : 'hidden';
        const link = placeLinks.current.get(target.id);
        if (position) {
          el.style.transform = `translate(${position.x}px, ${position.y}px)`;
          if (link) {
            link.style.visibility = '';
            link.setAttribute('x1', String(target.x));
            link.setAttribute('y1', String(target.y));
            link.setAttribute('x2', String(position.x + target.w / 2));
            link.setAttribute('y2', String(position.y + target.h / 2));
          }
        } else {
          if (link) link.style.visibility = 'hidden';
          overflow.push(target.id);
        }
      }
      if (overflow.join() !== overflowRef.current.join()) {
        overflowRef.current = overflow;
        setOverflowPlaces(overflow);
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
    choiceAction.current?.(choice);
    choiceAction.current = null;
  };

  // Resolve only against the last painted people, labels and camera at pointerdown.
  const targetsAt = (e: React.PointerEvent<HTMLCanvasElement>): Choice[] => {
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
    if (props.selectedId && personIds.size === 0) {
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
    return hits;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const held = drag.current;
    if (!held || held.pointerId !== e.pointerId) return;
    drag.current = null;
    if (held.moved || Math.hypot(e.clientX - held.x, e.clientY - held.y) > 8) return;
    choiceAction.current = held.choose;
    if (held.hits.length > 1) setChoices(held.hits);
    else {
      setChoices([]);
      const hit = held.hits[0];
      if (hit) choose(hit);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const held = drag.current;
    if (held && held.pointerId !== e.pointerId) return;
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
    <div className={`pane-canvas pane-canvas-${side}`}>
      <div className="map-controls">
        {props.onShowVillage && (
          <button
            type="button"
            onClick={() => {
              pan.current = null;
              localFollow.current = false;
              setChoices([]);
              setPanned(false);
              props.onShowVillage?.();
            }}
          >
            Show {side === 'human' ? 'Human' : 'Classic'} village
          </button>
        )}
        <span className="map-hint">Drag to look around</span>
        {(panned || (props.following === false && !props.frameSelection)) && (
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
            {settingWords(props.selectedId ? `Follow ${shortName(props.selectedId)}` : 'Centre village')}
          </button>
        )}
      </div>
      <div className="map-viewport" ref={wrap}>
        <canvas
          ref={canvas}
          aria-label={side === 'classic' ? 'Classic village map' : 'Human village map'}
          onPointerDown={(e) => {
            if (drag.current) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              pointerId: e.pointerId,
              start: view.current,
              moved: false,
              hits: targetsAt(e),
              choose: (choice) => {
                if ('person' in choice) props.onSelect(choice.person);
                else props.onPlace(choice.place);
              },
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerCancel={(e) => {
            if (drag.current?.pointerId === e.pointerId) drag.current = null;
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
                {settingWords(choice.label)}
              </button>
            ))}
            <button type="button" onClick={() => setChoices([])}>
              Cancel
            </button>
          </fieldset>
        )}
        {props.selectedId && props.scenePlaces && (
          <section className="scene-place-layer" aria-label="Order at a place">
            <svg className="scene-place-links" aria-hidden="true" width="100%" height="100%">
              {props.scenePlaces.map((item) => (
                <line
                  key={item.placeId}
                  ref={(el) => {
                    if (el) placeLinks.current.set(item.placeId, el);
                    else placeLinks.current.delete(item.placeId);
                  }}
                  style={{ visibility: 'hidden' }}
                />
              ))}
            </svg>
            {props.scenePlaces.map((item) => (
              <button
                key={item.placeId}
                type="button"
                className="scene-place"
                style={{ visibility: 'hidden' }}
                data-place={item.placeId}
                ref={(el) => {
                  if (el) placeEls.current.set(item.placeId, el);
                  else placeEls.current.delete(item.placeId);
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  scenePress.current = {
                    pointerId: e.pointerId,
                    placeId: item.placeId,
                    x: e.clientX,
                    y: e.clientY,
                    send: props.onPlace,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerUp={(e) => {
                  const pressed = scenePress.current;
                  scenePress.current = null;
                  if (!pressed || pressed.pointerId !== e.pointerId || pressed.placeId !== item.placeId)
                    return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (
                    Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) <= 8 &&
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                  )
                    pressed.send(pressed.placeId);
                }}
                onPointerCancel={() => {
                  scenePress.current = null;
                }}
                onLostPointerCapture={() => {
                  scenePress.current = null;
                }}
                onClick={(e) => {
                  // Keyboard and assistive activation have no pointer transaction.
                  if (e.detail === 0) props.onPlace(item.placeId);
                }}
                onPointerEnter={() => props.onHoverPlace(item.placeId)}
                onPointerLeave={() => props.onHoverPlace(null)}
              >
                <strong>{settingWords(item.label)}</strong>
                <span>{settingWords(item.answer)}</span>
                {item.placeId === 'site' && (
                  <span>
                    Short building task, not a finished roof. Continuing on their own is not guaranteed.
                  </span>
                )}
                {item.placeId === 'kitchen' && (
                  <span>Ordinary meals can be enough below the separate twelve-meal storm reserve.</span>
                )}
              </button>
            ))}
          </section>
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
                title={settingWords(`Select ${shortName(sb.bubble.personId)}`)}
                aria-label={settingWords(
                  sb.phase === 'typing'
                    ? `${shortName(sb.bubble.personId)} is answering`
                    : `${shortName(sb.bubble.personId)}: “${sb.bubble.text}” Select worker`,
                )}
              >
                <BubbleBody shown={sb} />
              </button>
            ))}
          </div>
        )}
      </div>
      {shown
        .filter((sb) => sb.bubble.kind !== 'thought' && sb.phase === 'line')
        .map((sb) => (
          <button
            type="button"
            key={utteranceKey(sb)}
            aria-label={`Dismiss ${shortName(sb.bubble.personId)} speech from minute ${sb.bubble.minute}`}
            onClick={() => {
              dismissed.current.add(utteranceKey(sb));
              setShown((current) => current.filter((item) => utteranceKey(item) !== utteranceKey(sb)));
            }}
          >
            Dismiss {shortName(sb.bubble.personId)}’s speech · minute {sb.bubble.minute}
          </button>
        ))}
      {props.selectedId && (props.scenePlaces?.length ?? 0) > 0 && props.onMorePlaces && (
        <button type="button" className="scene-more-places" onClick={props.onMorePlaces}>
          {settingWords(
            overflowPlaces.length > 0 ? `More places (${overflowPlaces.length})` : 'Choose place',
          )}
        </button>
      )}
      {props.selectedId && overflowPlaces.length > 0 && !props.onMorePlaces && (
        <details className="scene-place-overflow">
          <summary>More places ({overflowPlaces.length})</summary>
          <div>
            {props.scenePlaces
              ?.filter((item) => overflowPlaces.includes(item.placeId))
              .map((item) => (
                <button key={item.placeId} type="button" onClick={() => props.onPlace(item.placeId)}>
                  <strong>{settingWords(item.label)}</strong>
                  <span>{settingWords(item.answer)}</span>
                  {item.placeId === 'site' && (
                    <span>
                      Short building task, not a finished roof. Continuing on their own is not guaranteed.
                    </span>
                  )}
                  {item.placeId === 'kitchen' && (
                    <span>Ordinary meals can be enough below the separate twelve-meal storm reserve.</span>
                  )}
                </button>
              ))}
          </div>
        </details>
      )}
    </div>
  );
});

/** The line already contains the counter-offer ("After I pray Fajr, then I will." / "after I pray Fajr"). */
export function saysIt(text: string, counter: string): boolean {
  const words = text.toLowerCase();
  const tail = counter.toLowerCase();
  if (words.includes(tail)) return true;
  return (
    (tail === 'when the store runs low' && words.includes('when it runs low')) ||
    (tail === 'when there’s timber' && words.includes('no timber to build with')) ||
    (tail === 'at the next prayer' && words.includes('isn’t prayer time'))
  );
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
        <s>{settingWords(b.orderText ?? b.text)}</s> …fine.
      </span>
    );
  }
  return (
    <span>
      {settingWords(b.text)}
      {b.counterOffer && !saysIt(b.text, b.counterOffer) && <em> {settingWords(b.counterOffer)}</em>}
    </span>
  );
}

/** Only the most recent spoken answer belongs in the scene; the parent owns answer history. */
export function latestReply(list: ShownBubble[]): ShownBubble[] {
  const replies = list.filter((item) => item.bubble.kind !== 'thought');
  const latest = replies.reduce<ShownBubble | undefined>(
    (last, item) => (!last || item.bubble.minute >= last.bubble.minute ? item : last),
    undefined,
  );
  return latest ? [latest] : [];
}
