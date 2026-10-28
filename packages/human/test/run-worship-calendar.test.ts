import { expect, test } from 'vitest';
import {
  createPerson,
  createRun,
  DEFAULT_NORMS,
  exportRun,
  inspect,
  replay,
  restoreRun,
  step,
} from '../src/index.ts';
import { authoredPerson, exampleSpec, MINUTE, need } from './support.ts';

test('supplied prayer times give a holder five sourced worship duties and replay', () => {
  const spec = exampleSpec();
  const salah = DEFAULT_NORMS.find((norm) => norm.id === 'salah');
  if (!salah) throw new Error('Missing salah norm');
  spec.definitions.norms = [salah];
  const action = spec.definitions.actions[0];
  if (!action) throw new Error('Missing action');
  spec.definitions.actions = [...spec.definitions.actions, { ...action, id: 'pray', label: 'pray' }];
  spec.definitions.calendar.days = [
    {
      dayIndex: 0,
      start: 0,
      windows: [],
      prayers: {
        fajrMs: 8 * 60 * MINUTE,
        sunriseMs: 9 * 60 * MINUTE,
        dhuhrMs: 12 * 60 * MINUTE,
        asrMs: 15 * 60 * MINUTE,
        maghribMs: 18 * 60 * MINUTE,
        ishaMs: 20 * 60 * MINUTE,
      },
      nextFajrMs: 8 * 60 * MINUTE,
    },
  ];
  const holder = authoredPerson('ada', 'Ada');
  holder.identity.castId = 'cast.ada';
  holder.state.heldNorms = [
    { normId: 'salah', standing: 'obligatory', conviction: 1, provenance: salah.provenance },
  ];
  const run = need(createRun(spec));
  need(createPerson(run, holder));
  need(createPerson(run, authoredPerson('bea', 'Bea')));
  const archive = exportRun(run);
  expect(archive.current.people.ada?.agenda.commitments.map(({ id }) => id)).toEqual([
    'salah:0:fajr',
    'salah:0:dhuhr',
    'salah:0:asr',
    'salah:0:maghrib',
    'salah:0:isha',
  ]);
  expect(archive.current.people.bea?.agenda.commitments).toEqual([]);
  const reading = need(
    inspect(run, {
      perspective: { kind: 'host' },
      people: ['ada'],
      select: ['persona', 'calendar'],
      portable: { person: 'ada', castId: 'cast.ada', castRevision: '1' },
    }),
  );
  const entry = reading.people[0];
  if (entry?.kind !== 'host') throw new Error('Missing host reading');
  const persona = entry.parts.find((part) => part.select === 'persona');
  if (persona?.select !== 'persona') throw new Error('Missing portable person');
  const arriving = authoredPerson('guest', 'Guest');
  arriving.portable = {
    person: JSON.parse(JSON.stringify(persona.value)),
    mapping: { offsetMs: MINUTE, references: [] },
  };
  const receiving = need(createRun({ ...spec, start: spec.start + MINUTE }));
  need(createPerson(receiving, arriving));
  const retained = exportRun(receiving);
  expect(retained.current.people.guest?.agenda.commitments).toEqual(
    archive.current.people.ada?.agenda.commitments.map((duty) => ({
      ...duty,
      from: duty.from + MINUTE,
      until: duty.until + MINUTE,
    })),
  );
  expect(need(replay(retained)).fullHash).toBe(retained.hashes.full);

  need(step(run, { until: 9 * 60 * MINUTE + 1, inputs: [] }));
  expect(exportRun(run).current.people.ada?.agenda.owed.some((item) => item.ofId === 'salah:0:fajr')).toBe(
    true,
  );
  const bad = structuredClone(spec);
  const badDay = bad.definitions.calendar.days[0];
  if (!badDay) throw new Error('Missing calendar day');
  delete badDay.nextFajrMs;
  expect(createRun(bad).ok).toBe(false);
  const stepped = exportRun(run);
  expect(need(replay(stepped)).fullHash).toBe(stepped.hashes.full);
  expect(exportRun(need(restoreRun(stepped))).hashes.full).toBe(stepped.hashes.full);
});
