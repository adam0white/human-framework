/**
 * Player personas: who is holding the phone. Each preset is an ordinary HF `PersonSpec` (traits, body, the time of
 * day) plus the session's own few numbers. Patience reads HEXACO agreeableness (patience is one of its facets);
 * appetite for novelty reads openness; persistence reads conscientiousness. The agenda is real life around the
 * session: a bus stop, a bedtime, or a wish to see the game through. Every number is an engineering premise for
 * playtesting, not an estimate of real players.
 *
 * Edge-pushers (2026-10-19) add a `style`, a session-side input policy (see `style.ts`) on top of HF's own scoring:
 * the mischief-maker provokes and wants an answer, the exploit-hunter repeats whatever paid, the rule-lawyer tries
 * every input once and twice in a row. Traits alone cannot produce these (HF's scorer has no "hunt for exploits"
 * term), so the style is declared as an engineering premise, like the session's engagement store. The returner
 * comes back on later days only if yesterday's session left it wanting more (see `returner.ts`).
 */
import {
  adoptGoal,
  createPerson,
  MINUTES_PER_YEAR,
  type Person,
  type PersonSpec,
  promise,
} from '@adam0white/human-framework';

export interface Persona {
  id: string;
  label: string;
  /** Who they are, as HF sees them (id, name, seed and `now` are filled in by `makePlayer`). */
  spec: Omit<PersonSpec, 'id' | 'name' | 'seed' | 'now' | 'bornAt' | 'sex'> &
    Partial<Pick<PersonSpec, 'sex'>>;
  age: number;
  /** Minute of day the session starts. */
  startsAt: number;
  /** Real life ending the session: a stop or a bedtime, minutes after the start. Absent = none. */
  mustStopAfter?: { minutes: number; label: string; importance: number };
  /** Wants to see the game through: an HF goal that playing advances. */
  persistent?: boolean;
  /** Softmax temperature for HF selection: casual players are less exact. */
  temperature: number;
  /** Real seconds between inputs, 1..60 (the stance is reconsidered once a real minute). */
  beatSeconds: number;
  /** Edge-pushing input policy (see `style.ts`); absent = an ordinary player. */
  style?: PlayStyle;
  /** Days after the first on which the player may come back (see `returner.ts`); absent = one session. */
  returnDays?: number;
}

export type PlayStyle = 'mischief' | 'exploit' | 'rules';

