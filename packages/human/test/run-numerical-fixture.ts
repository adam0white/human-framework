/** SCOPE: authored public Run premises, not an owner/runtime replacement.
 * W1 accepted-v9 Body control supplies the ten seeds, high sleep pressure,
 * seated live doze, 0.4 meals at 6/12/18h and voluntary sleep at 16h.
 * Public idle load is the archived PERSON_DEFAULTS prior (0.05/0.05).
 * Ambient evidence is explicitly constant. Unknown relationships stay absent.
 */
import { feltAffect } from '../src/affect/affect.ts';
import { circadianAlertness, readBody } from '../src/body/body.ts';
import { readCapacities } from '../src/body/injury.ts';
import { ageYearsAt, evaluateCell } from '../src/body/span.ts';
import { pregnancyWeeks } from '../src/family/family.ts';
import { modifiersForAge } from '../src/lifecourse/lifecourse.ts';
import { bodyPerception } from '../src/run-person.ts';
import type {
  DeepReadonly,
  Input,
  Offer,
  PersonAuthoring,
  Result,
  RunArchive,
  RunSpec,
} from '../src/run-schema.ts';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const PERSON = 'numerical-person';
export const HOST = { type: 'host', id: 'numerical-host' } as const;

export function accepted<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

export function numericalSpec(seed: number): RunSpec {
  return {
    id: 'numerical-control',
    seed,
    start: 0,
    host: { id: HOST.id, edition: 'numerical-4', schema: 'numerical-4' },
    definitions: {
      actions: [{ id: 'sleep', label: 'Sleep', demands: sleepOffer().demands, tags: [], norms: [] }],
      norms: [],
      marriageCustoms: [],
      skills: [],
      skillTransfers: [],
      methods: [],
      calendar: {
        id: 'calendar',
        epoch: { id: 'epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: [
          { dayIndex: 0, start: 0, windows: [] },
          { dayIndex: 1, start: DAY, windows: [] },
        ],
      },
      routines: [],
      lexicon: { names: { [PERSON]: 'Ada' }, roles: {}, prefer: 'name', actions: {} },
      sources: [HOST, { type: 'person', id: PERSON }],
    },
    lifecycle: { kinPremises: [], kinScopes: [] },
    world: { revision: 0, facts: [], hostState: null },
  };
}

export function numericalPerson(seed: number): PersonAuthoring {
  return {
    id: PERSON,
    identity: { name: 'Ada', birthAt: -30 * 365.25 * DAY, sex: 'female' },
    biography: [],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: 'numerical-authoring' },
      traits: { kind: 'unknown-genetics-prior', prior: 'source-population-midpoint' },
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
      body: {
        satiety: 0.6 + seed * 0.01,
        hydration: 0.7 + seed * 0.01,
        sleepPressure: 0.9,
        exertion: 0,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 8,
        depletion: 0,
        circadianPeakMs: 15 * HOUR,
        asleep: false,
        since: 0,
        doze: {
          context: { posture: 'seated', stimulation: 0.1 },
          basis: { kind: 'authored', author: HOST.id, at: 0 },
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
      skills: [],
      heldNorms: [],
      beliefs: [],
      consequences: [],
      sourceTrust: [],
      context: { scarcity: { kind: 'unobserved' }, smoking: { kind: 'unobserved' } },
      relationships: [],
      voices: [],
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
      affect: { mood: { valence: 0, arousal: 0.5 }, regulation: 0, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'none', atMsOfDay: 23 * HOUR },
      bonds: { courtships: [], marriages: [] },
    },
  };
}

export function sleepOffer(): Offer {
  return {
    id: 'sleep-at-16h',
    actionId: 'sleep',
    label: 'Sleep',
    person: PERSON,
    durationMs: 8 * HOUR,
    participants: [],
    alongside: [],
    demands: { effort: 0.1, focus: 0, mode: 'sleep', requires: {} },
    tags: [],
    norms: [],
    expected: { needs: { sleep: 1 }, followedBy: [], provenance: ['numerical-authoring'] },
    fulfills: [],
    advances: [],
    diminishes: [],
  };
}

