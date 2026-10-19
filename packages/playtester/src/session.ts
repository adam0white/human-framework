/**
 * SCOPE: an HF person plays a game through a `GameAdapter`, and the session records where it got bored, frustrated,
 * rewarded or stopped. Choices come at two speeds.
 * - Once a real minute (HF lives on minutes) the player makes an HF `decide` among `play-on`, `look-away` and
 *   `stop-playing`. Playing on is a 20-minute HF activity, so between checks HF's own inertia keeps it unless
 *   something pulls harder: boredom (HF's emotion, favouring `novel`-tagged options; stopping counts as novel only
 *   once the game has gone stale), distress (favouring `rest`, which stopping carries only once setbacks have kept coming: one hard blow is a
 *   loss the player plays through, a stream of them is frustration), the agenda (a bus stop or a
 *   bedtime is a commitment `stop-playing` keeps; a wish to see the game through is a goal `play-on` advances),
 *   sleepiness and the leisure need. Joy pulls toward looking away a little (HF's 'novel' weight), which is
 *   the brief glance a pleased player takes.
 * - Every beat (3 real seconds) while playing, one input or none: the game's actions and `wait` are scored by HF's
 *   own scorer (`scoreAll`: needs, emotion tendencies such as anger toward `confront`-tagged insisting, effort)
 *   without the running activity or its inertia, and sampled by softmax with the session's own seeded RNG. An
 *   input is not a new HF activity, so HF learns nothing per input; it learns from each stretch of play.
 * HF also supplies attention (`perceive` drops what a tired or occupied person misses; looking away shows only
 * salient events, and one pulls the eyes back) and appraisal (events become joy, distress or anger at who did it).
 *
 * The session holds one fast store HF does not have: `engagement`, 0..1, how much the screen is holding attention.
 * HF's leisure need moves over hours; play-session boredom moves over seconds, so this store bridges the two.
 * Attended events refill it by salience, stakes (|valence|; an event with none adds little) and novelty (each event kind habituates, halving after a minute,
 * faster for open people); on-screen pressure adds a little; it fades with a half-life set by patience
 * (agreeableness). A minute under `boredLine` is felt as HF boredom, more strongly for impatient people. A stretch
 * of play gives HF realized leisure (engagement × rate) and competence (rewards minus setbacks) when it ends, so
 * HF's leisure need and learned expectations follow the game. Shapes: boredom as unengaged attention and lack of
 * meaning (Eastwood et al. 2012; Westgate and Wilson 2018), habituation to repeated stimuli. Every number is an
 * engineering premise for playtesting, tuned so the toy controls in test/ behave sensibly; none is an estimate of
 * real players.
 *
 * It does not model reading speed, motor skill, the player learning the rules (inputs carry no learned
 * expectation, except the edge-pushers' session-side record in `style.ts`), social play, or monetisation. It reads
 * only what the adapter shows; it cannot see a game's truth.
 *
 * Each beat records the events shown (kind, valence, whether it answered an input) and the input's kind, so the
 * cohort tools can find edges from the trace alone. A session can continue an existing player on a later day
 * (`opts.player`, `opts.at`), which is how the returner plays its second evening.
 */
import {
  type Affordance,
  actionTendencies,
  begin,
  type Considered,
  type DecideContext,
  decide,
  dominantTerm,
  emotionLevel,
  feel,
  finish,
  lifeModifiers,
  type NeedId,
  type Percept,
  type Person,
  perceive,
  readPerson,
  scoreAll,
  skip,
  tendencyEmotions,
} from '@adam0white/human-framework';
import {
  answerOf,
  type GameAdapter,
  type Observation,
  type PlayAction,
  type PlayEvent,
  type ShownEvent,
} from './adapter.ts';
import { bookSession, makePlayer, type Persona } from './persona.ts';
import { STYLE_DEFAULTS, StyleMind } from './style.ts';

