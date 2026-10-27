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
import { rendererOwner } from '../src/narrate/literal.ts';
import { fillTemplate } from '../src/narrate/templates.ts';
import { selectEventWording } from '../src/narrate/variants.ts';
import { createPerson, createRun, exportRun, inspect, replay, restoreRun, step } from '../src/run.ts';
import type { Input, Lexicon, RunEvent, RunState } from '../src/run-schema.ts';

const wordings = { 'decision.wait': ['I will wait.', 'I will give it time.', 'I will wait a little.'] };
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
function sequence(seed: number, interleave = false) {
  const state: Pick<RunState, 'wording'> = { wording: {} };
  const events = Array.from({ length: 12 }, (_, i) => wait(String(i)));
  for (const event of events) {
    if (interleave) selectEventWording(wait(`other-${event.id}`, 'bea'), lex, seed, state);
    selectEventWording(event, lex, seed, state);
  }
  return { events, state, indices: events.map((e) => e.wording?.index) };
}
it('seeds a separate stream per person/key and excludes the previous wording', () => {
  const first = sequence(7);
  expect(sequence(7).indices).toEqual(first.indices);
  expect(sequence(7, true).indices).toEqual(first.indices);
  expect(sequence(8).indices).not.toEqual(first.indices);
  for (let i = 1; i < first.indices.length; i++) expect(first.indices[i]).not.toBe(first.indices[i - 1]);
  expect(first.events.map((e) => e.wording?.occurrence)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
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
it('keeps fallback and singleton text and substitutes slots only once', () => {
  const event = wait('fallback');
  const state = { wording: {} };
  selectEventWording(event, { ...lex, wordings: undefined }, 7, state);
  expect(event.wording).toBeUndefined();
  expect(state.wording).toEqual({});
  expect(rendererOwner.render(event, { kind: 'host' }, lex, 7)[0]?.text).toBe('I will wait.');
  const singleton = { ...lex, wordings: { 'decision.wait': ['I can wait.'] } };
  selectEventWording(event, singleton, 7, state);
  expect(rendererOwner.render(event, { kind: 'host' }, singleton, 7)[0]?.text).toBe('I can wait.');
  expect(fillTemplate('{action} {why}', { action: 'read {why}', why: '$&' })).toBe('read {why} $&');
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
it('headless control: reads, pagination, restore continuation and replay retain the event choices', () => {
  function setup(withVariants: boolean) {
    const spec = exampleSpec(7);
    if (withVariants)
      spec.definitions.lexicon.wordings = {
        'decision.act': ['My next step is to {action}.{why}'],
        'observation.summary': ['{summary}', 'I noticed this: {summary}', 'I saw this: {summary}'],
      };
    if (withVariants) spec.definitions.lexicon.names = { ada: 'Ada' };
    if (withVariants)
      spec.definitions.lexicon.voices = {
        ada: {
          'decision.act': ['My own next step is to {action}.{why}'],
          'observation.summary': ['Ada noticed: {summary}', 'Ada saw: {summary}'],
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
  need(step(run, continuation));
  need(step(restored, continuation));
  expect(exportRun(restored)).toEqual(exportRun(run));
  expect(need(replay(exportRun(run))).verified).toBe(true);
  const decisionRun = setup(true);
  need(
    step(decisionRun, { until: START, inputs: openingInputs([{ id: 'ada', offers: exampleOffers('ada') }]) }),
  );
  const decisionEvent = exportRun(decisionRun).current.events.find((e) => e.data.kind === 'decision');
  if (decisionEvent?.data.kind !== 'decision') throw new Error('Missing actual decision');
  expect(decisionEvent.wording?.key).toBe('decision.act');
  expect(decisionEvent.wording?.occurrence).toBe(1);
  expect(decisionEvent.data.decision.intention).toBe(decisionEvent.narration[0]?.text);
  expect(decisionEvent.data.decision.intention).toContain('My own next step is to');
  expect(need(replay(exportRun(decisionRun))).verified).toBe(true);
  expect(exportRun(need(restoreRun(exportRun(decisionRun))))).toEqual(exportRun(decisionRun));
});

it('uses each person override, then the run table, then built-ins with the same stream', () => {
  const voiced: Lexicon = {
    ...lex,
    voices: {
      ada: { 'decision.wait': ['Ada waits.', 'Ada pauses.', 'Ada gives it time.'] },
      bea: { 'decision.wait': ['Bea waits.'] },
    },
  };
  const state = { wording: {} };
  const events = Array.from({ length: 12 }, (_, i) => wait(String(i)));
  for (const event of events) {
    selectEventWording(wait(`bea-${event.id}`, 'bea'), voiced, 7, state);
    selectEventWording(event, voiced, 7, state);
    expect(rendererOwner.render(event, { kind: 'host' }, voiced, 7)[0]?.text).toMatch(/^Ada /);
  }
  expect(events.map((event) => event.wording?.index)).toEqual(sequence(7).indices);
  for (const [person, expected] of [
    ['bea', 'Bea waits.'],
    ['cora', 'I will '],
  ]) {
    const event = wait(person ?? '', person);
    selectEventWording(event, voiced, 7, state);
    expect(rendererOwner.render(event, { kind: 'host' }, voiced, 7)[0]?.text).toContain(expected);
  }
  const partial: Lexicon = { ...lex, voices: { ada: { 'body.woke': ['Ada wakes.'] } } };
  const inherited = wait('inherited');
  selectEventWording(inherited, partial, 7, { wording: {} });
  expect(rendererOwner.render(inherited, { kind: 'host' }, partial, 7)[0]?.text).toBe(
    rendererOwner.render(inherited, { kind: 'host' }, lex, 7)[0]?.text,
  );
  const bare = { ...partial, wordings: undefined };
  const fallback = wait('bare');
  const untouched = { wording: {} };
  selectEventWording(fallback, bare, 7, untouched);
  expect(fallback.wording).toBeUndefined();
  expect(untouched.wording).toEqual({});
  expect(rendererOwner.render(fallback, { kind: 'host' }, bare, 7)[0]?.text).toBe('I will wait.');
});

it('pins no-table narration byte for byte to the 4.1 built-in text', () => {
  const event: RunEvent = {
    ...wait('golden-promise'),
    data: { kind: 'voice-promise', voiceId: 'bea', kept: false, before: 0.5, after: 0.4 },
  };
  const plain = { ...lex, wordings: undefined };
  const empty = { ...plain, wordings: {}, voices: {} };
  const review: RunEvent = {
    ...wait('golden-review'),
    data: { kind: 'review', record: { day: 1, missed: ['Fajr'], kept: [], resolved: ['Fajr'] } },
  };
  expect(rendererOwner.render(review, { kind: 'host' }, plain, 7)[0]).toMatchObject({
    text: 'I did not keep the dawn prayer. Next time I will be ready when it comes.',
    variantId: 'en:review:0',
  });
  const expected = [
    {
      eventId: 'golden-promise',
      audience: { kind: 'host' },
      text: 'bea broke their word.',
      variantId: 'en:voice-promise:0',
    },
  ];
  for (const lexicon of [plain, empty]) {
    const state = { wording: {} };
    selectEventWording(event, lexicon, 7, state);
    expect(state.wording).toEqual({});
    expect(rendererOwner.render(event, { kind: 'host' }, lexicon, 7)).toEqual(expected);
  }
});
