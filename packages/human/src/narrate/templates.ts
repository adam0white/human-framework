/** Closed fallback templates for event meanings. */
export const NARRATION_TEMPLATES = {
  'review.kept': [
    'Today I kept {items}.',
    'I kept {items} today.',
    'Today I followed through on {items}.',
    'I followed through on {items} today.',
  ],
  'review.unresolved': [
    'I keep going back over {items}.',
    'I am still thinking about {items}.',
    'I have not settled my thoughts about {items}.',
    'My thoughts return to {items}.',
  ],
  'review.resolved': [
    'I did not keep {items}. Next time I will be ready when it comes.',
    'I missed {items}. Next time I will be ready when it comes.',
    'I missed {items}. I intend to be ready next time.',
    'I did not keep {items}. I intend to be ready next time.',
  ],
  'prompting.assented': [
    'I had an urge to {action}. I chose to {action}.',
    'I considered whether to {action}, and I chose to {action}.',
    'I thought I might {action}. I went on to {action}.',
    'I wanted to {action}, and I decided to {action}.',
  ],
  'prompting.turned': [
    'I had an urge to {action}. I used a practised response and chose otherwise.',
    'I considered whether to {action}, but used a practised response to stop myself.',
    'I thought I might {action}. I used a response I had practised instead.',
    'When I wanted to {action}, I used a practised response and chose otherwise.',
  ],
  'prompting.other': [
    'I had an urge to {action}. I did not act on it.',
    'I considered whether to {action}, and did not act on the thought.',
    'I thought I might {action}, but left it at that.',
    'I wanted to {action}. I did not follow the urge.',
  ],
  'decision.wait': ['I will wait.', 'I have decided to wait.', 'For now, I will wait.', 'I choose to wait.'],
  'decision.act': [
    'I will {action}.{why}',
    'I have decided to {action}.{why}',
    'I choose to {action}.{why}',
    'My decision is to {action}.{why}',
  ],
  'claim.told': ['{speaker} said that {prop} is {value}.'],
  conversation: ['{speaker} spoke with {listener}.'],
  'suggestion.resolved': [
    'I {verdict}.',
    'After considering it, I {verdict}.',
    'I {verdict} after thinking it over.',
    'This time, I {verdict}.',
  ],
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
