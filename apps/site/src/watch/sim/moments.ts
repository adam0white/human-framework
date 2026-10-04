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
import { type PostId, postSection, type SectionId, type WatcherId, watcherDef } from './config.ts';
import { fearAt, litSection, PRESS_STRENGTH, presentIds, ringBell } from './night.ts';
import { isPost, KEEPER_ID, personOf, WatchWorld } from './people.ts';
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
}

export interface Read {
  /** 'likely' | 'unsure' | 'won't' | 'can't tell'. */
  word: 'likely' | 'unsure' | "won't" | "can't tell";
  /** How sure the Keeper is, 0..1. */
  confidence: number;
  /** A short why in the person's voice, when the read is not 'likely'. */
  why?: string;
}

function offersFor(s: WatchState, who: WatcherId): Affordance[] {
  const p = personOf(s, who);
  return p ? new WatchWorld(s).affordancesFor(p) : [];
}

function toRead(res: SuggestionResolution, confidence: number): Read {
  if (confidence < 0.2) return { word: "can't tell", confidence };
  if (res.verdict === 'assented' || res.verdict === 'complied' || res.verdict === 'commanded')
    return { word: 'likely', confidence };
  const why = res.says || undefined;
  if (res.verdict === 'deferred' || res.verdict === 'modified')
    return { word: 'unsure', confidence, ...(why ? { why } : {}) };
  return { word: "won't", confidence, ...(why ? { why } : {}) };
}

/** The Keeper's read of how a watcher would take a posting (dusk card). Pure. */
export function readPosting(s: WatchState, who: WatcherId, post: PostId, press: Press = 'ask'): Read {
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
  const offers = offersFor(s, who);
  if (!offers.some((a) => a.id === `post:${post}`))
    return { word: "won't", confidence: 1, why: 'Someone stands there.' };
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
  const post = isPost(pl) ? pl : (s.posts[who] ?? watcherDef(who).usual);
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

export function readWords(r: Read): string {
  const sure = r.confidence > 0.6 ? '' : r.confidence > 0.35 ? ', you think' : ', maybe';
  switch (r.word) {
    case 'likely':
      return `likely${sure}`;
    case 'unsure':
      return `might${sure}`;
    case "won't":
      return `won't${sure}`;
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

/** Whether a watcher's true choice right now would take them off the wall (the waver trigger). Pure. */
function wavering(s: WatchState, who: WatcherId): boolean {
  const p = personOf(s, who);
  const pl = s.place[who];
  if (!p || !isPost(pl) || p.body.downed || p.activity?.action !== 'hold-post') return false;
  if (fearAt(p, postSection(pl)) < 0.25) return false;
  const sug: Suggestion = {
    voiceId: KEEPER_ID,
    affordanceId: `post:${pl}`,
    strength: PRESS_STRENGTH[s.press[who]],
  };
  const res = predict(p, offersFor(s, who), sug);
  const away = res.insteadAffordanceId ?? '';
  return res.verdict === 'refused' || ['flee', 'run-off', 'go-home', 'sleep'].includes(away);
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
    const name = watcherDef(who).name;
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
        label: `${watcherDef(id).name}, carry ${name}`,
        read: readWords(toRead(resolution, confidence)),
      });
    }
    options.push({ id: 'leave', label: `Leave ${name} for now` });
    open(s, { kind: 'downed', who, section: lit, text: `${name} is down at the wall.`, options });
    return;
  }
  for (const who of here) {
    const p = personOf(s, who);
    const def = watcherDef(who);
    if (!p || def.family === null || carded(s, 'family', who)) continue;
    const duty = p.agenda.commitments.some(
      (c) => c.status === 'pending' && c.actions.includes('go-home') && c.until > s.minute,
    );
    if (!duty) continue;
    const pl = s.place[who];
    const options: MomentOption[] = [{ id: 'let', label: `Let ${def.name} go to ${def.family}` }];
    const sub =
      presentIds(s).find((id) => id !== who && !isPost(s.place[id]) && !personOf(s, id)?.body.downed) ??
      presentIds(s).find((id) => {
        const q = s.place[id];
        return id !== who && isPost(q) && postSection(q) !== lit;
      });
    if (sub && isPost(pl)) {
      const q = personOf(s, sub);
      const r = q ? readPosting(s, sub, pl, 'urge') : { word: "can't tell" as const, confidence: 0 };
      options.push({
        id: `send:${sub}`,
        label: `Let her go; send ${watcherDef(sub).name} to the post`,
        read: readWords(r),
      });
    }
    if (!s.rope.snapped)
      options.push({ id: 'bell', label: `Ring for ${def.name} to hold`, read: bellWords(readBell(s, who)) });
    open(s, {
      kind: 'family',
      who,
      section: lit,
      text: `${def.name} hears them near ${def.family}.`,
      options,
    });
    return;
  }
  for (const who of here) {
    if (carded(s, 'waver', who) || !wavering(s, who)) continue;
    const def = watcherDef(who);
    const options: MomentOption[] = [
      { id: 'let', label: `Let ${def.name} go` },
      { id: 'urge', label: `Urge ${def.name} to hold` },
    ];
    if (!s.rope.snapped)
      options.push({ id: 'bell', label: `Ring for ${def.name} to hold`, read: bellWords(readBell(s, who)) });
    open(s, { kind: 'waver', who, section: lit, text: `${def.name} looks back at the steps.`, options });
    return;
  }
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
  if (choice === 'urge' && isPost(pl)) ask(s, who, `post:${pl}`);
  else if (choice === 'bell') {
    if (!ringBell(s, who)) return false;
  } else if (choice === 'let') {
    const post = s.posts[who];
    if (post) s.letGo[who] = post;
    s.posts[who] = null;
  } else if (choice.startsWith('send:') && isPost(pl)) {
    const sub = choice.slice(5) as WatcherId;
    const post = s.posts[who];
    if (post) s.letGo[who] = post;
    s.posts[who] = null;
    ask(s, sub, `post:${pl}`);
  } else if (choice.startsWith('carry:')) {
    ask(s, choice.slice(6) as WatcherId, `carry:${who}`);
  }
  const log = s.momentLog.at(-1);
  if (log) log.choice = choice;
  s.moment = null;
  return true;
}
