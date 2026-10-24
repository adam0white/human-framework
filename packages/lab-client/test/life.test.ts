import { describe, expect, it } from 'vitest';
import { CANONICAL_CAST, canonicalCast, castForGame } from '../src/cast.ts';
import {
  anchorPersonaLife,
  claimCastChapter,
  claimCastChapterBatch,
  initialPersonaLife,
  lifeAdmission,
  preparePersonaLife,
} from '../src/life.ts';
import {
  acceptPersona,
  acceptPersonaBatch,
  closePersonaBranch,
  createPersona,
  type PersonaShelfState,
} from '../src/persona.ts';

const hour = 3_600_000;
async function envelope() {
  return createPersona({
    format: 'hf-persona/1',
    castId: 'hf.cast.samira.well',
    castRevision: '1',
    branchId: 'life-test',
    parentRevision: null,
    source: { game: 'well', build: 'test', engine: '2.17.0', rules: '9' },
    transfer: { life: initialPersonaLife('hf.cast.samira.well', 'life-test', 0), person: { pinned: true } },
    limitations: ['Coarse local fiction; no duties are resolved.'],
  });
}
describe('canonical cast and bounded browser life', () => {
  it('contains exactly forty complete host-independent profiles and fifteen allocations', () => {
    expect(CANONICAL_CAST).toHaveLength(40);
    expect(CANONICAL_CAST.filter((p) => p.cohort === 'coast')).toHaveLength(30);
    const games = new Set(CANONICAL_CAST.flatMap((p) => p.games));
    expect(games.size).toBe(15);
    for (const p of CANONICAL_CAST) {
      expect(Object.keys(p.traits)).toHaveLength(6);
      expect(Object.keys(p.values)).toHaveLength(10);
    }
    expect([...games].sort()).toEqual(
      'pass murmur stairwell voice goodhands hearsay rope glance repair neighbours commonstead well valley warren watch'
        .split(' ')
        .sort(),
    );
    for (const game of games) {
      expect(castForGame(game).length).toBeGreaterThanOrEqual(3);
      expect(castForGame(game).length).toBeLessThanOrEqual(8);
    }
    expect(canonicalCast('hf.cast.selin.voice').values.security).toBe(0.5);
  });
  it('pins clock outcomes, cap, rollback, repeated return and local cohort contacts', async () => {
    const p = await envelope();
    const prepared = preparePersonaLife(p, 100 * hour);
    expect(prepared).toEqual(preparePersonaLife(p, 100 * hour));
    expect(prepared.life.skipped).toBe(76);
    expect(prepared.life.events.length).toBeLessThanOrEqual(24);
    for (const id of prepared.life.notices) expect(canonicalCast(id).cohort).toBe('valley');
    const carried = { ...p, transfer: { ...p.transfer, life: prepared.life } };
    expect(preparePersonaLife(carried, 0).life).toEqual(prepared.life);
    expect(preparePersonaLife(carried, 100 * hour).life).toEqual(prepared.life);
    const anchored = anchorPersonaLife(prepared.life, p.castId, 90 * hour);
    expect(anchored.clock.watermark).toBe(100);
    expect(p.transfer.person).toEqual({ pinned: true });
    expect(() => lifeAdmission(prepared, 'voice')).toThrow();
    expect(() => preparePersonaLife({ ...p, castRevision: 'older' }, hour)).toThrow(/older cast/);
  });
  it('retains forty heads while pruning only bounded non-head history', async () => {
    let state: PersonaShelfState = { heads: {}, revisions: [] };
    const sample = await envelope();
    const { revision: _revision, ...body } = sample;
    for (const cast of CANONICAL_CAST) {
      const p = await createPersona({
        ...body,
        castId: cast.castId,
        castRevision: cast.revision,
        branchId: cast.castId,
      });
      state = acceptPersona(state, p);
    }
    const cast = CANONICAL_CAST[0];
    if (!cast) throw new Error('missing cast');
    for (let n = 0; n < 90; n++) {
      const p = await createPersona({
        ...body,
        castId: cast.castId,
        castRevision: cast.revision,
        branchId: cast.castId,
        parentRevision: state.heads[cast.castId] ?? null,
        transfer: { n },
      });
      state = acceptPersona(state, p);
    }
    expect(Object.keys(state.heads)).toHaveLength(40);
    expect(state.revisions).toHaveLength(120);
    for (const head of Object.values(state.heads))
      expect(state.revisions.some((p) => p.revision === head)).toBe(true);
  });
  it('claims only after semantic validation and competing claims cannot replace a head', async () => {
    const p = await envelope();
    let state: PersonaShelfState = acceptPersona({ heads: {}, revisions: [] }, p);
    const shelf = {
      async request<T>(request: { action: string; envelope?: typeof p }) {
        if (request.action === 'prepare') return preparePersonaLife(p, hour) as T;
        if (request.envelope) state = acceptPersona(state, request.envelope);
        return request.envelope as T;
      },
    };
    await expect(
      claimCastChapter(shelf, p.castId, { ...p.source, game: 'watch' }, async () => {
        throw new Error('unmapped promise');
      }),
    ).rejects.toThrow('unmapped promise');
    expect(state.heads[p.castId]).toBe(p.revision);
    const a = await claimCastChapter(shelf, p.castId, { ...p.source, game: 'watch' }, async (input) => ({
      input,
      person: 'complete pinned state',
    }));
    expect(a?.initial.person).toBe('complete pinned state');
    await expect(
      claimCastChapter(shelf, p.castId, { ...p.source, game: 'valley' }, async () => ({})),
    ).rejects.toThrow(/conflict/);
    expect(a?.input.parent).toEqual(p);
  });
});

