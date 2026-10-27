/** Closed fallback templates for event meanings. */
export const NARRATION_TEMPLATES = {
  'review.kept': ['Today I kept {items}.'],
  'review.unresolved': ['I keep going back over {items}.'],
  'review.resolved': [
    'I did not keep {items}. Next time I will be ready when it comes.',
    'I missed {items}. Next time I will be ready when it comes.',
  ],
  'prompting.assented': ['I felt a pull to {action}. I went on to {action}.'],
  'prompting.turned': ['I felt a pull to {action}. I used a practised response and turned away.'],
  'prompting.other': ['I felt a pull to {action}. I let the thought pass.'],
  'decision.wait': ['I will wait.'],
  'decision.act': ['I will {action}.{why}', 'I have decided to {action}.{why}'],
  'claim.told': ['{speaker} said that {prop} is {value}.'],
  conversation: ['{speaker} spoke with {listener}.'],
  'suggestion.resolved': ['I {verdict} the advice.'],
  'commitment.changed': ['{label}: {status}.'],
  'goal.changed': ['{label}: {status}.'],
  'day.closed': ['{summary}'],
  'year.closed': ['Across {days} recorded days, I kept {kept} commitments and broke {broken}.'],
  'body.died': ['The person has died.'],
  'body.dozed': ['I fell asleep.'],
  'body.woke': ['I woke up.'],
  'body.downed': ['I cannot get up.'],
  'body.stood': ['I got up.'],
  'body.injured': ['I was injured.'],
  'body.illness': ['I became ill.'],
  'crisis.onset': ['I cannot continue what I was doing.'],
  'crisis.other': ['I can continue again.'],
  'voice.promise': ['{voice} {outcome} their word.'],
  'observation.summary': ['{summary}'],
  'observation.death': ['I heard that {person} died.'],
} as const satisfies Record<string, readonly string[]>;

for (const [key, templates] of Object.entries(NARRATION_TEMPLATES)) {
  const expected = JSON.stringify(templateSlots(templates[0]));
  if (templates.some((template) => JSON.stringify(templateSlots(template)) !== expected))
    throw new Error(`Built-in wording ${key} has inconsistent slots`);
  Object.freeze(templates);
}
Object.freeze(NARRATION_TEMPLATES);

/** Returns undefined for unmatched braces or invalid slot names. */
export function templateSlots(template: string): string[] | undefined {
  const names = new Set<string>();
  let pos = 0;
  while (pos < template.length) {
    const c = template[pos];
    if (c === '}') return undefined;
    if (c !== '{') {
      pos++;
      continue;
    }
    const end = template.indexOf('}', pos + 1);
    if (end < 0) return undefined;
    const name = template.slice(pos + 1, end);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) return undefined;
    names.add(name);
    pos = end + 1;
  }
  return [...names].sort();
}

export function fillTemplate(template: string, slots: Readonly<Record<string, string>>): string {
  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name: string) =>
    Object.hasOwn(slots, name) ? (slots[name] as string) : match,
  );
}
