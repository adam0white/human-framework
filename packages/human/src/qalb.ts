/** SCOPE: internal read-only lens over retained evidence, held rules, mood and three
 * distinct trust stores. Sources support this lens, not a diagnosis or acceptance score.
 * C0 applies perspective admission before invoking this projection.
 */

import { displayName } from './narrate/lexicon.ts';
import { renderProjection } from './narrate/literal.ts';
import type { ActorState, DeepReadonly, Lexicon, SourcedNorm } from './run-schema.ts';
export interface QalbDescription {
  facet: 'attention' | 'held-norm' | 'mood' | 'trust';
  category: string;
  personId: string;
  text: string;
  evidence: string[];
  sources: string[];
}
export function qalbReading(
  p: DeepReadonly<ActorState>,
  norms: readonly DeepReadonly<SourcedNorm>[],
  lexicon: DeepReadonly<Lexicon>,
): QalbDescription[] {
  const sources = [
    'research/reconciliation.md §2–4, §7; Q7 (22:46); H9 (Bukhari 52; Muslim 1599a)',
    'research/islamic-foundations.md §2: Qalb',
    'research/decisions.md: Qalb, nafs, fitra, ʿaql as state (2026-10-18)',
  ];
  const rows: QalbDescription[] = [];
  const add = (facet: QalbDescription['facet'], category: string, text: string, evidence: string[]) =>
    rows.push({ facet, category, personId: p.id, text, evidence, sources: [...sources] });
  const memories = [...p.memory.episodes, ...p.memory.gists];
  add(
    'attention',
    memories.length ? 'retained-evidence' : 'no-retained-evidence',
    renderProjection({ kind: 'attention', retained: memories.length > 0 }),
    memories.map((e) => `memory:${e.id}:${e.kind}`),
  );
  if (!p.conscience.norms.length)
    add('held-norm', 'unrecorded', renderProjection({ kind: 'no-evidence', subject: 'held rules' }), [
      'conscience.norms',
    ]);
  for (const n of p.conscience.norms)
    add(
      'held-norm',
      n.conviction === 0 ? 'no-conviction' : 'held-understanding',
      renderProjection({
        kind: 'held-norm',
        label: norms.find((x) => x.id === n.normId)?.label ?? n.normId,
        conviction: n.conviction,
      }),
      [`norm:${n.normId}`, `standing:${n.standing}`, 'conscience.norms.conviction'],
    );
  add(
    'mood',
    p.affect.mood.valence < 0 ? 'unpleasant' : p.affect.mood.valence > 0 ? 'pleasant' : 'neutral',
    renderProjection({ kind: 'mood', valence: p.affect.mood.valence }),
    ['affect.mood.valence'],
  );
  add(
    'mood',
    p.affect.mood.arousal === 0 ? 'no-arousal' : 'some-arousal',
    renderProjection({ kind: 'mood', valence: p.affect.mood.valence, arousal: p.affect.mood.arousal }),
    ['affect.mood.arousal'],
  );
  const trusts = [
    ...p.social.relationships.map((r) => ({
      store: 'social.relationships',
      kind: 'person' as const,
      id: r.otherId,
      trust: r.trust,
    })),
    ...p.will.voices.map((v) => ({
      store: 'will.voices',
      kind: 'advising voice' as const,
      id: v.voiceId,
      trust: v.trust,
    })),
    ...Object.entries(p.memory.sourceTrust).map(([id, trust]) => ({
      store: 'memory.sourceTrust',
      kind: 'information source' as const,
      id,
      trust,
    })),
  ];
  if (!trusts.length)
    add('trust', 'unrecorded', renderProjection({ kind: 'no-evidence', subject: 'learned trust' }), [
      'social.relationships',
      'will.voices',
      'memory.sourceTrust',
    ]);
  for (const t of trusts)
    add(
      'trust',
      t.trust < 0.5 ? 'below-midpoint' : t.trust > 0.5 ? 'above-midpoint' : 'at-midpoint',
      renderProjection({ kind: 'trust', subject: displayName(t.id, lexicon), store: t.kind, trust: t.trust }),
      [`${t.store}:${t.id}`],
    );
  return rows;
}
