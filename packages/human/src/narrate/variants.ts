/** SCOPE: offline-authored wording admission and event-time selection. Each person/key
 * owns a serializable seeded stream. Rendering never advances it or actor randomness.
 */

import { EngineLimitError } from '../core/limit.ts';
import { createRng, random } from '../core/random.ts';
import type { ActorState, DeepReadonly, Lexicon, RunEvent, RunState, WordingContext } from '../run-schema.ts';
import { authoredWordings, stableHash } from './lexicon.ts';
import { describeWording } from './literal.ts';
import { NARRATION_TEMPLATES, templateSlots } from './templates.ts';

export function wordingIssue(
  lexicon: DeepReadonly<Lexicon>,
): { code: 'invalid-schema' | 'unknown-id'; path: string; message: string } | undefined {
  const tables = [
    { path: '', person: undefined, table: lexicon.wordings ?? {} },
    ...Object.entries(lexicon.voices ?? {}).map(([person, table]) => ({
      path: `.voices.${person}`,
      person,
      table,
    })),
  ];
  for (const { path, person, table } of tables) {
    if (
      person !== undefined &&
      !Object.hasOwn(lexicon.names, person) &&
      !Object.hasOwn(lexicon.roles, person)
    )
      return { code: 'unknown-id', path, message: `Unknown voice person: ${person}` };
    for (const [key, variants] of Object.entries(table)) {
      const label = person === undefined ? `Wording ${key}` : `Wording ${key} in voice ${person}`;
      const issue = (message: string) => ({ code: 'invalid-schema' as const, path, message });
      if (!Object.hasOwn(NARRATION_TEMPLATES, key)) return issue(`${label} has an unknown key`);
      const defaults = NARRATION_TEMPLATES[key as keyof typeof NARRATION_TEMPLATES];
      const expected = JSON.stringify(templateSlots(defaults[0] ?? ''));
      if (variants.length < 4 || new Set(variants).size !== variants.length)
        return issue(`${label} needs at least four distinct strings`);
      for (const variant of variants)
        if (!variant.trim() || JSON.stringify(templateSlots(variant)) !== expected)
          return issue(`${label} must keep exactly the template's named slots`);
    }
  }
  return undefined;
}

export function selectEventWording(
  event: Omit<DeepReadonly<RunEvent>, 'wording'> & Pick<RunEvent, 'wording'>,
  lexicon: DeepReadonly<Lexicon>,
  seed: number,
  state: Pick<RunState, 'wording'>,
  context: WordingContext = { mood: 0, trust: 0.5, habit: 0 },
): void {
  const line = describeWording(event.data, lexicon);
  if (!line) return;
  const variants = authoredWordings(lexicon, event.person, line.key) ?? line.templates;
  const identity = JSON.stringify([event.person ?? null, line.key]);
  const prior = state.wording[identity];
  const rng = prior
    ? { ...prior.rng }
    : createRng(stableHash(JSON.stringify(['hf:wording:2', seed, identity])));
  const occurrence = (prior?.occurrence ?? 0) + 1;
  if (!Number.isSafeInteger(occurrence)) throw new EngineLimitError('Wording occurrence exhausted');
  // Every admitted phrasebook has at least four alternatives. Keep the last
  // two choices out of the next draw, leaving at least two candidates. Context changes the preference for concise wording:
  // low mood, distrust and well-practised acts favour shorter alternatives.
  const excluded = new Set(prior?.recent ?? []);
  const candidates = variants.map((text, index) => ({ text, index })).filter((v) => !excluded.has(v.index));
  const shortest = Math.min(...variants.map((text) => text.length));
  const longest = Math.max(...variants.map((text) => text.length));
  const brevity = ((1 - context.mood) / 2 + (1 - context.trust) + context.habit) / 3;
  const weights = candidates.map(({ text }) => {
    const length = longest === shortest ? 0.5 : (text.length - shortest) / (longest - shortest);
    return 1 + 3 * (brevity * (1 - length) + (1 - brevity) * length);
  });
  let draw = random(rng) * weights.reduce((sum, weight) => sum + weight, 0);
  let index = candidates.at(-1)?.index ?? 0;
  for (let i = 0; i < candidates.length; i++) {
    draw -= weights[i] ?? 0;
    if (draw < 0) {
      index = candidates[i]?.index ?? 0;
      break;
    }
  }
  const recent = [...(prior?.recent ?? []), index].slice(-2);
  // The dispatcher owns a detached mutable Run state; recovery owns its fresh map.
  state.wording[identity] = { rng, occurrence, recent };
  event.wording = { key: line.key, occurrence, index, context: { ...context } };
}

/** Capture the person's evidence at emission; readers never consult later state. */
export function wordingContext(
  actor: DeepReadonly<ActorState> | undefined,
  data: DeepReadonly<RunEvent['data']>,
): WordingContext {
  if (!actor || !['decision', 'prompting', 'suggestion-resolved'].includes(data.kind))
    return { mood: 0, trust: 0.5, habit: 0 };
  // Wording uses broad bands, never floating-point noise in bodily integration.
  const band = (value: number) => Math.round(value * 10) / 10 || 0;
  const action =
    data.kind === 'decision'
      ? data.decision.chosenAction
      : data.kind === 'prompting'
        ? data.record.action
        : undefined;
  const voice = data.kind === 'suggestion-resolved' ? data.resolution.voiceId : undefined;
  return {
    mood: band(actor.affect.mood.valence),
    trust: band(actor.will.voices.find((v) => v.voiceId === voice)?.trust ?? 0.5),
    habit: band(Math.max(0, ...actor.habits.filter((h) => h.action === action).map((h) => h.strength))),
  };
}