export const SESSION_DEFAULTS = {
  /** Engagement half-life in seconds: base + span × agreeableness (patience). */
  engagementHalfLifeBase: 20,
  engagementHalfLifeSpan: 70,
  /** Event-kind habituation: novelty = 1 / (1 + h × n), h = base + span × openness; n halves every minute. */
  habituationBase: 0.3,
  habituationSpan: 0.7,
  habituationHalfLife: 60,
  /** Share of on-screen pressure that holds attention by itself. */
  pressureHold: 0.15,
  /**
   * What an event without stakes (valence 0) adds to engagement, per unit salience; stakes add the rest up to 1.
   * Low on purpose (2026-10-19): a steady drip of neutral log lines held every persona at 0.7–0.9, and nobody bored.
   */
  neutralStim: 0.12,
  /** Share of an event's valence HF appraises: a game setback weighs less than one in the player's own life. */
  appraisalScale: 0.5,
  /** Leisure per minute of play at full engagement (advertised and realized alike, so HF's learning agrees). */
  playLeisure: 0.02,
  /** Minutes one choice to play on covers (HF activity length), so inertia holds it between minute checks. */
  stretchMinutes: 20,
  /** Realized competence per minute = competenceRate × (rewards − setbacks), clamped to ±competenceRate. */
  competenceRate: 0.03,
  /** What the alternatives give: a minute with eyes off the screen, or per minute of something else instead. */
  lookAway: { leisure: 0.003, rest: 0.003 },
  stop: { leisure: 0.006, rest: 0.008 },
  /**
   * Loss and frustration are told apart (2026-10-19). A minute is hard when its setbacks outweigh its rewards and
   * reach `hardMinute`; stopping carries HF's `rest` tag (which distress favours) only after `hardMinutes` hard
   * minutes in the last `hardWindow` (so never in the first `hardWindow` minutes), with the window's setbacks `lostBy` times its rewards or more. HF holds joy and
   * distress apart for hours, so a session of mixed nights raises both; the window is where they are weighed. One hard blow is felt (HF distress, a 'setback' moment) but is a loss, not
   * a reason to quit: HF distress lasts hours, a game's bad night does not.
   */
  hardMinute: 0.15,
  hardWindow: 5,
  hardMinutes: 3,
  /** The window is lost when its setbacks exceed its rewards by this factor: clearly losing, not a close night. */
  lostBy: 1.5,
  /** Events below this |valence| (as appraised) count at `smallStakes` weight as reward or setback. */
  stakesAt: 0.2,
  smallStakes: 0.5,
  /** An event this bad (appraised valence) is a setback moment by itself. */
  setbackAt: -0.4,
  /** Engagement below which the minute bores; boredom felt = gain × shortfall, gain from impatience. */
  boredLine: 0.35,
  boredGainBase: 0.25,
  boredGainSpan: 0.5,
  /** Moment-to-moment input: what a game action advertises (competence × promise) and costs. */
  promiseCompetence: 0.3,
  actionFocus: 0.03,
  /** While looking away, only events at least this salient are seen (a sound, a buzz); one pulls the eyes back. */
  lookAwaySalience: 0.8,
  /** Moment thresholds (HF emotion levels and session engagement). */
  boredAt: 0.2,
  frustratedAt: 0.35,
  rewardedAt: 0.45,
  /** Session cap in real minutes. */
  maxMinutes: 90,
};

export interface Beat {
  /** Real seconds since the start. */
  t: number;
  clock: string;
  phase: string;
  /** The minute's stance ('play', 'look-away') and this beat's input ('wait' or a game action id). */
  stance: string;
  choice: string;
  why: string;
  engagement: number;
  boredom: number;
  frustration: number;
  joy: number;
  leisure: number;
  sleepiness: number;
  /** Events seen this beat, and how many shown but missed. */
  noticed: string[];
  missed: number;
  /** Where in the game (the observation's `chapter`, else its phase). */
  chapter: string;
  /** The input's action kind ('wait' when none), whether it was an edge action, and whether it was mischief. */
  kind: string;
  edge?: true;
  mischief?: true;
  /** Inputs on offer this beat (besides waiting). */
  offered: number;
  /** Every event shown this beat (seen or not): kind, valence, and what it answered (1 = any input). */
  shown: ShownEvent[];
}

export interface Moment {
  t: number;
  clock: string;
  kind:
    | 'bored'
    | 'frustrated'
    | 'setback'
    | 'rewarded'
    | 'looked-away'
    | 'stopped'
    | 'finished'
    | 'time-limit'
    | 'answered'
    | 'ignored';
  text: string;
}

