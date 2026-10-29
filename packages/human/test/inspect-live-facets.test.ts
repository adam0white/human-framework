/** Live rules can read current host facets without asking for a portable person. */
import { expect, test } from 'vitest';
import { exportRun, inspect, preview, replay, restoreRun, step } from '../src/index.ts';
import type { Run } from '../src/run-schema.ts';
import {
  actionRequest,
  authoredPerson,
  exampleOffers,
  exampleSpec,
  need,
  openingInputs,
  resolutionInput,
  START,
  setup,
} from './support.ts';

test('pending and active actors expose actual host traits and current held norms without granting subjective access', () => {
  const spec = exampleSpec(42),
    ada = authoredPerson('ada', 'Ada');
  const provenance = {
    kind: 'authored-world' as const,
    author: 'world',
    ruleId: 'tidy',
    edition: 'control1',
  };
  spec.definitions.norms = [
    {
      id: 'tidy',
      label: 'Leave the work area tidy',
      standing: 'recommended',
      sources: [{ kind: 'assumption', ref: 'authored-control:tidy' }],
      provenance,
      exemptions: [],
    },
  ];
  ada.state.traits.openness = 0.73;
  ada.state.heldNorms = [{ normId: 'tidy', standing: 'recommended', conviction: 0.4, provenance }];
  const run = setup([ada, authoredPerson('bora', 'Bora')], spec);
  const work = exampleOffers('ada', ['work'])[0];
  if (!work) throw new Error('Missing authored work');
  const changed = { normId: 'tidy', standing: 'obligatory' as const, conviction: 0.8, provenance };
  const request = actionRequest(
    need(
      step(run, {
        until: START,
        inputs: [
          {
            id: 'interpretation',
            at: START,
            source: { type: 'host', id: 'world' },
            kind: 'norm.interpretation-received',
            payload: { person: 'ada', evidenceId: 'interpretation-evidence', ...changed },
          },
          ...openingInputs([{ id: 'ada', offers: [work] }]),
        ],
      }),
    ),
    'start',
  );

  function read(current: Run) {
    const before = exportRun(current);
    const host = need(
      inspect(current, { perspective: { kind: 'host' }, people: ['ada'], select: ['traits', 'heldNorms'] }),
    );
    const person = host.people[0];
    if (person?.kind !== 'host') throw new Error('Missing host reading');
    const traits = person.parts.find((part) => part.select === 'traits')?.value;
    const norms = person.parts.find((part) => part.select === 'heldNorms')?.value;
    expect(traits).toStrictEqual(ada.state.traits);
    expect(norms).toStrictEqual([changed]);
    if (!traits || !norms?.[0]) throw new Error('Missing selected facets');
    Reflect.set(traits, 'openness', 0);
    Reflect.set(norms[0], 'standing', 'permitted');
    const self = need(
      inspect(current, {
        perspective: { kind: 'person', observer: 'ada' },
        people: ['ada'],
        select: ['traits', 'heldNorms'],
      }),
    );
    expect(self.people[0]?.parts).toStrictEqual([
      { select: 'traits', value: { kind: 'unobserved' } },
      { select: 'heldNorms', value: [changed] },
    ]);
    const other = need(
      inspect(current, {
        perspective: { kind: 'person', observer: 'bora' },
        people: ['ada'],
        select: ['traits', 'heldNorms'],
      }),
    );
    expect(other.people[0]?.parts).toStrictEqual([
      { select: 'traits', value: { kind: 'unobserved' } },
      { select: 'heldNorms', value: { kind: 'unobserved' } },
    ]);
    expect(exportRun(current)).toStrictEqual(before);
  }

  expect(exportRun(run).current.pending.map((item) => item.id)).toContain(request.id);
  read(run);
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  expect(exportRun(run).current.people.ada?.activity).toMatchObject({ offer: { actionId: 'work' } });
  read(run);
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

/** G4: current feelings and learning remain readable during pending/active work. */
test('live affect and expectations use detached host/self reads and keep other minds unknown', () => {
  const ada = authoredPerson('ada', 'Ada');
  ada.state.affect.emotions = [
    { id: 'fear', intensity: 0.7, cause: 'night:west', targetId: 'west', since: START, halfLifeMs: 60_000 },
  ];
  ada.state.expectations = [{ key: 'work@west', needs: {}, samples: 2, successRate: 0.3, valence: -0.6 }];
  const run = setup([ada, authoredPerson('bora', 'Bora')]);
  const work = exampleOffers('ada', ['work'])[0];
  if (!work) throw new Error('Missing work');
  const request = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [work] }]) })),
    'start',
  );
  const select = ['affect', 'expectations'] as const;
  const read = (current: Run) => {
    const before = exportRun(current);
    const host = need(inspect(current, { perspective: { kind: 'host' }, people: ['ada'], select }));
    const person = host.people[0];
    if (person?.kind !== 'host') throw new Error('Missing host reading');
    const parts = person.parts;
    expect(parts).toStrictEqual([
      {
        select: 'affect',
        value: {
          mood: before.current.people.ada?.affect.mood,
          emotions: before.current.people.ada?.affect.emotions.map(({ id, intensity, cause, targetId }) => ({
            id,
            intensity,
            cause,
            targetId,
          })),
        },
      },
      { select: 'expectations', value: before.current.people.ada?.memory.expectations },
    ]);
    expect(parts?.[0]?.value).toMatchObject({
      emotions: [{ id: 'fear', cause: 'night:west', targetId: 'west', intensity: 0.7 }],
    });
    const self = need(
      inspect(current, { perspective: { kind: 'person', observer: 'ada' }, people: ['ada'], select }),
    );
    expect(self.people[0]?.parts).toStrictEqual(parts);
    const selfSummary = need(
      inspect(current, {
        perspective: { kind: 'person', observer: 'ada' },
        people: ['ada'],
        select: ['summary', 'affect'],
      }),
    );
    expect(selfSummary.people[0]?.parts[0]?.value).toStrictEqual({ name: 'Ada' });
    const other = need(
      inspect(current, { perspective: { kind: 'person', observer: 'bora' }, people: ['ada'], select }),
    );
    expect(other.people[0]?.parts).toStrictEqual(
      select.map((select) => ({ select, value: { kind: 'unobserved' } })),
    );
    const forecast = need(
      preview(current, { perspective: { kind: 'host' }, person: 'ada', until: START, inputs: [], select }),
    );
    expect(forecast.reading?.parts).toStrictEqual(parts);
    const imagined = need(
      preview(current, {
        perspective: { kind: 'person', observer: 'bora' },
        person: 'ada',
        until: START,
        inputs: [],
        select,
      }),
    );
    expect(imagined.reading).toStrictEqual(other.people[0]);
    const affect = parts?.find((part) => part.select === 'affect')?.value;
    if (!affect) throw new Error('Missing affect');
    Reflect.set(affect.emotions[0] ?? {}, 'intensity', 0);
    expect(exportRun(current)).toStrictEqual(before);
  };
  read(run);
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  read(run);
  const archive = exportRun(run);
  read(need(restoreRun(JSON.parse(JSON.stringify(archive)))));
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
