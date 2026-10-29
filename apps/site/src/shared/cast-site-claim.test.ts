import { type CastShelf, type PersonaEnvelope, preparePersonaLife } from '@adam0white/lab-client';
import { expect, test, vi } from 'vitest';
import daysHacer from '../../test/fixtures/portable-days-hacer.json';
import { claimSiteCastBatch } from './cast-site-claim.ts';

test('a refused shared write is named before host admission and preserves the source head', async () => {
  const parent = daysHacer as PersonaEnvelope;
  const original = structuredClone(parent);
  const messages: Record<string, unknown>[] = [];
  const hostAdmission = vi.fn();
  const shelf = {
    request: async (message: Record<string, unknown>) => {
      messages.push(message);
      if (message.action === 'prepareBatch')
        return {
          expectedHeads: { [parent.castId]: parent.revision },
          blocked: [],
          inputs: [preparePersonaLife(parent, 0)],
        };
      return {};
    },
  } as unknown as CastShelf;
  const result = await claimSiteCastBatch(
    shelf,
    [parent.castId],
    { game: 'voice', engine: '4.10.0', build: 'control', rules: 'hf4-cast-1' },
    async (inputs) => inputs,
    { admitPerson: hostAdmission },
  );
  expect(result?.blocked[0]?.reason).toMatch(/Hacer/);
  expect(result?.claims).toEqual([]);
  expect(hostAdmission).not.toHaveBeenCalled();
  expect(messages.at(-1)).toMatchObject({
    action: 'putBatch',
    envelopes: [],
    expectedHeads: { [parent.castId]: parent.revision },
  });
  expect(parent).toEqual(original);
});
