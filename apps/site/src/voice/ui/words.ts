import { settingWords } from '../../shared/setting-words.ts';

/** Display projections only. Stored labels, reports and replay inputs retain their original wording. */
export function actionPhrase(label: string): string {
  return label.replace(/^tea with /, 'have tea with ').replace(/^housework$/, 'do housework');
}
const PAST: Record<string, string> = {
  eat: 'ate',
  see: 'saw',
  walk: 'walked',
  call: 'called',
  sleep: 'slept',
  rest: 'rested',
  drink: 'drank',
  pray: 'prayed',
  repair: 'repaired',
  take: 'took',
  join: 'joined',
  visit: 'visited',
  smoke: 'smoked',
  buy: 'bought',
  pay: 'paid',
  work: 'worked',
  wait: 'waited',
  make: 'made',
  have: 'had',
  talk: 'talked',
  do: 'did',
  keep: 'kept',
  help: 'helped',
};
export function pastAction(label: string): string {
  const action = actionPhrase(label);
  const [verb = '', ...rest] = action.split(' ');
  return PAST[verb] ? [PAST[verb], ...rest].join(' ') : `completed “${label}”`;
}
const listed = (items: string[]) =>
  items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

function moneyWords(text: string): string {
  // Each match is a currency clause emitted by game/view/prefill/report, never a bare number.
  const number = '(\\d+(?:\\.\\d+)?)';
  const amount = `${number}(?!\\d|\\.\\d| lira)(?=[.,;)]| \\(| (?:by|at|on|and|of the)\\b|$)`;
  let result = text.replace(
    new RegExp(
      `\\b((?:he (?:still )?)?(?:has|had|owes|owed|paid)(?: Osman)?|(?:Osman|he) (?:wants|is owed)|Pay Osman|earned|spent|leave him with about) ${amount}`,
      'gi',
    ),
    '$1 $2 lira',
  );
  result = result
    .replace(
      new RegExp(`(Osman wants the rest, |payment (?:is due (?:today|tonight)|deadline): )${amount}`, 'g'),
      '$1$2 lira',
    )
    .replace(new RegExp(`(the rest \\()${number}(\\))`, 'g'), '$1$2 lira$3')
    .replace(new RegExp(`\\b${number}( is owed| short\\b)`, 'g'), '$1 lira$2')
    .replace(new RegExp(`(\\(was )${number}(\\))`, 'g'), '$1$2 lira$3');
  // The only numeric lists in paid clauses are payment amount + date pairs.
  result = result.replace(/\bHe paid ([^.]+)(?=[.;])/g, (clause) =>
    clause.replace(/\b(\d+) on /g, '$1 lira on '),
  );
  result = result.replace(/(he had \d+ lira of the )(\d+)(?!\d| lira)/g, '$1$2 lira');
  return result;
}

export function voiceWords(value: string): string;
export function voiceWords(value: string | undefined): string | undefined;
export function voiceWords(value: string | null | undefined): string | null | undefined;
export function voiceWords(value: string | null | undefined): string | null | undefined {
  if (typeof value !== 'string') return value;
  let text = value
    .replace(
      /^He completed these after your suggestion: (.+)\.$/,
      (_, labels: string) => `After your suggestion, he ${listed(labels.split('; ').map(pastAction))}.`,
    )
    .replace(
      /^He started these after your suggestion but stopped before finishing: (.+)\.$/,
      (_, labels: string) =>
        `After your suggestion, he started to ${listed(labels.split('; ').map(actionPhrase))} but stopped before finishing.`,
    )
    .replace(/\bHalil chose to tea with /g, 'Halil chose to have tea with ')
    .replace(/\bHalil chose to housework\b/g, 'Halil chose to do housework')
    .replace(/^He remembers: her tea and my cigarette/, 'He remembers Nuran’s tea and his cigarette')
    .replace(/^He remembers: /, 'He remembers ')
    .replace(
      /^He remembers (.*)$/,
      (_, memory: string) => `He remembers ${memory.replace(/\bour table\b/g, 'his table')}`,
    )
    .replace(/^Rıza(?:, his friend,)? over tea: (?:have )?tea with Rıza\.?$/, 'Rıza invited him to have tea.')
    .replace(/^Selin said last night: (.+)\.$/, 'Last night, Selin suggested that he $1.')
    .replace(/\bHe fasted on 0 of the \d+ days(?: so far)?\./g, 'He has not fasted yet.')
    .replace(/\bHe has kept 0 of \d+ fasts so far\./, 'He has not fasted yet.')
    .replace(/\bhe kept 0 of \d+ days of Ramadan/gi, 'he has not fasted yet')
    .replace(/\bHe kept 0 of \d+ appointments\./g, 'He has not kept an appointment yet.')
    .replace(/ \((?:mention|urge|insist)(?:, in turn with the other)?\)(?=:)/g, '')
    .replace(/he did it on 0 of \d+ days/g, 'he has not done it yet')
    .replace(/ and The (baker’s boy|doctor)/g, ' and the $1');
  text = moneyWords(text).replace(/^(\d+) owed$/, '$1 lira owed');
  return settingWords(text);
}