export interface SessionTrace {
  game: string;
  persona: string;
  seed: number;
  beats: Beat[];
  moments: Moment[];
  ended: { t: number; clock: string; reason: 'quit' | 'agenda' | 'game-over' | 'time-limit'; why: string };
  /** What the last screen showed: where, how it ended (if it did), and what it left unfinished. */
  final: { chapter: string; outcome?: 'win' | 'loss' | 'mixed'; openLoop: number; loops: string[] };
  /** HF minute the session started. */
  startedAt: number;
  /** The HF person after the session (for inspection). */
  player: Person;
}

const round = (x: number) => Math.round(x * 1000) / 1000;
const STYLE = STYLE_DEFAULTS;
const clampU = (x: number) => Math.max(0, Math.min(1, x));

/** Play one session of `adapter` as `persona`. Deterministic for a given game state, persona and seed. */
export function playSession(
  adapter: GameAdapter,
  persona: Persona,
  seed: number,
  opts: {
    maxMinutes?: number;
    /** Continue this player (a later day) instead of making a new one; booked for the session at `at`. */
    player?: Person;
    /** HF minute the session starts (default `persona.startsAt`, or the player's `now`). */
    at?: number;
    /** Debug hook: each minute's HF decision record, or each input's scored options. */
    onDecide?: (
      level: 'minute' | 'input',
      t: number,
      rec: { considered: Considered[]; chosenAffordanceId?: string | null },
    ) => void;
  } = {},
): SessionTrace {
  const S = SESSION_DEFAULTS;
  let p: Person;
  if (opts.player) {
    p = opts.player;
    const at = opts.at ?? p.now;
    if (at > p.now) skip(p, at);
    bookSession(p, persona, p.now);
  } else p = makePlayer(persona, seed);
  const start = opts.player ? p.now : persona.startsAt;
  const mind = new StyleMind(persona.style);
  const beatS = persona.beatSeconds;
  const perMinute = Math.max(1, Math.round(60 / beatS));
  const halfLife = S.engagementHalfLifeBase + S.engagementHalfLifeSpan * p.traits.agreeableness;
  const habit = (S.habituationBase + S.habituationSpan * p.traits.openness) * mind.habituation;
  const boredGain = S.boredGainBase + S.boredGainSpan * (1 - p.traits.agreeableness);
  const maxS = (opts.maxMinutes ?? S.maxMinutes) * 60;
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const seen = new Map<string, { n: number; t: number }>();
  const beats: Beat[] = [];
  const moments: Moment[] = [];
  let engagement = 0.6;
  let stance: 'play' | 'look-away' = 'play';
  let stanceWhy = '';
  let t = 0;
  let beat = 0;
  let obs: Observation = adapter.observe();
  const last = { bored: false, frustrated: false };
  // The last `hardWindow` minutes' rewards and setbacks. A stream means several hard minutes and a window clearly
  // lost: one blow is not one, and neither are a defence game's mixed nights.
  const hard: { reward: number; setback: number }[] = [];
  const streak = () =>
    hard.length >= S.hardWindow &&
    hard.filter((m) => m.setback >= S.hardMinute && m.setback > m.reward).length >= S.hardMinutes &&
    hard.reduce((n, m) => n + m.setback - S.lostBy * m.reward, 0) > 0;
  // Frustration is distress or anger while setbacks keep coming; checked each beat and before each minute's choice.
  const frustratedNow = (bad: string[]) => {
    const on =
      Math.min(1, emotionLevel(p, 'anger') + emotionLevel(p, 'distress')) >= S.frustratedAt && streak();
    if (on && !last.frustrated) moment('frustrated', bad.length ? bad.join('; ') : 'things keep going wrong');
    last.frustrated = on;
  };
  // The minute so far, and the running stretch of play: what HF is told when the activity ends.
  let acc = { e: 0, reward: 0, setback: 0, beats: 0, bad: [] as string[] };
  let stretch = { leisure: 0, competence: 0 };
  const endActivity = (at: number, status: 'completed' | 'interrupted') => {
    const act = p.activity;
    if (!act) return;
    const needs: Partial<Record<NeedId, number>> =
      act.action === 'play-on' ? { ...stretch } : act.action === 'look-away' ? { ...S.lookAway } : {};
    finish(p, { affordanceId: act.affordanceId, action: act.action, status, at, needs });
    stretch = { leisure: 0, competence: 0 };
  };
  const moment = (kind: Moment['kind'], text: string) => moments.push({ t, clock: obs.clock, kind, text });

  for (;;) {
    const now = start + Math.floor(t / 60);
    // 1. What reaches the player: HF attention over what is visible.
    const visible =
      stance === 'look-away' ? obs.events.filter((e) => e.salience >= S.lookAwaySalience) : obs.events;
    const attended = perceive(
      p,
      visible.map((e) => toPercept(p, e, now, S.appraisalScale * mind.appraisal)),
    );
    // Match attended percepts back to events one for one (two events may share a summary).
    const left = attended.map((a) => a.summary);
    const noticed = obs.events.filter((e) => {
      const i = left.indexOf(e.summary);
      if (i < 0) return false;
      left.splice(i, 1);
      return true;
    });
    let stim = S.pressureHold * (obs.features.pressure ?? 0);
    for (const e of noticed) {
      const prior = seen.get(e.kind);
      const n = prior ? prior.n * 2 ** (-(t - prior.t) / S.habituationHalfLife) : 0;
      seen.set(e.kind, { n: n + 1, t });
      const novelty = 1 / (1 + habit * n);
      stim += e.salience * (S.neutralStim + (1 - S.neutralStim) * Math.abs(e.valence)) * novelty;
      const v = e.valence * mind.appraisal;
      // Small news (a character walking off, a line of chatter) weighs less than a win or a blow, but a drip of
      // small refusals still adds up.
      const w = Math.abs(v) < S.stakesAt ? S.smallStakes : 1;
      if (v > 0) acc.reward += w * v * e.salience;
      else if (v < 0) {
        acc.setback -= w * v * e.salience;
        if (!acc.bad.includes(e.summary)) acc.bad.push(e.summary);
      }
      if (v >= S.rewardedAt) moment('rewarded', e.summary);
      if (v <= S.setbackAt) moment('setback', e.summary);
    }
    // The style's record: answers and payoffs credited to recent inputs (see style.ts).
    const styled = mind.credit(beat, obs.events);
    if (mind.style === 'mischief') {
      for (const a of styled.answered) {
        stim += STYLE.mischiefRelish * a.by.salience;
        acc.reward += STYLE.mischiefRelish * a.by.salience;
        moment('answered', `they rose to it: ${a.by.summary}`);
      }
      for (const g of styled.ignored)
        if (g.mischief) {
          feel(p, 'boredom', STYLE.mischiefIgnoredBoredom, 'game:ignored', now);
          moment('ignored', `nothing came of ${g.id}`);
        }
    } else if (mind.style === 'rules')
      for (const g of styled.ignored) {
        feel(p, 'distress', STYLE.rulesSilentDistress, 'game:silent', now);
        moment('ignored', `no answer to ${g.id}`);
      }
    engagement = engagement * 2 ** (-beatS / halfLife);
    engagement += (1 - engagement) * Math.min(1, stim);
    acc.e += engagement;
    acc.beats += 1;
    if (stance === 'look-away' && noticed.length > 0) {
      stance = 'play';
      stanceWhy = `pulled back by ${noticed[0]?.summary ?? 'the screen'}`;
    }

    if (obs.over || t >= maxS) {
      if (stance === 'play') stretch.leisure += S.playLeisure * (acc.beats ? acc.e / acc.beats : engagement);
      if (p.activity) endActivity(now, 'completed');
      if (obs.over) {
        moment('finished', 'the game ended');
        return close('game-over', 'the game ended');
      }
      moment('time-limit', 'session cap reached');
      return close('time-limit', 'session cap');
    }

    // 2. Once a minute, the player's own choice: play on, look away, or stop. HF lives on minutes. Playing on is
    // a stretch of `stretchMinutes`, so while it runs HF's inertia keeps it unless something pulls harder.
    if (beat % perMinute === 0) {
      const mean = acc.beats ? acc.e / acc.beats : engagement;
      const c = S.competenceRate;
      if (stance === 'play') {
        stretch.leisure += S.playLeisure * mean;
        stretch.competence += Math.max(-c, Math.min(c, c * (acc.reward - acc.setback)));
      }
      if (p.activity && (p.activity.action !== 'play-on' || now >= p.activity.endsAt))
        endActivity(now, 'completed');
      if (beat > 0) {
        hard.push({ reward: acc.reward, setback: acc.setback });
        if (hard.length > S.hardWindow) hard.shift();
        frustratedNow(acc.bad);
      }
      if (beat > 0 && mean < S.boredLine)
        feel(p, 'boredom', clampU(boredGain * (1 - mean / S.boredLine)), 'game:dull', now);
      const playOn: Affordance = {
        id: 'play-on',
        action: 'play-on',
        label: 'keep playing',
        duration: S.stretchMinutes,
        effort: 0,
        advertises: { leisure: S.playLeisure * engagement * S.stretchMinutes },
      };
      const scale = (x: Record<string, number>, k: number) =>
        Object.fromEntries(Object.entries(x).map(([id, v]) => [id, v * k]));
      const offers: Affordance[] = [
        playOn,
        {
          id: 'look-away',
          action: 'look-away',
          label: 'look away',
          duration: 1,
          effort: 0,
          advertises: { ...S.lookAway },
          tags: ['novel'],
        },
        {
          id: 'stop-playing',
          action: 'stop-playing',
          label: 'stop playing',
          duration: S.stretchMinutes,
          effort: 0,
          advertises: scale(S.stop, S.stretchMinutes),
          // Something else is the new thing only once the game has gone stale; a rest from it only once setbacks
          // have kept coming.
          tags: [...(mean < S.boredLine ? ['novel'] : []), ...(streak() ? ['rest'] : [])],
        },
      ];
      const rec = decide(p, offers, { now });
      opts.onDecide?.('minute', t, rec);
      const chosen = offers.find((o) => o.id === rec.chosenAffordanceId) ?? playOn;
      const why = dominantTerm(rec.considered.find((c) => c.affordanceId === chosen.id));
      if (chosen.id === 'stop-playing') {
        if (p.activity) endActivity(now, 'interrupted');
        const reason = why.startsWith('commitment') || why.startsWith('agenda') ? 'agenda' : 'quit';
        moment('stopped', `${reason === 'agenda' ? 'had to stop' : 'put it down'} (${why})`);
        return close(reason, why);
      }
      if (p.activity?.affordanceId !== chosen.id) {
        if (p.activity) endActivity(now, 'interrupted');
        begin(p, chosen, rec);
      }
      if (chosen.id === 'look-away' && stance !== 'look-away') moment('looked-away', `looked away (${why})`);
      stance = chosen.id === 'look-away' ? 'look-away' : 'play';
      stanceWhy = why;
      acc = { e: 0, reward: 0, setback: 0, beats: 0, bad: [] };
    }

    // 3. Moment to moment, while playing: one input or none, chosen by HF over the game's actions.
    let choice = 'wait';
    let choiceKind = 'wait';
    let choiceEdge = false;
    let why = stanceWhy;
    let picked: PlayAction | undefined;
    let offered = 0;
    if (stance === 'play') {
      const plain = adapter.actions();
      const edges = mind.style && adapter.edgeActions ? adapter.edgeActions() : [];
      const edgeIds = new Set(edges.map((a) => a.id));
      const game = mind.shape([...plain, ...edges.filter((a) => !plain.some((x) => x.id === a.id))]);
      offered = game.length;
      if (game.length > 0) {
        const offers: Affordance[] = game.map((a) => {
          const aff: Affordance = {
            id: a.id,
            action: `play:${a.kind}`,
            label: a.label,
            duration: 1,
            effort: 0,
            focus: a.focus ?? S.actionFocus,
            advertises: { competence: S.promiseCompetence * clampU(a.promise) },
          };
          if (a.tags) aff.tags = [...a.tags];
          return aff;
        });
        offers.push({
          id: 'wait',
          action: 'play:wait',
          label: 'wait',
          duration: 1,
          effort: 0,
          advertises: {},
        });
        const scored = scoreInputs(p, offers);
        opts.onDecide?.('input', t, scored);
        const pick = pickSoftmax(scored, persona.temperature, rng);
        choice = pick?.affordanceId ?? 'wait';
        why = dominantTerm(pick);
        picked = game.find((a) => a.id === choice);
        if (picked) {
          choiceKind = picked.kind;
          choiceEdge = edgeIds.has(picked.id);
        }
      }
    }

    const boredom = emotionLevel(p, 'boredom');
    const frustration = Math.min(1, emotionLevel(p, 'anger') + emotionLevel(p, 'distress'));
    beats.push({
      t,
      clock: obs.clock,
      phase: obs.phase,
      stance,
      choice,
      why,
      engagement: round(engagement),
      boredom: round(boredom),
      frustration: round(frustration),
      joy: round(emotionLevel(p, 'joy')),
      leisure: round(p.needs.leisure),
      sleepiness: round(readPerson(p).body.perceived.sleepiness),
      noticed: noticed.map((e) => e.summary),
      missed: obs.events.length - noticed.length,
      chapter: obs.chapter ?? obs.phase,
      offered,
      kind: choiceKind,
      ...(choiceEdge ? { edge: true as const } : {}),
      // Mischief in the trace: an input the adapter marks as mischief, or a confrontation chosen by the
      // mischief-maker. Another player's plain insisting is play, not provocation.
      ...(picked && (picked.mischief || (mind.style === 'mischief' && picked.tags?.includes('confront')))
        ? { mischief: true as const }
        : {}),
      shown: obs.events.map((e) => {
        const ev: ShownEvent = { k: e.kind, v: round(e.valence) };
        const a = answerOf(e);
        if (a) ev.a = a;
        return ev;
      }),
    });
    const bored = boredom >= S.boredAt;
    if (bored && !last.bored)
      moment('bored', `nothing has held me for a while (engagement ${engagement.toFixed(2)}, ${obs.phase})`);
    frustratedNow(noticed.filter((e) => e.valence < 0).map((e) => e.summary));
    last.bored = bored;

    if (picked) mind.applied(beat, picked);
    if (choice !== 'wait') adapter.apply(choice);
    adapter.advance(beatS);
    t += beatS;
    beat += 1;
    obs = adapter.observe();
  }

  function close(reason: SessionTrace['ended']['reason'], why: string): SessionTrace {
    return {
      game: adapter.name,
      persona: persona.id,
      seed,
      beats,
      moments,
      ended: { t, clock: obs.clock, reason, why },
      final: {
        chapter: obs.chapter ?? obs.phase,
        ...(obs.outcome ? { outcome: obs.outcome } : {}),
        openLoop: clampU(obs.features.openLoop ?? 0),
        loops: [...(obs.loops ?? [])],
      },
      startedAt: start,
      player: p,
    };
  }
}

