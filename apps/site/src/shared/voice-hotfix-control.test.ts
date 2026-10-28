import { ENGINE_VERSION } from '@adam0white/human-framework';
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
import { newRun, VoiceGame } from '../voice/sim/game.ts';
import { play } from '../voice/sim/headless.ts';
import { RecordedGame, replayVoice, voiceHash } from '../voice/sim/record.ts';
import { makeCastChapter, siteCastCheckpoint } from './cast-chapter.ts';
import { claimSiteCastBatch } from './cast-site-claim.ts';

import { requireValue } from './require-value.ts';

const ids = ['halil', 'selin', 'riza', 'hacer', 'osman'].map((role) => `hf.cast.${role}.voice`);
const source = {
  game: 'voice',
  engine: ENGINE_VERSION,
  build: 'control',
  rules: 'cast-1',
};

async function authored(id: string) {
  const branchId = `control-${id}`;
  return createPersona({
    format: 'hf-persona/1',
    castId: id,
    castRevision: canonicalCast(id).revision,
    branchId,
    parentRevision: null,
    source,
    transfer: {
      castPassport: 'authored-cast/1',
      life: initialPersonaLife(id, branchId, 0),
    },
    limitations: [],
  });
}

async function control(dead: boolean) {
  const heads = await Promise.all(
    ids.map((id) =>
      id === 'hf.cast.hacer.voice' ? Promise.resolve(daysHacer as PersonaEnvelope) : authored(id),
    ),
  );
  const rizaId = requireValue(ids[2]);
  const native = await siteCastCheckpoint('voice', newRun(7).ppl.riza);
  heads[2] = await createPersona({
    format: 'hf-persona/1',
    castId: rizaId,
    castRevision: canonicalCast(rizaId).revision,
    branchId: 'native-riza',
    parentRevision: null,
    source,
    transfer: { ...native, life: initialPersonaLife(rizaId, 'native-riza', 0) },
    limitations: [],
  });
  let state: PersonaShelfState = { heads: {}, revisions: [] };
  for (const head of heads) state = acceptPersona(state, head);
  if (dead) {
    heads[1] = await closePersonaBranch(requireValue(heads[1]), source, 1);
    state = acceptPersona(state, requireValue(heads[1]));
  }
  const before = structuredClone(state);
  let writes = 0;
  const shelf = {
    request: async (message: Record<string, unknown>) => {
      if (message.action === 'prepareBatch') {
        const inputs = [],
          blocked = [];
        for (const id of ids) {
          const head = state.revisions.find((p) => p.revision === state.heads[id]);
          if (!head) continue;
          try {
            inputs.push(preparePersonaLife(head, 0));
          } catch (e) {
            blocked.push({ castId: id, reason: String(e) });
          }
        }
        return {
          inputs,
          blocked,
          expectedHeads: Object.fromEntries(ids.map((id) => [id, state.heads[id] ?? null])),
        };
      }
      expect(message.expectedHeads).toEqual(
        Object.fromEntries(ids.map((id) => [id, before.heads[id] ?? null])),
      );
      state = acceptPersonaBatch(
        state,
        message.envelopes as PersonaEnvelope[],
        message.expectedHeads as Record<string, string | null>,
      );
      writes++;
      return {};
    },
  } as unknown as CastShelf;
  const result = await claimSiteCastBatch(
    shelf,
    ids,
    source,
    async (inputs) => {
      const chapter = makeCastChapter(inputs);
      new VoiceGame(7, 4, chapter);
      return chapter;
    },
    {
      admitPerson: async (input) => {
        new VoiceGame(7, 4, makeCastChapter([input]));
      },
    },
  );
  expect(writes).toBe(1);
  expect(state.heads['hf.cast.hacer.voice']).toBe(before.heads['hf.cast.hacer.voice']);
  expect(state.revisions.find((p) => p.revision === state.heads['hf.cast.hacer.voice'])).toEqual(heads[3]);
  expect(result?.blocked.find((p) => p.castId === ids[3])?.reason).toMatch(/Hacer/);
  if (dead) {
    expect(result?.blocked.find((p) => p.castId === ids[1])?.reason).toMatch(/Selin.*death/i);
    expect(state.heads[requireValue(ids[1])]).toBe(before.heads[requireValue(ids[1])]);
  }

  const eligible = ids.filter((id) => id !== ids[3] && (!dead || id !== ids[1]));
  expect(result?.claims.map((p) => p.castId)).toEqual(eligible);
  for (const id of eligible) expect(state.heads[id]).not.toBe(before.heads[id]);
  return requireValue(result);
}

test('played Days Hacer is named and skipped while Voice carries the other four and replays a played choice', async () => {
  const result = await control(false);
  const rec = new RecordedGame(new VoiceGame(7, 4, result.initial));
  play(rec, {
    tick: [1000],
    stop: (g) => !g.intro && g.composer().open && g.frame().options.length > 0,
  });
  const option = requireValue(rec.frame().options[0]);
  rec.apply({
    type: 'suggest',
    draft: { optionId: option.id, strength: 'mention', insist: false },
  });
  for (let i = 0; i < 5; i++) rec.tick(1000);
  expect(rec.log.some((entry) => 'type' in entry && entry.type === 'suggest')).toBe(true);
  const replay = replayVoice(7, JSON.parse(JSON.stringify(rec.log)), 4, undefined, 0, result.initial);
  expect(replay.driftAt).toBe(-1);
  expect(voiceHash(replay.rec.game)).toBe(voiceHash(rec.game));
});

test('a death refused in prepareBatch is named and does not prevent other claims', async () => {
  await control(true);
});
