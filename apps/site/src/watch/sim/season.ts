/**
 * The year (G3-3, spec §2–3): a winter of played nights, the rest of the winter lived by routine, the thaw page,
 * spring, summer and autumn lived a day at a time, the harvest and the fair, and the next winter's first dusk.
 *
 * Scope. Day 0 of year y is midnight of absolute day 365·(y − 1); `MINUTES_PER_YEAR` is 365 days, so ages and the
 * chronicle's years agree. Winter is days 0–89: the played nights are the first `winter.nights` (consecutive, from
 * the winter's first dusk), then the rest of the winter is routine days. Spring starts on day 90 (the thaw page),
 * summer on 180, autumn on 270; the harvest comes on day 285 and the fair on day 300; the next winter opens at
 * midnight of day 365 and its first dusk is lived to. Fidelity switches only at midnight: the hours between a dawn
 * and the next midnight, and between midnight and the winter's first dusk, are lived minute by minute
 * (`stepPeople`); whole days in between use HF's public daily clock with this game's ordinary routines. All actor
 * faculties, natural death and chronic onsets remain active. Grain is lost only on played nights; the spring's eating is paid at the thaw and the harvest refills it
 * (14 + 1.5 sacks per worker, by the weather, up to a granary of 45). An empty granary at the thaw is a hungry
 * spring: the households most ready to go leave until the rest can be fed.
 * The village ends only when nobody aged fifteen or more is left. Village size is held by crowding (fewer births and
 * young couples leaving above twenty-two) and refugees (below ten).
 *
 * Not covered: weather beyond the harvest roll, the spring repairs, trade, resettlement after a fall (a fallen
 * village ends its volume and the chronicle; a new seed starts a new village).
 */

import { actorAt, actorInput, actorPeople, actorRuntime, publicOffer } from './actor.ts';
import { skillLevel, tend } from './actor-effects.ts';
import { flushActors, physicalLedger, schedulePrayerDay } from './actor-world.ts';
import {
  DAY,
  DUSK_START,
  NIGHTFALL,
  POST_IDS,
  type PostId,
  postSection,
  SECTION_IDS,
  type SectionId,
} from './config.ts';
import { planWinter } from './director.ts';
import { familyComes, openFair, refreshGateKeeper } from './fair.ts';
import { minuteMs } from './hf4.ts';
import {
  ageOf,
  chronicle,
  dayHook,
  dayOfYear,
  fillLeaf,
  householdCount,
  hungrySpring,
  leaving,
  living,
  maybeFire,
  maybePartner,
  outgrown,
  postEveryone,
  prune,
  readDeaths,
  routineFor,
  SMALL_VILLAGE,
  settleLifeCard,
  settleProposal,
  starve,
  winterStories,
} from './life.ts';
import { planNight, presentIds, stepPeople } from './night.ts';
import { isWatcher, nameOf, personOf } from './people.ts';
import { nextRandom, UNHURT_QUESTIONS, type WatchState, worldRng } from './state.ts';
import { fearedSection } from './voices.ts';
import { closeVolume, openVolume, volumeResolved } from './volume.ts';

export const SPRING_DAY = 90;
export const SUMMER_DAY = 180;
export const AUTUMN_DAY = 270;
export const HARVEST_DAY = 285;
export const FAIR_DAY = 300;
/** The day a dry summer may burn a house. */
export const FIRE_DAY = 220;
export const YEAR_DAYS = 365;
/** Sacks eaten per living person between the thaw and the harvest. */
export const EAT_PER_HEAD = 0.4;

/** The granary never holds more than this. */
export const GRANARY_MAX = 45;

