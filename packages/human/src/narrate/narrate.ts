/** SCOPE: pure event projection through the single renderer. Call frequency owns no state. */
import type { DeepReadonly, Lexicon, Perspective, RenderedLine, RunEvent } from '../run-schema.ts';
import { rendererOwner } from './literal.ts';
export function narrate(
  events: readonly DeepReadonly<RunEvent>[],
  perspective: DeepReadonly<Perspective>,
  lexicon: DeepReadonly<Lexicon>,
  seed: number,
): readonly RenderedLine[] {
  return events.flatMap((event) => rendererOwner.render(event, perspective, lexicon, seed));
}
