import {
  type CastShelf,
  createPersona,
  initialPersonaLife,
  type LifeBatchPreparation,
  type PersonaEnvelope,
  preparePersonaLife,
} from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { nativeCastSource } from './cast-native-sources.ts';
import { claimSiteCastBatch } from './cast-site-claim.ts';
import { requireValue } from './require-value.ts';

/** Transaction orchestration control; not a fabricated native played-source receipt. */
describe('same-site native claim provenance', () => {
  it('preserves original native source across same-site claims and refuses an external pass-through claim', async () => {
    let head = await createPersona({
      format: 'hf-persona/1',
      castId: 'hf.cast.hacer.voice',
      castRevision: '1',
      branchId: 'control-native',
      parentRevision: null,
      source: { game: 'stairwell', rules: '7', engine: '2.17.0', build: 'native-control' },
      transfer: {
        castPassport: 'stairwell-cast/1',
        sourceRole: 'hacer',
        hostObligations: [],
        life: initialPersonaLife('hf.cast.hacer.voice', 'control-native', 0),
      },
      limitations: [],
    });
    const original = head;
    const shelf = {
      request: async (message: Record<string, unknown>) => {
        if (message.action === 'prepareBatch')
          return {
            expectedHeads: { [head.castId]: head.revision },
            blocked: [],
            inputs: [preparePersonaLife(head, 0)],
          } satisfies LifeBatchPreparation;
        const envelopes = message.envelopes as PersonaEnvelope[];
        expect((message.expectedHeads as Record<string, string>)[head.castId]).toBe(head.revision);
        head = requireValue(envelopes[0]);
        return {};
      },
    } as unknown as CastShelf;
    const source = { game: 'voice', rules: 'cast-1', engine: '2.17.0', build: 'site-control' };
    const a = await claimSiteCastBatch(shelf, [head.castId], source, async (inputs) => {
      expect(nativeCastSource('voice', requireValue(inputs[0]).parent)?.role).toBe('hacer');
      return 'pinned';
    });
    expect(a?.initial).toBe('pinned');
    expect(head.source).toEqual(source);
    expect(head.transfer.siteNativeClaim).toEqual({
      version: 'site-native-claim/1',
      source: original.source,
      revision: original.revision,
    });
    await claimSiteCastBatch(shelf, [head.castId], source, async (inputs) => {
      expect(nativeCastSource('voice', requireValue(inputs[0]).parent)?.mapping).toBe('stairwell-calendar/1');
      return 'still-pinned';
    });
    expect(head.transfer.siteNativeClaim).toEqual(a?.claims[0]?.transfer.siteNativeClaim);
    expect(() => nativeCastSource('well', head)).toThrow(/same-site/);
    const external = { ...head, source: { ...head.source, game: 'hearsay' } };
    expect(() => nativeCastSource('voice', external)).toThrow(/same-site/);
  });
});