/**
 * Hardship rules (`s.hardship`, scenarios 17–19; WATCH-cold-loss). The cold play found that a careless winter
 * emptied the granary and the harvest refilled it: nobody died and nothing carried over. Now:
 * - the spring sowing takes `SOW_SEED` sacks after the eating; a field not sown gives nothing, so the harvest is
 *   `SOWN_FLOOR` (kitchen gardens and the fields sown anyway) plus the rest in proportion to the seed sown;
 * - a hungry spring can kill its frailest face (the oldest from fifty, else the youngest under six), more likely the
 *   emptier the granary;
 * - a winter that opens with less grain than the spring's eating and sowing need, or after a hungry spring, is lean: the watchers go up weak
 *   (fitness `LEAN_FITNESS` of what it was), so they tire sooner on the wall;
 * - a second hungry spring running ends the village if the granary falls half short or worse (the design's fall
 *   at the thaw, spec §3).
 */
export const SOW_SEED = 4;
export const SOWN_FLOOR = 0.7;
export const LEAN_FITNESS = 0.6;
/** Chance the hunger takes its frailest face, at an empty granary; scaled by how short the granary fell. */
export const HUNGER_DEATH = 0.75;
/** A second hungry spring running ends the village when the granary falls at least this share short. */
export const FALL_SHORT = 0.5;

export const isSeason = (s: WatchState): boolean =>
  s.phase === 'spring' || s.phase === 'summer' || s.phase === 'autumn';

const yearStart = (s: WatchState): number => (s.year - 1) * YEAR_DAYS * DAY;

/** Lives whole days by routine up to `until` (a midnight), reading deaths into the chronicle. */
export function liveDays(s: WatchState, until: number): void {
  if (until <= s.minute) return;
  const routine = routineFor(s);
  while (s.minute < until) {
    const day = Math.floor(s.minute / DAY),
      end = Math.min(until, (day + 1) * DAY),
      at = actorAt(s),
      runtime = actorRuntime(s);
    const early = s.actors.queued.filter((input) => input.at < at),
      later = s.actors.queued.filter((input) => input.at >= at);
    if (runtime.time() < at - 1 || early.length) {
      s.actors.queued = early;
      s.actorEvents.push(...flushActors(s, at - 1, true));
      s.actors.queued.push(...later);
    }
    const people = actorPeople(s).filter((p) => p.body.alive);
    const rows = people.map((p) => {
      const post = s.posts[p.id];
      const local = p.id !== 'keeper' && s.cast[p.id]?.status === 'here' ? routine(p, day).activities : [];
      const offers = [
        publicOffer(p.id, {
          id: `routine:${day}:sleep`,
          action: 'sleep',
          label: 'sleep at home',
          duration: 480,
          effort: 0,
          mode: 'sleep',
          advertises: { sleep: 0.9, rest: 0.5 },
        }),
        publicOffer(p.id, {
          id: `routine:${day}:eat`,
          action: 'eat',
          label: 'eat and drink',
          duration: 30,
          effort: 0,
          advertises: { food: 0.6, water: 0.5 },
        }),
        publicOffer(p.id, {
          id: `routine:${day}:rest`,
          action: 'rest',
          label: 'rest at home',
          duration: 60,
          effort: 0,
          advertises: { rest: 0.3, leisure: 0.1 },
        }),
        ...local.map((a, i) =>
          publicOffer(p.id, {
            id: `routine:${day}:${i}`,
            action: a.action,
            label: a.action,
            duration: a.minutes,
            effort: a.tags?.includes('work') ? 0.35 : 0.1,
            mode: a.action === 'sleep' ? 'sleep' : 'awake',
            advertises:
              a.action === 'supper'
                ? { food: 0.6, water: 0.5, belonging: 0.1 }
                : a.action === 'pray'
                  ? { meaning: 0.1 }
                  : a.action === 'play'
                    ? { leisure: 0.3, belonging: 0.1 }
                    : { competence: 0.1, meaning: 0.04 },
            tags: a.tags,
            with: a.with,
            skill: a.skill,
            ...(a.action === 'stand the wall' && post ? { targetId: postSection(post) } : {}),
          }),
        ),
      ];
      return { person: p.id, offers };
    });
    const ledger = physicalLedger(s);
    ledger.year = s.year;
    ledger.ration = s.yearGrain.hungry ? 0.35 : 0.6;
    const offerInputs = runtime.offerInputs(
      at,
      rows,
      ledger as unknown as import('@adam0white/human-framework').Json,
    );
    s.actors.queued.push(...offerInputs);
    for (const row of rows) {
      const p = people.find((p) => p.id === row.person);
      if (!p) throw new Error('Missing authored village routine person.');
      const entries = row.offers.map((offer, i) => ({
        id: `day:${day}:${i}`,
        at: Math.max(at, minuteMs(day * DAY + Math.min(23 * 60, 6 * 60 + i * 60))),
        offer,
        chance: 1,
      }));
      actorInput(
        s,
        'routine.authored',
        { person: row.person, scheduleId: 'village-day', entries },
        undefined,
        at,
      );
      if (s.cast[row.person]?.prays || row.person === 'keeper') schedulePrayerDay(s, row.person, day, at);
      if (!p.activity)
        actorInput(
          s,
          'decision.requested',
          {
            person: row.person,
            reason: 'An ordinary village day',
            treatment: 'ordinary',
            offerRevision: (() => {
              const input = offerInputs.find(
                (i) => i.kind === 'offers.received' && i.payload.person === row.person,
              );
              return input?.kind === 'offers.received'
                ? input.payload.revision
                : runtime.offerRevision(row.person);
            })(),
          },
          undefined,
          at,
        );
    }
    // Whole routine days use HF's ordinary daily clock. Partial days retain fine time.
    const fidelity =
      s.minute % DAY === 0 && end - s.minute === DAY
        ? { mode: 'daily' as const, dayMs: 86400000 as const, anchor: 0 }
        : { mode: 'fine' as const };
    const events = [...s.actorEvents, ...flushActors(s, end, false, fidelity)];
    s.actorEvents = [];
    s.minute = end;
    readDeaths(s, events);
    dayHook(s)(undefined, day, end);
  }
}

