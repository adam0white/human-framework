/**
 * The map: a canvas sized to its box (ResizeObserver × device pixel ratio), redrawn every animation frame from
 * the latest frame. Taps become a post or a section; the parent decides what that means in this phase.
 */
import { useEffect, useRef } from 'react';
import type { WatcherId } from '../sim/config.ts';
import type { Frame } from '../sim/view.ts';
import { drawMap, type Hit, hitTest, isDay, type Layout, layoutFor, newEase } from './map.ts';

export function MapCanvas({
  frame,
  selected,
  onHit,
}: {
  frame: Frame;
  selected: WatcherId | null;
  onHit: (hit: Hit) => void;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const latest = useRef({ frame, selected });
  latest.current = { frame, selected };
  const layout = useRef<Layout>(layoutFor(320, 400));

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const ease = newEase();
    let dpr = 1;
    let size = { w: 320, h: 400 };
    const resize = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      cv.style.width = `${r.width}px`;
      cv.style.height = `${r.height}px`;
      size = { w: r.width, h: r.height };
    };
    const paint = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // By day the village takes more of the map; the layout follows the phase.
      layout.current = layoutFor(size.w, size.h, isDay(latest.current.frame));
      drawMap(ctx, layout.current, latest.current.frame, ease, { selected: latest.current.selected, now });
    };
    // Resizing a canvas clears it: paint again at once, so a resize or a load never shows a blank frame.
    const ro = new ResizeObserver(() => {
      resize();
      paint(performance.now());
    });
    ro.observe(el);
    resize();
    paint(performance.now());
    let raf = 0;
    const draw = (now: number) => {
      paint(now);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const label =
    frame.phase === 'night'
      ? `The wall at night. The lantern is ${frame.lit ? `at the ${frame.sections.find((s) => s.id === frame.lit)?.name}` : 'moving'}. Tap a section to carry it there.`
      : isDay(frame)
        ? `The village by day, ${frame.season}: the fields above the wall and the villagers below it.`
        : 'The wall at dusk. Pick a watcher, then tap a post.';

  return (
    <div className="w-mapbox" ref={box}>
      <canvas
        ref={canvas}
        className="w-canvas"
        role="img"
        aria-label={label}
        onPointerUp={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onHit(hitTest(layout.current, latest.current.frame, e.clientX - r.left, e.clientY - r.top));
        }}
      />
    </div>
  );
}
