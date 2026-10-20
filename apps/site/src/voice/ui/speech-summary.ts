/** Presentation only: count accepted care/questions separately from simulated suggestions. */
import type { SceneWords } from '../protocol.ts';

export function companyWords(words: readonly SceneWords[], day?: number): string[] {
  const spoken = words.filter(
    (line) => line.said !== false && line.kind !== 'suggestion' && (day === undefined || line.day === day),
  );
  const care = spoken.filter((line) => line.kind === 'care').length;
  const questions = spoken.filter((line) => line.kind === 'question').length;
  const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
  return [
    ...(care ? [`You offered care ${times(care)}.`] : []),
    ...(questions ? [`You asked ${questions === 1 ? 'a question' : `${questions} questions`}.`] : []),
  ];
}

export function daySpeech(lines: readonly string[], words: readonly SceneWords[], day: number): string[] {
  const company = companyWords(words, day);
  return [
    ...company,
    ...lines.map((line) => {
      if (line === 'You said nothing today.')
        return company.length > 0
          ? 'You kept him company without suggesting anything.'
          : 'You made no suggestions today.';
      return line.replace(/^You spoke /, 'You suggested an action ');
    }),
  ];
}
