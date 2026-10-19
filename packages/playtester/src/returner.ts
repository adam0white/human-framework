/**
 * SCOPE: coming back the next day. After a session that did not end the game, the same HF person lives on to the
 * next evening (`skip`: mood, memory and habits decay; nothing is decided), and at its usual start time decides,
 * with HF's ordinary `decide`, between going back to the game and something else that evening.
 * - Going back is the action `play-on`, so HF's learned expectation of the game (from every stretch of play it
 *   finished yesterday) weighs in by itself. Its advertised leisure is the session as remembered: the mean of its
 *   best minute and its last minute (peak-end; Fredrickson and Kahneman 1993), times the play rate.
 * - An open loop is an HF goal: if the last screen left something unfinished (`features.openLoop`, `loops`), the
 *   player adopts "see what happens with …", closed by one finished stretch of `play-on`, at importance
 *   `loopImportance × openLoop × remembered` (a loop left by a dull session pulls little); one at a time. This
 *   reads the Ovsiankina effect (people tend to resume interrupted tasks) more than Zeigarnik's memory claim, whose
 *   replication is weak (Ghibellini and Meier 2023). A loop left open twice is not adopted twice.
 * - The other evening is always there and nearly as good as a good session (`elsewhere`): the returner is hard to
 *   please. A good session with nothing left open is about a coin flip; HF's habit term (a cued, repeated evening
 *   act) then makes each further return a little likelier, as it would for any routine.
 * The leisure appetite is reset to the persona's own at each evening (a working day in between; HF's `skip` does
 * not drain needs). The game keeps its state between sessions (the adapter is the save). Every number is an
 * engineering premise for playtesting, not an estimate of real players. It does not model notifications, streaks,
 * friends or anything outside the screen.
 */
import {
  type Affordance,
  adoptGoal,
  begin,
  decide,
  dominantTerm,
  MINUTES_PER_DAY,
  satisfy,
  skip,
} from '@adam0white/human-framework';
import type { GameAdapter } from './adapter.ts';
import type { Persona } from './persona.ts';
import { playSession, SESSION_DEFAULTS, type SessionTrace } from './session.ts';

export const RETURN_DEFAULTS = {
  /**
   * Importance of an open loop's goal at `openLoop` = 1 after a session remembered at full engagement (it scales with
   * both): enough to tip a close evening, not to override a poor session.
   */
  loopImportance: 0.06,
  /** Engagement-equivalent of the other evening: what `elsewhere` advertises, as a fraction of full play. */
  elsewhere: 0.85,
};

export interface ReturnDecision {
  /** Day index (1 = the day after the first session). */
  day: number;
  returned: boolean;
  why: string;
  /** Remembered quality (peak-end engagement) and the loop left open, as the decision saw them. */
  remembered: number;
  openLoop: number;
  loops: string[];
  /** The open-loop goal's HF id, while one is active (its term is `goal:<id>`). */
  loopGoal?: string;
  /** Both options as HF scored them: utility and the three largest terms. */
  options: { id: string; utility: number; terms: string[] }[];
}

export interface DaysTrace {
  game: string;
  persona: string;
  seed: number;
  sessions: SessionTrace[];
  decisions: ReturnDecision[];
}

/** Peak-end engagement of a session: the mean of its best real minute and its last one. */
export function rememberedQuality(tr: SessionTrace): number {
  const per = Math.max(
    1,
    Math.round(60 / Math.max(1, tr.beats[1] ? tr.beats[1].t - (tr.beats[0]?.t ?? 0) : 3)),
  );
  const minutes: number[] = [];
  for (let i = 0; i < tr.beats.length; i += per) {
    const slice = tr.beats.slice(i, i + per);
    minutes.push(slice.reduce((s, b) => s + b.engagement, 0) / (slice.length || 1));
  }
  if (minutes.length === 0) return 0;
  return (Math.max(...minutes) + (minutes[minutes.length - 1] ?? 0)) / 2;
}