export function semanticInputs(): Input[] {
  const inputs: Input[] = [
    {
      id: 'ambient',
      at: 0,
      source: HOST,
      kind: 'ambient.received',
      payload: {
        person: PERSON,
        evidenceId: 'ambient-evidence',
        environment: {
          contextId: 'constant-room',
          readings: {
            cold: 0.2,
            dark: 0.2,
            crowding: 0.2,
            beauty: 0.2,
            weather: 0.2,
            outdoors: false,
            dayLengthHours: 12,
          },
          basis: { kind: 'received', evidenceId: 'ambient-evidence', at: 0, validUntil: DAY + 1 },
        },
      },
    },
  ];
  for (const hour of [6, 12, 18])
    inputs.push({
      id: `meal-${hour}`,
      at: hour * HOUR,
      source: HOST,
      kind: 'body.received',
      payload: {
        person: PERSON,
        evidenceId: `meal-evidence-${hour}`,
        receipt: {
          type: 'consumed',
          actionReceipt: `meal-${hour}`,
          received: { food: 0.4, water: 0.4 },
        },
      },
    });
  inputs.push({
    id: 'sleep-offer',
    at: 16 * HOUR,
    source: HOST,
    kind: 'offers.received',
    payload: { person: PERSON, revision: 1, offers: [sleepOffer()] },
  });
  // Canonical source ordering puts host offers before this person decision.
  // Admission/decision failure is reported rather than forced by state edits.
  inputs.push({
    id: 'sleep-decision',
    at: 16 * HOUR,
    source: { type: 'person', id: PERSON },
    kind: 'decision.requested',
    payload: { person: PERSON, reason: 'voluntary-sleep', treatment: 'ordinary', offerRevision: 1 },
  });
  return inputs.sort(
    (a, b) =>
      a.at - b.at ||
      (a.source.type < b.source.type ? -1 : a.source.type > b.source.type ? 1 : a.id < b.id ? -1 : 1),
  );
}

/** Measurement only. Every value comes from serialized current state or an
 * actual pure source reader with the archived effective coefficients. No owner
 * advancement/receipt, mutable state, callback adapter or copied formula.
 * Optional absence is separate from a present quantity without a pure reader.
 */
