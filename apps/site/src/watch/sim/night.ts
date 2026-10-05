/**
 * The Night Watch rules (spec §10; G3-1 lanes, G3-2 people).
 *
 * Scope. Each wall section is a lane; threats are tokens that walk from the treeline to the foot of the wall,
 * wait there while they climb, and take grain if nobody drives them off. The watchers are HF people
 * (`people.ts`) stepped minute by minute in a community: the Keeper's postings are standing suggestions they
 * may take, put off or refuse from need, fear or a bond, and the bell is a command (HF `command`) on the
 * watchers in earshot, which costs trust and autonomy as the engine prices it. Each sim minute resolves as
 * seeded rolls: every watcher standing a post throws at the nearest token they can see, with a chance from their
 * sling skill, their hands, fatigue and fear, and the light. The lantern is the Keeper's position: walking it
 * costs minutes, and only the section it stands at is lit (watchers there see far and hit more; the Keeper sees
 * them clearly and learns their state). Dark sections are seen late and show the Keeper only motion. A wolf at
 * the foot of the wall may bite a watcher there; a thief who gets over may knock one down. Downed watchers can
 * be carried to the hall. The scout's warning at dusk names the lead threat's approach and is right about each
 * wave three times in four (every wave on the first night). Each bell pull wears the rope; a worn rope snaps and
 * stays snapped until it is mended by day (`day.ts`).
 *
 * Not covered. Seasons, ageing, talks, the fair, two-section warnings (G3-3).
 */
import {
  type Affordance,
  type Command,
  glimpseOf,
  hear,
  injure,
  interruptPerson,
  knockDown,
  learnOutcome,
  observeAct,
  outwardSigns,
  type Percept,
  type Person,
  promise,
  readCapacities,
  readPerson,
  remember,
  type SimEvent,
  type Suggestion,
  skillLevel,
  stepCommunity,
  strain,
  tend,
} from '@adam0white/human-framework';
import {
  AIM_SCALE,
  BELL_COMMAND_MIN,
  BELL_WEAR_BASE,
  BELL_WEAR_SPREAD,
  DARK_AIM,
  DARK_REACH,
  DARK_SIGHT_BONUS,
  FOOT_AIM,
  LANTERN_STEP_MIN,
  LIT_REACH,
  MOTION_REACH,
  NIGHT_CARRY,
  NIGHT_CARRY_RICH,
  NIGHT_LENGTH,
  OPENING_CARRY_SHARE,
  type PostId,
  postSection,
  SCOUT_TRUE,
  SECTION_IDS,
  type SectionId,
  SIT_AIM,
  SLOW_WINDOW,
  START_GRAIN,
  sectionDef,
  THREATS,
  type ThreatKind,
  type WatcherId,
} from './config.ts';
import { advanceDay } from './day.ts';
import { planDirectedNight } from './director.ts';
import { takeOffer } from './fair.ts';
import { fillLeaf, maybeLimp } from './life.ts';
import { answerMoment, bellTarget, catchLeaving, checkMoments } from './moments.ts';
import {
  addVillager,
  arrive,
  familyWords,
  foundingCast,
  isPost,
  isWatcher,
  KEEPER_ID,
  nameOf,
  personOf,
  placeOfActivity,
  villager,
  WatchWorld,
} from './people.ts';
import { closeCard, endWinter, isSeason, leaveClosed, leaveThaw, stepSeason } from './season.ts';
import {
  type Alert,
  createState,
  type DawnPage,
  emptyTally,
  type FairOffer,
  type NightNote,
  nextRandom,
  type Press,
  pick,
  type Token,
  UNHURT_QUESTIONS,
  type WatchState,
} from './state.ts';
import { canTalk, TALKS_PER_DAY, type Topic, talk } from './talk.ts';
import { dawnVoices } from './voices.ts';
import { firstStand, freshLeaves } from './volume.ts';

export type Input =
  | { k: 'start' }
  | { k: 'continue' }
  | { k: 'fair'; pick: FairOffer['id'] }
  | { k: 'card'; id: number; choice: string }
  | { k: 'talk'; who: WatcherId; topic: Topic }
  | { k: 'post'; watcher: WatcherId; post: PostId | null; press?: Press }
  | { k: 'begin' }
  | { k: 'lantern'; section: SectionId }
  | { k: 'bell'; who?: WatcherId }
  | { k: 'answer'; id: number; choice: string }
  | { k: 'toDusk' };

const ALERT_KEEP = 14;
/** With only the Keeper's lantern at an empty stretch, a climb advances this much per minute. */
const KEEPER_CLIMB = 0.5;
/** ... and each minute a climber there may turn back. */
const KEEPER_SCARE = 0.1;
/** Fled and breached tokens stay drawn this many minutes. */
const TOKEN_LINGER = 10;
/** Chance per minute that a wolf at the foot of the wall bites someone standing there. */
const BITE_CHANCE = 0.035;
/** Chance that a thief who gets over knocks down someone standing there. */
const STRIKE_CHANCE = 0.4;
/** The Keeper looks over the lit stretch this often (minutes); watchers glimpse each other less often. */
const KEEPER_LOOK = 10;
const PEER_LOOK = 30;
/** Suggestion strength by press. */
export const PRESS_STRENGTH: Record<Press, number> = { ask: 0.35, urge: 0.6, insist: 0.6 };
/** Notes of the same kind for the same person closer together than this are merged. */
const NOTE_GAP = 90;

export function newGame(seed: number): WatchState {
  const s = createState(seed);
  for (const v of foundingCast()) addVillager(s, v);
  s.leaves = freshLeaves();
  arrive(s);
  for (const id of presentIds(s)) s.posts[id] = villager(s, id).usual;
  planNight(s);
  return s;
}

/** Ids of the watchers (of watch age, alive and here), in cast order. */
export function presentIds(s: WatchState): WatcherId[] {
  const out: WatcherId[] = [];
  for (const id of s.order) {
    const p = personOf(s, id);
    if (p && isWatcher(s, p)) out.push(id);
  }
  return out;
}

/** True while the clock runs (dusk and night by the minute, the open seasons by the day). */
export function clockRuns(s: WatchState): boolean {
  return s.phase === 'dusk' || s.phase === 'night' || isSeason(s);
}

export function litSection(s: WatchState): SectionId | null {
  if (s.lantern.x !== s.lantern.target) return null;
  return SECTION_IDS[s.lantern.x] ?? null;
}

/** The authored opening: year 1's first nights take what they take (the gates' nights). */
const OPENING_NIGHTS = 3;