/** Lives minute by minute (in hourly steps) from now to `until`. */
function liveHours(s: WatchState, until: number): void {
  for (let t = Math.min(until, s.minute + 60); ; t = Math.min(until, t + 60)) {
    s.minute = t;
    stepPeople(s, t);
    if (t >= until) break;
  }
}

/** One day of an open season. */
export function stepSeason(s: WatchState): void {
  liveDays(s, s.minute + DAY);
  if (s.card && s.minute >= s.card.until) closeCard(s, null);
  const d = dayOfYear(s);
  if (d === SUMMER_DAY) s.phase = 'summer';
  if (d === FIRE_DAY) maybeFire(s);
  if (d === AUTUMN_DAY) s.phase = 'autumn';
  if (d === HARVEST_DAY) harvest(s);
  if (d === FAIR_DAY) openFair(s);
  if (d >= YEAR_DAYS) startWinter(s);
}

/** The Keeper's word on the open season card, or the card closing with none. */
export function closeCard(s: WatchState, choice: string | null): boolean {
  const c = s.card;
  if (!c) return false;
  const asker = personOf(s, c.who);
  const answerer = personOf(s, c.other);
  s.card = null;
  if (c.kind !== 'proposal') {
    settleLifeCard(s, c, choice);
    return true;
  }
  if (!asker || !answerer || !asker.body.alive || !answerer.body.alive) return true;
  settleProposal(s, asker, answerer, choice === 'bless' ? 1 : choice === 'against' ? -1 : null, s.minute);
  return true;
}

/** The last dawn of the winter: the rest of it lived by routine, then the thaw page. */
export function endWinter(s: WatchState): void {
  const midnight = (Math.floor(s.minute / DAY) + 1) * DAY;
  liveHours(s, midnight);
  for (const id of presentIds(s)) s.place[id] = 'village';
  liveDays(s, yearStart(s) + SPRING_DAY * DAY);
  thaw(s);
}

