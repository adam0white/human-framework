/**
 * What the Keeper can see, built from the state for the UI. The lit section shows threats, their kind and the
 * watchers' throws; a dark section shows only motion (no kind, a blurred position) and nothing that has fled.
 * Grain and rope wear are carried as values for drawing (sacks and strands); the UI prints no numbers.
 *
 * G3-2: a watcher's posture and outward signs (tired, afraid, hurt) are shown only in the lantern's light, from
 * what their face and body show (HF `outwardSigns`, after their reserve), never their true state. What the Keeper
 * believes of each watcher comes as phrases with a sureness (`reads.ts`), and every read of how a posting, a card
 * choice or the bell would go is the Keeper's guess (`moments.ts`).
 */

import { outwardSigns } from '@human/framework';
import {
  DAY,
  MOTION_REACH,
  POSTS,
  type PostId,
  postSection,
  SECTIONS,
  type SectionId,
  type ThreatKind,
  type WatcherId,
} from './config.ts';
import { bellWords, type Moment, readBell, readPosting, readWords } from './moments.ts';
import { earshot, litSection, nightEnd, presentIds } from './night.ts';
import { isPost, type Place, personOf, villager } from './people.ts';
import { type Impression, keeperImpressions } from './reads.ts';
import type { Alert, DawnPage, DaySummary, Phase, Press, WatchState } from './state.ts';

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
  /** Per post: who stands there now (`watcher`) and who is posted there (`posted`). */
  sections: {
    id: SectionId;
    name: string;
    posts: { id: PostId; watcher: WatcherId | null; posted: WatcherId | null }[];
  }[];
  /** Watchers who have come to the village (absent ones are left out). */
  watchers: FrameWatcher[];
  /** The card open now (night only). */
  moment: Moment | null;
  /** At dusk: the Keeper's read of how each watcher would take their posting, by press. */
  postingReads: Partial<Record<WatcherId, Record<Press, string>>> | null;
  /** At night: the Keeper's read of the bell on those in earshot, in words (null when it cannot ring). */
  bellRead: string | null;
  /** The last day, for the dusk panel. */
  day: DaySummary | null;
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

export type Posture = 'stand' | 'sit' | 'doze' | 'eat' | 'pray' | 'down' | 'frozen' | 'carry' | 'figure';

export interface FrameWatcher {
  id: WatcherId;
  name: string;
  /** Which figure the map draws. */
  look: number;
  /** Where their household sits. */
  home: SectionId;
  note: string;
  newcomer: boolean;
  /** Where they are: a post, the hall, home or the village (by day). */
  place: Place;
  /** The post they stand now, if on the wall. */
  post: PostId | null;
  section: SectionId | null;
  /** The Keeper's posting and how hard he pressed it. */
  posted: PostId | null;
  press: Press;
  /** Whether the lantern is on them. */
  lit: boolean;
  /** What the light shows them doing; 'figure' in the dark. */
  posture: Posture;
  /** What their face and body show in the light (after reserve); null in the dark. */
  signs: { tired: boolean; afraid: boolean; hurt: boolean } | null;
  /** Under the bell's command now. */
  commanded: boolean;
  /** What the Keeper believes of them, surest first. */
  impressions: Impression[];
  /** Only in the lit section: whether they threw this minute and whether it struck. */
  throwing: 'hit' | 'miss' | null;
  target: number | null;
}

const POSTURE: Record<string, Posture> = {
  'hold-post': 'stand',
  sit: 'sit',
  doze: 'doze',
  eat: 'eat',
  pray: 'pray',
  freeze: 'frozen',
  carry: 'carry',
};

let readCache: { key: string; reads: Frame['postingReads'] } | null = null;
let bellCache: { key: string; read: string | null } | null = null;

