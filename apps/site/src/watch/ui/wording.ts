import { settingWords } from '../../shared/setting-words.ts';

/** Display-only wording. Recorded dialogue, estimated state, confidence and replay inputs stay unchanged. */
const spoken: readonly (readonly [string, string])[] = [
  [
    'Bring every soul and the granary to the thaw.',
    'Keep everyone alive and protect the grain until the spring thaw, when the snow melts.',
  ],
  ['“Long and cold. I talked to the stones.”', '“The night was long and cold. I talked to the stones.”'],
  ['“Cold. Long. Nothing I couldn’t stand.”', '“The night was long and cold, but I could stand it.”'],
  ['“Tired to the bone, that’s all.”', '“I am very tired, that is all.”'],
  ['“Fit to stand tonight.”', '“I am fit enough to stand watch tonight.”'],
  ['“Well enough. Sleep would help.”', '“I feel well enough, but I could use more sleep.”'],
  ['“Nothing wrong with me.”', '“There is nothing wrong with me.”'],
  ['“Fine. I’m fine.”', '“I am fine. I really am.”'],
  ['“It aches. It’ll hold.”', '“It aches, but I can still use it.”'],
  ['“Not me. Ask someone steadier.”', '“Do not choose me. Ask someone steadier.”'],
  ['“Me? I’d try. Someone has to.”', '“I would try if you chose me. Someone has to.”'],
  ['“The Gate? I can barely keep my own boots dry.”', '“I am not sure I can manage the Gate.”'],
  ['“All well.”', '“Everything is well at home.”'],
  [
    '“Loud. Hungry. The little ones ask where I go at night.”',
    '“The children are loud and hungry. They ask where I go at night.”',
  ],
];
export function watchWords(text: string | undefined | null): string {
  let result = text ?? '';
  for (const [before, after] of spoken) result = result.replaceAll(before, after);
  return settingWords(
    result
      .replace(/“Quiet\. /g, '“It is quiet at home. ')
      .replace(
        /“([^”]+) and I… it’s not good just now\. Ask me another day\.”/g,
        '“$1 and I are not getting along just now. Ask me another day.”',
      )
      .replace(
        /“([^”]+)\. I keep seeing it when I shut my eyes\.”/g,
        '“I keep seeing $1 when I shut my eyes.”',
      ),
  );
}
const impressions: Readonly<Record<string, string>> = {
  'worn out': 'They look very tired.',
  tiring: 'They look tired.',
  'hurting badly': 'They seem to be in a lot of pain.',
  hurt: 'They look hurt.',
  frightened: 'They seem frightened.',
  uneasy: 'They seem uneasy.',
  'heeds you': 'They seem to follow your advice.',
  'doesn’t heed you': 'They do not seem to follow your advice.',
  'jumpy by nature': 'They seem easily startled.',
  'steady by nature': 'They seem calm by nature.',
  'a sure arm': 'They seem accurate with a sling.',
  'wild with the sling': 'They seem to miss often with a sling.',
  dutiful: 'They seem careful about their duties.',
  careless: 'They seem careless about their duties.',
  'you don’t know them yet': 'You do not know them well enough yet.',
  'from last winter': 'This impression comes from last winter.',
  'from winters ago': 'This impression comes from several winters ago.',
  'seemed worn out at dusk': 'They looked very tired at dusk.',
  'seemed tiring at dusk': 'They looked tired at dusk.',
};
export function watchImpression(text: string): string {
  if (impressions[text]) return impressions[text];
  if (text.startsWith('afraid of ')) return `They seem ${text}.`;
  if (text.startsWith('close to ')) return `They seem ${text}.`;
  if (text.startsWith('at odds with ')) return `They do not seem to get along with ${text.slice(13)}.`;
  return settingWords(text);
}