function thaw(s: WatchState): void {
  s.phase = 'thaw';
  // The last dawn page is spent: a fall from here is the thaw's, not a night's.
  s.dawn = null;
  const q = s.winter.question;
  if (q && q.met === null) {
    if (q.kind === 'souls') {
      const died = s.chronicle.some((l) => l.year === s.year && l.season === 'winter' && l.kind === 'death');
      // Met only if the granary can also feed everyone into spring: a hungry spring is not "done".
      q.met = !died && s.grain >= Math.ceil(living(s).length * EAT_PER_HEAD);
    } else if (UNHURT_QUESTIONS.includes(q.kind)) q.met = true;
    else q.met = false;
  }
  if (q) chronicle(s, 'winter', q.met ? `Done: ${q.text}` : `Not done: ${q.text}`);
  routineLine(s);
  winterStories(s);
  lessonLines(s);
  fairLines(s);
  // Grown old on the wall.
  for (const p of living(s)) {
    if (isWatcher(s, p) && ageOf(p, s.minute) >= 60 && (s.cast[p.id]?.comes.year ?? s.year) <= s.year - 20)
      fillLeaf(
        s,
        'grew-old',
        `${nameOf(s, p.id)} has guarded the wall for twenty winters and grown old while doing it.`,
      );
  }
  leaving(s);
  // A stretch climbed all winter comes down in the thaw and cannot be stood next winter.
  const worst = SECTION_IDS.reduce<SectionId | null>(
    (a, b) => ((s.yearGrain.breaches[b] ?? 0) > (a ? (s.yearGrain.breaches[a] ?? 0) : 0) ? b : a),
    null,
  );
  if (worst && (s.yearGrain.breaches[worst] ?? 0) >= 4 && nextRandom(worldRng(s, 'collapse')) < 0.35) {
    s.marks.lost = { section: worst, year: s.year + 1 };
    chronicle(
      s,
      'loss',
      `The thaw brought down ${worst === 'gate' ? 'the wall by the Gate' : `the ${worst} wall`} where it was climbed all winter. Nobody can guard it next winter.`,
    );
  }
  const eat = Math.ceil(living(s).length * EAT_PER_HEAD);
  s.yearGrain.eaten = eat;
  if (s.grain < eat) {
    // An empty granary is a hungry spring, not the end: households go until the rest can be fed.
    s.yearGrain.hungry = true;
    const before = householdCount(s);
    hungrySpring(s, EAT_PER_HEAD);
    const went = before - householdCount(s);
    if (living(s).length === 0) {
      chronicle(
        s,
        'loss',
        'The grain ran out before the harvest. The last of the village went down the valley.',
      );
      closeVolume(s, 'The grain ran out before the harvest. The villagers left in different directions.');
      s.phase = 'fallen';
      return;
    }
    const short = 1 - s.grain / eat;
    chronicle(
      s,
      'loss',
      (went === 0
        ? 'The grain ran out before the harvest. Everyone went hungry until the new grain came.'
        : `The grain ran out before the harvest. ${went === 1 ? 'One household' : `${went} households`} went down the valley.`) +
        hungerFaces(s),
    );
    if (s.hardship) {
      hungerDeath(s, short);
      // The design's fall at the thaw (spec §3): a village cannot live through two hungry springs running when the
      // second leaves it less than half of what the spring needs. A smaller shortfall is survived, narrowly.
      if (s.annals.at(-1)?.hungry && short >= FALL_SHORT) {
        chronicle(
          s,
          'loss',
          'A second hungry spring in a row. The families could not stay to starve, and the village went down the valley.',
        );
        closeVolume(s, 'Two hungry springs in a row. The village went down the valley.');
        s.yearGrain.sown = 0;
        s.phase = 'fallen';
        return;
      }
    }
    s.yearGrain.eaten = Math.min(s.grain, Math.ceil(living(s).length * EAT_PER_HEAD));
    s.grain -= s.yearGrain.eaten;
  } else {
    s.grain -= eat;
  }
  if (s.hardship) sow(s);
  outgrown(s);
  prune(s);
  maybePartner(s);
  // The director keeps a small village going: refugees come up the valley.
  if (living(s).length < SMALL_VILLAGE && living(s).length > 0 && nextRandom(worldRng(s, 'refugees')) < 0.5)
    familyComes(s, s.minute, 'refugees');
  if (!living(s).some((p) => ageOf(p, s.minute) >= 15)) {
    chronicle(s, 'loss', 'Nobody was left who could guard the wall. The village is empty.');
    closeVolume(s, 'Nobody was left to guard the wall.');
    s.phase = 'fallen';
    return;
  }
  if (volumeResolved(s)) closeVolume(s);
}

