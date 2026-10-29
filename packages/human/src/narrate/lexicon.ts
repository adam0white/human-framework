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
  get: 'got',
  feel: 'felt',
  keep: 'kept',
  leave: 'left',
  stand: 'stood',
  be: 'was',
  come: 'came',
  find: 'found',
  hear: 'heard',
  hold: 'held',
  lose: 'lost',
  say: 'said',
  send: 'sent',
  spend: 'spent',
  break: 'broke',
  choose: 'chose',
  cut: 'cut',
  hit: 'hit',
  let: 'let',
  put: 'put',
  set: 'set',
  shut: 'shut',
  quit: 'quit',
  swim: 'swam',
  win: 'won',
  dig: 'dug',
};

// Only double final consonants for known single-syllable verbs; spelling alone
// cannot reliably distinguish stressed endings such as "open" and "plan".
const DOUBLED_FINAL = new Set([
  'beg',
  'chat',
  'drop',
  'grab',
  'hop',
  'hug',
  'jog',
  'nod',
  'plan',
  'shop',
  'skip',
  'slip',
  'stop',
  'tap',
  'get',
  'run',
  'sit',
  'cut',
  'hit',
  'let',
  'put',
  'set',
  'shut',
  'quit',
  'swim',
  'win',
  'dig',
]);
function regularPast(verb: string): string {
  if (IRREGULAR_PAST[verb]) return IRREGULAR_PAST[verb] as string;
  if (verb.endsWith('e')) return `${verb}d`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ied`;
  if (DOUBLED_FINAL.has(verb)) return `${verb}${verb.at(-1)}ed`;
  return `${verb}ed`;
}

function regularGerund(verb: string): string {
  if (DOUBLED_FINAL.has(verb)) return `${verb}${verb.at(-1)}ing`;
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

/** One authored-table lookup for emission and rendering; shared events have no voice. */
export function authoredWordings(
  lexicon: DeepReadonly<Lexicon>,
  person: string | undefined,
  key: string,
): readonly string[] | undefined {
  const voice =
    person !== undefined && Object.hasOwn(lexicon.voices ?? {}, person)
      ? lexicon.voices?.[person]
      : undefined;
  if (voice && Object.hasOwn(voice, key)) return voice[key];
  return Object.hasOwn(lexicon.wordings ?? {}, key) ? lexicon.wordings?.[key] : undefined;
}