it('claims two distinct histories atomically and a conflict in either parent changes neither', async () => {
  const a = await envelope();
  const { revision: _revision, ...body } = a;
  const b = await createPersona({
    ...body,
    castId: 'hf.cast.idris.well',
    branchId: 'idris-history',
    transfer: {
      ...body.transfer,
      life: initialPersonaLife('hf.cast.idris.well', 'idris-history', 0),
      acquired: 'second history',
    },
  });
  let state = acceptPersonaBatch({ heads: {}, revisions: [] }, [a, b]);
  const inputs = [a, b].map((p) => preparePersonaLife(p, hour));
  const shelf = {
    async request<T>(r: import('../src/persona.ts').PersonaRequest) {
      if (r.action === 'prepareBatch')
        return {
          inputs,
          blocked: [],
          expectedHeads: Object.fromEntries(inputs.map((p) => [p.parent.castId, p.parent.revision])),
        } as T;
      if (r.action === 'putBatch') state = acceptPersonaBatch(state, r.envelopes!, r.expectedHeads);
      return r.envelopes as T;
    },
  };
  const other = await createPersona({
    ...body,
    castId: b.castId,
    branchId: b.branchId,
    parentRevision: b.revision,
    transfer: { ...b.transfer, advanced: true },
  });
  state = acceptPersona(state, other);
  const before = structuredClone(state);
  let started = false;
  await expect(
    claimCastChapterBatch(shelf, [a.castId, b.castId], { ...a.source, game: 'watch' }, async (p) =>
      p.map((x) => x.parent.transfer),
    ),
  ).rejects.toThrow(/conflict/);
  expect(state).toEqual(before);
  // Start belongs after the successful helper result, so this conflict starts no partial game.
  expect(started).toBe(false);
  state = acceptPersonaBatch({ heads: {}, revisions: [] }, [a, b]);
  const result = await claimCastChapterBatch(
    shelf,
    [a.castId, b.castId],
    { ...a.source, game: 'watch' },
    async (p) => p.map((x) => x.parent.transfer),
  );
  started = Boolean(result);
  expect(started).toBe(true);
  expect(result?.claims).toHaveLength(2);
  expect(result?.initial[1]?.acquired).toBe('second history');
});
it('retains a terminal receipt and refuses preparation or living continuation of that branch', async () => {
  const alive = await envelope();
  const closed = await closePersonaBranch(alive, alive.source, 1200);
  const state = acceptPersona(acceptPersona({ heads: {}, revisions: [] }, alive), closed);
  expect(() => preparePersonaLife(closed, hour)).toThrow(/closed/);
  const { revision: _revision, ...body } = alive;
  const stale = await createPersona({ ...body, parentRevision: closed.revision });
  expect(() => acceptPersona(state, stale)).toThrow(/closed/);
  expect(() => acceptPersona(state, alive)).toThrow(/conflict/);
  expect(state.revisions).toContainEqual(alive);
  const alternate = await createPersona({ ...body, branchId: 'explicit-alternate', parentRevision: null });
  expect(acceptPersona(state, alternate, true).heads[alive.castId]).toBe(alternate.revision);
});
