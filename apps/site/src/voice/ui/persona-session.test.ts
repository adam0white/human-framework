import type { PersonaEnvelope } from '@adam0white/lab-client';
import { describe, expect, test } from 'vitest';
import { claimAfterValidation, PersonaSession, requireOwnHead } from './persona-session.ts';

const envelope = (revision: string): PersonaEnvelope => ({
  format: 'hf-persona/1',
  castId: 'hf.cast.selin.voice',
  castRevision: '1',
  branchId: 'one-branch',
  revision,
  parentRevision: null,
  source: { game: 'voice', build: 'test', engine: '2.14.1', rules: 'voice-3' },
  transfer: {},
  limitations: [],
});
describe('validated person replacement', () => {
  test('a rejected candidate blocks uploads while pending and restores the original local-only gate', () => {
    const keys: (string | null)[] = [];
    const session = new PersonaSession((key) => keys.push(key));
    const old = envelope('a'.repeat(64));
    session.accept(old);
    session.beginFile('{}');
    expect(keys.at(-1)).toMatch(/^voice-pending-/);
    session.finish(false);
    expect(keys.at(-1)).toBe(old.branchId);
    expect(session.head).toEqual(old);
  });
  test('the accepted envelope gates a header even without optional analytics rows', () => {
    const keys: (string | null)[] = [];
    const session = new PersonaSession((key) => keys.push(key));
    const imported = envelope('b'.repeat(64));
    session.beginFile(JSON.stringify({ voicePersona: { admission: imported, acceptedHead: imported } }));
    expect(keys.at(-1)).toMatch(/^voice-pending-/);
    session.finish(true);
    expect(keys.at(-1)).toBe(imported.branchId);
  });
  test('an incompatible return cannot consume a shared head', async () => {
    let claims = 0;
    await expect(
      claimAfterValidation(
        'invalid',
        async () => {
          throw Error('incompatible');
        },
        async () => {
          claims++;
          return envelope('c'.repeat(64));
        },
      ),
    ).rejects.toThrow('incompatible');
    expect(claims).toBe(0);
  });
  test('validated saved ownership resumes only its own accepted revision', () => {
    const session = new PersonaSession(() => {});
    const saved = envelope('a'.repeat(64));
    session.beginFile(JSON.stringify({ voicePersonaHead: saved }));
    session.finish(true);
    expect(() => requireOwnHead(saved, session.head)).not.toThrow();
    expect(() => requireOwnHead(envelope('b'.repeat(64)), session.head)).toThrow('another Selin chapter');
    expect(session.head?.revision).toBe(saved.revision);
  });
});
