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
    'I did not keep {items}. Next time I will be ready.',
    'I missed {items}. Next time I will be ready.',
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
  'claim.told': [
    '{speaker} said that {prop} is {value}.',
    '{speaker} stated that {prop} is {value}.',
    'According to {speaker}, {prop} is {value}.',
    '{speaker} made the claim that {prop} is {value}.',
  ],
  conversation: [
    '{speaker} spoke with {listener}.',
    '{speaker} talked with {listener}.',
    '{speaker} and {listener} had a conversation.',
    'There was a conversation between {speaker} and {listener}.',
  ],
  'suggestion.resolved': [
    'I {verdict}.',
    'After considering it, I {verdict}.',
    'I {verdict} after thinking it over.',
    'This time, I {verdict}.',
  ],
  'commitment.changed': [
    'My commitment “{label}” is now {status}.',
    'The status of my commitment “{label}” is {status}.',
    'For my commitment “{label}”, the status is {status}.',
    'My commitment “{label}” has the status {status}.',
  ],
  'goal.changed': [
    'My goal “{label}” is now {status}.',
    'The status of my goal “{label}” is {status}.',
    'For my goal “{label}”, the status is {status}.',
    'My goal “{label}” has the status {status}.',
  ],
  'day.closed': [
    '{summary}',
    'This is my account of the day. {summary}',
    'Here is what happened during my day. {summary}',
    'I can describe my day this way. {summary}',
  ],
  'year.closed': [
    'Across {days} recorded days, I kept {kept} commitments and broke {broken}.',
    'In {days} recorded days, I broke {broken} commitments and kept {kept}.',
    'I kept {kept} commitments and broke {broken} across {days} recorded days.',
    'My record for {days} days shows {kept} commitments kept and {broken} broken.',
  ],
  'body.died': [
    'The person has died.',
    'The person died.',
    'The person is dead.',
    'The person is no longer alive.',
  ],
  'body.dozed': ['I fell asleep.', 'I went to sleep.', 'I have fallen asleep.', 'I have gone to sleep.'],
  'body.woke': ['I woke up.', 'I awoke.', 'I have woken up.', 'I am awake again.'],
  'body.downed': ['I cannot get up.', 'I am unable to get up.', 'I cannot rise.', 'I am unable to rise.'],
  'body.stood': ['I got up.', 'I stood up.', 'I have gotten up.', 'I have stood up.'],
  'body.injured': [
    'I was injured.',
    'I sustained an injury.',
    'I have been injured.',
    'I suffered an injury.',
  ],
  'body.illness': ['I became ill.', 'I fell ill.', 'I have become ill.', 'I have fallen ill.'],
  'crisis.onset': [
    'I cannot continue what I was doing.',
    'I am unable to continue what I was doing.',
    'I cannot carry on with what I was doing.',
    'I am unable to carry on with what I was doing.',
  ],
  'crisis.other': [
    'I can continue again.',
    'I can carry on again.',
    'I am able to continue again.',
    'I am able to carry on again.',
  ],
  'voice.promise': [
    '{voice} {outcome} their word.',
    '{voice} {outcome} their promise.',
    'This time, {voice} {outcome} their word.',
    '{voice} {outcome} the promise they made.',
  ],
  'observation.summary': [
    '{summary}',
    'I noticed this: {summary}',
    'I noted the following: {summary}',
    'This is what I noticed: {summary}',
  ],
  'observation.death': [
    'I heard that {person} died.',
    'I learned that {person} died.',
    'I was told that {person} died.',
    'I heard of the death of {person}.',
  ],
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
