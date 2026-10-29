/** SCOPE: wording's own choices and one headless public-run control. */
import { expect, it } from 'vitest';
import {
  authoredPerson,
  exampleOffers,
  exampleSpec,
  need,
  openingInputs,
  START,
} from '../examples/minimal.ts';
import { narrateChronicle } from '../src/chronicle/story.ts';
import { describeWording, rendererOwner } from '../src/narrate/literal.ts';
import { fillTemplate } from '../src/narrate/templates.ts';
import { selectEventWording } from '../src/narrate/variants.ts';
import {
  createPerson,
  createRun,
  exportRun,
  inspect,
  preview,
  replay,
  restoreRun,
  step,
} from '../src/run.ts';
import type { Input, Lexicon, RunEvent, RunState } from '../src/run-schema.ts';
import { actionRequest, resolutionInput } from './support.ts';

const wordings = {
  'decision.wait': ['Wait.', 'I will wait.', 'I will give it time.', 'I will wait a little longer.'],
};
const lex: Lexicon = { names: {}, roles: {}, actions: {}, prefer: 'name', wordings };
function wait(id: string, person = 'ada'): RunEvent {
  return {
    id,
    person,
    at: 0,
    phase: 4,
    causeIds: [],
    narration: [],
    data: {
      kind: 'decision',
      decision: { id, at: 0, considered: [], intention: '', chosenAction: null, chosenAffordanceId: null },
    },
  };
}
function sequence(seed: number, interleave = false, context = { mood: 0, trust: 0.5, habit: 0 }) {
  const state: Pick<RunState, 'wording'> = { wording: {} };
  const events = Array.from({ length: 12 }, (_, i) => wait(String(i)));
  for (const event of events) {
    if (interleave) selectEventWording(wait(`other-${event.id}`, 'bea'), lex, seed, state, context);
    selectEventWording(event, lex, seed, state, context);
  }
  return { events, state, indices: events.map((e) => e.wording?.index) };
}
it('never repeats an alternative within two choices, including built-in fallback', () => {
  for (const variants of [wordings['decision.wait']]) {
    const table = { ...lex, wordings: { 'decision.wait': variants } };
    const state: Pick<RunState, 'wording'> = { wording: {} };
    const indices: number[] = [];
    for (let i = 0; i < 12; i++) {
      const event = wait(String(i));
      selectEventWording(event, table, 7, state);
      if (!event.wording) throw new Error('Missing wording');
      expect(indices.slice(-2)).not.toContain(event.wording.index);
      indices.push(event.wording.index);
      expect(rendererOwner.render(event, { kind: 'host' }, table, 7)[0]?.text).toBe(
        variants[event.wording.index],
      );
    }
  }
  for (const table of [
    { ...lex, wordings: undefined },
    { ...lex, wordings: {}, voices: {} },
  ]) {
    const event = wait('fallback');
    const state: Pick<RunState, 'wording'> = { wording: {} };
    selectEventWording(event, table, 7, state);
    expect(event.wording).toMatchObject({ key: 'decision.wait', occurrence: 1 });
    expect(Object.values(state.wording)).toHaveLength(1);
    expect(rendererOwner.render(event, { kind: 'host' }, table, 7)[0]?.text).toBeTruthy();
  }
  const own = ['Own A.', 'Own B.', 'Own C.', 'Own D.'];
  const precedence: Lexicon = { ...lex, names: { ada: 'Ada' }, voices: { ada: { 'decision.wait': own } } };
  for (const [person, table, expected] of [
    ['ada', precedence, own],
    ['bea', precedence, wordings['decision.wait']],
    ['ada', { ...precedence, wordings: {}, voices: { ada: {} } }, undefined],
  ] as const) {
    const event = wait('precedence', person);
    const state: Pick<RunState, 'wording'> = { wording: {} };
    const ownedMap = state.wording;
    selectEventWording(event, table, 7, state);
    expect(state.wording).toBe(ownedMap);
    const text = rendererOwner.render(event, { kind: 'host' }, table, 7)[0]?.text;
    if (expected) expect(expected).toContain(text);
    else expect(text).toMatch(/I .*wait/);
  }
  expect(fillTemplate('{action} {why}', { action: 'read {why}', why: '$&' })).toBe('read {why} $&');
});
it('reproduces choices from seed and context, isolates people, and responds to context', () => {
  const first = sequence(7);
  expect(sequence(7)).toEqual(first);
  expect(sequence(7, true).indices).toEqual(first.indices);
  expect(sequence(8).indices).not.toEqual(first.indices);
  expect(first.events.map((e) => e.wording?.occurrence)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  const terse = { mood: -1, trust: 0, habit: 1 };
  const expansive = { mood: 1, trust: 1, habit: 0 };
  const lengths = (context: typeof terse) =>
    Array.from({ length: 200 }, (_, seed) => {
      const event = wait(String(seed));
      selectEventWording(event, lex, seed, { wording: {} }, context);
      expect(event.wording?.context).toEqual(context);
      return wordings['decision.wait'][event.wording?.index ?? 0]!.length;
    }).reduce((sum, length) => sum + length, 0);
  expect(lengths(terse)).toBeLessThan(lengths(expansive));
  const event = first.events[0];
  if (!event) throw new Error('Missing event');
  const before = JSON.stringify(first);
  const host = rendererOwner.render(event, { kind: 'host' }, lex, 7);
  expect(rendererOwner.render(event, { kind: 'person', observer: 'ada' }, lex, 7)[0]?.text).toBe(
    host[0]?.text,
  );
  expect(rendererOwner.render(event, { kind: 'person', observer: 'bea' }, lex, 7)).toEqual([]);
  expect(JSON.stringify(first)).toBe(before);
});
it('rejects malformed wording data before a run is created', () => {
  for (const invalid of [
    { 'unknown.key': ['A.'] },
    { 'decision.wait': [] },
    { 'decision.wait': ['A.', 'A.'] },
    { 'decision.wait': [' '] },
    { 'decision.act': ['I will {action}.'] },
    { 'decision.act': ['I will {action}.{why}{extra}'] },
    { 'decision.wait': ['Unclosed {'] },
    { 'decision.wait': ['I will wait.', 3] },
  ]) {
    const spec = exampleSpec();
    // Exercise untrusted JSON rather than only the TypeScript authoring contract.
    Object.assign(spec.definitions.lexicon, { wordings: invalid });
    expect(createRun(spec).ok).toBe(false);
    delete spec.definitions.lexicon.wordings;
    spec.definitions.lexicon.names = { ada: 'Ada' };
    Object.assign(spec.definitions.lexicon, { voices: { ada: invalid } });
    expect(createRun(spec).ok).toBe(false);
  }
});
it('rejects unknown voice ids and identifies invalid voice tables', () => {
  const spec = exampleSpec();
  spec.definitions.lexicon.voices = { nobody: { 'decision.wait': ['I wait.'] } };
  expect(createRun(spec)).toMatchObject({
    ok: false,
    error: {
      code: 'unknown-id',
      path: '$.definitions.lexicon.voices.nobody',
      message: expect.stringContaining('nobody'),
    },
  });
  spec.definitions.lexicon.names = { ada: 'Ada' };
  spec.definitions.lexicon.voices = { ada: { 'unknown.key': ['A.'] } };
  expect(createRun(spec)).toMatchObject({
    ok: false,
    error: {
      path: '$.definitions.lexicon.voices.ada',
      message: expect.stringMatching(/ada.*unknown\.key|unknown\.key.*ada/),
    },
  });
});
it('uses authored semantic fragments with voice precedence and the recorded event choice', () => {
  const spec = exampleSpec();
  spec.definitions.lexicon.names = { ada: 'Ada' };
  const predicates = ['took the advice', 'followed the advice', 'heeded the advice', 'acted on the advice'];
  const own = ['agreed to it', 'accepted it', 'went along with it', 'chose to follow it'];
  const reasons = ['I need a meal.', 'I am hungry.', 'Food comes first.', 'I need food.'];
  spec.definitions.lexicon.wordings = {
    'verdict.assented': predicates,
    'reason.need:food': reasons,
    'verdict.cannot': ['cannot act', 'cannot manage it', 'cannot do it', 'am unable to act'],
    'verdict.deferred': [
      'will first {alternative}',
      'must first {alternative}',
      'need to {alternative} first',
      'will wait until I {alternative}',
    ],
  };
  spec.definitions.lexicon.voices = { ada: { 'verdict.assented': own } };
  expect(createRun(spec).ok).toBe(true);
  const event: RunEvent = {
    id: 'verdict',
    person: 'ada',
    at: 0,
    phase: 4,
    causeIds: [],
    narration: [],
    data: {
      kind: 'suggestion-resolved',
      adviceId: 'a',
      decisionId: 'd',
      resolution: { voiceId: 'v', verdict: 'assented', reason: '' },
    },
  };
  selectEventWording(event, spec.definitions.lexicon, 7, { wording: {} });
  const index = event.wording?.fragments?.['verdict.assented'];
  if (index === undefined) throw new Error('Missing recorded verdict');
  expect(rendererOwner.render(event, { kind: 'host' }, spec.definitions.lexicon, 7)[0]?.text).toContain(
    own[index],
  );
  expect(
    describeWording(event.data, spec.definitions.lexicon, 'other', { 'verdict.assented': index })?.slots
      .verdict,
  ).toBe(predicates[index]);
  if (event.data.kind !== 'suggestion-resolved') throw new Error('Missing suggestion');
  const cannot = {
    ...event.data,
    resolution: {
      ...event.data.resolution,
      verdict: 'refused' as const,
      kind: 'cannot' as const,
      reason: 'need:food',
    },
  };
  const cannotLine = describeWording(cannot, spec.definitions.lexicon, 'ada', {
    'verdict.assented': index,
    'verdict.cannot': index,
    'reason.need:food': index,
    'verdict.deferred': index,
  });
  expect(cannotLine?.slots.verdict).toContain('cannot');
  expect(cannotLine?.slots.reason).toBe(` ${reasons[index]}`);
  const deferred = {
    ...event.data,
    resolution: {
      ...event.data.resolution,
      verdict: 'deferred' as const,
      insteadAffordanceId: 'wall',
      counterOffer: { label: 'climb the wall' },
    },
  };
  expect(
    describeWording(deferred, spec.definitions.lexicon, 'ada', {
      'verdict.assented': index,
      'verdict.cannot': index,
      'reason.need:food': index,
      'verdict.deferred': index,
    })?.slots.verdict,
  ).toContain('climb the wall');
  const decision = {
    kind: 'decision' as const,
    decision: {
      id: 'd',
      at: 0,
      intention: '',
      chosenAction: 'eat',
      chosenAffordanceId: 'meal',
      considered: [
        { affordanceId: 'meal', action: 'eat', utility: 1, terms: [{ source: 'need:food', value: 1 }] },
      ],
    },
  };
  expect(
    describeWording(decision, spec.definitions.lexicon, 'ada', {
      'verdict.assented': index,
      'verdict.cannot': index,
      'reason.need:food': index,
      'verdict.deferred': index,
    })?.slots.why,
  ).toBe(' I need to eat first.');
  spec.definitions.lexicon.wordings = { 'reason.imaginary': predicates };
  expect(createRun(spec)).toMatchObject({
    ok: false,
    error: { code: 'invalid-schema', message: expect.stringContaining('reason.imaginary') },
  });
});
it('keeps a missing winning alternative neutral and an authored objection out of decision motives', () => {
  const table: Lexicon = {
    ...lex,
    wordings: {
      'verdict.deferred': ['I will {alternative} first.'],
      'verdict.deferred.later': ['Not yet. Ask me again later.'],
      'suggestion.resolved': ['{verdict}{reason}'],
      'reason.norm': [
        'This conflicts with my rule.',
        'My rule forbids this.',
        'I object because of my rule.',
        'That breaks a rule I hold.',
      ],
    },
  };
  const deferred: RunEvent['data'] = {
    kind: 'suggestion-resolved',
    adviceId: 'a',
    decisionId: 'd',
    resolution: { voiceId: 'v', verdict: 'deferred', reason: 'preference', counterOffer: { label: 'later' } },
  };
  expect(describeWording(deferred, table)?.slots.verdict).toBe('Not yet. Ask me again later.');
  expect(
    describeWording(
      {
        ...deferred,
        resolution: { ...deferred.resolution, commitmentId: 'prayer', counterOffer: { label: 'Fajr' } },
      },
      table,
    )?.slots.verdict,
  ).toBe('Not yet. Ask me again later.');
  const event = wait('motive');
  event.data = {
    kind: 'decision',
    decision: {
      id: 'motive',
      at: 0,
      intention: '',
      chosenAction: 'pray',
      chosenAffordanceId: 'prayer',
      considered: [
        { affordanceId: 'prayer', action: 'pray', utility: 1, terms: [{ source: 'norm:prayer', value: 1 }] },
      ],
    },
  };
  selectEventWording(event, table, 7, { wording: {} });
  expect(event.wording?.fragments).toBeUndefined();
  const text = rendererOwner.render(event, { kind: 'host' }, table, 7)[0]?.text;
  expect(text).toContain('I want to act according to a rule I hold.');
  expect(text).not.toContain('conflicts');
});
it('records a separate choice for every authored fragment and can reach all variants', () => {
  const variants = ['accepted one', 'accepted two', 'accepted three', 'accepted four', 'accepted five'];
  const table: Lexicon = { ...lex, wordings: { 'verdict.assented': variants } };
  const seen = new Set<number>();
  const state: Pick<RunState, 'wording'> = { wording: {} };
  const previous: number[] = [];
  for (let i = 0; i < 30; i++) {
    const event: RunEvent = {
      id: String(i),
      person: 'ada',
      at: 0,
      phase: 4,
      causeIds: [],
      narration: [],
      data: {
        kind: 'suggestion-resolved',
        adviceId: 'a',
        decisionId: 'd',
        resolution: { voiceId: 'v', verdict: 'assented', reason: '' },
      },
    };
    selectEventWording(event, table, 7, state);
    const index = event.wording?.fragments?.['verdict.assented'];
    if (index === undefined) throw new Error('Missing fragment choice');
    expect(previous.slice(-2)).not.toContain(index);
    previous.push(index);
    seen.add(index);
    const before = JSON.stringify({ event, state });
    expect(rendererOwner.render(event, { kind: 'host' }, table, 7)[0]?.text).toContain(variants[index]);
    expect(JSON.stringify({ event, state })).toBe(before);
  }
  expect(seen.size).toBe(5);
});
it('headless control: reads, pagination, restore continuation and replay retain the event choices', () => {
  function setup(withVariants: boolean) {
    const spec = exampleSpec(7);
    if (withVariants)
      spec.definitions.lexicon.wordings = {
        'verdict.refused': ['refused it', 'declined it', 'said no to it', 'would not do it'],
        'suggestion.resolved': ['{verdict}{reason}'],
        'verdict.cannot': ["I can't do that."],
        'verdict.deferred.later': ['Not yet. Ask me again later.'],
        'reason.need:food': ['I need a meal.', 'I am hungry.', 'Food comes first.', 'I need food.'],
        'decision.act': [
          'My next step is to {action}.{why}',
          'I will {action}.{why}',
          'I choose to {action}.{why}',
          'I intend to {action}.{why}',
        ],
        'observation.summary': [
          '{summary}',
          'I noticed this: {summary}',
          'I saw this: {summary}',
          'I observed this: {summary}',
        ],
      };
    if (withVariants) spec.definitions.lexicon.names = { ada: 'Ada' };
    if (withVariants)
      spec.definitions.lexicon.voices = {
        ada: {
          'decision.act': [
            'My own next step is to {action}.{why}',
            'My own choice is to {action}.{why}',
            'I plan to {action}.{why}',
            'I choose to {action}.{why}',
          ],
          'observation.summary': [
            'I noticed: {summary}',
            'I saw: {summary}',
            'I observed: {summary}',
            'I remember this: {summary}',
          ],
        },
      };
    const run = need(createRun(spec));
    need(createPerson(run, authoredPerson('ada', 'Ada')));
    return run;
  }
  const inputs: Input[] = Array.from({ length: 6 }, (_, i) => ({
    id: `note-${i}`,
    at: START + i * 60_000,
    source: { type: 'host', id: 'world' },
    kind: 'observation.received',
    payload: {
      person: 'ada',
      evidenceId: `evidence-${i}`,
      percepts: [
        {
          id: `percept-${i}`,
          occurredAt: START + i * 60_000,
          channel: 'saw',
          kind: 'host-note',
          salience: 1,
          summary: 'The door is open.',
          claims: [],
          norms: [],
          advice: [],
          consequences: [],
          withdrawConsequences: [],
          witnesses: [],
          reports: [],
          provenance: ['world'],
        },
      ],
    },
  }));
  const run = setup(true),
    plain = setup(false);
  const opening = inputs.slice(0, 3);
  need(step(run, { until: START + 120_000, inputs: opening }));
  need(step(plain, { until: START + 120_000, inputs: opening }));
  const archive = exportRun(run);
  expect(archive.current.events.filter((e) => e.wording).length).toBeGreaterThanOrEqual(3);
  expect(archive.current.people).toEqual(exportRun(plain).current.people);
  expect(archive.current.rng).toEqual(exportRun(plain).current.rng);
  const query = {
    perspective: { kind: 'person' as const, observer: 'ada' },
    people: ['ada'],
    select: ['events' as const],
  };
  const view = need(inspect(run, query));
  const cursor = view.events[0];
  if (!cursor) throw new Error('Missing cursor');
  expect(need(inspect(run, { ...query, afterEvent: cursor.id })).events).toEqual(view.events.slice(1));
  expect(need(inspect(run, query))).toEqual(view);
  expect(exportRun(run)).toEqual(archive);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  const restored = need(restoreRun(JSON.parse(JSON.stringify(archive))));
  const continuation = { until: START + 300_000, inputs: inputs.slice(3) };
  const prediction = need(preview(run, { perspective: { kind: 'host' }, person: 'ada', ...continuation }));
  expect(exportRun(run)).toEqual(archive);
  const actual = need(step(run, continuation));
  expect(prediction.possibilities.map((e) => e.narration.map((line) => line.text))).toEqual(
    actual.events.map((e) => e.narration.map((line) => line.text)),
  );
  need(step(restored, continuation));
  expect(exportRun(restored)).toEqual(exportRun(run));
  expect(need(replay(exportRun(run))).verified).toBe(true);
  const daily = need(step(restored, { until: START + 86400000, inputs: [] }));
  const dayEvents = daily.events.filter((event) => event.data.kind === 'day-closed');
  expect(dayEvents.length).toBeGreaterThan(0);
  const closed = dayEvents[0];
  if (closed?.data.kind !== 'day-closed') throw new Error('Missing daily record');
  const summary = describeWording(
    {
      ...closed.data,
      record: {
        ...closed.data.record,
        verdicts: [{ voiceId: 'player', verdict: 'deferred', reason: 'preference', count: 2 }],
      },
    },
    {
      ...lex,
      wordings: {
        'verdict.deferred': [
          'will first {alternative}',
          'must first {alternative}',
          'need to {alternative}',
          'intend to {alternative}',
        ],
      },
    },
  )?.slots.summary;
  expect(summary).toContain('I put off acting on the advice from player 2 times.');
  expect(summary).not.toContain('something else');
  expect(narrateChronicle(daily.events, { kind: 'host' }, exampleSpec(7).definitions.lexicon, 7)).toEqual(
    dayEvents.flatMap((event) => event.narration.map((line) => line.text)),
  );
  expect(need(replay(exportRun(restored))).verified).toBe(true);
  const decisionRun = setup(true);
  need(
    step(decisionRun, { until: START, inputs: openingInputs([{ id: 'ada', offers: exampleOffers('ada') }]) }),
  );
  const voiceRun = setup(true);
  const offers = exampleOffers('ada', ['rest', 'work']);
  const started = need(step(voiceRun, { until: START, inputs: openingInputs([{ id: 'ada', offers }]) }));
  const request = actionRequest(started, 'start');
  need(
    step(voiceRun, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  const suggestion: Input<'suggestion.received'> = {
    id: 'missing-offer-suggestion',
    at: START + 60_000,
    source: { type: 'voice', id: 'player' },
    kind: 'suggestion.received',
    payload: {
      person: 'ada',
      received: {
        kind: 'ordinary',
        suggestion: {
          adviceId: 'missing',
          voiceId: 'player',
          affordanceId: 'missing-offer',
          strength: 1,
          insist: true,
        },
      },
    },
  };
  need(step(voiceRun, { until: START + 60_000, inputs: [suggestion] }));
  const suggestionEvent = exportRun(voiceRun).current.events.find(
    (e) => e.data.kind === 'suggestion-resolved',
  );
  expect(suggestionEvent?.wording?.fragments?.['verdict.cannot']).toEqual(expect.any(Number));
  expect(need(replay(exportRun(voiceRun))).verified).toBe(true);
  const decisionEvent = exportRun(decisionRun).current.events.find((e) => e.data.kind === 'decision');
  if (decisionEvent?.data.kind !== 'decision') throw new Error('Missing actual decision');
  expect(decisionEvent.wording?.key).toBe('decision.act');
  expect(decisionEvent.wording?.occurrence).toBe(1);
  expect(decisionEvent.data.decision.intention).toBe(decisionEvent.narration[0]?.text);
  expect(decisionEvent.data.decision.intention).toMatch(
    /My own next step is to|My own choice is to|I plan to|I choose to/,
  );
  expect(need(replay(exportRun(decisionRun))).verified).toBe(true);
  expect(exportRun(need(restoreRun(exportRun(decisionRun))))).toEqual(exportRun(decisionRun));
});

it('records a single authored sentence without adding a subject, punctuation or a tentative opening', () => {
  const spec = exampleSpec();
  spec.definitions.lexicon.wordings = {
    'suggestion.resolved': ['{verdict}{reason}'],
    'verdict.assented': ["Yes! Let's go."],
  };
  expect(createRun(spec).ok).toBe(true);
  const event = wait('answer');
  event.data = {
    kind: 'suggestion-resolved',
    adviceId: 'a',
    decisionId: 'd',
    resolution: { voiceId: 'v', verdict: 'assented', reason: '' },
  };
  const state: Pick<RunState, 'wording'> = { wording: {} };
  for (let i = 0; i < 4; i++) {
    selectEventWording(event, spec.definitions.lexicon, 7, state);
    expect(event.wording?.fragments?.['verdict.assented']).toBe(0);
    expect(rendererOwner.render(event, { kind: 'host' }, spec.definitions.lexicon, 7)[0]?.text).toBe(
      "Yes! Let's go.",
    );
  }
});
