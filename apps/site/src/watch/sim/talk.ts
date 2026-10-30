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

import { lifeAdmission } from '@adam0white/lab-client';
import { personChapter, SITE_CAST } from '../../shared/cast-chapter.ts';
import { WATCH_DISCOVERIES } from '../../shared/cast-discoveries.ts';
import {
  actorEvidence,
  actorInput,
  actorSigns as outwardSigns,
  reportActor,
  actorReport as selfReport,
} from './actor.ts';
import { decide } from './actor-life.ts';
import { SECTION_IDS, type SectionId } from './config.ts';
import { ageOf, childrenOf } from './life.ts';
import { theSection } from './night.ts';
import { isHere, isWatcher, KEEPER_ID, personOf } from './people.ts';
import { keeperImpressions } from './reads.ts';
import type { WatchState } from './state.ts';

export type Topic = 'night' | 'body' | 'home' | 'gate';
export const TOPICS: readonly Topic[] = ['night', 'body', 'home', 'gate'];
export const TALKS_PER_DAY = 2;
/** Talk consumes the daylight conversation budget. HF owns the body cost of elapsed time. */
/** Testimony weighs less than seeing (the dawn voices use 0.5). */
const TALK_WEIGHT = 0.6;

export function canTalk(s: WatchState, who: string): boolean {
  const p = personOf(s, who);
  return s.phase === 'dawn' && s.talks.left > 0 && !!p && isWatcher(s, p);
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
  const reads = keeperImpressions(s, who).map((r) => r.cue ?? r.text);
  const has = (t: string) => reads.some((r) => r.includes(t));
  const v = s.cast[who];
  const score: Record<Topic, number> = { night: 1, body: 0.8, home: 0, gate: -1 };
  if (has('hurt') || v?.limp || ageOf(p, s.minute) >= 55) score.body += 1.2;
  if (has('afraid') || has('frightened') || has('uneasy')) score.night += 1;
  if (s.notes.some((n) => n.who === who && (n.kind === 'bitten' || n.kind === 'downed'))) score.body += 0.8;
  const kids = childrenOf(s, p).filter((c) => ageOf(c, s.minute) < 6).length;
  const spouse = spouseOf(s, who);
  if (kids > 0 || spouse) score.home = 0.6 + 0.4 * kids;
  else if (WATCH_DISCOVERIES[who] && !s.talks.discovered?.includes(who)) score.home = 0.4;
  if (!s.talks.asked.includes(`${who}:home`) && score.home > 0) score.home += 0.5;
  if (gateAsk(s, who)) score.gate = 0.7 + (s.gateKeeper && s.gateKeeper !== who ? 0.3 : 0);
  return TOPICS.filter(
    (t) =>
      score[t] > 0 &&
      (t !== 'gate' || gateAsk(s, who)) &&
      !s.talks.said.some((x) => x.who === who && x.topic === t),
  ).sort((a, b) => score[b] - score[a] || TOPICS.indexOf(a) - TOPICS.indexOf(b));
}

/**
 * Each watcher's own wording of a shared answer (F-1595: different people gave the very same sentence). The
 * phrasing is fixed by the run's seed and the speaker's place in the village, so two people in one game differ
 * while there are enough phrasings, and one already spoken this dawn is skipped. No RNG is drawn.
 */
