/**
 * Player personas: who is holding the phone. Each preset is an ordinary HF `PersonSpec` (traits, body, the time of
 * day) plus the session's own few numbers. Patience reads HEXACO agreeableness (patience is one of its facets);
 * appetite for novelty reads openness; persistence reads conscientiousness. The agenda is real life around the
 * session: a bus stop, a bedtime, or a wish to see the game through. Every number is an engineering premise for
 * playtesting, not an estimate of real players.
 */
import {
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
}

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
} satisfies Record<string, Persona>;

export type PersonaId = keyof typeof PERSONAS;

/** The HF person behind the persona, on day 0 at `startsAt`. */
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
  if (persona.persistent)
    p.agenda.goals.push({
      id: 'see-it-through',
      label: 'see the game through',
      serves: ['competence', 'achievement'],
      progress: 0,
      advancedBy: [{ action: 'play-on', amount: 0.02 }],
      importance: 0.5,
      status: 'active',
      adoptedAt: now,
    });
  return p;
}
