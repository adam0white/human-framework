/** SCOPE: construct a detached prior person from observer-held impressions.
 * Never receives a target actor. Unknown faculties use explicit engineering priors;
 * no target body, motives, memories, clocks or RNG enter this projection. */
import type * as T from './run-schema.ts';
import { believedValue, estimate, impressionOf, STATE_CUES } from './social/impressions.ts';
import { defaultRelationship } from './social/social.ts';

export function conditionImpression(observer: T.ActorState, targetId: T.Id, at: T.Time): T.ImpressionReading {
  const known = impressionOf(observer, targetId, at);
  const keys = new Set([...STATE_CUES, ...known.cues.map((c) => c.key)]);
  return {
    targetId,
    cues: [...keys].sort().map((key) => ({ key, ...estimate(observer, targetId, key, at) })),
  };
}

export function imaginedPerson(observer: T.ActorState, targetId: T.Id, at: T.Time): T.PersonAuthoring {
  const value = (key: string) => believedValue(observer, targetId, key, at);
  const held = conditionImpression(observer, targetId, at);
  return {
    id: targetId,
    // Age and sex are unknown. These constructor priors assert no actual identity.
    identity: { name: targetId, birthAt: at - 30 * 365.25 * 86400000, sex: 'female' },
    biography: [],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: 'observer-impression-prior' },
      traits: { kind: 'unknown-genetics-prior', prior: 'source-population-midpoint' },
    },
    state: {
      traits: {
        honesty: value('trait:honesty'),
        emotionality: value('trait:emotionality'),
        extraversion: value('trait:extraversion'),
        agreeableness: value('trait:agreeableness'),
        conscientiousness: value('trait:conscientiousness'),
        openness: value('trait:openness'),
      },
      body: {
        satiety: 0.7,
        hydration: 0.7,
        sleepPressure: value('fatigue'),
        exertion: 0,
        fitness: 0.5,
        health: 1,
        pain: value('pain'),
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: 15 * 3600000,
        asleep: false,
        since: at,
        doze: {
          context: { posture: 'upright', stimulation: 0.5 },
          basis: { kind: 'authored', author: observer.id, at },
        },
        bladder: { fill: 0, pending: 0 },
        injuries: [],
        illnesses: [],
        exposures: [],
      },
      needs: {
        safety: 0.5,
        belonging: 0.5,
        esteem: 0.5,
        autonomy: 0.5,
        competence: 0.5,
        leisure: 0.5,
        meaning: 0.5,
      },
      skills: held.cues
        .filter((c) => c.key.startsWith('skill:'))
        .map((c) => ({ id: c.key.slice(6), level: value(c.key), practicedMs: 0, lastPracticed: at })),
      heldNorms: [],
      beliefs: [],
      consequences: [],
      sourceTrust: held.cues
        .filter((c) => c.key.startsWith('trust:'))
        .map((c) => ({ sourceId: c.key.slice(6), trust: value(c.key) })),
      context: { scarcity: { kind: 'unobserved' }, smoking: { kind: 'unobserved' } },
      relationships: held.cues
        .filter((c) => c.key.startsWith('tie:'))
        .map((c) => ({
          ...defaultRelationship(c.key.slice(4), at),
          affection: value(c.key),
        })),
      voices: held.cues
        .filter((c) => c.key.startsWith('trust:'))
        .map((c) => ({ voiceId: c.key.slice(6), trust: value(c.key) })),
      agenda: {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments: [],
        goals: [],
        precommitments: [],
        owed: [],
      },
      family: { contactCovered: [], aptitudes: {} },
      groups: [],
      values: {
        benevolence: 0.5,
        universalism: 0.5,
        tradition: 0.5,
        conformity: 0.5,
        security: 0.5,
        achievement: 0.5,
        power: 0.5,
        hedonism: 0.5,
        stimulation: 0.5,
        selfDirection: 0.5,
      },
      reserve: {},
      retention: { trace: 32, chronicleDays: 31 },
      habits: [],
      expectations: [],
      affect: {
        mood: { valence: value('mood'), arousal: 0.5 },
        regulation: 0,
        emotions: [
          {
            id: 'fear',
            intensity: value('fear'),
            cause: 'observer-impression-prior',
            since: at,
            halfLifeMs: 3600000,
          },
        ],
      },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'none', atMsOfDay: 23 * 3600000 },
      bonds: { courtships: [], marriages: [] },
    },
  };
}
