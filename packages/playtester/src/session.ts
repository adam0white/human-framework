/**
 * SCOPE: an HF person plays a game through a `GameAdapter`, and the session records where it got bored, frustrated,
 * rewarded or stopped. Choices come at two speeds.
 * - Once a real minute (HF lives on minutes) the player makes an HF `decide` among `play-on`, `look-away` and
 *   `stop-playing`. Playing on is a 20-minute HF activity, so between checks HF's own inertia keeps it unless
 *   something pulls harder: boredom (HF's emotion, favouring `novel`-tagged options; stopping counts as novel only
 *   once the game has gone stale), distress (favouring `rest`, which stopping carries), the agenda (a bus stop or a
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
 * Attended events refill it by salience, weight and novelty (each event kind habituates, halving after a minute,
 * faster for open people); on-screen pressure adds a little; it fades with a half-life set by patience
 * (agreeableness). A minute under `boredLine` is felt as HF boredom, more strongly for impatient people. A stretch
 * of play gives HF realized leisure (engagement × rate) and competence (rewards minus setbacks) when it ends, so
 * HF's leisure need and learned expectations follow the game. Shapes: boredom as unengaged attention and lack of
 * meaning (Eastwood et al. 2012; Westgate and Wilson 2018), habituation to repeated stimuli. Every number is an
 * engineering premise for playtesting, tuned so the toy controls in test/ behave sensibly; none is an estimate of
 * real players.
 *
 * It does not model reading speed, motor skill, the player learning the rules (inputs carry no learned
 * expectation), social play, or monetisation. It reads only what the adapter shows; it cannot see a game's truth.
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
  tendencyEmotions,
} from '@adam0white/human-framework';
import type { GameAdapter, Observation, PlayEvent } from './adapter.ts';
import { makePlayer, type Persona } from './persona.ts';

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
}

export interface Moment {
  t: number;
  clock: string;
  kind: 'bored' | 'frustrated' | 'rewarded' | 'looked-away' | 'stopped' | 'finished' | 'time-limit';
  text: string;
}

export interface SessionTrace {
  game: string;
  persona: string;
  seed: number;
  beats: Beat[];
  moments: Moment[];
  ended: { t: number; clock: string; reason: 'quit' | 'agenda' | 'game-over' | 'time-limit'; why: string };
  /** The HF person after the session (for inspection). */
  player: Person;
}

const round = (x: number) => Math.round(x * 1000) / 1000;
const clampU = (x: number) => Math.max(0, Math.min(1, x));

/** Play one session of `adapter` as `persona`. Deterministic for a given game state, persona and seed. */
export function playSession(
  adapter: GameAdapter,
  persona: Persona,
  seed: number,
  opts: {
    maxMinutes?: number;
    /** Debug hook: each minute's HF decision record, or each input's scored options. */
    onDecide?: (
      level: 'minute' | 'input',
      t: number,
      rec: { considered: Considered[]; chosenAffordanceId?: string | null },
    ) => void;
  } = {},
): SessionTrace {
  const S = SESSION_DEFAULTS;
  const p = makePlayer(persona, seed);
  const beatS = persona.beatSeconds;
  const perMinute = Math.max(1, Math.round(60 / beatS));
  const halfLife = S.engagementHalfLifeBase + S.engagementHalfLifeSpan * p.traits.agreeableness;
  const habit = S.habituationBase + S.habituationSpan * p.traits.openness;
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
  let last = { bored: false, frustrated: false };
  // The minute so far, and the running stretch of play: what HF is told when the activity ends.
  let acc = { e: 0, reward: 0, setback: 0, beats: 0 };
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
    const now = persona.startsAt + Math.floor(t / 60);
    // 1. What reaches the player: HF attention over what is visible.
    const visible =
      stance === 'look-away' ? obs.events.filter((e) => e.salience >= S.lookAwaySalience) : obs.events;
    const attended = perceive(
      p,
      visible.map((e) => toPercept(p, e, now, S.appraisalScale)),
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
      stim += e.salience * (0.4 + 0.6 * Math.abs(e.valence)) * novelty;
      if (e.valence > 0) acc.reward += e.valence * e.salience;
      else acc.setback -= e.valence * e.salience;
      if (e.valence >= S.rewardedAt) moment('rewarded', e.summary);
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
          // Something else is the new thing only once the game has gone stale.
          tags: mean < S.boredLine ? ['novel', 'rest'] : ['rest'],
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
      acc = { e: 0, reward: 0, setback: 0, beats: 0 };
    }

    // 3. Moment to moment, while playing: one input or none, chosen by HF over the game's actions.
    let choice = 'wait';
    let why = stanceWhy;
    if (stance === 'play') {
      const game = adapter.actions();
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
    });
    const bored = boredom >= S.boredAt;
    if (bored && !last.bored)
      moment('bored', `nothing has held me for a while (engagement ${engagement.toFixed(2)}, ${obs.phase})`);
    const frustrated = frustration >= S.frustratedAt;
    if (frustrated && !last.frustrated) {
      const bad = noticed.filter((e) => e.valence < 0).map((e) => e.summary);
      moment('frustrated', bad.length ? bad.join('; ') : 'things keep going wrong');
    }
    last = { bored, frustrated };

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
