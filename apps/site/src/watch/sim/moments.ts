/**
 * Moments (spec §4) and the Keeper's reads (G3-2).
 *
 * Scope. A moment is a card on the lit stretch only, at most three a night, one at a time: a watcher wavering
 * (their true choice right now would take them off the wall), a watcher whose family is threatened (they have
 * taken on the duty of going home), or a watcher down in the open. The card stays open for `MOMENT_WINDOW` sim
 * minutes; doing nothing is legal and the person decides alone. Choices: let go, urge (a stronger one-shot
 * suggestion to hold), the bell (a command on that watcher), send someone else to the post, name a carrier.
 *
 * Every read the player sees goes through the Keeper's impression (HF `predictAs`, `previewCommandAs`), not the
 * truth: "likely", "won't", "you can't tell", with how sure he is. A hidden trait makes a read wrong; the dawn
 * page shows what actually happened.
 */
import {
  type Affordance,
  interruptPerson,
  predict,
  predictAs,
  previewCommandAs,
  type Suggestion,
  type SuggestionResolution,
} from '@human/framework';
import { type PostId, postSection, type SectionId, type WatcherId } from './config.ts';
import { earshot, fearAt, litSection, PRESS_STRENGTH, presentIds, ringBell } from './night.ts';
import { familyWords, isPost, KEEPER_ID, nameOf, personOf, them, villager, WatchWorld } from './people.ts';
import type { Press, WatchState } from './state.ts';

/** Sim minutes a card stays open. */
export const MOMENT_WINDOW = 3;
export const MOMENTS_PER_NIGHT = 3;
/** A one-shot ask (urge, send, carry) lasts this long. */
const ASK_MIN = 60;

export type MomentKind = 'waver' | 'family' | 'downed';

export interface MomentOption {
  id: string;
  label: string;
  /** The Keeper's read of how it would go, in words. */
  read?: string;
}

export interface Moment {
  id: number;
  kind: MomentKind;
  who: WatcherId;
  section: SectionId;
  opened: number;
  until: number;
  text: string;
  options: MomentOption[];
  /** The post a 'urge' answer asks them back to (set when the card catches them already leaving). */
  post?: PostId;
}

export interface Read {
  /** 'likely' | 'unsure' | 'won't' | 'can't tell'. */
  word: 'likely' | 'grudging' | 'unsure' | "won't" | "can't tell";
  /** How sure the Keeper is, 0..1. */
  confidence: number;
  /** A short why in the person's voice, when the read is not 'likely'. */
  why?: string;
}

function offersFor(s: WatchState, who: WatcherId, expect = false): Affordance[] {
  const p = personOf(s, who);
  return p ? new WatchWorld(s, expect).affordancesFor(p) : [];
}

function toRead(res: SuggestionResolution, confidence: number): Read {
  if (confidence < 0.2) return { word: "can't tell", confidence };
  if (res.verdict === 'assented') return { word: 'likely', confidence };
  // Complied: does it, but would rather not (and it costs them some autonomy).
  if (res.verdict === 'complied' || res.verdict === 'commanded') return { word: 'grudging', confidence };
  const why = res.says || undefined;
  if (res.verdict === 'deferred' || res.verdict === 'modified')
    return { word: 'unsure', confidence, ...(why ? { why } : {}) };
  return { word: "won't", confidence, ...(why ? { why } : {}) };
}

/** The Keeper's read of how a watcher would take a posting (dusk card). Pure. */
export function readPosting(
  s: WatchState,
  who: WatcherId,
  post: PostId,
  press: Press = 'ask',
  vacating?: WatcherId,
): Read {
  const p = personOf(s, who);
  if (!p) return { word: "can't tell", confidence: 0 };
  const sug: Suggestion = {
    voiceId: KEEPER_ID,
    affordanceId: `post:${post}`,
    strength: PRESS_STRENGTH[press],
    appeal: 'duty',
  };
  if (press === 'insist') sug.insist = true;
  // At dusk the post is offered as it will be at nightfall (free of others), so read against a copy of the
  // places with the watcher already standing there.
  // At dusk the Keeper reads the night ahead: the scout's warned stretch as dangerous already, and a post as free
  // when whoever stands there now is posted elsewhere (they will move at nightfall).
  // At night, `vacating` is the watcher the Keeper is letting go from that post: read it as free.
  let view = s;
  if (s.phase === 'dusk' || vacating) {
    const place = { ...s.place };
    for (const [id, pl] of Object.entries(place))
      if (id !== who && pl === post && (id === vacating || (s.phase === 'dusk' && s.posts[id] !== post)))
        place[id] = 'village';
    view = { ...s, place };
  }
  const offers = offersFor(view, who, s.phase === 'dusk');
  if (!offers.some((a) => a.id === `post:${post}`))
    return { word: 'unsure', confidence: 1, why: 'someone else stands there now' };
  const { resolution, confidence } = predictAs(s.keeper, p, offers, sug, { now: s.minute });
  return toRead(resolution, confidence);
}

