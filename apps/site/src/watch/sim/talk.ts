/**
 * Talks by day (G3-3, spec §4): the Keeper's main way to learn a watcher's fears and hurts. At dawn he has
 * daylight for two talks; each costs the watcher sleep after a night on the wall. Each answer is the person's own
 * words (HF `selfReport`: what they are willing to say, so pride hides pain) and moves the Keeper's impression as
 * testimony (HF `hear`), weaker than seeing them lit.
 *
 * G3-4: four topics, ranked per person by what the Keeper reads of them (`topicsFor`), so the two offered differ:
 * - "Tell me about last night": fear and where (the night's testimony);
 * - the body ("How is the leg?"): pain and tiredness;
 * - "How are things at home?": their household in their words; the Keeper learns how close they are to their
 *   spouse (a `tie:` cue) and being asked warms their trust in him a little;
 * - "Would you keep the Gate one day?": for younger watchers while no heir is named; the answer shows how dutiful
 *   they are (a `trait:conscientiousness` cue) and a willing answer puts them forward at the next fair's heir offer.
 *
 * Not covered: the spec's topics that change behaviour directly (rest tonight, practise with, mend things); talks
 * with children; talks in the open seasons.
 */
import { hear, outwardSigns, selfReport } from '@human/framework';
import { SECTION_IDS, type SectionId } from './config.ts';
import { ageOf, childrenOf } from './life.ts';
import { theSection } from './night.ts';
import { isHere, isWatcher, KEEPER_ID, personOf } from './people.ts';
import { keeperImpressions } from './reads.ts';
import type { WatchState } from './state.ts';

export type Topic = 'night' | 'body' | 'home' | 'gate';
export const TOPICS: readonly Topic[] = ['night', 'body', 'home', 'gate'];
export const TALKS_PER_DAY = 2;
/** Sleep a talk costs a watcher after a night on the wall (sleep pressure, 0..1). */
const TALK_SLEEP = 0.06;
/** Testimony weighs less than seeing (the dawn voices use 0.5). */
const TALK_WEIGHT = 0.6;
/** Trust in the Keeper a talk about home adds (being asked after one's own). */
const HOME_WARMTH = 0.02;

export function canTalk(s: WatchState, who: string): boolean {
  const p = personOf(s, who);
  return (
    s.phase === 'dawn' &&
    s.talks.left > 0 &&
    !!p &&
    isWatcher(s, p) &&
    !s.talks.said.some((x) => x.who === who)
  );
}

function spouseOf(s: WatchState, who: string) {
  const r = personOf(s, who)?.social.relationships.find((x) => x.roles.includes('spouse'));
  const q = r ? personOf(s, r.otherId) : undefined;
  return q && isHere(s, q) ? { q, affection: r?.affection ?? 0 } : null;
}

/** Whether the Gate question can be asked of them: younger watchers, while there is no heir and they are not keeper. */
function gateAsk(s: WatchState, who: string): boolean {
  const p = personOf(s, who);
  if (!p || s.heir || s.gateKeeper === who || s.gateWilling[who] !== undefined) return false;
  const a = ageOf(p, s.minute);
  return a >= 17 && a < 40;
}

/**
 * The topics worth raising with someone, most pressing first, by the Keeper's read of them (never their true
 * state): a hurt or a limp puts the body first, fear the night, a young family home, a likely heir the Gate.
 */
export function topicsFor(s: WatchState, who: string): Topic[] {
  const p = personOf(s, who);
  if (!p) return ['night', 'body'];
  const reads = keeperImpressions(s, who).map((r) => r.text);
  const has = (t: string) => reads.some((r) => r.includes(t));
  const v = s.cast[who];
  const score: Record<Topic, number> = { night: 1, body: 0.8, home: 0, gate: -1 };
  if (has('hurt') || v?.limp || ageOf(p, s.minute) >= 55) score.body += 1.2;
  if (has('afraid') || has('frightened') || has('uneasy')) score.night += 1;
  if (s.notes.some((n) => n.who === who && (n.kind === 'bitten' || n.kind === 'downed'))) score.body += 0.8;
  const kids = childrenOf(s, p).filter((c) => ageOf(c, s.minute) < 6).length;
  const spouse = spouseOf(s, who);
  if (kids > 0 || spouse) score.home = 0.6 + 0.4 * kids;
  if (!s.talks.asked.includes(`${who}:home`) && score.home > 0) score.home += 0.5;
  if (gateAsk(s, who)) score.gate = 0.7 + (s.gateKeeper && s.gateKeeper !== who ? 0.3 : 0);
  return TOPICS.filter((t) => score[t] > 0 && (t !== 'gate' || gateAsk(s, who))).sort(
    (a, b) => score[b] - score[a] || TOPICS.indexOf(a) - TOPICS.indexOf(b),
  );
}

