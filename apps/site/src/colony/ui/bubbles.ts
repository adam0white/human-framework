/**
 * Real-time bubble minimums (spec §5): typing dots for at least 400 ms, then the line for at least 2.5 s,
 * regardless of sim speed. The worker's view says which bubble is current in sim time; this manager holds
 * each one on screen long enough to read and queues the next verdict behind it. Thoughts never queue.
 */
import type { Bubble, VillagerView } from '../sim/human-side.ts';
import type { VillagerId } from '../sim/world-types.ts';

export const TYPING_MS = 400;
export const LINE_MS = 2500;
/** At most this many thought clouds on a map at once; verdicts are never capped. */
export const MAX_THOUGHTS = 2;

export interface ShownBubble {
  bubble: Bubble;
  phase: 'typing' | 'line';
}

interface Slot {
  bubble: Bubble;
  since: number;
}

export class BubbleManager {
  private current = new Map<VillagerId, Slot>();
  private queue = new Map<VillagerId, Bubble[]>();
  private seen = new Set<string>();
  private live = new Set<string>();
  /** Bumped whenever the visible set or a phase changes; the overlay re-renders on change. */
  version = 0;
  private phases = new Map<string, 'typing' | 'line'>();

  ingest(views: readonly VillagerView[], now: number): void {
    this.live.clear();
    for (const v of views) {
      const b = v.bubble;
      if (!b) continue;
      this.live.add(b.id);
      if (this.seen.has(b.id)) continue;
      this.seen.add(b.id);
      const cur = this.current.get(v.id);
      const busy = cur && cur.bubble.kind !== 'thought' && now - cur.since < TYPING_MS + LINE_MS;
      if (busy && b.kind === 'thought') continue;
      if (b.kind === 'thought' && cur?.bubble.kind !== 'thought' && this.thoughts() >= MAX_THOUGHTS) continue;
      if (busy) {
        const q = this.queue.get(v.id) ?? [];
        q.push(b);
        this.queue.set(v.id, q);
      } else {
        this.current.set(v.id, { bubble: b, since: now });
        this.version++;
      }
    }
  }

  private thoughts(): number {
    let n = 0;
    for (const slot of this.current.values()) if (slot.bubble.kind === 'thought') n++;
    return n;
  }

  /** Advance timers; returns what to show. */
  tick(now: number): ShownBubble[] {
    const out: ShownBubble[] = [];
    for (const [id, slot] of [...this.current]) {
      const age = now - slot.since;
      const minimum = (slot.bubble.kind === 'thought' ? 0 : TYPING_MS) + LINE_MS;
      if (age >= minimum && !this.live.has(slot.bubble.id)) {
        this.current.delete(id);
        const next = this.queue.get(id)?.shift();
        if (next) this.current.set(id, { bubble: next, since: now });
        this.version++;
        if (!next) continue;
      }
      const s = this.current.get(id);
      if (!s) continue;
      const phase = s.bubble.kind !== 'thought' && now - s.since < TYPING_MS ? 'typing' : 'line';
      if (this.phases.get(s.bubble.id) !== phase) {
        this.phases.set(s.bubble.id, phase);
        this.version++;
      }
      out.push({ bubble: s.bubble, phase });
    }
    return out;
  }

  reset(): void {
    this.current.clear();
    this.queue.clear();
    this.seen.clear();
    this.live.clear();
    this.phases.clear();
    this.version++;
  }
}