/** The Keeper's read of the bell on one watcher: whether it holds and how much they'd resent it. Pure. */
export function readBell(
  s: WatchState,
  who: WatcherId,
): { holds: boolean; resent: 'little' | 'some' | 'much'; confidence: number } {
  const p = personOf(s, who);
  if (!p) return { holds: false, resent: 'little', confidence: 0 };
  const pl = s.place[who];
  const post = isPost(pl) ? pl : (s.posts[who] ?? villager(s, who).usual);
  const { outcome, confidence } = previewCommandAs(
    s.keeper,
    p,
    offersFor(s, who),
    { voiceId: KEEPER_ID, affordanceId: `post:${post}`, since: s.minute },
    s.minute,
  );
  const resent = outcome.margin > 0.4 ? 'much' : outcome.margin > 0.1 ? 'some' : 'little';
  return { holds: outcome.holds, resent, confidence };
}

/**
 * Who the bell rings for (H2; spec §4: the bell commands one named watcher within earshot). Of the watchers in
 * earshot (on a post on the lit stretch or its neighbours, or in the hall by the Gate), the one the Keeper reads as
 * least likely to hold their post unbidden: one who has gone to the hall first, then "won't", "might", "can't
 * tell", "grudgingly", "likely"; a less certain read before a surer one; wall order after that. Someone already under
 * the bell comes last, so a second pull calls the next one. Null when no one is in earshot. Pure.
 */
