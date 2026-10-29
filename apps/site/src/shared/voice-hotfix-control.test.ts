/** Real shelf refusal keeps old sources while a fresh HF4 Voice run remains playable. */
import {
  acceptPersona,
  acceptPersonaBatch,
  type CastShelf,
  canonicalCast,
  closePersonaBranch,
  createPersona,
  initialPersonaLife,
  type PersonaEnvelope,
  type PersonaShelfState,
  preparePersonaLife,
} from '@adam0white/lab-client';
import { expect, test } from 'vitest';
import daysHacer from '../../test/fixtures/portable-days-hacer.json';
import { VoiceGame } from '../voice/sim/game.ts';
import { RecordedGame, replayVoice, voiceHash } from '../voice/sim/record.ts';
import { makeCastChapter } from './cast-chapter.ts';
import { claimSiteCastBatch } from './cast-site-claim.ts';
import { FRAMEWORK_PACKAGE_VERSION } from './playtest.ts';
import { requireValue } from './require-value.ts';

const ids = ['halil', 'selin', 'riza', 'hacer', 'osman'].map((role) => `hf.cast.${role}.voice`);
const source = { game: 'voice', engine: FRAMEWORK_PACKAGE_VERSION, build: 'control', rules: 'hf4-cast-1' };

async function control(dead: boolean) {
  const heads = await Promise.all(
    ids.map(async (id) => {
      if (id === 'hf.cast.hacer.voice') return daysHacer as PersonaEnvelope;
      const branchId = `old-source-${id}`;
      return createPersona({
        format: 'hf-persona/1',
        castId: id,
        castRevision: canonicalCast(id).revision,
        branchId,
        parentRevision: null,
        source: { game: 'voice', engine: '3.2.0', build: 'old-source-control', rules: 'voice-3' },
        transfer: {
          castPassport: 'site-cast/1',
          sourceRole: id.split('.')[2],
          life: initialPersonaLife(id, branchId, 0),
        },
        limitations: ['Synthetic older source; no claim of retained acquired state.'],
      });
    }),
  );
  let state: PersonaShelfState = { heads: {}, revisions: [] };
  for (const head of heads) state = acceptPersona(state, head);
  if (dead) state = acceptPersona(state, await closePersonaBranch(requireValue(heads[1]), source, 1));
  const before = structuredClone(state);
  let batchCalls = 0;
  const shelf = {
    request: async (message: Record<string, unknown>) => {
      if (message.action === 'prepareBatch') {
        const inputs = [],
          blocked = [];
        for (const id of ids) {
          const parent = requireValue(state.revisions.find((p) => p.revision === state.heads[id]));
          try {
            inputs.push(preparePersonaLife(parent, 0));
          } catch (error) {
            blocked.push({ castId: id, reason: String(error) });
          }
        }
        return { inputs, blocked, expectedHeads: { ...state.heads } };
      }
      expect(message.action).toBe('putBatch');
      expect(message.expectedHeads).toEqual(before.heads);
      expect(message.envelopes).toEqual([]);
      state = acceptPersonaBatch(
        state,
        message.envelopes as PersonaEnvelope[],
        message.expectedHeads as Record<string, string | null>,
      );
      batchCalls++;
      return [];
    },
  } as unknown as CastShelf;
  const result = requireValue(
    await claimSiteCastBatch(shelf, ids, source, async (inputs) =>
      inputs.length ? makeCastChapter(inputs) : undefined,
    ),
  );
  expect(result.claims).toEqual([]);
  expect(result.inputs).toEqual([]);
  expect(result.blocked.find((item) => item.castId === 'hf.cast.hacer.voice')?.reason).toMatch(/Hacer/);
  if (dead)
    expect(result.blocked.find((item) => item.castId === 'hf.cast.selin.voice')?.reason).toMatch(
      /Selin.*death/i,
    );
  expect(batchCalls).toBe(1); // Empty CAS still checks every accepted parent; it replaces none.
  expect(state).toEqual(before);
  return result;
}

test('names unsupported Hacer and other sources, preserves every head, and replays the fresh local cast', async () => {
  const result = await control(false);
  const rec = new RecordedGame(new VoiceGame(7, 4, result.initial));
  rec.apply({ type: 'begin' });
  rec.step(5);
  expect(rec.game.run.c.people.map((person) => person.id).sort()).toEqual([
    'hacer',
    'halil',
    'osman',
    'riza',
    'selin',
  ]);
  const again = replayVoice(7, JSON.parse(JSON.stringify(rec.log)), 4);
  expect(again.driftAt).toBe(-1);
  expect(voiceHash(again.rec.game)).toBe(voiceHash(rec.game));
  expect(again.rec.game.run.c.runtime?.save().archive.hashes.full).toBe(
    rec.game.run.c.runtime?.save().archive.hashes.full,
  );
});

test('names a previously closed Selin branch and preserves it with the other refused parents', async () => {
  await control(true);
});
