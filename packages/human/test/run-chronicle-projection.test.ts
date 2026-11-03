import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun, restoreRun, step } from '../src/run.ts';
import type { PersonAuthoring } from '../src/run-schema.ts';
import { emptyRunSpec } from './run-fixture.ts';

// Representation contract only, not long-life or performance qualification.
// Authored retention shortens this control; production defaults remain unchanged.
// Every faculty stays on, and native owner clocks produce the daily closures.
// The functional bound includes cold replay, separate from the unchanged game latency gate.
test('public daily episodes fold into restorable five-field yearly episodes', () => {
  const dayMs = 86400000;
  const start = dayMs - 1;
  const spec = emptyRunSpec();
  const created = createRun({
    ...spec,
    start,
    definitions: {
      ...spec.definitions,
      actions: [
        {
          id: 'sleep',
          label: 'Sleep',
          demands: { effort: 0, focus: 0, mode: 'sleep', requires: {} },
          tags: [],
          norms: [],
        },
      ],
    },
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  const run = created.value;
  const person: PersonAuthoring = {
    id: 'reader',
    identity: { name: 'Reader', birthAt: -946080000000, sex: 'female' },
    biography: [
      {
        id: 'e0',
        at: start - 1,
        kind: 'observation',
        valence: 1,
        salience: 1,
        summary: 'The second reader rested beside the open door.',
        action: 'sleep',
        targetId: 'reader-2',
        tags: [],
        basis: { kind: 'authored', author: 'world' },
        provenance: [],
      },
      {
        id: 'e1',
        at: start - 1,
        kind: 'observation',
        valence: -1,
        salience: 1,
        summary: 'The door closed before the reader could leave.',
        tags: [],
        basis: { kind: 'authored', author: 'world' },
        provenance: [],
      },
    ],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: 'opening' },
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
        hydration: 0.8,
        sleepPressure: 0.1,
        exertion: 0.1,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: 54000000,
        asleep: false,
        since: 0,
        doze: {
          context: { posture: 'seated', stimulation: 0.5 },
          basis: { kind: 'authored', author: 'world', at: 0 },
        },
        bladder: { fill: 0, pending: 0 },
        injuries: [],
        illnesses: [],
        exposures: [],
      },
      needs: {
        safety: 0.8,
        belonging: 0.8,
        esteem: 0.8,
        autonomy: 0.8,
        competence: 0.8,
        leisure: 0.8,
        meaning: 0.8,
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
      reserve: {},
      retention: { trace: 32, chronicleDays: 31 },
      habits: [],
      expectations: [],
      affect: { mood: { valence: 0, arousal: 0.5 }, regulation: 0.5, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'none', atMsOfDay: 72000000 },
      bonds: { courtships: [], marriages: [] },
    },
  };
  const target = createPerson(run, {
    ...person,
    id: 'reader-2',
    identity: { ...person.identity, name: 'Second Reader' },
    biography: [],
  });
  if (!target.ok) throw new Error(JSON.stringify(target.error));
  const authored = createPerson(run, person);
  if (!authored.ok) throw new Error(JSON.stringify(authored.error));

  const first = step(run, { until: dayMs, inputs: [] });
  if (!first.ok) throw new Error(JSON.stringify(first.error));
  const firstDay = exportRun(run).current.people.reader?.chronicle.find((day) => day.day === 0);
  if (!firstDay) throw new Error('Native day-zero record missing');
  expect(firstDay.episodes.find((episode) => episode.id === 'e0')).toMatchObject({
    action: 'sleep',
    targetId: 'reader-2',
  });
  expect(firstDay.episodes.find((episode) => episode.id === 'e1')).not.toHaveProperty('action');
  expect(firstDay.episodes.find((episode) => episode.id === 'e1')).not.toHaveProperty('targetId');
  // The retained distance is inclusive: day zero folds only when day 32 closes.
  for (let close = 2; close <= 33; close++) {
    const advanced = step(run, { until: close * dayMs, inputs: [] });
    if (!advanced.ok) throw new Error(JSON.stringify(advanced.error));
  }
  const archive = exportRun(run);
  expect(archive.current.at).toBe(33 * dayMs);
  const reader = archive.current.people.reader;
  if (!reader) throw new Error('Reader missing after native daily closures');
  const year = reader.chronicleYears.find((record) => record.episodes.some((e) => e.id === 'e0'));
  if (!year) throw new Error('Native yearly producer did not fold the authored day');
  expect(year.days).toBeGreaterThanOrEqual(1);
  const expectedEpisodes = ['e0', 'e1'].map((id) => {
    const daily = firstDay.episodes.find((episode) => episode.id === id);
    if (!daily) throw new Error(`Authored daily episode ${id} missing`);
    return {
      id,
      day: firstDay.day,
      summary: daily.summary,
      valence: daily.valence,
      salience: daily.salience,
    };
  });
  for (const expected of expectedEpisodes) {
    expect(year.episodes.find((episode) => episode.id === expected.id)).toMatchObject(expected);
  }

  // Assert restore first: the current producer leaks daily action/targetId here.
  // The positive archive comes only from public authoring and native stepping.
  const restored = restoreRun(JSON.parse(JSON.stringify(archive)));
  if (!restored.ok) throw new Error(JSON.stringify(restored.error));
  expect(exportRun(restored.value)).toEqual(archive);
  for (const expected of expectedEpisodes) {
    expect(year.episodes.find((episode) => episode.id === expected.id)).toEqual(expected);
  }

  const next = { until: 34 * dayMs, inputs: [] };
  const continued = step(run, next);
  if (!continued.ok) throw new Error(JSON.stringify(continued.error));
  const coldContinued = step(restored.value, next);
  if (!coldContinued.ok) throw new Error(JSON.stringify(coldContinued.error));
  expect(exportRun(restored.value)).toEqual(exportRun(run));
});