export function measureNumerical(archive: DeepReadonly<RunArchive>) {
  const s = archive.current;
  const a = s.people[PERSON];
  const c = s.continuations.find((item) => item.person === PERSON);
  if (!a || !c) throw new Error('missing actual exported actor/continuation');
  const p = archive.initial.effective.builtins;
  const values: Record<string, number> = {
    'body.satiety': a.body.satiety,
    'body.hydration': a.body.hydration,
    'body.sleepPressure': a.body.sleepPressure,
    'body.sleepDebtHours': a.body.sleepDebtHours / p.BODY_DEFAULTS.maxSleepDebt,
    'body.exertion': a.body.exertion,
    'body.pain': a.body.pain,
    'body.health': a.body.health,
    'body.fitness': a.body.fitness,
    'body.depletion': a.body.depletion,
    'body.bladder.fill': a.body.bladder.fill,
    'body.bladder.pending': a.body.bladder.pending / p.BLADDER_DEFAULTS.maxPending,
    'needs.safety': a.needs.safety,
    'needs.belonging': a.needs.belonging,
    'needs.esteem': a.needs.esteem,
    'needs.autonomy': a.needs.autonomy,
    'needs.competence': a.needs.competence,
    'needs.leisure': a.needs.leisure,
    'needs.meaning': a.needs.meaning,
    'affect.mood.valence': a.affect.mood.valence,
    'affect.mood.arousal': a.affect.mood.arousal,
    'affect.regulation': a.affect.regulation,
    'affect.crisis.stress': a.affect.crisis.stress,
    'will.switchMargin': a.will.switchMargin,
    'will.temperature': a.will.temperature,
    circadianAlertness: circadianAlertness(s.at, a.body.circadianPeakMs),
  };
  if (!(p.BODY_DEFAULTS.maxSleepDebt > 0 && p.BLADDER_DEFAULTS.maxPending > 0))
    throw new Error('invalid archived normalization scales');
  const body = readBody(a.body, s.at, p.BODY_DEFAULTS, bodyPerception(a, s.at));
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'number') values[`readBody.${key}`] = value;
  }
  for (const [key, value] of Object.entries(body.perceived)) values[`readBody.perceived.${key}`] = value;
  for (const [key, value] of Object.entries(readCapacities(a.body))) values[`readCapacities.${key}`] = value;
  for (const [key, value] of Object.entries(feltAffect(a.affect, p.AFFECT_DEFAULTS)))
    values[`readAffect.${key}`] = value;
  const life = modifiersForAge(ageYearsAt(a.life.bornAt, s.at), p.LIFE_DEFAULTS);
  for (const [key, value] of Object.entries(life)) {
    if (typeof value === 'number') values[`lifeModifiers.${key}`] = value;
  }
  // Character is an actual upstream forcing of Crisis/Affect/Needs. Include all
  // authored trait/value leaves rather than treating their drift as cache data.
  for (const [key, value] of Object.entries(a.traits)) values[`traits.${key}`] = value;
  for (const [key, value] of Object.entries(a.values)) values[`values.${key}`] = value;
  const notApplicable: string[] = [];
  const uncovered: string[] = [];
  if (!a.body.injuries.length) notApplicable.push('body.injuries[id].severity', 'body.injuries[id].bleeding');
  for (const injury of a.body.injuries) {
    values[`body.injuries[${injury.id}].severity`] = injury.severity;
    if (injury.bleeding !== undefined) values[`body.injuries[${injury.id}].bleeding`] = injury.bleeding;
    else notApplicable.push(`body.injuries[${injury.id}].bleeding`);
  }
  if (!a.body.illnesses.length)
    notApplicable.push(
      'body.illnesses[id].severity',
      'body.illnesses[id].trendPerDay',
      'body.illnesses[id].baseline',
    );
  for (const illness of a.body.illnesses) {
    values[`body.illnesses[${illness.id}].severity`] = illness.severity;
    values[`body.illnesses[${illness.id}].trendPerDay`] = illness.trendPerDay;
    if (illness.baseline !== undefined) values[`body.illnesses[${illness.id}].baseline`] = illness.baseline;
    else notApplicable.push(`body.illnesses[${illness.id}].baseline`);
  }
  if (!Object.keys(a.body.exposures).length)
    notApplicable.push('body.exposures[kind].recent', 'body.exposures[kind].cumulative');
  for (const [id, exposure] of Object.entries(a.body.exposures)) {
    values[`body.exposures[${id}].recent`] = exposure.recent;
    values[`body.exposures[${id}].cumulative`] = exposure.cumulative;
  }
  if (!a.affect.emotions.length) notApplicable.push('affect.emotions[instance].intensity');
  a.affect.emotions.forEach((emotion, i) => {
    const identity = JSON.stringify([emotion.id, emotion.cause, emotion.targetId, emotion.since, i]);
    values[`affect.emotions[${identity}].intensity`] = emotion.intensity;
  });
  if (a.family.pregnancy) values.pregnancyWeeks = pregnancyWeeks(a.family, s.at);
  else notApplicable.push('pregnancyWeeks');
  if (!c.crisis.recovery) notApplicable.push('continuation.crisis.remainingWorkMinutes');
  else if (c.crisis.recovery.anchorMs === s.at)
    values['continuation.crisis.remainingWorkMinutes'] = c.crisis.recovery.remainingWorkMinutesAtAnchor;
  else
    uncovered.push(
      'continuation.crisis.remainingWorkMinutes: serialized anchor is not current; no pure remaining-work reader exists',
    );
  const intensity = (hazard: typeof c.doze.hazard) =>
    hazard.activeIntegralCell ? evaluateCell(hazard.activeIntegralCell, s.at) : hazard.acceptedIntegral;
  values['continuation.doze.integratedIntensity'] = intensity(c.doze.hazard);
  values['continuation.crisis.integratedIntensity'] = intensity(c.crisis.hazard);
  for (const hazard of c.life.hazards)
    values[`continuation.${hazard.key.kind}[${hazard.key.channelId}].integratedIntensity`] =
      intensity(hazard);
  return {
    values,
    body,
    lifeStage: life.stage,
    notApplicable: notApplicable.sort(),
    uncovered: uncovered.sort(),
  };
}
