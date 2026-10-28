/** Live rules can read current host facets without asking for a portable person. */
import { expect, test } from 'vitest';
import { exportRun, inspect, replay, step } from '../src/index.ts';
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
