/** SCOPE: authored display data and deterministic text identity. No phrase packs or live RNG. */
import type { DeepReadonly, Lexicon } from '../run-schema.ts';
export function stableHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function displayName(id: string, lexicon: DeepReadonly<Lexicon>): string {
  const first = lexicon.prefer === 'role' ? lexicon.roles : lexicon.names;
  const second = lexicon.prefer === 'role' ? lexicon.names : lexicon.roles;
  return (
    (Object.hasOwn(first, id) ? first[id] : undefined) ??
    (Object.hasOwn(second, id) ? second[id] : undefined) ??
    id
  );
}
const IRREGULAR_PAST: Record<string, string> = {
  eat: 'ate',
  sleep: 'slept',
  drink: 'drank',
  sit: 'sat',
  go: 'went',
  read: 'read',
  run: 'ran',
  buy: 'bought',
  make: 'made',
  take: 'took',
  give: 'gave',
  see: 'saw',
  meet: 'met',
  teach: 'taught',
  write: 'wrote',
  bring: 'brought',
  think: 'thought',
  fight: 'fought',
  feed: 'fed',
  build: 'built',
  sell: 'sold',
  tell: 'told',
  speak: 'spoke',
  do: 'did',
  have: 'had',
  pay: 'paid',
  steal: 'stole',
  wake: 'woke',
};

function regularPast(verb: string): string {
  if (IRREGULAR_PAST[verb]) return IRREGULAR_PAST[verb] as string;
  if (verb.endsWith('e')) return `${verb}d`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ied`;
  return `${verb}ed`;
}

function regularGerund(verb: string): string {
  if (verb.endsWith('ie')) return `${verb.slice(0, -2)}ying`;
  if (verb.endsWith('e') && !verb.endsWith('ee') && verb.length > 2) return `${verb.slice(0, -1)}ing`;
  return `${verb}ing`;
}

export function actionForms(
  action: string,
  lexicon: DeepReadonly<Lexicon>,
): { base: string; past: string; gerund: string } {
  const given = Object.hasOwn(lexicon.actions, action) ? lexicon.actions[action] : undefined;
  const base = given?.base ?? action.replace(/[-_]/g, ' '),
    [verb = base, ...rest] = base.split(' '),
    tail = rest.length ? ` ${rest.join(' ')}` : '';
  return {
    base,
    past: given?.past ?? `${regularPast(verb)}${tail}`,
    gerund: given?.gerund ?? `${regularGerund(verb)}${tail}`,
  };
}
export const capitalize = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