/** Who the hunger showed on (G3-4 review: a hungry spring needs a face): the oldest and the youngest left. */
function hungerFaces(s: WatchState): string {
  const people = living(s).sort((a, b) => a.life.bornAt - b.life.bornAt || (a.id < b.id ? -1 : 1));
  const old = people[0];
  const young = people.at(-1);
  const parts: string[] = [];
  if (old && ageOf(old, s.minute) >= 50)
    parts.push(`${nameOf(s, old.id)} gave away half of every bowl and grew thin`);
  if (young && young !== old && ageOf(young, s.minute) < 6)
    parts.push(`${nameOf(s, young.id)} cried with hunger at night`);
  return parts.length === 0 ? '' : ` ${parts.join('; ')}.`;
}

/**
 * The hunger takes its frailest face (hardship rules): the oldest from fifty, else the youngest under six, with
 * `HUNGER_DEATH` times how short the granary fell. At most one a spring. A world draw: what the Keeper did set the
 * shortfall, and nothing else moves the roll.
 */
function hungerDeath(s: WatchState, short: number): void {
  const people = living(s).sort((a, b) => a.life.bornAt - b.life.bornAt || (a.id < b.id ? -1 : 1));
  const old = people[0];
  const young = people.at(-1);
  const frail =
    old && ageOf(old, s.minute) >= 50 ? old : young && ageOf(young, s.minute) < 6 ? young : undefined;
  if (!frail || nextRandom(worldRng(s, 'hunger')) >= HUNGER_DEATH * Math.max(0, Math.min(1, short))) return;
  starve(s, frail);
}

/** The spring sowing (hardship rules): up to `SOW_SEED` sacks go into the fields; the share sown sets the harvest. */
function sow(s: WatchState): void {
  const seed = Math.min(SOW_SEED, Math.max(0, s.grain));
  s.grain -= seed;
  s.yearGrain.sown = seed / SOW_SEED;
  if (seed >= SOW_SEED) return;
  chronicle(
    s,
    'loss',
    seed === 0
      ? 'There was no seed grain left to sow. Only the kitchen gardens were planted, so the harvest will be poor.'
      : 'There was too little seed grain to sow every field, so the harvest will be smaller.',
  );
}

/**
 * The routine part of the winter, told at the thaw (G3-4): how many nights went by without the Keeper's lantern,
 * who stood the most of them, and an actual stretch on which a watcher took quiet turns.
 */
/** How much surer the pupil's sling must have grown since the blessing for the thaw to say it showed. */
const LESSON_SHOWED = 0.06;
const LESSON_LITTLE = 0.02;

/**
 * The thaw after a blessed lesson says what came of it (owner's playtest, 2026-10-05: "Training was mentioned in
 * the game but I don't know if it worked or not"): the pupil's sling now against the day the Keeper blessed it.
 */
function lessonLines(s: WatchState): void {
  for (const x of s.pairings) {
    if (x.from === undefined || x.told || s.minute < x.until) continue;
    x.told = true;
    const p = personOf(s, x.who);
    if (!p?.body.alive) continue;
    const grew = skillLevel(p, 'sling') - x.from;
    const who = nameOf(s, x.who);
    const teacher = nameOf(s, x.with);
    chronicle(
      s,
      'winter',
      grew >= LESSON_SHOWED
        ? `The summer of sling lessons with ${teacher} showed this winter: ${who} threw stones more accurately than before.`
        : grew >= LESSON_LITTLE
          ? `${who}'s sling lessons with ${teacher} helped a little this winter. The throws were steadier, but the aim was still uncertain.`
          : `${who}'s sling lessons with ${teacher} have not yet led to noticeably more accurate throws on the wall.`,
      x.who,
    );
  }
}

