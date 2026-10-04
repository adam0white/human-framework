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
 * onsets on. Grain is lost only on played nights; the spring's eating is paid at the thaw (the village falls if the
 * granary cannot reach the harvest) and the harvest refills it.
 *
 * Not covered: weather, the spring repairs, trade, resettlement after a fall (a fallen village ends its volume and
 * the chronicle; a new seed starts a new village).
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
  settleProposal,
} from './life.ts';
import { planNight, presentIds, stepPeople } from './night.ts';
import { isWatcher, nameOf, personOf } from './people.ts';
import { nextRandom, type WatchState } from './state.ts';
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
export const GRANARY_MAX = 40;

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
  const q = s.winter.question;
  if (q && q.met === null) {
    if (q.kind === 'souls') {
      const died = s.chronicle.some((l) => l.year === s.year && l.season === 'winter' && l.kind === 'death');
      q.met = !died && s.grain > 0;
    } else if (q.kind === 'first') q.met = true;
    else q.met = false;
  }
  if (q) chronicle(s, 'winter', q.met ? `Done: ${q.text}` : `Not done: ${q.text}`);
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
  if (s.grain < eat && s.year === 1) {
    chronicle(s, 'loss', 'The granary could not reach the harvest. The village could not stay.');
    closeVolume(s, 'The granary ran out before the harvest; the village scattered.');
    s.phase = 'fallen';
    return;
  }
  if (s.grain < eat) {
    // From year 2 an empty granary is a hungry spring, not the end: households go until the rest can be fed.
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
      went === 0
        ? 'A hungry spring: the granary could not reach the harvest, and everyone went short until it came.'
        : `A hungry spring: the granary could not reach the harvest, and ${went === 1 ? 'one household' : `${went} households`} went down the valley.`,
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
  const got = Math.max(0, Math.round((8 + 2.2 * workers) * weather * seed));
  s.yearGrain.harvest = got;
  const before = s.grain;
  s.grain = Math.min(GRANARY_MAX, s.grain + got);
  const words = weather > 1.05 ? 'A good harvest' : weather < 0.82 ? 'A thin harvest' : 'An ordinary harvest';
  chronicle(
    s,
    'harvest',
    `${words}: ${s.grain >= GRANARY_MAX ? 'the granary is full to the door' : s.grain - before > 12 ? 'the granary is well filled' : 'the granary is half empty going into winter'}.`,
  );
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
