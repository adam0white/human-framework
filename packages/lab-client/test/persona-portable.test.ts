import { createPerson, promise } from '@adam0white/hf-legacy';
import { describe, expect, it } from 'vitest';
import { canonicalCast } from '../src/cast.ts';
import {
  claimCastChapter,
  claimCastChapterBatch,
  preparePersonaLife,
  projectCastClaimTransfer,
} from '../src/life.ts';
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
  it('locks projected arrivals until a genuine current-actor departure succeeds', async () => {
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: 'claim-control',
      parentRevision: null,
      source: { game: 'commonstead', engine: '2.23.0', build: 'control', rules: 'portable-1' },
      transfer: project(),
      limitations: [],
    });
    const source = { ...parent.source, game: 'commonstead', engine: '2.23.0' };
    const arrival = projectPortablePerson({
      castId,
      game: 'commonstead',
      engine: '2.23.0',
      person: actor(),
      history: [],
      previous: parent,
    });
    const input = preparePersonaLife(parent, 3600000);
    const receiving = { ...source, game: 'days', engine: '4.0.0' };
    const shelf = {
      async request<T>(request: import('../src/persona.ts').PersonaRequest) {
        if (request.action === 'prepare') return input as T;
        if (request.action === 'prepareBatch')
          return {
            expectedHeads: { [castId]: parent.revision },
            inputs: [input],
            blocked: [],
          } as T;
        return undefined as T;
      },
    };
    const single = await claimCastChapter(shelf, castId, receiving, async () =>
      admitPortablePerson(parent, receiving.game, actor()),
    );
    const defaultBatch = await claimCastChapterBatch(shelf, [castId], receiving, async () =>
      admitPortablePerson(parent, receiving.game, actor()),
    );
    for (const claim of [single?.claim, defaultBatch?.claims[0]]) {
      if (!claim) throw new Error('The copied arrival was not claimed.');
      expect(claim.source).toEqual(parent.source);
      expect(claim.transfer.portableClaim).toEqual({ game: receiving.game });
      expect(() => admitPortablePerson(claim, 'commonstead', actor())).toThrow();
      expect(() => admitPortablePerson(claim, 'days', actor())).not.toThrow();
    }
    const result = await claimCastChapterBatch(
      {
        async request<T>(request: import('../src/persona.ts').PersonaRequest) {
          if (request.action === 'prepareBatch')
            return {
              expectedHeads: { [castId]: parent.revision },
              inputs: [input],
              blocked: [],
            } as T;
          return undefined as T;
        },
      },
      [castId],
      source,
      async () => arrival,
      { claimTransfer: (initial) => initial },
    );
    const claimed = result?.claims[0];
    if (!claimed) throw new Error('The portable arrival was not claimed.');
    expect(() => admitPortablePerson(claimed, 'days', actor())).toThrow(/matching authored role/);
    expect(() => projectCastClaimTransfer(claimed, { ...source, game: 'days' }, arrival, input.life)).toThrow(
      /still belongs/,
    );
    expect(() =>
      projectPortablePerson({
        castId,
        game: 'commonstead',
        engine: '2.23.0',
        person: actor(),
        history: [],
        previous: claimed,
        hostObligations: ['Unfinished delivery'],
      }),
    ).toThrow(/unfinished responsibilities/);
    expect(() => admitPortablePerson(claimed, 'days', actor())).toThrow();
    const departed = {
      ...claimed,
      transfer: projectPortablePerson({
        castId,
        game: 'commonstead',
        engine: '2.23.0',
        person: actor(),
        history: ['Finished the chapter.'],
        previous: claimed,
      }),
    };
    expect(() => admitPortablePerson(departed, 'days', actor())).not.toThrow();
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