/**
 * Score moment-to-moment inputs as HF would score offers (needs, emotion tendencies such as anger toward
 * `confront`, effort, learned expectations), without the running activity, inertia, RNG or any write: an input
 * is not a new activity, so it must not compete with playing on itself.
 */
function scoreInputs(p: Person, offers: Affordance[]): { considered: Considered[] } {
  const { body, needs, desperation } = readPerson(p);
  const ctx: DecideContext = {
    id: 'input',
    now: p.now,
    body,
    needs,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    desperation,
    habit: { now: p.now },
    necessity: true,
    tendencyEmotions: tendencyEmotions(p),
  };
  return { considered: scoreAll(p, offers, ctx).considered };
}

/** Softmax over utilities with the session's own seeded RNG (the person's RNG is kept for HF's own choices). */
function pickSoftmax(
  s: { considered: Considered[] },
  temperature: number,
  rng: () => number,
): Considered | undefined {
  const xs = s.considered.filter((c) => Number.isFinite(c.utility));
  if (xs.length === 0) return undefined;
  const top = Math.max(...xs.map((c) => c.utility));
  if (!(temperature > 0)) return xs.find((c) => c.utility === top);
  const w = xs.map((c) => Math.exp((c.utility - top) / temperature));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (const [i, c] of xs.entries()) {
    r -= w[i] ?? 0;
    if (r <= 0) return c;
  }
  return xs[xs.length - 1];
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toPercept(p: Person, e: PlayEvent, at: number, scale: number): Percept {
  const pc: Percept = {
    at,
    channel: 'saw',
    kind: e.kind,
    targetId: p.id,
    salience: Math.max(0, Math.min(1, e.salience)),
    valence: scale * Math.max(-1, Math.min(1, e.valence)),
    summary: e.summary,
  };
  if (e.by !== undefined) pc.actorId = e.by;
  return pc;
}