/** Dusk posting reads, recomputed every ten sim minutes or when a posting changes (they run predictAs). */
function postingReads(s: WatchState): Frame['postingReads'] {
  if (s.phase !== 'dusk') return null;
  const key = `${s.seed}|${s.night}|${Math.floor(s.minute / 10)}|${JSON.stringify(s.posts)}`;
  if (readCache?.key === key) return readCache.reads;
  const reads: NonNullable<Frame['postingReads']> = {};
  for (const id of presentIds(s)) {
    const post = s.posts[id];
    if (!post) continue;
    const ask = readPosting(s, id, post, 'ask');
    // When the Keeper expects an ask to do, pressing harder only spends their goodwill: say so.
    const needless = ask.word === 'likely' ? '; pressing may cost goodwill' : '';
    reads[id] = {
      ask: readWords(ask),
      urge: readWords(readPosting(s, id, post, 'urge')) + needless,
      insist: readWords(readPosting(s, id, post, 'insist')) + needless,
    };
  }
  readCache = { key, reads };
  return reads;
}

/** The bell read: the worst of those on the wall in earshot. */
function bellRead(s: WatchState): string | null {
  if (s.phase !== 'night' || s.rope.snapped) return null;
  const hear = earshot(s);
  const key = `${s.seed}|${s.minute}|${s.lantern.x}`;
  if (bellCache?.key === key) return bellCache.read;
  const order = { little: 0, some: 1, much: 2 } as const;
  let worst: ReturnType<typeof readBell> | null = null;
  for (const id of presentIds(s)) {
    const pl = s.place[id];
    if (!isPost(pl) || !hear.includes(postSection(pl))) continue;
    const b = readBell(s, id);
    const rank = (x: ReturnType<typeof readBell>) => (x.holds ? order[x.resent] : 3);
    if (!worst || rank(b) > rank(worst)) worst = b;
  }
  const read = worst ? bellWords(worst) : 'no one in earshot';
  bellCache = { key, read };
  return read;
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
  const ids = presentIds(s);
  const sections = SECTIONS.map((sec) => ({
    id: sec.id,
    name: sec.name,
    posts: POSTS.filter((p) => p.section === sec.id && s.openPosts.includes(p.id)).map((p) => ({
      id: p.id,
      watcher: ids.find((w) => s.place[w] === p.id) ?? null,
      posted: ids.find((w) => s.posts[w] === p.id) ?? null,
    })),
  }));
  const watchers: FrameWatcher[] = [];
  for (const id of ids) {
    const p = personOf(s, id);
    if (!p) continue;
    const w = villager(s, id);
    const place = s.place[id] ?? 'village';
    const post = isPost(place) ? place : null;
    const section = post === null ? null : postSection(post);
    const onLit = section !== null && section === lit;
    const th = onLit ? s.throws.find((x) => x.watcher === w.id) : undefined;
    let posture: Posture = 'figure';
    let signs: FrameWatcher['signs'] = null;
    if (onLit) {
      posture = p.body.downed ? 'down' : (POSTURE[p.activity?.action ?? ''] ?? 'stand');
      const o = outwardSigns(p);
      signs = { tired: o.fatigue > 0.5, afraid: o.fear > 0.35, hurt: o.pain > 0.3 };
    }
    watchers.push({
      id: w.id,
      name: w.name,
      note: w.note,
      look: w.look,
      home: w.home,
      newcomer: w.newcomer,
      place,
      post,
      section,
      posted: s.posts[w.id] ?? null,
      press: s.press[w.id] ?? 'ask',
      lit: onLit,
      posture,
      signs,
      commanded: s.phase === 'night' && s.commands[w.id] !== undefined,
      impressions: keeperImpressions(s, w.id),
      throwing: th ? (th.hit ? ('hit' as const) : ('miss' as const)) : null,
      target: th ? th.token : null,
    });
  }
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
    roused: s.phase === 'night' && Object.keys(s.commands).length > 0,
    slowed,
    // Only what is still news: alerts from the last hour of the night.
    alerts: s.alerts.filter((a) => s.minute - a.minute < 60).slice(-6),
    dawn: s.dawn,
    moment: s.phase === 'night' ? s.moment : null,
    postingReads: postingReads(s),
    bellRead: bellRead(s),
    day: s.day,
  };
}
