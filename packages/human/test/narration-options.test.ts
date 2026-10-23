import { expect, test } from 'vitest';
import { main } from '../examples/narration-control.ts';
import {
  actionForms,
  confirm,
  converse,
  createPerson,
  credence,
  decide,
  intentionFor,
  narrateDecision,
  perceive,
  predict,
  promptingLine,
  recallLine,
  relationshipWith,
  reviewLine,
  seedBelief,
  snapshot,
  villagerSpec,
  voiceLine,
} from '../src/index.ts';
import type { Episode, SuggestionResolution } from '../src/types.ts';

const person = (id = 'person') => createPerson(villagerSpec(id, id, 1, { now: 720 }));

test('normal decisions and predictions vary by person only when opted in; the warning control separates arms', () => {
  const out = main();
  expect(new Set(out.arms[0]?.predictions).size).toBe(1);
  expect(new Set(out.arms[0]?.decisions).size).toBe(1);
  expect(new Set(out.arms[1]?.predictions).size).toBeGreaterThan(1);
  expect(new Set(out.arms[1]?.decisions).size).toBeGreaterThan(1);
  expect(out.warningOff).toBe(0);
  expect(out.warningOn).toBe(1);
  const res: SuggestionResolution = {
    voiceId: 'v',
    verdict: 'deferred',
    reason: 'busy',
    says: '',
    counterOffer: { label: 'after lunch' },
  };
  const lines = Array.from({ length: 8 }, (_, i) => {
    const p = person(`person${i}`);
    p.lexicon = { variety: true };
    return voiceLine(p, res, 'same');
  });
  expect(new Set(lines).size).toBeGreaterThan(1);
  const p = person();
  p.lexicon = { variety: true };
  const offers = [{ id: 'task', action: 'task', label: 'help', duration: 10, effort: 0, advertises: {} }];
  const ask = { voiceId: 'friend', action: 'task', strength: 1 };
  const acrossMinutes = Array.from({ length: 8 }, (_, minute) => {
    p.now = 720 + minute;
    const reply = predict(p, offers, ask).says;
    expect(predict(p, offers, ask).says).toBe(reply);
    return reply;
  });
  expect(new Set(acrossMinutes).size).toBeGreaterThan(1);
});

test('presentation options are read-only, leave defaults intact and accept noun actions and authored recall', () => {
  const p = person();
  const record = decide(p, [
    { id: 'dig', action: 'dig', label: 'dig', effort: 0, duration: 10, advertises: {}, material: 1 },
  ]);
  expect(narrateDecision(p, record)).toMatch(/money|pays/);
  const before = snapshot(p);
  const lex = { materialMeaning: 'household keep', nounActions: true };
  expect(narrateDecision(p, record, lex)).toContain('household keep');
  expect(intentionFor(p, record, lex)).toBe('for household keep');
  expect(actionForms('tea-break', lex)).toEqual({
    base: 'do tea break',
    past: 'did tea break',
    gerund: 'doing tea break',
  });
  expect(actionForms('tea-break', { ...lex, actions: { 'tea-break': { past: 'took tea' } } }).past).toBe(
    'took tea',
  );
  expect(promptingLine('intrusion', 'passed', undefined, { voice: 'third' })).toBe('an urge came and passed');
  expect(promptingLine('intrusion', 'passed')).toContain('not who I am');
  const ep: Episode = {
    id: 'e',
    at: 0,
    kind: 'gift',
    actorId: 'steward',
    valence: 0.5,
    salience: 1,
    summary: 'The steward gave us grain.',
    tags: [],
  };
  ep.addressedSummary = 'You gave us grain.';
  expect(recallLine(ep, 'steward')).toBe('You gave us grain.');
  expect(recallLine(ep, 'other')).toBe(ep.summary);
  delete ep.addressedSummary;
  expect(recallLine(ep, 'steward')).toBe(ep.summary);
  expect(snapshot(p)).toEqual(before);
  perceive(p, [
    {
      at: 720,
      channel: 'saw',
      kind: 'gift',
      actorId: 'steward',
      salience: 1,
      summary: ep.summary,
      addressedSummary: 'You gave us grain.',
    },
  ]);
  const remembered = p.memory.episodes.find((e) => e.actorId === 'steward');
  expect(remembered && recallLine(remembered, 'steward')).toBe('You gave us grain.');
});

