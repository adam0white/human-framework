/** SCOPE: fixed source log-aptitude inheritance, separate construction stream.
 * Traits are character-owned. Values/norms/social trust are learned or authored. */

import { clip, copy } from '../body/span.ts';
import { dexp, dlog } from '../core/libm.ts';
import { normal } from '../core/random.ts';
import type * as T from '../run-schema.ts';
export const deriveAptitudes: T.ConstructionOwners['deriveAptitudes'] = (parents, skills, input) => {
  const rng = copy<T.InheritanceCursor>(input);
  const aptitudes: Record<string, number> = {};
  const residual = 0.25 * Math.sqrt(1 - (0.5 * 0.5) / 2);
  for (const id of [...new Set(skills.map((s) => s.id))].sort()) {
    const mid = (dlog(parents[0]?.aptitudes[id] ?? 1) + dlog(parents[1]?.aptitudes[id] ?? 1)) / 2;
    aptitudes[id] = clip(dexp(0.5 * mid + normal(rng.words, 0, residual)), 0.25, 4);
    rng.uniformDraws += 2;
  }
  return { aptitudes, rng };
};