export function bellTarget(s: WatchState): WatcherId | null {
  const hear = earshot(s);
  const rank: Record<Read['word'], number> = {
    "won't": 4,
    unsure: 3,
    "can't tell": 2,
    grudging: 1,
    likely: 0,
  };
  let best: WatcherId | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const id of presentIds(s)) {
    const pl = s.place[id];
    let score: number;
    if (isPost(pl) && hear.includes(postSection(pl))) {
      const r = readPosting(s, id, pl, s.press[id] ?? 'ask');
      score = rank[r.word] + (1 - r.confidence) * 0.5;
    } else if (pl === 'hall' && hear.includes('gate')) score = 5;
    else continue;
    const held = s.commands[id];
    if (held && s.minute < held.until) score -= 10;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

export function readWords(r: Read): string {
  const sure = r.confidence > 0.6 ? '' : r.confidence > 0.35 ? ', you think' : ', maybe';
  // The reason, when the Keeper can picture one: their own words as he imagines them.
  const why = r.why ? ` (${r.why.replace(/^[“"]|[”"]$/g, '')})` : '';
  switch (r.word) {
    case 'likely':
      return `likely${sure}`;
    case 'grudging':
      return `will, grudgingly${sure}`;
    case 'unsure':
      return `might${sure}${why}`;
    case "won't":
      return `won't${sure}${why}`;
    default:
      return "you can't tell";
  }
}

export function bellWords(b: ReturnType<typeof readBell>): string {
  if (!b.holds) return b.confidence < 0.2 ? "you can't tell if it holds" : 'it may not hold';
  return b.resent === 'much'
    ? 'holds, but they will resent it'
    : b.resent === 'some'
      ? 'holds; some resentment'
      : 'holds';
}

/** Whether a watcher's true choice right now would take them off the wall, and why (the waver trigger). Pure. */
function wavering(s: WatchState, who: WatcherId): 'fear' | 'tired' | null {
  const p = personOf(s, who);
  const pl = s.place[who];
  if (
    !p ||
    !isPost(pl) ||
    p.body.downed ||
    !['hold-post', 'sit', 'doze', 'eat'].includes(p.activity?.action ?? '')
  )
    return null;
  const sug: Suggestion = {
    voiceId: KEEPER_ID,
    affordanceId: `post:${pl}`,
    strength: PRESS_STRENGTH[s.press[who] ?? 'ask'],
  };
  const res = predict(p, offersFor(s, who), sug);
  const away = res.insteadAffordanceId ?? '';
  if (away === 'sleep') return 'tired';
  if (fearAt(p, postSection(pl)) < 0.25) return null;
  return res.verdict === 'refused' || ['flee', 'run-off', 'go-home'].includes(away) ? 'fear' : null;
}

function carded(s: WatchState, kind: MomentKind, who: WatcherId): boolean {
  return s.momentLog.some((m) => m.kind === kind && m.who === who);
}

function open(s: WatchState, m: Omit<Moment, 'id' | 'opened' | 'until'>): void {
  const moment: Moment = { ...m, id: s.nextMomentId++, opened: s.minute, until: s.minute + MOMENT_WINDOW };
  s.moment = moment;
  s.momentLog.push({ kind: m.kind, who: m.who, minute: s.minute, choice: null });
  s.slowUntil = Math.max(s.slowUntil, moment.until);
}

/** Opens a card if one is due (called each night minute after the people have lived it). */
export function checkMoments(s: WatchState): void {
  if (s.moment && s.minute >= s.moment.until) s.moment = null;
  if (s.moment || s.momentLog.length >= MOMENTS_PER_NIGHT) return;
  const lit = litSection(s);
  if (!lit) return;
  const here = presentIds(s).filter((id) => {
    const pl = s.place[id];
    return isPost(pl) && postSection(pl) === lit;
  });
  // Downed first, then family, then a waver.
  for (const who of here) {
    const p = personOf(s, who);
    if (!p?.body.downed || s.carried[who] || carded(s, 'downed', who)) continue;
    const name = nameOf(s, who);
    const options: MomentOption[] = [];
    const helpers = presentIds(s).filter((id) => {
      const q = personOf(s, id);
      const pl = s.place[id];
      return (
        id !== who && q && !q.body.downed && isPost(pl) && Math.abs(sectionGap(postSection(pl), lit)) <= 1
      );
    });
    for (const id of helpers.slice(0, 3)) {
      const q = personOf(s, id);
      if (!q) continue;
      const { resolution, confidence } = predictAs(
        s.keeper,
        q,
        offersFor(s, id),
        { voiceId: KEEPER_ID, affordanceId: `carry:${who}`, strength: 0.85 },
        { now: s.minute },
      );
      options.push({
        id: `carry:${id}`,
        label: `${nameOf(s, id)}, carry ${name}`,
        read: readWords(toRead(resolution, confidence)),
      });
    }
    options.push({ id: 'leave', label: `Leave ${name} for now` });
    open(s, { kind: 'downed', who, section: lit, text: `${name} is down at the wall.`, options });
    return;
  }
  for (const who of here) {
    const p = personOf(s, who);
    const family = familyWords(s, who);
    const name = nameOf(s, who);
    if (!p || family === null || carded(s, 'family', who)) continue;
    const duty = p.agenda.commitments.some(
      (c) => c.status === 'pending' && c.actions.includes('go-home') && c.until > s.minute,
    );
    if (!duty) continue;
    const pl = s.place[who];
    const options: MomentOption[] = [{ id: 'let', label: `Let ${name} go to ${family}` }];
    const sub =
      // Someone not posted tonight and still in the village, never one who has just left the wall.
      presentIds(s).find(
        (id) => id !== who && s.place[id] === 'village' && !s.posts[id] && !personOf(s, id)?.body.downed,
      ) ??
      presentIds(s).find((id) => {
        const q = s.place[id];
        return id !== who && isPost(q) && postSection(q) !== lit;
      });
    if (sub && isPost(pl)) {
      const q = personOf(s, sub);
      const r = q ? readPosting(s, sub, pl, 'urge', who) : { word: "can't tell" as const, confidence: 0 };
      options.push({
        id: `send:${sub}`,
        label: `Let ${them(s, who)} go; send ${nameOf(s, sub)} to the post`,
        read: readWords(r),
      });
    }
    if (!s.rope.snapped)
      options.push({ id: 'bell', label: `Ring for ${name} to hold`, read: bellWords(readBell(s, who)) });
    open(s, {
      kind: 'family',
      who,
      section: lit,
      text: `${name} hears them near ${family}.`,
      options,
    });
    return;
  }
  for (const who of here) {
    const why = carded(s, 'waver', who) ? null : wavering(s, who);
    if (!why) continue;
    const name = nameOf(s, who);
    const options: MomentOption[] = [
      { id: 'let', label: `Let ${name} go` },
      { id: 'urge', label: `Urge ${name} to hold` },
    ];
    if (!s.rope.snapped)
      options.push({ id: 'bell', label: `Ring for ${name} to hold`, read: bellWords(readBell(s, who)) });
    open(s, {
      kind: 'waver',
      who,
      section: lit,
      text:
        why === 'tired'
          ? `${name} can barely keep ${villager(s, who).sex === 'female' ? 'her' : 'his'} eyes open.`
          : `${name} looks back at the steps.`,
      options,
    });
    return;
  }
}

/**
 * A watcher on the lit stretch has just started to leave it (flee, go home, sleep, run): the Keeper sees them go
 * and gets one card to call them back. Their next decision may not come in time to see it coming, so this catches
 * the act itself. Counts against the night's cards and the person's one waver card.
 */
export function catchLeaving(s: WatchState, who: WatcherId, action: string, section: SectionId): void {
  if (s.moment || s.momentLog.length >= MOMENTS_PER_NIGHT || carded(s, 'waver', who)) return;
  const name = nameOf(s, who);
  const post = s.posts[who] ?? s.openPosts.find((p) => postSection(p) === section);
  // The act is under way when the card opens: say so, so the card does not read as a warning that came late.
  const from = section === 'gate' ? 'the Gate' : `the ${section} wall`;
  const where =
    action === 'sleep' || action === 'go-home'
      ? `is climbing down from ${from}, going home`
      : action === 'run-off'
        ? `has broken from ${from} and is running`
        : `is climbing down from ${from}, heading for the hall`;
  open(s, {
    kind: 'waver',
    who,
    section,
    text: `${name} ${where}.`,
    options: [
      { id: 'let', label: `Let ${name} go` },
      { id: 'urge', label: `Call ${them(s, who)} back to the wall` },
    ],
    ...(post ? { post } : {}),
  });
}

function sectionGap(a: SectionId, b: SectionId): number {
  const order: SectionId[] = ['west', 'gate', 'mill', 'east'];
  return order.indexOf(a) - order.indexOf(b);
}

function ask(s: WatchState, who: WatcherId, affordanceId: string): void {
  s.asks[who] = {
    sug: { voiceId: KEEPER_ID, affordanceId, strength: 0.85, appeal: 'duty', since: s.minute },
    until: s.minute + ASK_MIN,
  };
  const p = personOf(s, who);
  if (p) interruptPerson(s.community, p, s.minute, 'keeper');
}

/** The Keeper answers the open card. Returns false when there is no such card or choice. */
export function answerMoment(s: WatchState, id: number, choice: string): boolean {
  const m = s.moment;
  if (s.phase !== 'night' || !m || m.id !== id || !m.options.some((o) => o.id === choice)) return false;
  const who = m.who;
  const pl = s.place[who];
  if (choice === 'urge' && (isPost(pl) || m.post)) ask(s, who, `post:${isPost(pl) ? pl : m.post}`);
  else if (choice === 'bell') {
    if (!ringBell(s, who)) return false;
  } else if (choice === 'let') {
    const post = s.posts[who];
    if (post) s.letGo[who] = post;
    s.posts[who] = null;
  } else if (choice.startsWith('send:') && isPost(pl)) {
    const sub = choice.slice(5);
    const post = s.posts[who];
    if (post) s.letGo[who] = post;
    s.posts[who] = null;
    ask(s, sub, `post:${pl}`);
  } else if (choice.startsWith('carry:')) {
    ask(s, choice.slice(6), `carry:${who}`);
  }
  const log = s.momentLog.at(-1);
  if (log) log.choice = choice;
  s.moment = null;
  return true;
}
