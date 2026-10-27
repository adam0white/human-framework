/** SCOPE: offline-authored wording admission and event-time selection. Each person/key
 * owns a serializable seeded stream. Rendering never advances it or actor randomness.
 */

import { EngineLimitError } from '../core/limit.ts';
import { createRng, random } from '../core/random.ts';
import type { DeepReadonly, Lexicon, RunEvent, RunState } from '../run-schema.ts';
import { authoredWordings, stableHash } from './lexicon.ts';
import { describeWording } from './literal.ts';
import { NARRATION_TEMPLATES, templateSlots } from './templates.ts';

export function wordingIssue(lexicon: DeepReadonly<Lexicon>): string | undefined {
  const tables = [lexicon.wordings ?? {}, ...Object.values(lexicon.voices ?? {})];
  for (const table of tables) {
    for (const [key, variants] of Object.entries(table)) {
      if (!Object.hasOwn(NARRATION_TEMPLATES, key)) return `Unknown wording key: ${key}`;
      const defaults = NARRATION_TEMPLATES[key as keyof typeof NARRATION_TEMPLATES];
      const expected = JSON.stringify(templateSlots(defaults[0] ?? ''));
      if (!variants.length || new Set(variants).size !== variants.length)
        return `Wording ${key} needs a nonempty list of distinct strings`;
      for (const variant of variants)
        if (!variant.trim() || JSON.stringify(templateSlots(variant)) !== expected)
          return `Wording ${key} must keep exactly the template's named slots`;
    }
  }
  return undefined;
}

export function selectEventWording(
  event: Omit<DeepReadonly<RunEvent>, 'wording'> & Pick<RunEvent, 'wording'>,
  lexicon: DeepReadonly<Lexicon>,
  seed: number,
  state: Pick<RunState, 'wording'>,
): void {
  const line = describeWording(event.data, lexicon);
  if (!line) return;
  const variants = authoredWordings(lexicon, event.person, line.key);
  if (!variants?.length) return;
  const identity = JSON.stringify([event.person ?? null, line.key]);
  const prior = state.wording[identity];
  const rng = prior
    ? { ...prior.rng }
    : createRng(stableHash(JSON.stringify(['hf:wording:1', seed, identity])));
  const occurrence = (prior?.occurrence ?? 0) + 1;
  if (!Number.isSafeInteger(occurrence)) throw new EngineLimitError('Wording occurrence exhausted');
  let index = Math.floor(random(rng) * (variants.length - (prior && variants.length > 1 ? 1 : 0)));
  if (prior && variants.length > 1 && index >= prior.last) index++;
  state.wording = { ...state.wording, [identity]: { rng, occurrence, last: index } };
  event.wording = { key: line.key, occurrence, index };
}
