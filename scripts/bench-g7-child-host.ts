/** SCOPE: preserved reduced Child G7 authoring from the HF4 candidate.
 * Six actual cast identities/traits are supplied by bench-g7.ts; no lessons,
 * relationships or sleep activities are fabricated by this fixture.
 */
import type { PersonAuthoring, Result, RunSpec } from '../packages/human/src/index.ts';

export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const START = 7 * 60 * MINUTE;
export function need<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.path}: ${result.error.message}`);
  return result.value;
}
export function exampleSpec(seed = 7): RunSpec {
  const demands = { effort: 0, focus: 0, mode: 'awake' as const, requires: {} };
  return {
    id: 'example',
    seed,
    start: START,
    host: { id: 'world', edition: 'example4-1', schema: 'example4-1' },
    definitions: {
      actions: ['wait', 'rest', 'work'].map((id) => ({
        id,
        label: id,
        demands: { ...demands, effort: id === 'work' ? 0.4 : 0 },
        tags: id === 'rest' ? ['rest'] : [],
        norms: [],
      })),
      norms: [],
      marriageCustoms: [],
      skills: [],
      skillTransfers: [],
      methods: [],
      routines: [],
      sources: [
        { type: 'host', id: 'world' },
        { type: 'voice', id: 'player' },
      ],
      lexicon: { names: {}, roles: {}, prefer: 'name', actions: {} },
      calendar: {
        id: 'calendar',
        epoch: { id: 'epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: [
          { dayIndex: 0, start: 0, windows: [] },
          { dayIndex: 1, start: DAY, windows: [] },
        ],
      },
    },
    lifecycle: { kinPremises: [], kinScopes: [] },
    world: { revision: 0, facts: [], hostState: { completed: 0, active: [] } },
  };
}
export function authoredPerson(id: string, name: string, sex: 'female' | 'male' = 'female'): PersonAuthoring {
  return {
    id,
    identity: { name, birthAt: START - 30 * 365 * DAY, sex },
    biography: [],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: `author:${id}` },
      traits: { kind: 'explicit-authoring', evidence: { kind: 'evidence', id: `traits:${id}` } },
    },
    state: {
      traits: {
        honesty: 0.5,
        emotionality: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        conscientiousness: 0.5,
        openness: 0.5,
      },
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
      body: {
        satiety: 0.8,
        hydration: 0.85,
        sleepPressure: 0.2,
        exertion: 0,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: 16 * 60 * MINUTE,
        asleep: false,
        since: START,
        doze: {
          context: { posture: 'upright', stimulation: 0.5 },
          basis: { kind: 'authored', author: 'world', at: START },
        },
        bladder: { fill: 0, pending: 0 },
        injuries: [],
        illnesses: [],
        exposures: [],
      },
      needs: {
        safety: 0.8,
        belonging: 0.7,
        esteem: 0.6,
        autonomy: 0.7,
        competence: 0.6,
        leisure: 0.6,
        meaning: 0.6,
      },
      skills: [],
      heldNorms: [],
      beliefs: [],
      consequences: [],
      sourceTrust: [],
      context: {
        scarcity: { kind: 'prior', value: 0, basis: 'engineering:source-zero-context' },
        smoking: { kind: 'unobserved' },
      },
      relationships: [],
      voices: [{ voiceId: 'player', trust: 0.5 }],
      agenda: {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments: [],
        goals: [],
        precommitments: [],
        owed: [],
      },
      family: { contactCovered: [], aptitudes: {} },
      groups: [],
      reserve: {},
      retention: { trace: 32, chronicleDays: 120 },
      habits: [],
      expectations: [],
      affect: { mood: { valence: 0, arousal: 0.3 }, regulation: 0.3, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'accounting', atMsOfDay: 21 * 60 * MINUTE },
      bonds: { courtships: [], marriages: [] },
    },
  };
}
