/** Death knowledge arrives as timestamped evidence. No listener clock is rewound. */
import { expect, test } from 'vitest';
import { exportRun, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import { actor, authoredPerson, MINUTE, need, START, setup } from './support.ts';

function listeners() {
  const person = authoredPerson('ada', 'Ada');
  person.state.relationships = [
    {
      otherId: 'bora',
      affection: 0.8,
      trust: 0.7,
      respect: 0.6,
      familiarity: 1,
      roles: ['friend'],
      ledger: 0,
      lastInteraction: START,
    },
  ];
  return setup([person, authoredPerson('bora', 'Bora', 'male'), authoredPerson('cem', 'Cem', 'male')]);
}
function notice(at: number): Input<'death.heard'> {
  return {
    id: 'host:death-news',
    at,
    source: { type: 'host', id: 'world' },
    kind: 'death.heard',
    payload: { person: 'ada', deceased: 'bora', reporter: 'world', evidenceId: 'heard:bora-death' },
  };
}

test('a later receipt changes only the addressed listener’s knowledge and settles once', () => {
  const run = listeners(),
    at = START + 10 * MINUTE;
  need(step(run, { until: at - 1, inputs: [] }));
  expect(actor(run).social.relationships[0]?.deceasedAt).toBeUndefined();
  const control = listeners();
  need(step(control, { until: at, inputs: [] }));
  const unaddressed = structuredClone(actor(control, 'cem'));
  const receipt = notice(at);
  const heard = need(step(run, { until: at, inputs: [receipt] })).events.find(
    (e) => e.data.kind === 'observation-attended',
  );
  // The news names who died as data; the renderer words it.
  expect(heard?.data.kind === 'observation-attended' && heard.data.died).toBe('bora');
  expect(actor(run).now).toBe(at);
  expect(actor(run).social.relationships[0]?.deceasedAt).toBe(at);
  expect(actor(run, 'cem')).toStrictEqual(unaddressed);
  // A report is knowledge, not an instruction to kill the reported actor.
  expect(actor(run, 'bora').body.alive).toBe(true);
  const hash = exportRun(run).hashes.full;
  expect(step(run, { until: at, inputs: [receipt] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(hash);
});

test('past-dated death news rejects the whole batch without changing any listener', () => {
  const run = listeners(),
    at = START + 10 * MINUTE;
  need(step(run, { until: at, inputs: [] }));
  const before = exportRun(run);
  const input = notice(START);
  expect(step(run, { until: at, inputs: [input] }).ok).toBe(false);
  expect(exportRun(run)).toStrictEqual(before);
  need(step(run, { until: at + 1, inputs: [notice(at + 1)] }));
  expect(actor(run).social.relationships[0]?.deceasedAt).toBe(at + 1);
});