/**
 * Play the first session, then up to `persona.returnDays` later evenings, each only if the player decides to go
 * back. Stops when the game ends or the player stays away (a player who stays away once is gone).
 */
export function playDays(
  adapter: GameAdapter,
  persona: Persona,
  seed: number,
  opts: { maxMinutes?: number; days?: number } = {},
): DaysTrace {
  const R = RETURN_DEFAULTS;
  const S = SESSION_DEFAULTS;
  const days = opts.days ?? persona.returnDays ?? 0;
  const first = playSession(adapter, persona, seed, opts.maxMinutes ? { maxMinutes: opts.maxMinutes } : {});
  const out: DaysTrace = {
    game: adapter.name,
    persona: persona.id,
    seed,
    sessions: [first],
    decisions: [],
  };
  const p = first.player;
  let last = first;
  const appetite = persona.spec.needs?.leisure;
  let loopGoal: string | undefined;
  for (let day = 1; day <= days; day++) {
    if (last.ended.reason === 'game-over') break;
    const remembered = rememberedQuality(last);
    const { openLoop, loops } = last.final;
    if (openLoop > 0 && !(loopGoal && p.agenda.goals.some((g) => g.id === loopGoal && g.status === 'active')))
      loopGoal = adoptGoal(
        p,
        {
          label: `see what happens with ${loops[0] ?? 'it'}`,
          serves: ['competence', 'meaning'],
          // One finished stretch of play closes it: the loop brings the player back, it does not hold them.
          advancedBy: [{ action: 'play-on', amount: 1 }],
          importance: R.loopImportance * openLoop * remembered,
        },
        p.now,
      ).id;
    const evening = (Math.floor(p.now / MINUTES_PER_DAY) + 1) * MINUTES_PER_DAY + persona.startsAt;
    skip(p, evening);
    // The persona's own appetite for play returns by evening (HF's `skip` holds needs); set through `satisfy`.
    if (appetite !== undefined) satisfy(p, { leisure: appetite - p.needs.leisure });
    const offers: Affordance[] = [
      {
        id: 'play-on',
        action: 'play-on',
        label: 'go back to the game',
        duration: S.stretchMinutes,
        effort: 0,
        advertises: { leisure: S.playLeisure * remembered * S.stretchMinutes },
      },
      {
        id: 'elsewhere',
        action: 'elsewhere',
        label: 'do something else this evening',
        duration: S.stretchMinutes,
        effort: 0,
        advertises: { leisure: S.playLeisure * R.elsewhere * S.stretchMinutes },
        tags: ['novel'],
      },
    ];
    const rec = decide(p, offers, { now: evening });
    const chosen = rec.chosenAffordanceId ?? 'elsewhere';
    const why = dominantTerm(rec.considered.find((c) => c.affordanceId === chosen));
    const returned = chosen === 'play-on';
    const options = rec.considered.map((c) => ({
      id: c.affordanceId,
      utility: round(c.utility),
      terms: [...c.terms]
        .sort((x, y) => Math.abs(y.value) - Math.abs(x.value))
        .slice(0, 3)
        .map((t) => `${t.source} ${round(t.value)}`),
    }));
    out.decisions.push({
      day,
      returned,
      why,
      remembered: round(remembered),
      openLoop,
      loops: [...loops],
      ...(loopGoal ? { loopGoal } : {}),
      options,
    });
    if (!returned) break;
    // Going back is the decision just made: the session opens on that stretch of play, so its first minute is a
    // review of it (HF's inertia), not a fresh choice.
    const back = offers[0];
    if (back) begin(p, back, rec);
    last = playSession(adapter, persona, seed + 7919 * day, {
      ...(opts.maxMinutes ? { maxMinutes: opts.maxMinutes } : {}),
      player: p,
      at: evening,
    });
    out.sessions.push(last);
  }
  return out;
}

const round = (x: number) => Math.round(x * 1000) / 1000;