/**
 * The first thaw after a fair says what came of what was bought there (deferred T1, "delayed feedback on other
 * decisions"; 2026-10-19 level-up): a raised wall against how often it was climbed this winter, and a named heir
 * against how many routine nights they stood the Gate. Read from the chronicle and this winter's tallies; words
 * only (the chronicle is not rule state).
 */
function fairLines(s: WatchState): void {
  const bought = s.chronicle.filter((l) => l.kind === 'fair' && l.year === s.year - 1);
  for (const sec of SECTION_IDS) {
    const wall = sec === 'gate' ? 'the wall by the Gate' : `the ${sec} wall`;
    // The texts fair.ts writes: "The west wall was raised and lengthened", "Masons … raised the west wall again".
    const raised = bought.some((l) => l.text.toLowerCase().startsWith(`${wall} was raised`));
    const rebuilt = bought.some((l) => l.text.includes(`raised ${wall} again`));
    if (!raised && !rebuilt) continue;
    const n = s.yearGrain.breaches[sec] ?? 0;
    const what = raised ? 'The workers hired at the fair raised and lengthened' : 'The builders rebuilt';
    chronicle(
      s,
      'winter',
      n === 0
        ? `${what} ${wall}. Nothing crossed it this winter.`
        : `${what} ${wall}. Attackers still climbed over it ${n === 1 ? 'once' : `${n} times`} this winter.`,
    );
  }
  if (bought.some((l) => l.text === 'A bigger bell was hung over the Gate.') && s.marks.bigBell)
    chronicle(s, 'winter', 'The bigger bell bought at the fair is still hung over the Gate.');
  for (const l of s.chronicle.filter((l) => l.year === s.year - 1)) {
    if (!l.who) continue;
    const arrival = l.kind === 'arrive' && l.text.includes('were let in at the fair.');
    const family =
      l.kind === 'birth' &&
      (l.text.startsWith('You chose to visit the family after ') ||
        l.text.startsWith('You sent a sack from the granary for ') ||
        l.text.startsWith('No sack could be sent for ') ||
        l.text.startsWith('The birth card for '));
    if (!arrival && !family) continue;
    const p = personOf(s, l.who);
    const status =
      p?.body.alive && s.cast[l.who]?.status === 'here'
        ? 'is living in the village at this thaw'
        : s.cast[l.who]?.status === 'dead' || p?.body.alive === false
          ? 'has died before this thaw'
          : 'is no longer living in the village at this thaw';
    chronicle(s, 'winter', `${l.text} ${nameOf(s, l.who)} ${status}.`, l.who);
  }
  for (const l of bought) {
    if (!l.who || !l.text.startsWith('You named')) continue;
    const heir = personOf(s, l.who);
    if (!heir?.body.alive) continue;
    const nights = s.yearGrain.stints[`${l.who}@gate`] ?? 0;
    const who = nameOf(s, l.who);
    const played = s.yearGrain.playedGate?.some((r) => r.who === l.who);
    const routine =
      nights > 0
        ? `stood the Gate on ${nights === 1 ? 'one quiet routine night' : 'quiet routine nights'} this winter`
        : 'had no recorded quiet routine nights at the Gate this winter';
    const kept = played ? ' There is also a completed Gate watch recorded on a night you kept.' : '';
    chronicle(s, 'winter', `${who}, named heir at the fair, ${routine}.${kept}`, l.who);
  }
}