test('loyal warnings require affection and an unfavourable claim; thresholds and phrasing are per call', () => {
  const speaker = person('speaker');
  const listener = person('listener');
  confirm(speaker, 'listener:unreliable', true, 720);
  confirm(speaker, 'listener:kind', true, 720);
  confirm(speaker, 'well:dry', true, 720);
  expect(
    converse(speaker, listener, { at: 720, loyalWarning: true }).claims.some((c) => c.about === listener.id),
  ).toBe(false);
  speaker.social.relationships.push({ ...relationshipWith(speaker, listener.id), affection: 0.8 });
  const before = [snapshot(speaker), snapshot(listener)];
  const result = converse(speaker, listener, {
    at: 720,
    loyalWarning: true,
    maxClaims: 10,
    phrase: (claim, summary) => `${claim.prop}: ${summary}`,
  });
  expect(result.claims.map((c) => c.prop)).toContain('listener:unreliable');
  expect(result.claims.map((c) => c.prop)).not.toContain('listener:kind');
  expect(result.claims.find((c) => c.prop === 'listener:unreliable')?.backbiting).toBe(false);
  expect(result.told.every((pc) => pc.summary?.startsWith(`${pc.claims?.[0]?.prop}: `))).toBe(true);
  expect(converse(speaker, listener, { at: 720, confidentMin: 0.5 }).claims).toEqual([]);
  expect(converse(speaker, listener, { at: 720, confidentMin: Number.NaN })).toEqual(
    converse(speaker, listener, { at: 720 }),
  );
  expect([snapshot(speaker), snapshot(listener)]).toEqual(before);
  seedBelief(speaker, 'bridge:closed', { value: true, credence: 0.6, at: 720 });
  expect(converse(speaker, listener, { at: 720 }).claims.some((c) => c.prop === 'bridge:closed')).toBe(false);
  expect(
    converse(speaker, listener, { at: 720, confidentMin: 0.05, maxClaims: 10 }).claims.some(
      (c) => c.prop === 'bridge:closed',
    ),
  ).toBe(true);
  speaker.traits.honesty = 1;
  const withheld = converse(speaker, listener, {
    at: 720,
    temptations: [{ prop: 'well:dry', value: false, gain: 1 }],
    phrase: (claim, summary) => ('reason' in claim ? `Withheld ${claim.prop}: ${summary}` : summary),
  }).withheld[0];
  expect(withheld?.reason).toBe('norm:lying');
  expect(withheld?.summary).toBe('Withheld well:dry: norm:lying');
});

test('perceive uses the host trait table on the attended belief, once', () => {
  const p = person();
  const baseline = person();
  const table = { nosy: { affection: -0.1, trust: -0.1, respect: -0.1 } };
  const pc = {
    at: 720,
    channel: 'saw' as const,
    kind: 'fact',
    summary: 'observed nosiness',
    salience: 1,
    actorId: 'other',
    claims: [{ prop: 'other:nosy', value: true, confidence: 1 }],
  };
  perceive(p, [pc], { reputationTraits: table });
  perceive(baseline, [pc]);
  expect(credence(p, 'other:nosy')).toBe(credence(baseline, 'other:nosy'));
  expect(relationshipWith(p, 'other').trust).toBeLessThan(relationshipWith(baseline, 'other').trust);
});

test('review wording varies by person and day, names host causes without changing resolve state', () => {
  const p = person();
  p.review = {
    style: 'accounting',
    at: 1260,
    resolves: [],
    last: { day: 1, missed: ['my call'], kept: [], resolved: ['my call'] },
  };
  expect(reviewLine(p)).toBe("I didn't keep my call. Next time I'll be ready when it comes.");
  const before = snapshot(p);
  expect(reviewLine(p, { cause: 'ordered' })).toContain('following an order');
  expect(reviewLine(p, { cause: 'ordered' })).toContain('say what the order would put aside');
  expect(snapshot(p)).toEqual(before);
  const lines = Array.from({ length: 6 }, (_, day) => {
    if (p.review?.last) p.review.last.day = day;
    return reviewLine(p, { variety: true });
  });
  expect(new Set(lines).size).toBeGreaterThan(1);
});
