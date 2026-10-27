/** SCOPE: pure display projections through the single renderer. Identifiers stay unchanged. */

import { labelLine, reasonLine } from './narrate/literal.ts';
import type { Commitment, NormDefinition } from './run-schema.ts';

export { labelLine, reasonLine };
export function commitmentLabel(c: Pick<Commitment, 'label' | 'kind'>): string {
  const kinds: Readonly<Record<string, string>> = {
    worship: 'my prayer',
    promise: 'my promise',
    duty: 'my duty',
    appointment: 'my appointment',
    job: 'my work shift',
    abstain: 'my abstention',
  };
  return c.label === undefined ? (kinds[c.kind] ?? c.kind) : labelLine(c.label);
}
export function normLabel(n: Pick<NormDefinition, 'id' | 'label'>): string {
  return labelLine(n.label);
}
