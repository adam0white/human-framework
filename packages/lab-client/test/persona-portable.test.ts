import { createPerson, promise } from '@adam0white/hf-legacy';
import { describe, expect, it } from 'vitest';
import { canonicalCast } from '../src/cast.ts';
import { createPersona } from '../src/persona.ts';
import { admitPortablePerson, projectPortablePerson } from '../src/persona-portable.ts';

const castId = 'hf.cast.burak.stairwell';
const actor = () =>
  createPerson({
    id: castId,
    name: 'Burak',
    bornAt: -31 * 525960,
    sex: 'male',
    seed: 9,
    traits: canonicalCast(castId).traits,
    values: canonicalCast(castId).values,
  });
const project = (person = actor()) =>
  projectPortablePerson({
    castId,
    game: 'commonstead',
    engine: '2.23.0',
    person,
    history: ['Worked with the workshop residents.'],
  });

describe('portable shelf contract', () => {
  it('binds a carried person and history to a registry role and refuses before replacing any input', async () => {
    const person = actor();
    person.body.satiety = 0.41;
    const p = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: 'portable-control',
      parentRevision: null,
      source: { game: 'commonstead', engine: '2.23.0', build: 'control', rules: 'portable-1' },
      transfer: project(person),
      limitations: [],
    });
    const frozen = structuredClone(p);
    const opening = actor();
    expect(admitPortablePerson(p, 'commonstead', opening).body.satiety).toBe(0.41);
    expect(opening.body.satiety).toBe(0.8);
    expect(p).toEqual(frozen);
    expect(() =>
      projectPortablePerson({
        castId: 'hf.cast.selin.voice',
        game: 'days',
        engine: '4.3.0',
        person,
        history: [],
      }),
    ).toThrow(/authored chapter/);
    expect(() =>
      admitPortablePerson(
        { ...p, transfer: { ...p.transfer, castPassport: 'hf-portable-person/99' } },
        'commonstead',
        opening,
      ),
    ).toThrow();
    expect(() =>
      projectPortablePerson({
        castId,
        game: 'commonstead',
        engine: '2.23.0',
        person,
        history: [],
        hostObligations: ['Unfinished shared building'],
      }),
    ).toThrow(/unfinished responsibilities/);
    expect(p).toEqual(frozen);
  });
  it('refuses all recurring chain states, precommitments and clinical injuries', () => {
    const person = actor();
    const duty = promise(person, {
      kind: 'promise',
      actions: ['rest'],
      from: 0,
      until: 60,
      importance: 0.5,
      recurEvery: 1440,
    });
    for (const status of ['pending', 'kept', 'broken', 'released'] as const) {
      duty.status = status;
      expect(() => project(person)).toThrow(/cannot continue/);
    }
    person.agenda.commitments = [];
    person.will.precommitments.push({} as never);
    expect(() => project(person)).toThrow(/cannot continue/);
    person.will.precommitments = [];
    person.body.injuries.push({} as never);
    expect(() => project(person)).toThrow(/cannot continue/);
  });
  it('refuses an active mourning period and permits its retained record after the source deadline', () => {
    const person = actor();
    person.bonds = {
      courtships: [],
      marriages: [{ spouseId: 'former-spouse', since: -100, endedAt: -10, end: 'widowed' }],
      mourning: { forId: 'former-spouse', since: -10, until: 1 },
    };
    expect(() => project(person)).toThrow(/cannot continue/);
    person.now = 1;
    expect(() => project(person)).not.toThrow();
  });
});
