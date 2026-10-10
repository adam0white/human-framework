/** Normalize only person-engine metadata in an immutable historic replay comparison. */
import { ENGINE_VERSION, PERSON_SCHEMA } from '@adam0white/human-framework';
import { stableStringify } from '../../src/shared/playtest.ts';

export function withHistoricPersonEngine(state: unknown, historicEngine: string): unknown {
  const copy: unknown = JSON.parse(stableStringify(state));
  let count = 0;
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    const row = value as Record<string, unknown>;
    if (row.schema === PERSON_SCHEMA) {
      if (row.engine !== ENGINE_VERSION) throw Error('unexpected current person engine');
      if (row.methods !== undefined) throw Error('historic game unexpectedly acquired methods');
      row.engine = historicEngine;
      count++;
    }
    for (const entry of Object.values(row)) visit(entry);
  };
  visit(copy);
  if (count === 0) throw Error('historic replay comparison found no people');
  return copy;
}
