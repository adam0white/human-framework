import { expect, it } from 'vitest';
import { qalbReading } from '../src/qalb.ts';
import type { ActorState, Lexicon } from '../src/run-schema.ts';

it('attributes retained evidence and keeps the three trust stores separate without mutation', () => {
  const actor = {
    id: 'a',
    rng: { a: 1, b: 2, c: 3, d: 4 },
    memory: { episodes: [{ id: 'e0', kind: 'told' }], gists: [], sourceTrust: { teller: 0.8 } },
    conscience: { norms: [{ normId: 'honesty', standing: 'forbidden', conviction: 0.9 }] },
    affect: { mood: { valence: -0.7, arousal: 0.2 } },
    social: { relationships: [{ otherId: 'neighbor', trust: 0.5 }] },
    will: { voices: [{ voiceId: 'advisor', trust: 0.1 }] },
  } as unknown as ActorState;
  const lex: Lexicon = {
      names: { neighbor: 'Sam', advisor: 'Mum', teller: 'Lee' },
      roles: {},
      actions: {},
      prefer: 'name',
    },
    before = JSON.stringify(actor);
  const rows = qalbReading(actor, [], lex);
  expect(rows.find((r) => r.facet === 'attention')?.evidence).toContain('memory:e0:told');
  expect(rows.find((r) => r.facet === 'held-norm')?.evidence).toContain('norm:honesty');
  expect(rows.filter((r) => r.facet === 'trust').map((r) => r.evidence[0])).toEqual([
    'social.relationships:neighbor',
    'will.voices:advisor',
    'memory.sourceTrust:teller',
  ]);
  expect(
    rows
      .filter((r) => r.facet === 'trust')
      .map((r) => r.text)
      .join(' '),
  ).toContain('advising voice Mum');
  rows[0]!.evidence.push('changed');
  expect(JSON.stringify(actor)).toBe(before);
});