function routineLine(s: WatchState): void {
  const nights = SPRING_DAY - s.winter.nights;
  const by = new Map<string, number>();
  let quiet: { who: string; sec: SectionId } | null = null;
  for (const [key, n] of Object.entries(s.yearGrain.stints)) {
    const [who, sec] = key.split('@') as [string, SectionId];
    by.set(who, (by.get(who) ?? 0) + n);
    const p = personOf(s, who);
    if (!quiet && p && n >= 3 && fearedSection(p)?.section === sec) quiet = { who, sec };
  }
  const most = [...by.entries()]
    .filter(([id]) => personOf(s, id)?.body.alive)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 2)
    .map(([id]) => nameOf(s, id));
  // Factual wording varies across eight years without drawing RNG or inventing an event.
  const openers = [
    `During the other ${nights} nights of winter, the watchers took their usual turns guarding the wall.`,
    `For the remaining ${nights} nights of winter, the watchers took their usual turns on the wall in the cold and dark.`,
    `For the next ${nights} nights, the watch changed at midnight and the snow kept falling.`,
    `${nights} more nights went by without the lantern: frost, the stars and the long hours before dawn.`,
    `The village kept its ordinary watch for the other ${nights} nights of winter.`,
    `After the nights you kept, the watchers took turns for another ${nights} nights.`,
    `The played watches ended, and ${nights} nights of ordinary watch followed.`,
    `There were ${nights} more winter nights to guard through the usual turns.`,
  ];
  const stoodWords = [
    ' guarded the wall on the most nights.',
    ' took the most turns guarding the wall.',
    ' were on the wall more nights than anyone.',
  ];
  let text = openers[(s.year - 1) % openers.length] ?? openers[0] ?? '';
  const sw = stoodWords[(s.year - 1) % stoodWords.length] ?? stoodWords[0] ?? '';
  if (most.length === 2) text += ` ${most[0]} and ${most[1]}${sw}`;
  else if (most.length === 1) text += ` ${most[0]}${sw.replace(' were ', ' was ')}`;
  if (quiet) {
    const where = quiet.sec === 'gate' ? 'the Gate' : `the ${quiet.sec} wall`;
    text += ` ${nameOf(s, quiet.who)} took quiet turns on ${where} this winter.`;
  }
  chronicle(s, 'winter', text);
}

/** Leaves the thaw page: the closed volume's epilogue first, if one closed, then spring. */
export function leaveThaw(s: WatchState): void {
  if (s.volume.epilogue) {
    s.phase = 'closed';
    return;
  }
  s.phase = 'spring';
}

/** Leaves the closed volume's page: the next volume opens with spring. */
export function leaveClosed(s: WatchState): void {
  openVolume(s);
  chronicle(s, 'volume', `Part ${s.volume.n} begins: ${s.volume.question}`);
  s.phase = 'spring';
}

function harvest(s: WatchState): void {
  const workers = living(s).filter((p) => {
    const a = ageOf(p, s.minute);
    return a >= 15 && a < 66 && !s.cast[p.id]?.limp;
  }).length;
  const weather = 0.7 + 0.5 * nextRandom(worldRng(s, 'weather'));
  const boughtSeed = s.marks.seed;
  const seed = boughtSeed ? 1.3 : 1;
  s.marks.seed = false;
  const sown = s.hardship ? (s.yearGrain.sown ?? 1) : 1;
  const fields = SOWN_FLOOR + (1 - SOWN_FLOOR) * sown;
  const got = Math.max(0, Math.round((14 + 1.5 * workers) * weather * seed * fields));
  s.yearGrain.harvest = got;
  s.grain = Math.min(GRANARY_MAX, s.grain + got);
  const good = weather > 1.05;
  const thin = weather < 0.82;
  const words = good ? 'A good harvest' : thin ? 'A poor harvest' : 'An ordinary harvest';
  const level = s.grain >= GRANARY_MAX ? 2 : s.grain >= 30 ? 1 : 0;
  const store = [
    'the granary is half empty going into winter',
    'the granary is well filled',
    'the grain store is completely full',
  ][level];
  // A poor harvest can still leave a full store (last year's grain), and a good one a half-empty store.
  const but = (thin && level > 0) || (good && level === 0);
  const unsown =
    sown >= 1
      ? ''
      : sown <= 0
        ? ' No seed was left to sow in spring, so only the kitchen gardens were planted.'
        : ' Too little seed was left in spring to sow every field.';
  const fairSeed = boughtSeed
    ? ' This harvest used the seed grain bought at the fair. Weather, the fields sown and the people working also shaped it.'
    : '';
  chronicle(s, 'harvest', `${words}${but ? ', but' : ':'} ${store}.${unsown}${fairSeed}`);
}

