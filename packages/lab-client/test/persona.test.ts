import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acceptPersona,
  boundedPersonaJson,
  createPersona,
  isPersonaConsentMessage,
  isPersonaMessage,
  PERSONA_LIMITS,
  PERSONA_ORIGINS,
  type PersonaShelfState,
  personaChannel,
  validatePersona,
} from '../src/persona.ts';

afterEach(() => vi.unstubAllGlobals());
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
    const continued = await createPersona({
      ...body,
      parentRevision: target.revision,
      transfer: { continued: true },
    });
    state = acceptPersona(state, continued);
    expect(() => acceptPersona(state, target)).toThrow('conflict');
    expect(() => acceptPersona(state, target, true)).toThrow('conflict');
    expect(() => acceptPersona(state, first, true)).toThrow('conflict');
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
    for (let n = 0; n < PERSONA_LIMITS.revisions; n++) {
      const p = await createPersona({ ...body, parentRevision: parent, transfer: { n } });
      state = acceptPersona(state, p);
      parent = p.revision;
    }
    const p = await createPersona({ ...body, parentRevision: parent, transfer: { n: 11 } });
    const oldHead = state.heads[body.castId];
    const next = acceptPersona(state, p);
    expect(next.revisions).toHaveLength(PERSONA_LIMITS.revisions);
    expect(next.heads[body.castId]).toBe(p.revision);
    expect(state.heads[body.castId]).toBe(oldHead);
    expect(state.revisions).toHaveLength(PERSONA_LIMITS.revisions);
    const stale = await createPersona({
      ...body,
      parentRevision: oldHead ?? null,
      transfer: { stale: true },
    });
    expect(() => acceptPersona(next, stale)).toThrow('conflict');
  });
});

it('shares only consent status before automatically enabling a fresh target origin', async () => {
  let centralEnabled = false;
  const messages: Record<string, unknown>[] = [];
  function browser(origin: string) {
    const local = new Map<string, string>();
    const listeners = new Set<(event: unknown) => void>();
    let load: (() => void) | undefined;
    const frame = {
      addEventListener: (_kind: string, listener: () => void) => {
        load = listener;
      },
      contentWindow: {
        postMessage: (message: Record<string, unknown>) => {
          messages.push(message);
          if (message.type === 'hf-persona-consent' && message.action === 'set')
            centralEnabled = message.enabled === true;
          queueMicrotask(() => {
            for (const receive of listeners)
              receive({
                origin: 'https://human.adamwhite.work',
                source: frame.contentWindow,
                data: {
                  type:
                    message.type === 'hf-persona-consent' ? 'hf-persona-consent-reply' : 'hf-persona-reply',
                  id: message.id,
                  value: message.type === 'hf-persona-consent' ? centralEnabled : [],
                },
              });
          });
        },
      },
    };
    vi.stubGlobal('location', { origin });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
    });
    vi.stubGlobal('document', {
      body: { append: () => queueMicrotask(() => load?.()) },
      createElement: () => frame,
    });
    vi.stubGlobal('window', {
      addEventListener: (_kind: string, fn: (event: unknown) => void) => listeners.add(fn),
      removeEventListener: (_kind: string, fn: (event: unknown) => void) => listeners.delete(fn),
    });
    return personaChannel();
  }
  const source = browser('https://pass.adamwhite.work');
  expect(await source.ready).toBe(false);
  await expect(source.request({ action: 'list' })).rejects.toThrow('Enable');
  source.setEnabled(true);
  expect(await source.ready).toBe(true);
  const target = browser('https://goodhands.adamwhite.work');
  expect(target.enabled).toBe(false);
  expect(await target.ready).toBe(true);
  expect(messages.every((message) => message.type === 'hf-persona-consent')).toBe(true);
  expect(messages.every((message) => message.envelope === undefined && message.castId === undefined)).toBe(
    true,
  );
  await expect(target.request({ action: 'list' })).resolves.toEqual([]);
  target.setEnabled(false);
  await target.ready;
  const nextGame = browser('https://hearsay.adamwhite.work');
  expect(await nextGame.ready).toBe(false);
});

it('rejects consent status exchanges from unapproved origins, sibling frames and malformed choices', () => {
  const parent = {};
  const request = { type: 'hf-persona-consent', id: 'a'.repeat(32), action: 'get' };
  expect(isPersonaConsentMessage('https://pass.adamwhite.work', parent, parent, request)).toBe(true);
  expect(isPersonaConsentMessage('https://evil.adamwhite.work', parent, parent, request)).toBe(false);
  expect(isPersonaConsentMessage('https://pass.adamwhite.work', {}, parent, request)).toBe(false);
  expect(
    isPersonaConsentMessage('https://pass.adamwhite.work', parent, parent, {
      ...request,
      action: 'set',
      enabled: 'true',
    }),
  ).toBe(false);
});