/** Weight of one seen throw as evidence of aim (the skill cue lasts a year). */
const SEEN_THROW = 0.05;

/** The sections in earshot of the Keeper: where he stands and its neighbours. */
export function earshot(s: WatchState): SectionId[] {
  const at = Math.round(s.lantern.x);
  return SECTION_IDS.filter((_, i) => Math.abs(i - at) <= 1);
}

export function nightEnd(s: WatchState): number {
  return s.nightStart + NIGHT_LENGTH;
}

export function plural(kind: ThreatKind, n: number): string {
  if (kind === 'wolf') return n === 1 ? 'a wolf' : 'wolves';
  return n === 1 ? 'a thief' : 'thieves';
}

export function capital(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "the west wall", "the Gate". */
export function theSection(id: SectionId): string {
  return id === 'gate' ? 'the Gate' : `the ${sectionDef(id).name.toLowerCase()}`;
}

/** Draws the night at dusk: the lead threat, the scout's line and the waves. */
export function planNight(s: WatchState): void {
  s.warnedAlso = null;
  if (s.year > 1) {
    planDirectedNight(s);
    return;
  }
  const n = s.winterNight;
  const previous = s.history.at(-1)?.lead;
  s.lead =
    n === 1 ? 'wolf' : nextRandom(s) < 0.65 ? (previous === 'wolf' ? 'thief' : 'wolf') : (previous ?? 'wolf');
  s.warned = pick(s, SECTION_IDS);
  const others = SECTION_IDS.filter((id) => id !== s.warned);
  const def = sectionDef(s.warned);
  s.warning =
    s.lead === 'wolf'
      ? `The scout found pack tracks ${def.approach}.`
      : `The scout saw strangers ${def.approach}.`;
  const spawns: WatchState['spawns'] = [];
  s.leadCame = [];
  const waveSize = (): number =>
    s.lead === 'wolf' ? 3 + Math.floor(n / 3) + (nextRandom(s) < 0.5 ? 1 : 0) : 2 + Math.floor(n / 4);
  const waves: [number, number][] = [
    [80, 220],
    [300, 540],
  ];
  let anyRight = false;
  for (const [w, [lo, hi]] of waves.entries()) {
    const at = s.nightStart + lo + Math.floor(nextRandom(s) * (hi - lo));
    // The first night is gentle (spec §3, year 1 authored): the scout is right about every wave. In the rest of the
    // opening the scout is right about at least one wave a night (H2: on seed 11 both waves of nights 2 and 3 came
    // elsewhere, and a planning Keeper lost the granary by the fourth night).
    const lastChance: boolean = w === waves.length - 1 && !anyRight && n <= OPENING_NIGHTS;
    const right: boolean = nextRandom(s) < (n === 1 ? 1 : SCOUT_TRUE) || lastChance;
    anyRight ||= right;
    const section = right ? s.warned : pick(s, others);
    if (!s.leadCame.includes(section)) s.leadCame.push(section);
    const count = waveSize();
    for (let i = 0; i < count; i++) {
      spawns.push({ at: at + i * (1 + Math.floor(nextRandom(s) * 3)), section, kind: s.lead, count: 1 });
    }
  }
  // A stray, anywhere: the warning is never the whole night.
  if (nextRandom(s) < 0.5) {
    const kind: ThreatKind = nextRandom(s) < 0.5 ? 'wolf' : 'thief';
    spawns.push({
      at: s.nightStart + 60 + Math.floor(nextRandom(s) * 560),
      section: pick(s, SECTION_IDS),
      kind,
      count: 1,
    });
  }
  spawns.sort((a, b) => a.at - b.at);
  s.spawns = spawns;
}

export function alert(s: WatchState, a: Omit<Alert, 'minute'>): void {
  if (!a.slowed && s.alerts.some((x) => x.text === a.text && s.minute - x.minute < 20)) return;
  s.alerts.push({ ...a, minute: s.minute });
  if (s.alerts.length > ALERT_KEEP) s.alerts.splice(0, s.alerts.length - ALERT_KEEP);
  if (a.slowed) s.slowUntil = Math.max(s.slowUntil, s.minute + SLOW_WINDOW);
}

function note(s: WatchState, n: Omit<NightNote, 'minute'>): boolean {
  if (s.notes.some((x) => x.who === n.who && x.kind === n.kind && s.minute - x.minute < NOTE_GAP))
    return false;
  s.notes.push({ ...n, minute: s.minute });
  return true;
}

/** Watchers at a post of `section` right now. */
export function postedIn(s: WatchState, section: SectionId): WatcherId[] {
  return presentIds(s).filter((w) => {
    const p = s.place[w];
    return isPost(p) && postSection(p) === section;
  });
}

function reachFor(lit: boolean, sight: number, kind: ThreatKind): number {
  if (lit) return LIT_REACH;
  return DARK_REACH - sight * DARK_SIGHT_BONUS + THREATS[kind].stealth;
}

function enterNight(s: WatchState): void {
  s.phase = 'night';
  s.minute = s.nightStart;
  // A child of the village standing the wall for the first time fills a leaf, and may answer the volume.
  for (const id of presentIds(s)) {
    const v = villager(s, id);
    if (!s.posts[id] || v.stood) continue;
    v.stood = true;
    if (v.bornHere) fillLeaf(s, 'born-stands', `${v.name}, born here, stood the wall for the first time.`);
    firstStand(s, id);
  }
  s.tally = emptyTally(s.grain);
  s.notes = [];
  s.carried = {};
  s.moment = null;
  s.momentLog = [];
  s.asks = {};
}

/** How bad a night's events at a stretch felt, for the person's expectation of standing it again. */
const BAD_NIGHT: Partial<Record<NightNote['kind'], number>> = {
  shaken: -0.35,
  bitten: -0.6,
  downed: -0.6,
  fled: -0.5,
  ran: -0.5,
  froze: -0.5,
};

/**
 * Fear that lasts: each watcher who was shaken, hurt or driven off a stretch tonight learns a bad expectation of
 * standing it (HF `learnOutcome` on 'hold-post@<section>'), so tomorrow's choice, and their dawn words, carry it.
 */
/** How many ordinary stints one fright on a stretch counts as, in what the watcher expects of it. */
const FRIGHT_WEIGHT = 5;

function rememberTheNight(s: WatchState): void {
  for (const p of s.community.people) {
    const id = p.id as WatcherId;
    const worst: Partial<Record<SectionId, number>> = {};
    for (const n of s.notes) {
      const felt = BAD_NIGHT[n.kind];
      if (n.who !== id || felt === undefined || !n.section) continue;
      worst[n.section] = Math.min(worst[n.section] ?? 0, felt);
    }
    for (const [sec, felt] of Object.entries(worst) as [SectionId, number][]) {
      const aff: Affordance = {
        id: `post:${sec}`,
        action: 'hold-post',
        label: 'stand the wall',
        targetId: sec,
        duration: 60,
        effort: 0.15,
        advertises: {},
      };
      // Every finished stint on the wall is also an outcome, so one plain sample would be averaged away by the
      // night's ordinary stints. A fright weighs as several: it outlasts a night of standing, then fades.
      const outcome = {
        affordanceId: aff.id,
        action: aff.action,
        targetId: sec,
        status: 'completed' as const,
        at: s.minute,
      };
      for (let i = 0; i < FRIGHT_WEIGHT; i++) learnOutcome(p, aff, outcome, {}, felt);
    }
  }
}

/**
 * What a night leaves in memory (H2, spec §3: memorable nights become lasting gists people retell). At dawn,
 * whoever stood a stretch where something got over remembers it as a bad night there; whoever drove a threat off
 * remembers a night held. These are ordinary HF episodes with the stretch as their place, so they fold into lasting
 * gists over the years, weigh on later postings there (HF `memory` term) and are what parents tell their children
 * (`winterStories`). Quiet nights leave nothing beyond what the framework already keeps.
 */
function nightMemories(s: WatchState): void {
  const t = s.tally;
  for (const sec of SECTION_IDS) {
    const got = (t.got[sec].wolf ?? 0) + (t.got[sec].thief ?? 0);
    const heroes = new Set(t.heroes[sec]);
    const there = new Set([...postedIn(s, sec), ...heroes]);
    for (const id of there) {
      const p = personOf(s, id);
      if (!p?.body.alive) continue;
      const the = theSection(sec);
      if (got > 0)
        remember(p, {
          at: s.minute,
          kind: 'outcome',
          action: 'night-watch',
          actorId: id,
          placeId: sec,
          valence: -Math.min(0.9, 0.5 + 0.1 * got),
          summary: `the night they came over ${the}`,
          tags: ['night', 'wall', 'danger'],
        });
      else if (heroes.has(id))
        remember(p, {
          at: s.minute,
          kind: 'outcome',
          action: 'night-watch',
          actorId: id,
          placeId: sec,
          valence: 0.5,
          summary: `the night we held ${the}`,
          tags: ['night', 'wall'],
        });
    }
  }
}

function enterDawn(s: WatchState): void {
  const t = s.tally;
  const lines: DawnPage['lines'] = [];
  for (const id of SECTION_IDS) {
    const the = theSection(id);
    const got = t.got[id];
    const driven = t.driven[id];
    const heroes = [...new Set(t.heroes[id])].map((w) => nameOf(s, w));
    const posted = postedIn(s, id).map((w) => nameOf(s, w));
    const gotKinds = (['wolf', 'thief'] as const).filter((k) => (got[k] ?? 0) > 0);
    const drivenKinds = (['wolf', 'thief'] as const).filter((k) => (driven[k] ?? 0) > 0);
    const parts: string[] = [];
    // `posted` is who stands there at dawn; someone who drove a threat off earlier stood it for a while.
    if (gotKinds.length > 0 && posted.length === 0)
      parts.push(heroes.length > 0 ? `Nobody held ${the} to the end.` : `Nobody stood ${the}.`);
    for (const kind of gotKinds) {
      const g = got[kind] ?? 0;
      parts.push(
        kind === 'wolf'
          ? `${capital(plural(kind, g))} got over ${the} and tore into the store.`
          : `${capital(plural(kind, g))} got over ${the} and carried sacks off.`,
      );
    }
    if (drivenKinds.length > 0) {
      const what = drivenKinds.map((k) => plural(k, driven[k] ?? 0)).join(' and ');
      parts.push(
        heroes.length > 0
          ? `${heroes.join(' and ')} drove off ${what} at ${the}.`
          : `Your lantern turned back ${what} at ${the}.`,
      );
    }
    if (parts.length === 0) {
      parts.push(posted.length === 0 ? `Nobody stood ${the}. Nothing came.` : `Quiet at ${the}.`);
    }
    lines.push({ section: id, text: parts.join(' ') });
  }
  nightMemories(s);
  const missed = s.leadCame.filter((x) => x !== s.warned);
  const scout =
    missed.length === 0
      ? null
      : s.leadCame.includes(s.warned)
        ? `The scout was half right: some came ${sectionDef(missed[0] ?? s.warned).approach} instead.`
        : `The scout's tracks were ${sectionDef(s.warned).approach}, but they came ${sectionDef(missed[0] ?? s.warned).approach}.`;
  s.dawn = {
    night: s.night,
    lines,
    scout,
    grainBefore: t.grainAtDusk,
    grainAfter: s.grain,
    ropeSnapped: s.rope.snapped,
    crossed: SECTION_IDS.some((id) => (t.got[id].wolf ?? 0) + (t.got[id].thief ?? 0) > 0),
    voices: [],
  };
  rememberTheNight(s);
  const { voices, tells } = dawnVoices(s);
  s.dawn.voices = voices;
  // The Keeper hears what they say: testimony moves his impressions (HF `hear`), weaker than seeing.
  for (const t of tells) hear(s.keeper, t.who, t.key, t.value, s.minute, 0.5);
  s.history.push({ night: s.night, warned: s.warned, lead: s.lead, lost: t.grainAtDusk - s.grain });
  s.yearGrain.lostWinter += t.grainAtDusk - s.grain;
  for (const id of SECTION_IDS) {
    const n = (t.got[id].wolf ?? 0) + (t.got[id].thief ?? 0);
    if (n > 0) s.yearGrain.breaches[id] = (s.yearGrain.breaches[id] ?? 0) + n;
  }
  const q = s.winter.question;
  if (q && q.met === null) {
    if (
      UNHURT_QUESTIONS.includes(q.kind) &&
      s.notes.some(
        (x) => (x.who === q.who || x.who === q.who2) && (x.kind === 'bitten' || x.kind === 'downed'),
      )
    )
      q.met = false;
    if (q.kind === 'gate' && s.winterNight === s.winter.peak)
      q.met = (t.got.gate.wolf ?? 0) + (t.got.gate.thief ?? 0) === 0;
  }
  for (const p of s.community.people) if (isWatcher(s, p)) maybeLimp(s, p);
  s.talks = { left: TALKS_PER_DAY, said: [], asked: s.talks.asked };
  s.tokens = [];
  s.throws = [];
  s.commands = {};
  s.moment = null;
  s.asks = {};
  // An emptied granary does not end the winter: the dawn page tells the night, and the thaw settles the hunger.
  s.phase = 'dawn';
}

/** Applies one Keeper input. Returns false (and changes nothing) when it does not apply in this phase. */
export function applyInput(s: WatchState, input: Input): boolean {
  switch (input.k) {
    case 'start':
      if (s.phase !== 'goal') return false;
      s.phase = 'dusk';
      return true;
    case 'post': {
      if (s.phase !== 'dusk' && s.phase !== 'goal') return false;
      const who = personOf(s, input.watcher);
      if (!who) return false;
      // Only someone of watch age, here and not lamed, can be given a post (a log replayed against another run
      // could otherwise post a child); taking a posting away is always allowed.
      if (input.post !== null && !isWatcher(s, who)) return false;
      if (input.press !== undefined && !['ask', 'urge', 'insist'].includes(input.press)) return false;
      if (input.post !== null) {
        if (!s.openPosts.includes(input.post)) return false;
        // A post holds one watcher: whoever was posted there loses the posting.
        for (const w of presentIds(s))
          if (w !== input.watcher && s.posts[w] === input.post) s.posts[w] = null;
      }
      s.posts[input.watcher] = input.post;
      s.press[input.watcher] = input.press ?? 'ask';
      s.postedAt[input.watcher] = s.minute;
      return true;
    }
    case 'begin':
      if (s.phase !== 'dusk') return false;
      // Starting the night early: the watchers live the rest of dusk at once.
      stepPeople(s, s.nightStart - 1);
      enterNight(s);
      return true;
    case 'lantern': {
      const target = SECTION_IDS.indexOf(input.section);
      if (target < 0) return false;
      if (s.phase === 'dusk' || s.phase === 'goal') {
        s.lantern = { x: target, target };
        return true;
      }
      if (s.phase !== 'night' || s.lantern.target === target) return false;
      s.lantern = { x: s.lantern.x, target };
      return true;
    }
    case 'bell':
      return ringBell(s, input.who);
    case 'answer':
      return answerMoment(s, input.id, input.choice);
    case 'toDusk': {
      if (s.phase !== 'dawn') return false;
      if (s.winterNight >= s.winter.nights) {
        endWinter(s);
        return true;
      }
      advanceDay(s);
      planNight(s);
      return true;
    }
    case 'continue':
      if (s.phase === 'thaw') leaveThaw(s);
      else if (s.phase === 'closed') leaveClosed(s);
      else if (s.phase === 'fair') {
        s.fair = null;
        s.phase = 'autumn';
      } else return false;
      return true;
    case 'fair':
      return takeOffer(s, input.pick);
    case 'card':
      if (!isSeason(s) || !s.card || s.card.id !== input.id) return false;
      if (!s.card.options.some((o) => o.id === input.choice)) return false;
      return closeCard(s, input.choice);
    case 'talk':
      if (!canTalk(s, input.who)) return false;
      return talk(s, input.who, input.topic);
  }
}

/**
 * The bell: a command to hold the post on one watcher in earshot, the one named, or by default the one the Keeper
 * reads as least likely to hold (`bellTarget`; spec §4, H2). A pull while the last one still rings (the same
 * minute) does nothing. Each pull wears the rope, even when no one is in earshot to hear it.
 */
export function ringBell(s: WatchState, who: WatcherId | undefined): boolean {
  if (s.phase !== 'night' || s.rope.snapped) return false;
  if (Object.values(s.commands).some((c) => c && c.cmd.since === s.minute)) return false;
  const hear = earshot(s);
  const inEarshot = (id: WatcherId): boolean => {
    const pl = s.place[id];
    if (isPost(pl)) return hear.includes(postSection(pl));
    return pl === 'hall' && hear.includes('gate');
  };
  const named = who ?? bellTarget(s);
  const targets = named !== null && presentIds(s).includes(named) && inEarshot(named) ? [named] : [];
  if (who !== undefined && targets.length === 0) return false;
  s.tally.bellRung += 1;
  s.rope.wear += (BELL_WEAR_BASE + BELL_WEAR_SPREAD * nextRandom(s)) * (s.marks.bigBell ? 0.5 : 1);
  const at = litSection(s) ?? 'gate';
  for (const id of targets) {
    const pl = s.place[id];
    const post = isPost(pl) ? pl : (s.posts[id] ?? villager(s, id).usual);
    const cmd: Command = { voiceId: KEEPER_ID, affordanceId: `post:${post}`, since: s.minute, repeat: true };
    s.commands[id] = { cmd, until: s.minute + BELL_COMMAND_MIN };
  }
  if (s.rope.wear >= 1) {
    s.rope = { wear: 1, snapped: true };
    alert(s, {
      section: at,
      kind: 'rope',
      text: 'The bell rope snapped. No more bell tonight.',
      slowed: true,
    });
  } else {
    alert(s, {
      section: at,
      kind: 'bell',
      text:
        targets.length === 0
          ? 'The bell rings, but nobody is in earshot.'
          : `The bell rings for ${targets.map((t) => nameOf(s, t)).join(', ')}: hold your post! ${bellAnswer(s, targets)}`,
      slowed: false,
    });
  }
  return true;
}

/**
 * Who answers the bell (G3-4): the one in earshot who trusts the Keeper least, by their trust and fear. A voice
 * back from the wall, never a number: "Holding!", a grudging "We heard you.", or silence. Reads state only.
 */
function bellAnswer(s: WatchState, targets: WatcherId[]): string {
  let who: WatcherId | null = null;
  let low = 2;
  for (const id of targets) {
    const t = personOf(s, id)?.will.voices.find((v) => v.voiceId === KEEPER_ID)?.trust ?? 0.5;
    if (t < low) {
      low = t;
      who = id;
    }
  }
  if (who === null) return '';
  const name = nameOf(s, who);
  const p = personOf(s, who);
  const fear = p?.affect.emotions.find((e) => e.id === 'fear')?.intensity ?? 0;
  if (targets.length > 1 && low >= 0.55) return '“Holding!” they call back.';
  if (low >= 0.55) return `“Holding!” ${name} calls back.`;
  if (fear > 0.5) return `${name} answers, voice thin: “I hear it.”`;
  if (low >= 0.35) return `“We heard you,” ${name} calls, not warmly.`;
  return `${name} does not answer.`;
}

/** The Keeper's standing suggestions: the posting, and a one-shot ask from a card while it lasts. */
function suggestions(s: WatchState): Record<string, Suggestion[]> {
  const out: Record<string, Suggestion[]> = {};
  for (const id of presentIds(s)) {
    const list: Suggestion[] = [];
    const a = s.asks[id];
    if (a && s.minute < a.until) list.push(a.sug);
    else if (a) delete s.asks[id];
    const post = s.posts[id];
    if (list.length > 0) out[id] = list;
    if (post === null) continue;
    const press = s.press[id] ?? 'ask';
    const sug: Suggestion = {
      voiceId: KEEPER_ID,
      affordanceId: `post:${post}`,
      strength: PRESS_STRENGTH[press],
      appeal: 'duty',
      since: s.postedAt[id],
    };
    if (press === 'insist') sug.insist = true;
    // One voice, one suggestion: an ask from a card speaks for the Keeper while it lasts.
    if (list.length === 0) out[id] = [sug];
  }
  return out;
}

function controlled(s: WatchState): Record<string, Command> {
  const out: Record<string, Command> = {};
  for (const id of presentIds(s)) {
    const c = s.commands[id];
    if (!c) continue;
    if (s.minute >= c.until) {
      delete s.commands[id];
      continue;
    }
    out[id] = c.cmd;
  }
  return out;
}

/** Queue a percept for a watcher, optionally pulling them to re-decide now. */
export function tell(s: WatchState, id: WatcherId, pc: Percept, interrupt = false): void {
  const q = s.percepts[id] ?? [];
  q.push(pc);
  s.percepts[id] = q;
  const p = personOf(s, id);
  if (interrupt && p) interruptPerson(s.community, p, s.minute, pc.kind);
}

/** Steps the watchers' community up to `until` (inclusive) and applies what they did to the wall. */
export function stepPeople(s: WatchState, until: number): SimEvent[] {
  const world = new WatchWorld(s);
  const events = stepCommunity(s.community, world, until, {
    suggestions: suggestions(s),
    controlled: controlled(s),
    contagion: false,
  });
  const before = { ...s.place };
  for (const p of s.community.people) {
    const id = p.id as WatcherId;
    if (!p.body.downed && p.activity) {
      const pl = placeOfActivity(p.activity);
      if (pl !== undefined) s.place[id] = pl;
    }
  }
  if (s.phase === 'night') readEvents(s, events, before);
  // Prune percepts each person has already been handed.
  for (const id of presentIds(s)) {
    const q = s.percepts[id];
    if (!q) continue;
    const upto = s.community.perceivedUntil[id] ?? -Infinity;
    const keep = q.filter((x) => x.at > upto);
    if (keep.length === 0) delete s.percepts[id];
    else s.percepts[id] = keep;
  }
  return events;
}

/** The section a person stands at (or stood at, given the places before this step). */
function sectionOf(
  s: WatchState,
  id: WatcherId,
  places: WatchState['place'] = s.place,
): SectionId | undefined {
  const pl = places[id];
  return isPost(pl) ? postSection(pl) : undefined;
}

/** What the watchers did this minute: notes for dawn, alerts on the lit stretch, the Keeper's impressions. */
function readEvents(s: WatchState, events: SimEvent[], before: WatchState['place']): void {
  const lit = litSection(s);
  for (const e of events) {
    const id = e.personId as WatcherId;
    const p = personOf(s, id);
    if (!p) continue;
    const name = nameOf(s, id);
    if (e.kind === 'decide' && e.verdict && !e.review) {
      const posted = s.posts[id];
      const sec = posted ? postSection(posted) : undefined;
      // Only a choice that takes them off the posted post counts as turning the Keeper down (eating, sitting
      // or praying first is not).
      const chosen = e.affordanceId ?? '';
      const away = chosen.startsWith('post:')
        ? chosen !== `post:${posted}`
        : !/^(sit|doze|eat|pray|carry):/.test(chosen) && chosen !== '';
      if (
        (e.verdict === 'refused' || e.verdict === 'deferred' || e.verdict === 'modified') &&
        away &&
        !p.body.downed
      ) {
        if (sec) note(s, { who: id, kind: e.verdict, section: sec });
        observeAct(s.keeper, id, {
          at: s.minute,
          clarity: sec === lit ? 0.8 : 0.4,
          voiceId: KEEPER_ID,
          heeded: -1,
        });
      } else if (e.verdict === 'assented' || e.verdict === 'complied') {
        observeAct(s.keeper, id, {
          at: s.minute,
          clarity: sec === lit ? 0.6 : 0.25,
          voiceId: KEEPER_ID,
          heeded: e.verdict === 'assented' ? 1 : 0.3,
        });
      }
    }
    if (e.kind === 'command' && e.verdict) {
      note(s, { who: id, kind: 'commanded', ...(sectionOf(s, id) ? { section: sectionOf(s, id) } : {}) });
    }
    if (e.kind !== 'begin') continue;
    const action = e.action ?? '';
    const from = s.notes.length;
    // Where they were when they began it: a person who leaves has already been moved off the wall.
    const where = sectionOf(s, id, before) ?? sectionOf(s, id);
    const seen = where !== undefined && where === lit;
    const clarity = seen ? 0.9 : 0.35;
    const leaving = action === 'flee' || action === 'run-off' || action === 'sleep' || action === 'go-home';
    if (leaving && where && !p.body.downed) {
      if (seen) catchLeaving(s, id, action, where);
      const kind: NightNote['kind'] =
        action === 'flee' ? 'fled' : action === 'run-off' ? 'ran' : action === 'sleep' ? 'slept' : 'home';
      note(s, { who: id, kind, section: where });
      // Walking home, to family or to bed, is not fear of the place (HF reads avoided 0 as an even 0.5, so it is
      // left out); only running from it is.
      const ran = action === 'flee' || action === 'run-off';
      observeAct(s.keeper, id, {
        at: s.minute,
        clarity,
        placeId: where,
        ...(ran ? { avoided: 1 } : {}),
        tags:
          action === 'flee' || action === 'run-off' ? ['flee'] : action === 'sleep' ? ['refuse'] : ['care'],
      });
    }
    if (action === 'doze' && where) {
      note(s, { who: id, kind: 'dozed', section: where });
    }
    if (action === 'freeze' && where) {
      note(s, { who: id, kind: 'froze', section: where });
      observeAct(s.keeper, id, { at: s.minute, clarity, placeId: where, avoided: 0.6, tags: ['freeze'] });
    }
    if (action === 'carry' && e.affordanceId) {
      const other = e.affordanceId.slice('carry:'.length) as WatcherId;
      const q = personOf(s, other);
      if (q && !s.carried[other]) {
        s.carried[other] = true;
        s.place[other] = 'hall';
        tend(q, undefined, 0.7);
        note(s, { who: id, kind: 'carrier', other, ...(where ? { section: where } : {}) });
        note(s, { who: other, kind: 'carried', other: id, ...(where ? { section: where } : {}) });
        observeAct(s.keeper, id, { at: s.minute, clarity, withId: other, toward: 0.8, tags: ['help'] });
        tell(s, other, {
          at: s.minute,
          channel: 'social',
          kind: 'help',
          actorId: id,
          targetId: other,
          salience: 0.8,
          valence: 0.6,
          summary: `${name} carried me off the wall`,
        });
      }
    }
    if (action === 'hold-post' && where) {
      const d = s.tokens.some((t) => t.section === where && (t.state === 'foot' || t.pos >= MOTION_REACH));
      if (d)
        observeAct(s.keeper, id, { at: s.minute, clarity, placeId: where, avoided: -1, tags: ['steady'] });
    }
    if (seen && s.notes.length > from) {
      const n = s.notes.at(-1);
      if (n && n.kind !== 'carried')
        alert(s, { section: where, kind: 'person', who: id, text: personLine(s, n), slowed: false });
    }
  }
}

/** A ticker line for a watcher's act seen under the lantern. */
function personLine(s: WatchState, n: NightNote): string {
  const line = personLineBare(s, n);
  // Leaving while the bell holds them: said, with whose voice they did not heed (G3-4 designer review).
  const c = s.commands[n.who];
  const leaving = n.kind === 'fled' || n.kind === 'ran' || n.kind === 'slept' || n.kind === 'home';
  return leaving && c && s.minute < c.until ? `The bell rang for them, but ${lower(line)}` : line;
}

function lower(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Why someone is leaving, as the Keeper can see it under the lantern (outward signs, not the truth). */
function leavingWhy(s: WatchState, who: WatcherId): string {
  const p = personOf(s, who);
  if (!p) return '';
  const o = outwardSigns(p);
  if (o.fear > 0.4 && o.fear >= o.fatigue) return ', white-faced';
  if (o.fatigue > 0.5) return ', stumbling with tiredness';
  if (o.pain > 0.3) return ', favouring a leg';
  return '';
}

function personLineBare(s: WatchState, n: NightNote): string {
  const name = nameOf(s, n.who);
  const at = n.section ? theSection(n.section) : 'the wall';
  switch (n.kind) {
    case 'fled':
      return `${name} leaves ${at} for the hall${leavingWhy(s, n.who)}.`;
    case 'ran':
      return `${name} breaks and runs from ${at}${leavingWhy(s, n.who)}.`;
    case 'slept':
      return `${name} goes home to sleep, eyes closing on their feet.`;
    case 'home':
      return `${name} runs home to ${familyWords(s, n.who) ?? 'the house'}: they heard something near it.`;
    case 'froze':
      return `${name} stands frozen at ${at}.`;
    case 'carrier':
      return `${name} carries ${n.other ? nameOf(s, n.other) : 'someone'} off ${at}.`;
    case 'refused':
      return `${name} won't take the post you gave.`;
    case 'deferred':
      return `${name} says: not yet.`;
    case 'modified':
      return `${name} stands somewhere else.`;
    default:
      return `${name} at ${at}.`;
  }
}

/** Fatigue and fear as they weigh on a throw (0..1 each). */
function burden(p: Person): { fatigue: number; fear: number } {
  const { body } = readPerson(p);
  let fear = 0;
  for (const e of p.affect.emotions) if (e.id === 'fear') fear += e.intensity;
  return { fatigue: body.perceived.fatigue, fear: Math.min(1, fear) };
}

/** Advances the clock one sim minute. Does nothing unless the clock runs. */
export function stepMinute(s: WatchState): void {
  if (isSeason(s)) {
    stepSeason(s);
    return;
  }
  if (s.phase === 'dusk') {
    stepPeople(s, s.minute);
    s.minute += 1;
    if (s.minute >= s.nightStart) enterNight(s);
    return;
  }
  if (s.phase !== 'night') return;
  const m = s.minute;
  s.throws = [];
  s.keeper.now = m;

  // The Keeper walks.
  if (s.lantern.x !== s.lantern.target) {
    const step = 1 / LANTERN_STEP_MIN;
    const dx = s.lantern.target - s.lantern.x;
    s.lantern.x = Math.abs(dx) <= step + 1e-9 ? s.lantern.target : s.lantern.x + Math.sign(dx) * step;
  }
  const lit = litSection(s);

  // Threats leave the treeline.
  while (s.spawns.length > 0 && (s.spawns[0]?.at ?? Infinity) <= m) {
    const sp = s.spawns.shift();
    if (!sp) break;
    const def = THREATS[sp.kind];
    s.tokens.push({
      id: s.nextTokenId++,
      kind: sp.kind,
      section: sp.section,
      pos: sp.pos ?? 0,
      hp: def.hp,
      climb: 0,
      state: 'coming',
      since: m,
    });
  }

  // Tokens advance, wait at the foot, get in.
  for (const t of s.tokens) {
    const def = THREATS[t.kind];
    if (t.state === 'coming') {
      const before = t.pos;
      t.pos = Math.min(1, t.pos + def.speed * (0.8 + 0.4 * nextRandom(s)));
      if (before < MOTION_REACH && t.pos >= MOTION_REACH) {
        warnWatchers(s, t, 0.45);
        if (!s.called[t.section]) {
          s.called[t.section] = true;
          const where = sectionDef(t.section).approach;
          alert(
            s,
            t.section === lit
              ? {
                  section: t.section,
                  kind: 'sighted',
                  text: `${capital(plural(t.kind, 2))} ${where}.`,
                  slowed: true,
                }
              : { section: t.section, kind: 'motion', text: `Movement in the dark ${where}.`, slowed: true },
          );
        }
      }
      if (t.pos >= 1) {
        t.state = 'foot';
        t.since = m;
        warnWatchers(s, t, 0.65);
        const recent = s.alerts.some(
          (a) => a.kind === 'foot' && a.section === t.section && m - a.minute < 10,
        );
        if (!recent) {
          const name = sectionDef(t.section).name.toLowerCase();
          alert(s, {
            section: t.section,
            kind: 'foot',
            text:
              t.section === lit
                ? `${capital(plural(t.kind, 1))} at the foot of the ${name}.`
                : `Something at the foot of the ${name}.`,
            slowed: true,
          });
        }
      }
    } else if (t.state === 'foot') {
      const standing = postedIn(s, t.section).filter((w) => !personOf(s, w)?.body.downed);
      // A wolf at the foot may bite someone standing there.
      if (t.kind === 'wolf' && standing.length > 0 && nextRandom(s) < BITE_CHANCE)
        bite(s, pick(s, standing), t);
      // The Keeper's lantern at the foot of an unwatched stretch: the climb is slow and loud, and some turn back.
      const keeperOnly = t.section === lit && standing.length === 0;
      t.climb += keeperOnly ? KEEPER_CLIMB : 1;
      if (keeperOnly && nextRandom(s) < KEEPER_SCARE) {
        t.state = 'fled';
        t.since = m;
        const d = s.tally.driven[t.section];
        d[t.kind] = (d[t.kind] ?? 0) + 1;
        alert(s, {
          section: t.section,
          kind: 'driven',
          text: `Your lantern turned ${plural(t.kind, 1)} back at the ${sectionDef(t.section).name.toLowerCase()}.`,
          slowed: false,
        });
      } else if (t.climb >= def.climb) {
        t.state = 'in';
        t.since = m;
        // After the first three nights a night carries off at most NIGHT_CARRY sacks (what can be hauled over a
        // wall before the alarm), so one bad night hurts without ending the chronicle; the first three nights of
        // year 1 are the authored opening the G3-1 and G3-2 gates measure, where a night carries off at most half
        // of what the granary held at dusk (H2: seed 11 lost 17 of 20 in two opening nights even with a plan).
        const capped = s.year > 1 || s.winterNight > OPENING_NIGHTS;
        const carry = capped
          ? NIGHT_CARRY + Math.floor(Math.max(0, s.tally.grainAtDusk - START_GRAIN) / NIGHT_CARRY_RICH)
          : Math.ceil(s.tally.grainAtDusk * OPENING_CARRY_SHARE);
        const room = Math.max(0, carry - (s.tally.grainAtDusk - s.grain));
        const took = Math.min(s.grain, def.takes, room);
        s.grain -= took;
        t.took = took;
        const got = s.tally.got[t.section];
        got[t.kind] = (got[t.kind] ?? 0) + 1;
        if (t.kind === 'thief' && standing.length > 0 && nextRandom(s) < STRIKE_CHANCE)
          strike(s, pick(s, standing), t.section);
        const name = sectionDef(t.section).name.toLowerCase();
        // Each one over the lit stretch is told, with what it got away with (owner's playtest, 2026-10-05: of two
        // thieves, one "still can't steal" with no word why); in the dark, one line per stretch a quarter hour.
        const seen = t.section === lit;
        const told =
          !seen && s.alerts.some((a) => a.kind === 'in' && a.section === t.section && m - a.minute < 15);
        const why = s.grain === 0 ? 'found the store bare' : 'the alarm was up';
        if (!told)
          alert(s, {
            section: t.section,
            kind: 'in',
            text: seen
              ? took > 0
                ? t.kind === 'thief'
                  ? `A thief got over the ${name} and away with grain.`
                  : `A wolf got over the ${name} and tore into the store.`
                : `${capital(plural(t.kind, 1))} got over the ${name}, but ${why}: away with nothing.`
              : took > 0
                ? `Grain is gone: something got over the ${name}.`
                : `Something got over the ${name} in the dark and away with nothing.`,
            slowed: true,
          });
      }
    }
  }

  // The watchers live this minute.
  stepPeople(s, m);

  // The Keeper looks over the lit stretch; watchers on the same stretch glimpse each other.
  if (lit && (m - s.nightStart) % KEEPER_LOOK === 0)
    for (const id of postedIn(s, lit)) {
      const p = personOf(s, id);
      if (p) glimpseOf(s.keeper, p, m, 0.9);
    }
  if ((m - s.nightStart) % PEER_LOOK === 0)
    for (const sec of SECTION_IDS) {
      const here = postedIn(s, sec);
      for (const a of here)
        for (const b of here) {
          if (a === b) continue;
          const pa = personOf(s, a);
          const pb = personOf(s, b);
          if (pa && pb) glimpseOf(pa, pb, m, sec === lit ? 0.7 : 0.45);
        }
    }

  if ((m - s.nightStart) % KEEPER_LOOK === 0) feelings(s, lit);
  checkMoments(s);

  // Watchers throw.
  for (const id of presentIds(s)) {
    const p = personOf(s, id);
    const post = s.place[id];
    if (!p || !isPost(post) || p.body.downed || p.body.asleep || !p.activity) continue;
    const action = p.activity.action;
    const rate = action === 'hold-post' ? 1 : action === 'sit' || action === 'eat' ? SIT_AIM : 0;
    if (rate === 0) continue;
    const section = postSection(post);
    const isLit = section === lit;
    const caps = readCapacities(p);
    const sling = skillLevel(p, 'sling');
    const sight = skillLevel(p, 'sight') * caps.sight;
    let target: Token | null = null;
    for (const t of s.tokens) {
      if (t.section !== section || (t.state !== 'coming' && t.state !== 'foot')) continue;
      if (t.pos < reachFor(isLit, sight, t.kind)) continue;
      if (!target || t.pos > target.pos || (t.pos === target.pos && t.climb > target.climb)) target = t;
    }
    if (!target) continue;
    const b = burden(p);
    const protest = p.activity.protest ? 0.8 : 1;
    const chance =
      AIM_SCALE *
      sling *
      rate *
      caps.manipulation *
      (1 - 0.35 * b.fatigue) *
      (1 - 0.3 * b.fear) *
      protest *
      (isLit ? 1 : DARK_AIM) *
      (target.state === 'foot' ? FOOT_AIM : 1);
    const hit = nextRandom(s) < chance;
    s.throws.push({ watcher: id, token: target.id, hit });
    // The Keeper sees lit throws land or miss: over winters that is what he believes of their aim (G3-3).
    if (isLit) hear(s.keeper, id, 'skill:sling', hit ? 1 : 0, m, SEEN_THROW);
    if (!hit) continue;
    target.hp -= 1;
    if (target.hp <= 0) {
      target.state = 'fled';
      target.since = m;
      const d = s.tally.driven[section];
      d[target.kind] = (d[target.kind] ?? 0) + 1;
      s.tally.heroes[section].push(id);
      if (isLit)
        alert(s, {
          section,
          kind: 'driven',
          who: id,
          text: `${nameOf(s, id)} drove ${plural(target.kind, 1)} off ${section === 'gate' ? 'the gate road' : `the ${sectionDef(section).name.toLowerCase()}`}.`,
          slowed: false,
        });
    }
  }

  s.tokens = s.tokens.filter((t) => t.state === 'coming' || t.state === 'foot' || m - t.since < TOKEN_LINGER);
  s.minute += 1;
  if (s.minute >= nightEnd(s)) enterDawn(s);
}

/** Fear aimed at a stretch of wall, summed (0..1). */
export function fearAt(p: Person, section: SectionId): number {
  let f = 0;
  for (const e of p.affect.emotions) if (e.id === 'fear' && e.targetId === section) f += e.intensity;
  return Math.min(1, f);
}

/**
 * Every ten minutes: who is shaken by the stretch they stand (fear aimed at it), and who stands beside someone
 * they care about, or someone they can't abide, while a threat is there. Both go in the night's notes; under
 * the lantern the Keeper sees them.
 */
function feelings(s: WatchState, lit: SectionId | null): void {
  for (const sec of SECTION_IDS) {
    const here = postedIn(s, sec);
    const danger = s.tokens.some(
      (t) => t.section === sec && (t.state === 'foot' || (t.state === 'coming' && t.pos >= MOTION_REACH)),
    );
    for (const id of here) {
      const p = personOf(s, id);
      if (!p || p.body.downed) continue;
      if (fearAt(p, sec) > 0.3) note(s, { who: id, kind: 'shaken', section: sec });
      if (!danger) continue;
      for (const other of here) {
        if (other === id) continue;
        const tie = p.social.relationships.find((r) => r.otherId === other);
        if (!tie || Math.abs(tie.affection) < 0.45) continue;
        if (note(s, { who: id, kind: 'together', section: sec, other }) && sec === lit)
          observeAct(s.keeper, id, { at: s.minute, clarity: 0.8, withId: other, toward: tie.affection });
      }
    }
  }
}

/** A threat at home: a watcher with family behind that stretch takes on the duty of going to them. */
function homeDuty(s: WatchState, id: WatcherId, section: SectionId): void {
  const p = personOf(s, id);
  const family = familyWords(s, id);
  if (!p || family === null || villager(s, id).home !== section) return;
  if (
    p.agenda.commitments.some(
      (c) => c.status === 'pending' && c.actions.includes('go-home') && c.until > s.minute,
    )
  )
    return;
  promise(p, {
    kind: 'duty',
    toId: `home:${section}`,
    actions: ['go-home'],
    from: s.minute,
    until: s.minute + 90,
    importance: 0.45 + 0.5 * p.traits.emotionality,
    label: `see to ${family}`,
  });
}

/**
 * A threat at a section: the watchers there see it (fear aimed at that stretch), their neighbours hear it, and
 * those whose family lives behind it learn their home is in danger.
 */
function warnWatchers(s: WatchState, t: Token, severity: number): void {
  const idx = SECTION_IDS.indexOf(t.section);
  s.homeThreat[t.section] = s.minute;
  for (const id of presentIds(s)) {
    const pl = s.place[id];
    const atSec = isPost(pl) ? postSection(pl) : undefined;
    const here = atSec === t.section;
    const near = atSec !== undefined && Math.abs(SECTION_IDS.indexOf(atSec) - idx) === 1;
    const home = atSec !== undefined && villager(s, id).home === t.section && familyWords(s, id) !== null;
    if (!here && !near && !home) continue;
    if (home && severity >= 0.6) homeDuty(s, id, t.section);
    const what = t.kind === 'wolf' ? 'wolves' : 'strangers';
    tell(
      s,
      id,
      {
        at: s.minute,
        channel: here ? 'saw' : 'heard',
        kind: 'threat',
        placeId: t.section,
        salience: here ? 0.85 : home ? 0.75 : 0.5,
        valence: -0.5,
        summary:
          home && !here
            ? `${what} by ${theSection(t.section)}, where my family sleeps`
            : `${what} at ${theSection(t.section)}`,
        threat: { severity: here ? severity : home ? severity * 0.9 : severity * 0.5, sourceId: t.section },
        near: here || home,
      },
      here || home,
    );
  }
}

function bite(s: WatchState, id: WatcherId, t: Token): void {
  const p = personOf(s, id);
  if (!p) return;
  const severity = 0.3 + 0.35 * nextRandom(s);
  injure(p, { part: 'leg', severity, healRatePerDay: 0.12, bleeding: 0.25 + 0.3 * nextRandom(s) });
  strain(p, 0.3 * severity);
  note(s, { who: id, kind: 'bitten', section: t.section });
  tell(
    s,
    id,
    {
      at: s.minute,
      channel: 'felt',
      kind: 'hurt',
      placeId: t.section,
      salience: 0.95,
      valence: -0.8,
      summary: `a wolf bit me at ${theSection(t.section)}`,
      threat: { severity: 0.8, sourceId: t.section },
      near: true,
    },
    true,
  );
  if (litSection(s) === t.section) {
    alert(s, {
      section: t.section,
      kind: 'person',
      who: id,
      text: `A wolf has ${nameOf(s, id)} by the leg.`,
      slowed: true,
    });
    glimpseOf(s.keeper, p, s.minute, 0.9);
  }
  if (readCapacities(p).moving < 0.3) downed(s, id, t.section);
}

function strike(s: WatchState, id: WatcherId, section: SectionId): void {
  const p = personOf(s, id);
  if (!p) return;
  injure(p, { part: 'head', severity: 0.4, healRatePerDay: 0.2 });
  knockDown(p, { reason: 'struck', until: s.minute + 120 });
  strain(p, 0.15);
  downed(s, id, section);
  tell(s, id, {
    at: s.minute,
    channel: 'felt',
    kind: 'hurt',
    placeId: section,
    salience: 0.95,
    valence: -0.8,
    summary: `a thief struck me down at ${theSection(section)}`,
    threat: { severity: 0.7, sourceId: section },
    near: true,
  });
}

function downed(s: WatchState, id: WatcherId, section: SectionId): void {
  if (!note(s, { who: id, kind: 'downed', section })) return;
  alert(s, {
    section,
    kind: 'person',
    who: id,
    text:
      litSection(s) === section
        ? `${nameOf(s, id)} is down at ${theSection(section)}.`
        : `A cry from ${theSection(section)}: someone is down.`,
    slowed: true,
  });
  for (const other of presentIds(s)) {
    if (other === id) continue;
    tell(
      s,
      other,
      {
        at: s.minute,
        channel: 'heard',
        kind: 'downed',
        actorId: id,
        placeId: section,
        salience: 0.8,
        valence: -0.5,
        summary: `${nameOf(s, id)} is down at ${theSection(section)}`,
        near: sectionOf(s, other) === section,
      },
      sectionOf(s, other) === section,
    );
  }
}
