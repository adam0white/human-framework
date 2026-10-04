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
 * (`stepPeople`); whole days in between by HF `liveCommunity` with this game's routines, natural death and chronic
 * onsets on. Grain is lost only on played nights; the spring's eating is paid at the thaw and the harvest refills it
 * (14 + 1.5 sacks per worker, by the weather, up to a granary of 45). An empty granary at the thaw is a hungry
 * spring: the households most ready to go leave until the rest can be fed.
 * The village ends only when nobody aged fifteen or more is left. Village size is held by crowding (fewer births and
 * young couples leaving above twenty-two) and refugees (below ten).
 *
 * Not covered: weather beyond the harvest roll, the spring repairs, trade, resettlement after a fall (a fallen
 * village ends its volume and the chronicle; a new seed starts a new village).
 */
import { liveCommunity, tend } from '@human/framework';
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
} from './life.ts';
import { planNight, presentIds, stepPeople } from './night.ts';
import { isWatcher, nameOf, personOf } from './people.ts';
import { nextRandom, UNHURT_QUESTIONS, type WatchState } from './state.ts';
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

export const isSeason = (s: WatchState): boolean =>
  s.phase === 'spring' || s.phase === 'summer' || s.phase === 'autumn';

const yearStart = (s: WatchState): number => (s.year - 1) * YEAR_DAYS * DAY;

/** Lives whole days by routine up to `until` (a midnight), reading deaths into the chronicle. */
export function liveDays(s: WatchState, until: number): void {
  if (until <= s.minute) return;
  const res = liveCommunity(s.community, until, {
    routineFor: routineFor(s),
    onDay: dayHook(s),
    lifecourse: { mortality: true, chronicOnsets: true },
  });
  s.minute = until;
  s.keeper.now = until;
  readDeaths(s, res.events);
}

