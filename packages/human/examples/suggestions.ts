/**
 * A suggestion is a push, not a command. The same voice asks five things of a hungry person and gets five
 * typed answers: assented, deferred (with a counter-offer), refused/willNot (a held norm), complied (the voice
 * insisted on a "not now") and refused/cannot (asleep).
 *
 * `predict` gives each verdict without changing the person or consuming randomness (UI telegraphs);
 * `decide` then makes one real decision and records it.
 * Run: `npm run build -w packages/human && node packages/human/examples/suggestions.ts`.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  MINUTES_PER_YEAR,
  type Person,
  predict,
  type Suggestion,
  type SuggestionResolution,
  tick,
} from '@human/framework';

const NOON = 12 * 60;

const offers: Affordance[] = [
  { id: 'wait', action: 'wait', label: 'wait', duration: 15, effort: 0, advertises: {} },
  { id: 'eat', action: 'eat', label: 'eat lunch', duration: 20, effort: 0, advertises: { food: 0.7 } },
  {
    id: 'sleep',
    action: 'sleep',
    label: 'sleep',
    duration: 480,
    effort: 0,
    mode: 'sleep',
    advertises: { sleep: 0.8, rest: 0.4 },
  },
  {
    id: 'chat',
    action: 'chat',
    label: 'chat with Deniz',
    with: ['deniz'],
    duration: 30,
    effort: 0.05,
    advertises: { belonging: 0.3, leisure: 0.2 },
    tags: ['social'],
  },
  {
    id: 'work',
    action: 'work',
    label: 'carry crates',
    duration: 120,
    effort: 0.6,
    advertises: { competence: 0.1 },
    tags: ['work'],
    material: 4,
  },
  {
    id: 'steal',
    action: 'steal',
    label: "take bread from the baker's cart",
    duration: 10,
    effort: 0.1,
    advertises: { food: 0.5 },
    tags: ['risky'],
    // The host tags moral relevance; the person's own understanding of the norm does the rest.
    norms: [{ normId: 'theft', relation: 'violates' }],
    risk: { chance: 0.2, severity: 0.3, kind: 'caught' },
    material: 1,
  },
];

function hungryPerson(
  body: { satiety: number; sleepPressure: number } = { satiety: 0.22, sleepPressure: 0.2 },
): Person {
  return createPerson({
    id: 'aylin',
    name: 'Aylin',
    seed: 11,
    now: NOON,
    bornAt: NOON - 28 * MINUTES_PER_YEAR,
    sex: 'female',
    traits: { honesty: 0.8 },
    norms: [{ normId: 'theft', standing: 'forbidden', conviction: 0.9 }],
    body,
    relationships: [{ otherId: 'deniz', affection: 0.4 }],
    voices: [{ voiceId: 'player', trust: 0.6 }],
  });
}

const ask = (action: string, extra: Partial<Suggestion> = {}): Suggestion => ({
  voiceId: 'player',
  action,
  strength: 0.6,
  ...extra,
});

const show = (label: string, r: SuggestionResolution): string =>
  `${label.padEnd(26)} ${r.verdict}${r.kind ? `/${r.kind}` : ''} (${r.reason})` +
  `${r.counterOffer ? ` counter-offer: "${r.counterOffer.label}"` : ''} - "${r.says}"`;

export function main(): { lines: string[]; verdicts: SuggestionResolution[] } {
  const lines: string[] = [];
  const verdicts: SuggestionResolution[] = [];
  const p = hungryPerson();
  const tell = (label: string, person: Person, s: Suggestion) => {
    const r = predict(person, offers, s);
    verdicts.push(r);
    lines.push(show(label, r));
  };

  tell('"Eat something."', p, ask('eat'));
  tell('"Go chat with Deniz."', p, ask('chat'));
  tell('"Take the bread."', p, ask('steal', { strength: 1, insist: true }));
  tell('"Chat with Deniz. Now."', p, ask('chat', { strength: 0.9, insist: true }));

  // Asleep: capacity vetoes work however hard the voice pushes.
  const sleeper = hungryPerson({ satiety: 0.8, sleepPressure: 0.95 });
  const sleep = offers.find((a) => a.id === 'sleep') as Affordance;
  begin(sleeper, sleep, decide(sleeper, offers));
  tick(sleeper, sleeper.now + 60); // predict does not advance time; an hour into the sleep
  tell('"Get up and carry crates."', sleeper, ask('work', { insist: true }));

  // One real decision: recorded in the trace, narrated, and it moves trust and autonomy.
  const rec = decide(p, offers, { suggestion: ask('chat', { strength: 0.9, insist: true }) });
  lines.push(`decide(): chose ${rec.chosenAction}; "${rec.narration}"; intention: ${rec.intention}`);
  // Every option keeps its utility terms, so a UI can show why (the top-scored option can lose to an insist).
  for (const c of rec.considered.slice(0, 3)) {
    const terms = [...c.terms].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3);
    lines.push(
      `  ${c.action.padEnd(6)} ${c.utility.toFixed(2)}: ${terms.map((t) => `${t.source} ${t.value.toFixed(2)}`).join(', ')}`,
    );
  }
  return { lines, verdicts };
}

if (import.meta.main) for (const line of main().lines) console.log(line);
