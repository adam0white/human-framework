import { settingWords } from '../../shared/setting-words.ts';

const GERUNDS: Record<string, string> = {
  build: 'building',
  cook: 'cooking',
  gather: 'gathering',
  draw: 'drawing',
  raise: 'raising',
  fell: 'felling',
  shutter: 'closing',
  drink: 'drinking',
  eat: 'eating',
  sleep: 'sleeping',
  pray: 'praying',
  shelter: 'sheltering',
  rest: 'resting',
  carry: 'carrying',
};
function gerund(label: string): string {
  const [verb = '', ...rest] = label.split(' ');
  return GERUNDS[verb] ? [GERUNDS[verb], ...rest].join(' ') : `the task “${label}”`;
}
/** The forecast is an observation; it is not quoted speech by the selected person. */
export function forecastWords(value: string): string {
  return wellWords(value)
    .replace(/^Later: not prayer time$/, 'Later, when it is prayer time.')
    .replace(/^Can’t: asleep$/, 'Asleep now.')
    .replace(/^Can’t: needs a builder$/, 'This needs a builder.')
    .replace(/^Can’t: /, 'Cannot do this because of ')
    .replace(
      /^Later: after I finish this task \(([^)]+)\)$/,
      (_, task: string) => `Later, after I finish ${gerund(task)}.`,
    )
    .replace(/^Later: /, 'Later, ');
}
export function wellWords(value: string): string;
export function wellWords(value: string | undefined): string | undefined;
export function wellWords(value: string | null | undefined): string | null | undefined;
export function wellWords(value: string | null | undefined): string | null | undefined {
  if (typeof value !== 'string') return value;
  return settingWords(value)
    .replace(/^Carried by /, 'Being carried by ')
    .replace(/^Shuttering the house$/, 'Closing the house’s shutters')
    .replace(/^Shuttering$/, 'Closing the shutters')
    .replace(/\bWalking to Big cedar/g, 'Walking to the big cedar')
    .replace(
      /\bWalking to (House|Forest|Field|Kitchen|Well|Site|Cedar|Home|Wellhouse|Mosque)\b/g,
      (_, place: string) => `Walking to the ${place.toLowerCase()}`,
    )
    .replace(
      /\b(?:Praying|praying) (?:the )?((?:morning|evening|dawn|noon|afternoon|sunset|night) prayer)/g,
      'Saying the $1',
    )
    .replace(/\bpray (morning|evening) prayer/g, 'say the $1 prayer')
    .replace(/\bI stopped this task: ([^.!?]+)\./, (_, task: string) => `I stopped ${gerund(task)}.`)
    .replace(
      /\b(?:Maryam|(?:Master )?Yusuf|Tariq|Idris|Samira|Danyal) didn’t get to the (.+) today\./g,
      'I didn’t get to the $1 today.',
    )
    .replace(/\bplayer insisted: ([^.]+)\.?/g, (_, task: string) => `You insisted that the villager ${task}.`)
    .replace(
      /\bto (Maryam|Yusuf|Tariq|Idris|Samira|Danyal) & (Maryam|Yusuf|Tariq|Idris|Samira|Danyal)(?!’s)/g,
      'to $1 and $2’s house',
    );
}
