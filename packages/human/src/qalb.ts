/**
 * SCOPE: a read-only narration lens over retained attention evidence, held norms and conviction,
 * mood and the three distinct trust stores. Owns no state and supplies no decision input. It does
 * not infer spiritual health, rank people, judge norms, measure the ruh or compute divine acceptance.
 * Retained memories are evidence available for narration, not a complete attention history.
 *
 * Provenance: research/reconciliation.md §2–4, §7 (Q7: Qur'an 22:46; H9: Bukhari 52 /
 * Muslim 1599a); research/islamic-foundations.md §2 (qalb as an overlapping interpretive view);
 * research/decisions.md, “Qalb, nafs, fitra, ʿaql as state”. These support the lens, not a
 * diagnostic mapping. Sign/zero categories below are engineering descriptions of stored values,
 * not religious categories. Mood and interpersonal trust imply nothing about faith.
 */
import type { Person } from './types.ts';

export interface QalbDescription {
  facet: 'attention' | 'held-norm' | 'mood' | 'trust';
  category: string;
  /** Every description is attributed to this simulated person's records. */
  personId: string;
  text: string;
  /** Detached identifiers and state paths, never mutable state objects or spiritual scores. */
  evidence: string[];
  sources: string[];
}

/**
 * Plain English descriptions; no scalar summary, comparison or hidden update.
 * Hosts must not present these records as spiritual health or a religious assessment.
 */
export function qalbReading(p: Person): QalbDescription[] {
  const sources = [
    'research/reconciliation.md §2–4, §7; Q7 (22:46); H9 (Bukhari 52; Muslim 1599a)',
    'research/islamic-foundations.md §2: Qalb',
    'research/decisions.md: Qalb, nafs, fitra, ʿaql as state (2026-10-18)',
  ];
  const rows: QalbDescription[] = [];
  const add = (facet: QalbDescription['facet'], category: string, text: string, evidence: string[]) => {
    rows.push({ facet, category, personId: p.id, text, evidence, sources: [...sources] });
  };
  const memories = [...p.memory.episodes, ...(p.memory.gists ?? [])];
  add(
    'attention',
    memories.length ? 'retained-evidence' : 'no-retained-evidence',
    memories.length
      ? 'Their memories retain some experiences. These do not show everything they noticed.'
      : 'Their records contain no retained experiences. This does not show what they noticed.',
    memories.map((e) => `memory:${e.id}:${e.kind}`),
  );
  if (!p.conscience.norms.length)
    add('held-norm', 'unrecorded', 'Their records contain no held rules.', ['conscience.norms']);
  for (const n of p.conscience.norms) {
    add(
      'held-norm',
      n.conviction === 0 ? 'no-conviction' : 'held-understanding',
      n.conviction === 0
        ? 'They have a recorded rule with no stated conviction.'
        : 'They hold an understanding of this rule. This is their view.',
      [`norm:${n.normId}`, `standing:${n.standing}`, 'conscience.norms.conviction'],
    );
  }
  add(
    'mood',
    p.affect.mood.valence < 0 ? 'unpleasant' : p.affect.mood.valence > 0 ? 'pleasant' : 'neutral',
    p.affect.mood.valence < 0
      ? 'Their recorded mood feels unpleasant.'
      : p.affect.mood.valence > 0
        ? 'Their recorded mood feels pleasant.'
        : 'Their recorded mood feels neutral.',
    ['affect.mood.valence'],
  );
  add(
    'mood',
    p.affect.mood.arousal === 0 ? 'no-arousal' : 'some-arousal',
    p.affect.mood.arousal === 0
      ? 'Their recorded mood has no arousal.'
      : 'Their recorded mood has some arousal.',
    ['affect.mood.arousal'],
  );
  // Keep stores distinct. Do not substitute relationship trust for source or advising-voice trust.
  const ties = p.social.relationships.map((r) => ({
    store: 'social.relationships',
    id: r.otherId,
    trust: r.trust,
  }));
  const voices = p.will.voices.map((v) => ({ store: 'will.voices', id: v.voiceId, trust: v.trust }));
  const sourcesTrust = Object.entries(p.memory.sourceTrust).map(([id, trust]) => ({
    store: 'memory.sourceTrust',
    id,
    trust,
  }));
  const trusts = [...ties, ...voices, ...sourcesTrust];
  if (!trusts.length)
    add('trust', 'unrecorded', 'Their records contain no learned trust.', [
      'social.relationships',
      'will.voices',
      'memory.sourceTrust',
    ]);
  for (const t of trusts) {
    // 0.5 is the numeric range midpoint, not a faith threshold or personal baseline.
    const subject =
      t.store === 'social.relationships'
        ? 'this person'
        : t.store === 'will.voices'
          ? 'this advising voice'
          : 'this information source';
    add(
      'trust',
      t.trust < 0.5 ? 'below-midpoint' : t.trust > 0.5 ? 'above-midpoint' : 'at-midpoint',
      t.trust < 0.5
        ? `Their trust in ${subject} is below the middle of its range.`
        : t.trust > 0.5
          ? `Their trust in ${subject} is above the middle of its range.`
          : `Their trust in ${subject} is at the middle of its range.`,
      [`${t.store}:${t.id}`],
    );
  }
  return rows;
}