/** Holds a talk. Returns false when it cannot be held. */
export function talk(s: WatchState, who: string, topic: Topic): boolean {
  if (!canTalk(s, who) || !TOPICS.includes(topic)) return false;
  if (topic === 'gate' && !gateAsk(s, who)) return false;
  const p = personOf(s, who);
  if (!p) return false;
  const said = selfReport(p);
  const at = s.minute;
  let text: string;
  if (topic === 'night') {
    const fears = Object.entries(said.fearOf ?? {})
      .filter(([k, v]) => SECTION_IDS.includes(k as SectionId) && v > 0.25)
      .sort((a, b) => b[1] - a[1]);
    for (const [k, v] of fears) hear(s.keeper, who, `fear@${k}`, v, at, TALK_WEIGHT);
    hear(s.keeper, who, 'fear', said.fear, at, TALK_WEIGHT);
    const worst = s.notes.filter((n) => n.who === who).at(-1);
    const left = s.notes.find(
      (n) => n.who === who && (n.kind === 'fled' || n.kind === 'ran' || n.kind === 'slept'),
    );
    const top = fears[0];
    if (left?.section)
      text =
        left.kind === 'slept'
          ? `“I went home to sleep. I’m sorry. I couldn’t stand up straight at ${theSection(left.section)}.”`
          : said.fear > 0.3
            ? `“I left ${theSection(left.section)}. I couldn’t stand it up there.”`
            : `“I left ${theSection(left.section)}. I was frozen through. It won’t happen again.”`;
    else if (top && top[1] > 0.45)
      text = `“${capital(theSection(top[0] as SectionId))}. I keep seeing it when I shut my eyes.”`;
    else if (top) text = `“It was all right. I don’t love ${theSection(top[0] as SectionId)}.”`;
    else if (worst?.kind === 'carrier') text = '“I got someone down off the wall. That’s what I remember.”';
    else if (said.fear > 0.35) text = '“I don’t want to talk about it.”';
    else
      text =
        p.traits.emotionality > 0.6
          ? '“I jumped at every owl. Nothing came, though.”'
          : p.traits.extraversion > 0.6
            ? '“Long and cold. I talked to the stones.”'
            : '“Cold. Long. Nothing I couldn’t stand.”';
  } else if (topic === 'body') {
    hear(s.keeper, who, 'pain', said.pain, at, TALK_WEIGHT);
    hear(s.keeper, who, 'fatigue', said.fatigue, at, TALK_WEIGHT);
    if (said.pain > 0.45) text = '“It’s bad. I won’t lie to you.”';
    else if (said.pain > 0.15) text = '“It aches. It’ll hold.”';
    else if (said.fatigue > 0.5) text = '“Tired to the bone, that’s all.”';
    // Pain they won't own to still shows in how they stand: the one "fine" worth noticing.
    else if (outwardSigns(p).pain > 0.15) text = '“Fine. I’m fine.” (They shift their weight off one leg.)';
    else
      text =
        p.traits.conscientiousness > 0.65
          ? '“Fit to stand tonight.”'
          : p.traits.emotionality > 0.6
            ? '“Well enough. Sleep would help.”'
            : '“Nothing wrong with me.”';
  } else if (topic === 'home') {
    text = homeWords(s, who);
    const spouse = spouseOf(s, who);
    if (spouse) hear(s.keeper, who, `tie:${spouse.q.id}`, spouse.affection, at, TALK_WEIGHT);
    p.will.voices = p.will.voices.map((v) =>
      v.voiceId === KEEPER_ID ? { ...v, trust: Math.min(1, v.trust + HOME_WARMTH) } : v,
    );
  } else {
    const c = p.traits.conscientiousness;
    hear(s.keeper, who, 'trait:conscientiousness', c, at, TALK_WEIGHT);
    const willing = c > 0.5 || (c > 0.35 && p.traits.extraversion > 0.6);
    s.gateWilling[who] = willing;
    text = willing
      ? c > 0.7
        ? '“If you asked me, I’d not let you down.”'
        : '“Me? I’d try. Someone has to.”'
      : c < 0.3
        ? '“The Gate? I can barely keep my own boots dry.”'
        : '“Not me. Ask someone steadier.”';
  }
  p.body.sleepPressure = Math.min(1, p.body.sleepPressure + TALK_SLEEP);
  s.talks.left -= 1;
  s.talks.said.push({ who, topic, text });
  if (!s.talks.asked.includes(`${who}:${topic}`)) s.talks.asked.push(`${who}:${topic}`);
  return true;
}

/** Their household, in their words. */
function homeWords(s: WatchState, who: string): string {
  const p = personOf(s, who);
  if (!p) return '“All well.”';
  const spouse = spouseOf(s, who);
  const kids = childrenOf(s, p).filter((c) => isHere(s, c) && c.body.alive);
  const baby = kids.find((c) => ageOf(c, s.minute) < 1);
  const small = kids.filter((c) => ageOf(c, s.minute) < 6).length;
  const name = (id: string) => s.cast[id]?.name ?? id;
  if (baby) return `“${name(baby.id)} won’t sleep. Neither will I, these nights.”`;
  if (spouse && spouse.affection < 0)
    return `“${name(spouse.q.id)} and I… it’s not good just now. Ask me another day.”`;
  if (small >= 2) return '“Loud. Hungry. The little ones ask where I go at night.”';
  if (small === 1)
    return `“${name(kids.find((c) => ageOf(c, s.minute) < 6)?.id ?? '')} asks every evening if I’m going up the wall.”`;
  if (spouse && spouse.affection > 0.5) return `“${name(spouse.q.id)} keeps the fire in till I’m home.”`;
  if (spouse) return `“Quiet. ${name(spouse.q.id)} worries, I think.”`;
  if (kids.length > 0) return '“The children are grown. The house is too big now.”';
  return '“Nobody waits up for me. It’s easier that way.”';
}

function capital(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