export const PERSONAS = {
  commuter: {
    id: 'commuter',
    label: 'plays on the bus home, 25 minutes, curious, middling patience',
    spec: {
      traits: {
        openness: 0.65,
        conscientiousness: 0.4,
        agreeableness: 0.45,
        emotionality: 0.5,
        extraversion: 0.5,
      },
      needs: { leisure: 0.35 },
    },
    age: 31,
    startsAt: 17 * 60 + 40,
    mustStopAfter: { minutes: 25, label: 'getting off at my stop', importance: 0.4 },
    temperature: 0.01,
    beatSeconds: 3,
  },
  unwinder: {
    id: 'unwinder',
    label: 'after a long day, on the sofa at 21:40, tired and easily put off',
    spec: {
      traits: { agreeableness: 0.55, emotionality: 0.75, conscientiousness: 0.5, openness: 0.45 },
      needs: { leisure: 0.25 },
      body: { sleepDebt: 3 },
    },
    age: 44,
    startsAt: 21 * 60 + 40,
    mustStopAfter: { minutes: 50, label: 'going to bed', importance: 0.5 },
    temperature: 0.01,
    beatSeconds: 3,
  },
  completionist: {
    id: 'completionist',
    label: 'a free afternoon, patient, wants to see it through',
    spec: {
      traits: { conscientiousness: 0.85, agreeableness: 0.7, openness: 0.5, emotionality: 0.4 },
      needs: { leisure: 0.4 },
    },
    age: 27,
    startsAt: 14 * 60,
    persistent: true,
    temperature: 0.005,
    beatSeconds: 3,
  },
  restless: {
    id: 'restless',
    label: 'restless evening, impatient, wants something new every minute',
    spec: {
      traits: { agreeableness: 0.2, openness: 0.8, conscientiousness: 0.3, emotionality: 0.55 },
      needs: { leisure: 0.3 },
    },
    age: 22,
    startsAt: 20 * 60,
    temperature: 0.03,
    beatSeconds: 3,
  },
  mischief: {
    id: 'mischief',
    label: 'after school, poking the game to see what it does when provoked; bored by good behaviour',
    spec: {
      traits: {
        honesty: 0.2,
        agreeableness: 0.3,
        openness: 0.8,
        extraversion: 0.7,
        conscientiousness: 0.25,
        emotionality: 0.4,
      },
      needs: { leisure: 0.3 },
    },
    age: 16,
    startsAt: 16 * 60 + 30,
    mustStopAfter: { minutes: 40, label: 'called down for dinner', importance: 0.35 },
    temperature: 0.03,
    beatSeconds: 3,
    style: 'mischief',
  },
  exploiter: {
    id: 'exploiter',
    label: 'a min-maxer hunting for the move that always pays, and tired of it once found',
    spec: {
      traits: {
        honesty: 0.35,
        conscientiousness: 0.75,
        openness: 0.6,
        agreeableness: 0.35,
        emotionality: 0.3,
      },
      needs: { leisure: 0.35 },
    },
    age: 29,
    startsAt: 21 * 60,
    persistent: true,
    temperature: 0.005,
    beatSeconds: 3,
    style: 'exploit',
  },
  rulesLawyer: {
    id: 'rulesLawyer',
    label: 'tries every button once and twice in a row, and minds when the game does not answer',
    spec: {
      traits: {
        honesty: 0.7,
        conscientiousness: 0.9,
        openness: 0.6,
        agreeableness: 0.3,
        emotionality: 0.45,
      },
      needs: { leisure: 0.35 },
    },
    age: 38,
    startsAt: 19 * 60,
    mustStopAfter: { minutes: 45, label: 'dinner', importance: 0.4 },
    temperature: 0.01,
    beatSeconds: 3,
    style: 'rules',
  },
  returner: {
    id: 'returner',
    label: 'half an hour before bed each evening; comes back tomorrow only if today left something',
    spec: {
      traits: {
        openness: 0.6,
        conscientiousness: 0.5,
        agreeableness: 0.45,
        emotionality: 0.5,
        extraversion: 0.45,
      },
      needs: { leisure: 0.35 },
    },
    age: 35,
    startsAt: 21 * 60 + 30,
    mustStopAfter: { minutes: 30, label: 'going to bed', importance: 0.5 },
    temperature: 0.01,
    beatSeconds: 3,
    returnDays: 3,
  },
} satisfies Record<string, Persona>;

export type PersonaId = keyof typeof PERSONAS;

/** The four ordinary players of 2.8.0. */
export const BASE_PERSONAS: readonly PersonaId[] = ['commuter', 'unwinder', 'completionist', 'restless'];
/** The edge-pushers. */
export const EDGE_PERSONAS: readonly PersonaId[] = ['mischief', 'exploiter', 'rulesLawyer'];

/** The HF person behind the persona, on day 0 at `startsAt`, booked for that session. */
export function makePlayer(persona: Persona, seed: number): Person {
  if (!(persona.beatSeconds >= 1 && persona.beatSeconds <= 60)) throw new Error('beatSeconds must be 1..60');
  const now = persona.startsAt;
  const p = createPerson({
    sex: 'female',
    ...persona.spec,
    id: 'player',
    name: persona.label,
    seed,
    now,
    bornAt: now - persona.age * MINUTES_PER_YEAR,
  });
  p.will.temperature = persona.temperature;
  bookSession(p, persona, now);
  return p;
}

/**
 * The real life around one session starting at `now`: the stop it must end by (a promise to self), and, for a
 * persistent player, the wish to see the game through (adopted once, kept across sessions).
 */
export function bookSession(p: Person, persona: Persona, now: number): void {
  if (persona.mustStopAfter) {
    const at = now + persona.mustStopAfter.minutes;
    promise(p, {
      kind: 'promise',
      toId: 'self',
      label: persona.mustStopAfter.label,
      actions: ['stop-playing'],
      from: at - 2,
      until: at + 3,
      importance: persona.mustStopAfter.importance,
    });
  }
  if (persona.persistent && !p.agenda.goals.some((g) => g.label === 'see the game through'))
    adoptGoal(
      p,
      {
        label: 'see the game through',
        serves: ['competence', 'achievement'],
        advancedBy: [{ action: 'play-on', amount: 0.02 }],
        importance: 0.5,
      },
      now,
    );
}