/** The open posts for a winter: the four stretches' two posts, raised stretches' thirds, a lost stretch closed. */
function wallFor(s: WatchState): PostId[] {
  const lost = s.marks.lost && s.marks.lost.year === s.year ? s.marks.lost.section : null;
  const posts: PostId[] = [...POST_IDS, ...s.marks.extended.map((x) => `${x}-3` as PostId)];
  return posts.filter((p) => postSection(p) !== lost);
}

/** Midnight of day 365: the next winter opens and its first dusk is lived to. */
export function startWinter(s: WatchState): void {
  s.year += 1;
  s.winterNight = 1;
  s.night += 1;
  s.openPosts = wallFor(s);
  // A posting on a closed stretch lapses, and so does one held by someone no longer of watch age or lamed.
  const watchers = new Set(presentIds(s));
  for (const [id, post] of Object.entries(s.posts))
    if (post && (!s.openPosts.includes(post) || !watchers.has(id))) s.posts[id] = null;
  refreshGateKeeper(s);
  planWinter(s);
  s.annals.push({
    year: s.year - 1,
    lostWinter: s.yearGrain.lostWinter,
    harvest: s.yearGrain.harvest,
    eaten: s.yearGrain.eaten,
    hungry: s.yearGrain.hungry,
    grainAtWinter: s.yearGrain.atWinter,
    living: living(s).length,
    watchers: presentIds(s).length,
    breaches: Object.values(s.yearGrain.breaches).reduce((a, b) => a + (b ?? 0), 0),
  });
  s.yearGrain = {
    lostWinter: 0,
    harvest: s.yearGrain.harvest,
    eaten: 0,
    breaches: {},
    atWinter: s.grain,
    hungry: false,
    stints: {},
  };
  const day = Math.floor(s.minute / DAY);
  // Nobody is still standing last winter's wall: the year was lived by routine, away from the posts.
  for (const id of presentIds(s)) s.place[id] = 'village';
  liveHours(s, day * DAY + DUSK_START);
  s.minute = day * DAY + DUSK_START;
  s.nightStart = day * DAY + NIGHTFALL;
  for (const p of s.community.people) tend(p);
  postEveryone(s, presentIds(s));
  const need = Math.ceil(living(s).length * EAT_PER_HEAD) + SOW_SEED;
  const lean = s.hardship && (s.grain < need || s.annals.at(-1)?.hungry === true);
  if (lean) leanWinter(s);
  s.dawn = null;
  s.day = { night: s.night, lines: [], ropeBefore: s.rope.wear, ropeAfter: s.rope.wear };
  s.alerts = [];
  s.slowUntil = -1;
  s.phase = 'dusk';
  planNight(s);
  chronicle(
    s,
    'winter',
    `Winter came. ${s.winter.why}${s.winter.question ? ` ${s.winter.question.text}` : ''}`,
  );
  if (lean)
    chronicle(
      s,
      'loss',
      'A lean winter: there is not enough food for everyone. The watchers go up the wall weak from hunger and will tire sooner.',
    );
}

/** A lean winter (hardship rules): every watcher goes up weak, and their roster line says so. */
function leanWinter(s: WatchState): void {
  for (const id of presentIds(s)) {
    const p = personOf(s, id);
    const v = s.cast[id];
    if (!p || !v) continue;
    actorInput(s, 'context.received', {
      person: id,
      evidenceId: `watch:scarcity:${s.year}:${id}`,
      context: { kind: 'scarcity', value: 1 },
    });
    v.thin = s.year;
  }
}
