/**
 * The real-time pulse every game shell sends its simulation: one `onTick(dtMs)` per animation frame. Real time
 * only paces the simulation; the sim steps whole sim minutes, so the tick schedule never changes outcomes.
 * Extracted for Game 3 from the copies in `colony/ui/useColony.ts` and `voice/ui/useVoice.ts` (quality review,
 * 2026-10-04 §4); Games 1–2 still carry their own copies.
 */
export function startTickLoop(onTick: (dtMs: number) => void): () => void {
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    // The first timestamp can precede `last`; a negative tick would run the clock backwards.
    const dt = Math.max(0, now - last);
    last = now;
    onTick(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