function own(s: WatchState, who: string, key: string, lines: string[]): string {
  let h = 0x811c9dc5;
  for (const c of `${s.seed}|${key}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  const start =
    (h >>> 0) +
    Math.max(
      0,
      s.community.people.findIndex((p) => p.id === who),
    );
  for (let k = 0; k < lines.length; k++) {
    const line = lines[(start + k) % lines.length] ?? '';
    if (!s.talks.said.some((x) => x.text.startsWith(line))) return line;
  }
  return lines[start % lines.length] ?? lines[0] ?? '';
}

/** Holds a talk. Returns false when it cannot be held. */
export function talk(s: WatchState, who: string, topic: Topic): boolean {
  if (!canTalk(s, who) || !TOPICS.includes(topic)) return false;
  if (s.talks.said.some((x) => x.who === who && x.topic === topic)) return false;
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
    for (const [k, v] of fears) reportActor(s, KEEPER_ID, who, `fear@${k}`, v, TALK_WEIGHT);
    reportActor(s, KEEPER_ID, who, 'fear', said.fear, TALK_WEIGHT);
    const worst = s.notes.filter((n) => n.who === who).at(-1);
    const left = s.notes.find(
      (n) => n.who === who && (n.kind === 'fled' || n.kind === 'ran' || n.kind === 'slept'),
    );
    const top = fears[0];
    if (left?.section) {
      const at = theSection(left.section);
      text =
        left.kind === 'slept'
          ? own(s, who, 'left-slept', [
              `“I went home to sleep. I’m sorry. I couldn’t stand up straight at ${at}.”`,
              `“My legs gave out at ${at}, so I went home to sleep. I’m sorry.”`,
              `“I couldn’t keep my eyes open at ${at}. I went to my bed.”`,
              `“I left ${at} to sleep. It was wrong of me.”`,
            ])
          : said.fear > 0.3
            ? own(s, who, 'left-afraid', [
                `“I left ${at}. I couldn’t stand it up there.”`,
                `“I came down from ${at}. I was too frightened to stay.”`,
                `“${capitalised(at)} was too much for me. I left it.”`,
                `“I ran from ${at}. I am ashamed of it.”`,
              ])
            : own(s, who, 'left-cold', [
                `“I left ${at}. I was very cold. It won’t happen again.”`,
                `“The cold drove me off ${at}. Next time I’ll bring another coat.”`,
                `“I couldn’t feel my hands, so I came down from ${at}.”`,
                `“I left ${at} to get warm. I should have stayed.”`,
              ]);
    } else if (top && top[1] > 0.45) {
      const at = theSection(top[0] as SectionId);
      text = own(s, who, 'feared', [
        `“I keep seeing ${at} when I shut my eyes.”`,
        `“I don’t want to go back to ${at}.”`,
        `“${capitalised(at)} frightens me now.”`,
        `“I still hear the noises from ${at} when it is quiet.”`,
      ]);
    } else if (top) {
      const at = theSection(top[0] as SectionId);
      text = own(s, who, 'uneasy', [
        `“It was all right. I don’t love ${at}.”`,
        `“It was fine, but ${at} makes me uneasy.”`,
        `“I managed. I would rather not stand at ${at} again.”`,
        `“Nothing much. ${capitalised(at)} is not my favourite place.”`,
      ]);
    } else if (worst?.kind === 'carrier') text = '“I got someone down off the wall. That’s what I remember.”';
    else if (said.fear > 0.35) text = '“I don’t want to talk about it.”';
    else
      text =
        p.traits.emotionality > 0.6
          ? own(s, who, 'jumpy', [
              '“I jumped at every owl. Nothing came, though.”',
              '“Every sound made me jump, but nothing came.”',
            ])
          : p.traits.extraversion > 0.6
            ? own(s, who, 'chatty', [
                '“The night was long and cold. I talked to the stones.”',
                '“Long and cold. I sang under my breath to stay awake.”',
              ])
            : own(s, who, 'steady', [
                '“The night was long and cold, but I could stand it.”',
                '“Cold, but I have stood worse nights.”',
                '“Long and quiet. I could stand it.”',
              ]);
  } else if (topic === 'body') {
    reportActor(s, KEEPER_ID, who, 'pain', said.pain, TALK_WEIGHT);
    reportActor(s, KEEPER_ID, who, 'fatigue', said.fatigue, TALK_WEIGHT);
    if (said.pain > 0.45)
      text = own(s, who, 'pain', [
        '“It’s bad. I won’t lie to you.”',
        '“It hurts a lot. I will not pretend it doesn’t.”',
        '“It is bad. I can barely use it.”',
      ]);
    else if (said.pain > 0.15)
      text = own(s, who, 'ache', [
        '“It aches, but I can still use it.”',
        '“It is sore. I can manage.”',
        '“It hurts when I move, but it works.”',
      ]);
    else if (said.fatigue > 0.5)
      text = own(s, who, 'tired', [
        '“I am very tired, that is all.”',
        '“Only tired. Very tired.”',
        '“I need sleep more than anything.”',
      ]);
    // Pain they won't own to still shows in how they stand: the one "fine" worth noticing.
    else if (outwardSigns(p).pain > 0.15)
      text = '“I am fine. I really am.” (The watcher avoids putting weight on one leg.)';
    else
      text =
        p.traits.conscientiousness > 0.65
          ? own(s, who, 'fit', [
              '“I am fit enough to stand watch tonight.”',
              '“I can stand watch tonight. Put me where you need me.”',
              '“I’m well. I will be on the wall tonight.”',
              '“Ready for tonight. Nothing is wrong.”',
            ])
          : p.traits.emotionality > 0.6
            ? own(s, who, 'well-enough', [
                '“I feel well enough, but I could use more sleep.”',
                '“Well enough. A little more sleep would help.”',
                '“I’m all right, only short of sleep.”',
              ])
            : own(s, who, 'fine', [
                '“There is nothing wrong with me.”',
                '“I’m fine.”',
                '“Nothing to report. I’m well.”',
              ]);
  } else if (topic === 'home') {
    text = homeWords(s, who);
    const spouse = spouseOf(s, who);
    if (spouse) reportActor(s, KEEPER_ID, who, `tie:${spouse.q.id}`, spouse.affection, TALK_WEIGHT);
    const homeEvidence = actorEvidence(s, who, 'home-talk');
    actorInput(s, 'voice.evidence-received', {
      ...homeEvidence,
      voiceId: KEEPER_ID,
      evidence: {
        kind: 'support',
        effect: 'acknowledged',
        id: homeEvidence.evidenceId,
        occurredAt: Math.round(at * 60_000),
        action: 'talk',
      },
    });
  } else {
    const c = p.traits.conscientiousness;
    reportActor(s, KEEPER_ID, who, 'trait:conscientiousness', c, TALK_WEIGHT);
    // These are authored alternatives, not a personality threshold or a forecast.
    // A recorded choice settles willingness; another choice leaves the question open.
    const answer = decide(p, [
      {
        id: `accept-gate-role:${who}`,
        action: 'accept-gate-role',
        label: 'offer to keep the Gate one day',
        duration: 1,
        effort: 0,
        advertises: { meaning: 0.2, belonging: 0.1 },
      },
      {
        id: `decline-gate-role:${who}`,
        action: 'decline-gate-role',
        label: 'decline the future Gate role',
        duration: 1,
        effort: 0,
        advertises: { autonomy: 0.2 },
      },
    ]);
    const willing = answer.chosenAction === 'accept-gate-role';
    const declined = answer.chosenAction === 'decline-gate-role';
    if (willing || declined) s.gateWilling[who] = willing;
    text =
      !willing && !declined
        ? own(s, who, 'gate-wait', [
            '“I need time to think.”',
            '“Ask me another day.”',
            '“I cannot say yet.”',
          ])
        : willing
          ? c > 0.7
            ? own(s, who, 'gate-sure', [
                '“If you asked me, I would do the job well.”',
                '“Choose me and I will keep it well.”',
              ])
            : own(s, who, 'gate-try', [
                '“I would try if you chose me. Someone has to.”',
                '“If nobody better comes forward, I will.”',
              ])
          : c < 0.3
            ? '“I am not sure I can manage the Gate.”'
            : '“Do not choose me. Ask someone steadier.”';
    // F-1597: say what the answer settled, outside the quotes.
    const name = s.cast[who]?.name ?? who;
    const their = s.cast[who]?.sex === 'female' ? 'her' : 'his';
    text += willing
      ? ` ${name} said yes. When you choose who keeps the Gate next, at an autumn fair, ${their} name comes first.`
      : declined
        ? ` ${name} said no. When you choose who keeps the Gate next, at an autumn fair, ${their} name comes last.`
        : ` ${name} has not answered yet.`;
  }
  if (
    topic === 'home' &&
    !text.includes('don’t want to talk') &&
    !s.talks.discovered?.includes(who) &&
    WATCH_DISCOVERIES[who]
  ) {
    text += `\nAbout life away from the wall, ${s.cast[who]?.name ?? who} adds: ${WATCH_DISCOVERIES[who]}`;
    s.talks.discovered ??= [];
    s.talks.discovered.push(who);
  }
  const chapter = personChapter(s.castChapter, SITE_CAST.watch?.[who]);
  if (topic === 'night' && !text.includes('don’t want to talk') && chapter)
    text += ` ${lifeAdmission(chapter.input, 'watch').line}`;
  s.talks.left -= 1;
  s.talks.said.push({ who, topic, text });
  if (!s.talks.asked.includes(`${who}:${topic}`)) s.talks.asked.push(`${who}:${topic}`);
  return true;
}

const capitalised = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Their household, in their words. */
function homeWords(s: WatchState, who: string): string {
  const p = personOf(s, who);
  if (!p) return '“Everything is well at home.”';
  const spouse = spouseOf(s, who);
  const kids = childrenOf(s, p).filter((c) => isHere(s, c) && c.body.alive);
  const baby = kids.find((c) => ageOf(c, s.minute) < 1);
  const small = kids.filter((c) => ageOf(c, s.minute) < 6).length;
  const name = (id: string) => s.cast[id]?.name ?? id;
  if (baby) return `“${name(baby.id)} won’t sleep. Neither will I, these nights.”`;
  if (spouse && spouse.affection < 0)
    return `“${name(spouse.q.id)} and I are not getting along just now. Ask me another day.”`;
  if (small >= 2) return '“The children are loud and hungry. They ask where I go at night.”';
  if (small === 1)
    return `“${name(kids.find((c) => ageOf(c, s.minute) < 6)?.id ?? '')} asks every evening if I’m going up the wall.”`;
  if (spouse && spouse.affection > 0.5)
    return `“${name(spouse.q.id)} keeps the fire burning until I’m home.”`;
  if (spouse) return `“It is quiet at home. ${name(spouse.q.id)} worries, I think.”`;
  if (kids.length > 0) return '“The children are grown. The house is too big now.”';
  return '“Nobody waits up for me. It’s easier that way.”';
}
