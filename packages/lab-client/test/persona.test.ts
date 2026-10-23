import { describe, expect, it } from 'vitest';
import {
  acceptPersona,
  boundedPersonaJson,
  createPersona,
  isPersonaMessage,
  PERSONA_ORIGINS,
  type PersonaShelfState,
  validatePersona,
} from '../src/persona.ts';

const body = {
  format: 'hf-persona/1' as const,
  castId: 'hf.cast.zeynep.pass',
  castRevision: '1',
  branchId: 'a',
  parentRevision: null,
  source: { game: 'pass', build: 'abc', engine: '2.14.1', rules: '1' },
  transfer: { format: 'hf-persona-state/1', traits: { honesty: 0.7 } },
  limitations: ['No world state.'],
};
const empty = (): PersonaShelfState => ({ revisions: [], heads: {} });
describe('persona shelf contract', () => {
  it('checks content hashes and rejects hostile structure, prototypes and byte overflow', async () => {
    const p = await createPersona(body);
    expect(await validatePersona(JSON.parse(JSON.stringify(p)))).toEqual(p);
    await expect(validatePersona({ ...p, transfer: { altered: true } })).rejects.toThrow('checksum');
    expect(() => boundedPersonaJson(JSON.parse('{"__proto__":{}}'))).toThrow('Unsafe');
    expect(() => boundedPersonaJson({ a: 'x'.repeat(33000) })).toThrow();
    let nested: unknown = 1;
    for (let n = 0; n < 26; n++) nested = { nested };
    expect(() => boundedPersonaJson(nested)).toThrow('complex');
    expect(PERSONA_ORIGINS.has('https://evil.adamwhite.work')).toBe(false);
    expect(PERSONA_ORIGINS.has('http://pass.adamwhite.work')).toBe(false);
  });
  it('admits only exact participating parent windows with explicit persona opt-in', () => {
    const parent = {};
    const message = {
      type: 'hf-persona-request',
      id: 'a'.repeat(32),
      optedIn: true,
      action: 'get',
      castId: body.castId,
    };
    expect(isPersonaMessage('https://pass.adamwhite.work', parent, parent, message)).toBe(true);
    expect(isPersonaMessage('https://evil.adamwhite.work', parent, parent, message)).toBe(false);
    expect(isPersonaMessage('https://pass.adamwhite.work', {}, parent, message)).toBe(false);
    expect(
      isPersonaMessage('https://pass.adamwhite.work', parent, parent, { ...message, optedIn: false }),
    ).toBe(false);
    expect(
      isPersonaMessage('https://pass.adamwhite.work', parent, parent, { ...message, action: 'read-all' }),
    ).toBe(false);
  });
  it('advances one person transactionally, preserves other people and refuses competing histories', async () => {
    const first = await createPersona(body);
    let state = acceptPersona(empty(), first);
    const target = await createPersona({
      ...body,
      parentRevision: first.revision,
      source: { ...body.source, game: 'goodhands' },
    });
    state = acceptPersona(state, target);
    expect(acceptPersona(state, target)).toBe(state);
    const stale = await createPersona({
      ...body,
      parentRevision: first.revision,
      transfer: { changed: true },
    });
    expect(() => acceptPersona(state, stale)).toThrow('conflict');
    const second = await createPersona({ ...body, castId: 'hf.cast.dilan.murmur' });
    state = acceptPersona(state, second);
    expect(Object.keys(state.heads)).toHaveLength(2);
    const fork = await createPersona({ ...body, branchId: 'fork' });
    expect(() => acceptPersona(state, fork)).toThrow('conflict');
    state = acceptPersona(state, fork, true);
    expect(state.heads[first.castId]).toBe(fork.revision);
    expect(() => acceptPersona(state, stale)).toThrow('conflict');
  });
  it('prunes old non-head cache entries while preserving active heads and stale-write refusal', async () => {
    let state = empty();
    let parent: string | null = null;
    for (let n = 0; n < 10; n++) {
      const p = await createPersona({ ...body, parentRevision: parent, transfer: { n } });
      state = acceptPersona(state, p);
      parent = p.revision;
    }
    const p = await createPersona({ ...body, parentRevision: parent, transfer: { n: 11 } });
    const oldHead = state.heads[body.castId];
    const next = acceptPersona(state, p);
    expect(next.revisions).toHaveLength(10);
    expect(next.heads[body.castId]).toBe(p.revision);
    expect(state.heads[body.castId]).toBe(oldHead);
    expect(state.revisions).toHaveLength(10);
    const stale = await createPersona({
      ...body,
      parentRevision: oldHead ?? null,
      transfer: { stale: true },
    });
    expect(() => acceptPersona(next, stale)).toThrow('conflict');
  });
});
