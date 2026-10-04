/**
 * What the Keeper can see, built from the state for the UI. The lit section shows threats, their kind and the
 * watchers' throws; a dark section shows only motion (no kind, a blurred position) and nothing that has fled.
 * Grain and rope wear are carried as values for drawing (sacks and strands); the UI prints no numbers.
 */
import {
  DAY,
  MOTION_REACH,
  POSTS,
  type PostId,
  postSection,
  SECTIONS,
  type SectionId,
  type ThreatKind,
  WATCHERS,
  type WatcherId,
} from './config.ts';
import { litSection, nightEnd } from './night.ts';
import type { Alert, DawnPage, Phase, WatchState } from './state.ts';

/** Threats in a lit section are seen from here out. */
export const LIGHT_EDGE = 0.18;

export interface SeenToken {
  id: number;
  kind: ThreatKind;
  section: SectionId;
  pos: number;
  state: 'coming' | 'foot' | 'fled' | 'in';
  /** Minutes since the state changed, for fades. */
  age: number;
  hurt: boolean;
}

export interface Motion {
  id: number;
  section: SectionId;
  /** Blurred to a coarse band. */
  pos: number;
  /** At the foot of the wall: a sound, not a shape. */
  foot: boolean;
}

export interface Frame {
  phase: Phase;
  night: number;
  /** Minute of the day (0..1439), for the sky. */
  clock: number;
  /** 0 at nightfall, 1 at dawn (negative during dusk). */
  nightProgress: number;
  /** Fraction of the current minute already elapsed in real time, for smooth drawing. */
  sub: number;
  warning: string;
  warned: SectionId;
  lit: SectionId | null;
  lantern: { x: number; target: number };
  sections: { id: SectionId; name: string; posts: { id: PostId; watcher: WatcherId | null }[] }[];
  watchers: {
    id: WatcherId;
    name: string;
    note: string;
    post: PostId | null;
    section: SectionId | null;
    /** Only in the lit section: whether they threw this minute and whether it struck. */
    throwing: 'hit' | 'miss' | null;
    target: number | null;
  }[];
  seen: SeenToken[];
  motion: Motion[];
  grain: number;
  grainAtDusk: number;
  rope: { wear: number; snapped: boolean };
  roused: boolean;
  slowed: boolean;
  alerts: Alert[];
  dawn: DawnPage | null;
}

function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export function buildFrame(s: WatchState, sub: number, slowed: boolean): Frame {
  const lit = litSection(s);
  const seen: SeenToken[] = [];
  const motion: Motion[] = [];
  for (const t of s.tokens) {
    if (t.section === lit) {
      if (t.pos < LIGHT_EDGE && t.state === 'coming') continue;
      seen.push({
        id: t.id,
        kind: t.kind,
        section: t.section,
        pos: t.pos,
        state: t.state,
        age: s.minute - t.since,
        hurt: t.hp < (t.kind === 'thief' ? 2 : 1),
      });
    } else if (t.state === 'coming' && t.pos >= MOTION_REACH) {
      // Blur: a band of about a tenth of the lane, shifting every few minutes.
      const jitter = (hash(t.id, Math.floor(s.minute / 4)) - 0.5) * 0.12;
      motion.push({
        id: t.id,
        section: t.section,
        pos: Math.min(0.97, Math.max(0.2, t.pos + jitter)),
        foot: false,
      });
    } else if (t.state === 'foot') {
      motion.push({ id: t.id, section: t.section, pos: 1, foot: true });
    }
  }
  const sections = SECTIONS.map((sec) => ({
    id: sec.id,
    name: sec.name,
    posts: POSTS.filter((p) => p.section === sec.id).map((p) => ({
      id: p.id,
      watcher: WATCHERS.find((w) => s.posts[w.id] === p.id)?.id ?? null,
    })),
  }));
  const watchers = WATCHERS.map((w) => {
    const post = s.posts[w.id];
    const section = post === null ? null : postSection(post);
    const th = section !== null && section === lit ? s.throws.find((x) => x.watcher === w.id) : undefined;
    return {
      id: w.id,
      name: w.name,
      note: w.note,
      post,
      section,
      throwing: th ? (th.hit ? ('hit' as const) : ('miss' as const)) : null,
      target: th ? th.token : null,
    };
  });
  const nightLen = nightEnd(s) - s.nightStart;
  return {
    phase: s.phase,
    night: s.night,
    clock: ((s.minute % DAY) + DAY) % DAY,
    nightProgress: (s.minute - s.nightStart) / nightLen,
    sub,
    warning: s.warning,
    warned: s.warned,
    lit,
    lantern: { ...s.lantern },
    sections,
    watchers,
    seen,
    motion,
    grain: s.grain,
    grainAtDusk: s.phase === 'night' ? s.tally.grainAtDusk : s.grain,
    rope: { ...s.rope },
    roused: s.phase === 'night' && s.minute < s.rousedUntil,
    slowed,
    alerts: s.alerts.slice(-6),
    dawn: s.dawn,
  };
}