/** Lives minute by minute (in hourly steps) from now to `until`. */
function liveHours(s: WatchState, until: number): void {
  for (let t = Math.min(until, s.minute + 60); ; t = Math.min(until, t + 60)) {
    s.minute = t;
    stepPeople(s, t);
    if (t >= until) break;
  }
  s.keeper.now = s.minute;
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
  // Grown old on the wall.
  for (const p of living(s)) {
    if (isWatcher(s, p) && ageOf(p, s.minute) >= 60 && (s.cast[p.id]?.comes.year ?? s.year) <= s.year - 20)
      fillLeaf(s, 'grew-old', `${nameOf(s, p.id)} has stood the wall twenty winters and grown old on it.`);
  }
  leaving(s);
  // A stretch climbed all winter comes down in the thaw and cannot be stood next winter.
  const worst = SECTION_IDS.reduce<SectionId | null>(
    (a, b) => ((s.yearGrain.breaches[b] ?? 0) > (a ? (s.yearGrain.breaches[a] ?? 0) : 0) ? b : a),
    null,
  );
  if (worst && (s.yearGrain.breaches[worst] ?? 0) >= 4 && nextRandom(s) < 0.35) {
    s.marks.lost = { section: worst, year: s.year + 1 };
    chronicle(
      s,
      'loss',
      `The thaw brought down ${worst === 'gate' ? 'the wall by the Gate' : `the ${worst} wall`} where it was climbed all winter. It cannot be stood next winter.`,
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
        'The granary could not reach the harvest. The last of the village went down the valley.',
      );
      closeVolume(s, 'The granary ran out before the harvest; the village scattered.');
      s.phase = 'fallen';
      return;
    }
    chronicle(
      s,
      'loss',
      (went === 0
        ? 'A hungry spring: the granary could not reach the harvest, and everyone went short until it came.'
        : `A hungry spring: the granary could not reach the harvest, and ${went === 1 ? 'one household' : `${went} households`} went down the valley.`) +
        hungerFaces(s),
    );
    s.yearGrain.eaten = Math.min(s.grain, Math.ceil(living(s).length * EAT_PER_HEAD));
    s.grain -= s.yearGrain.eaten;
  } else {
    s.grain -= eat;
  }
  outgrown(s);
  prune(s);
  maybePartner(s);
  // The director keeps a small village going: refugees come up the valley.
  if (living(s).length < SMALL_VILLAGE && living(s).length > 0 && nextRandom(s) < 0.5)
    familyComes(s, s.minute, 'refugees');
  if (!living(s).some((p) => ageOf(p, s.minute) >= 15)) {
    chronicle(s, 'loss', 'Nobody was left who could stand the wall. The village is empty.');
    closeVolume(s, 'Nobody was left to stand the wall.');
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
 * The routine part of the winter, told at the thaw (G3-4): how many nights went by without the Keeper's lantern,
 * who stood the most of them, and a stretch someone feared that quiet nights on it may have eased.
 */
function routineLine(s: WatchState): void {
  const nights = SPRING_DAY - s.winter.nights;
  const by = new Map<string, number>();
  let eased: { who: string; sec: SectionId } | null = null;
  for (const [key, n] of Object.entries(s.yearGrain.stints)) {
    const [who, sec] = key.split('@') as [string, SectionId];
    by.set(who, (by.get(who) ?? 0) + n);
    const p = personOf(s, who);
    if (!eased && p && n >= 3 && fearedSection(p)?.section === sec) eased = { who, sec };
  }
  const most = [...by.entries()]
    .filter(([id]) => personOf(s, id)?.body.alive)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 2)
    .map(([id]) => nameOf(s, id));
  // Said differently each year (G3-4 review: the same sentence every thaw read as a form).
  const openers = [
    `The other ${nights} nights of winter went by routine, the wall stood in turns.`,
    `The rest of the winter, ${nights} nights, passed in turns on the wall: cold, dark and uneventful.`,
    `For ${nights} nights nothing came worth the lantern. The watch changed at midnight and the snow kept falling.`,
    `${nights} more nights went by without the lantern: frost, the stars and the long hours before dawn.`,
  ];
  const stoodWords = [
    ' stood the most of them.',
    ' took the most turns.',
    ' were on the wall more nights than anyone.',
  ];
  let text = openers[(s.year - 1) % openers.length] ?? openers[0] ?? '';
  const sw = stoodWords[(s.year - 1) % stoodWords.length] ?? stoodWords[0] ?? '';
  if (most.length === 2) text += ` ${most[0]} and ${most[1]}${sw}`;
  else if (most.length === 1) text += ` ${most[0]}${sw.replace(' were ', ' was ')}`;
  if (eased) {
    const where = eased.sec === 'gate' ? 'the Gate' : `the ${eased.sec} wall`;
    text += ` Quiet nights on ${where} may have eased ${nameOf(s, eased.who)}’s dread of it.`;
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
  chronicle(s, 'volume', `Volume ${s.volume.n} opens: ${s.volume.question}`);
  s.phase = 'spring';
}

function harvest(s: WatchState): void {
  const workers = living(s).filter((p) => {
    const a = ageOf(p, s.minute);
    return a >= 15 && a < 66 && !s.cast[p.id]?.limp;
  }).length;
  const weather = 0.7 + 0.5 * nextRandom(s);
  const seed = s.marks.seed ? 1.3 : 1;
  s.marks.seed = false;
  const got = Math.max(0, Math.round((14 + 1.5 * workers) * weather * seed));
  s.yearGrain.harvest = got;
  s.grain = Math.min(GRANARY_MAX, s.grain + got);
  const good = weather > 1.05;
  const thin = weather < 0.82;
  const words = good ? 'A good harvest' : thin ? 'A thin harvest' : 'An ordinary harvest';
  const level = s.grain >= GRANARY_MAX ? 2 : s.grain >= 30 ? 1 : 0;
  const store = [
    'the granary is half empty going into winter',
    'the granary is well filled',
    'the granary is full to the door',
  ][level];
  // A thin harvest can still leave a full store (last year's grain), and a good one a half-empty store.
  const but = (thin && level > 0) || (good && level === 0);
  chronicle(s, 'harvest', `${words}${but ? ', but' : ':'} ${store}.`);
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
  for (const [id, post] of Object.entries(s.posts))
    if (post && !s.openPosts.includes(post)) s.posts[id] = null;
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
}
