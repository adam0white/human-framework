/**
 * Framework API gaps from the Game 1 design (docs/games/colony.md §10) and the follow-up review round.
 * One describe block per gap; each test names the behaviour it pins.
 */
import { describe, expect, test } from 'vitest';
import {
  acceptJoint,
  adoptGoal,
  advanceAgenda,
  BODY_DEFAULTS,
  begin,
  believe,
  COGNITION_DEFAULTS,
  type Community,
  confirm,
  consider,
  createCommunity,
  createPerson,
  decide,
  feel,
  finish,
  injure,
  interrupt,
  interruptPerson,
  jointSuccessChance,
  learnFromVoice,
  lifeModifiers,
  onFinished,
  perceive,
  prayerWindows,
  predict,
  preview,
  promise,
  proposeGoals,
  readNeeds,
  readPerson,
  recordDeed,
  remember,
  reviewed,
  socialContext,
  stepCommunity,
  successChance,
  tick,
  vetoFor,
  voiceOf,
  WILL_DEFAULTS,
  type World,
} from '../src/index.ts';
import type { Activity, Affordance, Outcome, Percept, Person, PersonSpec, Suggestion } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';

const ADULT = -30 * 365 * MINUTES_PER_DAY;

function person(id: string, over: Partial<PersonSpec> = {}): Person {
  return createPerson({
    id,
    name: id,
    seed: id.length * 7 + 1,
    bornAt: ADULT,
    sex: 'male',
    now: 600,
    ...over,
  });
}

const aff = (id: string, over: Partial<Affordance> = {}): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 60,
  effort: 0.2,
  advertises: {},
  ...over,
});

const REST = aff('rest', { advertises: { rest: 0.2 }, effort: 0, tags: ['rest'] });
const WORK = aff('work', { advertises: { esteem: 0.15, competence: 0.1 }, duration: 120, tags: ['work'] });
const PRAY = aff('pray', {
  duration: 15,
  effort: 0.05,
  tags: ['worship'],
  norms: [{ normId: 'salah', relation: 'fulfills' }],
});
const ask = (action: string, extra: Partial<Suggestion> = {}): Suggestion => ({
  voiceId: 'player',
  action,
  strength: 0.6,
  ...extra,
});

/** A tiny world: fixed offers per person, queued percepts, outcomes completed unless overridden. */
function tinyWorld(
  offers: (p: Person) => Affordance[],
  percepts: Record<string, Percept[]> = {},
  resolveOverride?: (p: Person, a: Activity, reason: 'ended' | 'interrupted') => Outcome | undefined,
): World & { resolved: { personId: string; affordanceId: string; at: number; jointId?: string }[] } {
  let now = 0;
  const resolved: { personId: string; affordanceId: string; at: number; jointId?: string }[] = [];
  return {
    resolved,
    now: () => now,
    affordancesFor: offers,
    perceptsFor: (p, since, until) => {
      now = Math.max(now, until);
      const list = percepts[p.id] ?? [];
      const due = list.filter((x) => x.at > since && x.at <= until);
      percepts[p.id] = list.filter((x) => !due.includes(x));
      return due;
    },
    resolve: (p, a, reason) => {
      const r = { personId: p.id, affordanceId: a.affordanceId, at: p.now } as (typeof resolved)[number];
      if (a.affordance.jointId !== undefined) r.jointId = a.affordance.jointId;
      resolved.push(r);
      return (
        resolveOverride?.(p, a, reason) ?? {
          affordanceId: a.affordanceId,
          action: a.action,
          status: reason === 'ended' ? 'completed' : 'interrupted',
          at: p.now,
        }
      );
    },
  };
}

// ---------------------------------------------------------------------------------------------
// 1. Joint activities
// ---------------------------------------------------------------------------------------------

describe('joint activities', () => {
  const beam = (partner: string) =>
    aff(`beam-with-${partner}`, {
      action: 'raise-beam',
      label: `raise the beam with ${partner}`,
      with: [partner],
      tags: ['work', 'joint'],
      advertises: { esteem: 0.4, competence: 0.3, meaning: 0.3 },
      duration: 60,
    });

  function pair(partnerTrust: number, partnerAffection: number) {
    const yusuf = person('yusuf', {
      needs: { esteem: 0.2, competence: 0.2, meaning: 0.2 },
      relationships: [{ otherId: 'tariq', affection: 0.6, trust: 0.8, familiarity: 0.8 }],
    });
    const tariq = person('tariq', {
      needs: { esteem: 0.3, competence: 0.3, meaning: 0.3 },
      relationships: [
        { otherId: 'yusuf', affection: partnerAffection, trust: partnerTrust, familiarity: 0.8 },
      ],
    });
    return { yusuf, tariq };
  }

  test('proposer and partner begin the same minute with a shared jointId', () => {
    const { yusuf, tariq } = pair(0.9, 0.7);
    const world = tinyWorld((p) => (p.id === 'yusuf' ? [REST, beam('tariq')] : [REST]));
    const c = createCommunity([yusuf, tariq]);
    const events = stepCommunity(c, world, 601);
    expect(events.some((e) => e.kind === 'propose' && e.personId === 'yusuf')).toBe(true);
    expect(events.some((e) => e.kind === 'accept' && e.personId === 'tariq')).toBe(true);
    expect(yusuf.activity?.action).toBe('raise-beam');
    expect(tariq.activity?.action).toBe('raise-beam');
    expect(yusuf.activity?.startedAt).toBe(tariq.activity?.startedAt);
    expect(yusuf.activity?.jointId).toBeDefined();
    expect(tariq.activity?.jointId).toBe(yusuf.activity?.jointId);
    expect(tariq.activity?.affordance.with).toEqual(['yusuf']);
    expect(tariq.activity?.affordance.tags).toContain('joint');
    // The partner's decision weighed trust in the proposer.
    const rec = tariq.trace.at(-1);
    expect(
      rec?.considered.find((x) => x.affordanceId === tariq.activity?.affordanceId)?.terms,
    ).toContainEqual(expect.objectContaining({ source: 'joint:yusuf' }));
  });

  test('a partner who declines sends the proposer back to decide without that offer', () => {
    const { yusuf, tariq } = pair(0.05, -0.9);
    const world = tinyWorld((p) => (p.id === 'yusuf' ? [REST, beam('tariq')] : [REST]));
    const c = createCommunity([yusuf, tariq]);
    const events = stepCommunity(c, world, 601);
    expect(events.some((e) => e.kind === 'decline' && e.personId === 'tariq')).toBe(true);
    expect(yusuf.activity?.action).toBe('rest');
    expect(tariq.activity?.action).toBe('rest');
    expect(c.joint.proposals.at(-1)?.status).toBe('declined');
    // The re-decision happened the same minute.
    const yd = events.filter((e) => e.personId === 'yusuf' && e.kind === 'decide');
    expect(yd).toHaveLength(2);
    expect(yd[1]?.at).toBe(600);
  });

  test('a dead partner declines at once', () => {
    const { yusuf, tariq } = pair(0.9, 0.7);
    tariq.body.alive = false;
    const world = tinyWorld((p) => (p.id === 'yusuf' ? [REST, beam('tariq')] : [REST]));
    const c = createCommunity([yusuf, tariq]);
    stepCommunity(c, world, 601);
    expect(yusuf.activity?.action).toBe('rest');
  });

  test('acceptJoint begins nobody until every partner has accepted', () => {
    const a = person('a');
    const b = person('b');
    const d = person('d');
    const c: Community = createCommunity([a, b, d]);
    const offer = aff('lift', { with: ['b', 'd'], tags: ['joint'] });
    const world = tinyWorld(() => [REST]);
    const rec = decide(a, [offer]);
    const proposal: Community['joint']['proposals'][number] = {
      id: 'j0',
      proposerId: 'a',
      partnerIds: ['b', 'd'],
      offer,
      record: rec,
      at: 600,
      accepted: [],
      partnerRecords: {},
      status: 'pending',
    };
    c.joint.proposals.push(proposal);
    expect(acceptJoint(c, world, proposal, b, decide(b, [REST]))).toHaveLength(0);
    expect(proposal.status).toBe('pending');
    expect(acceptJoint(c, world, proposal, d, decide(d, [REST]))).toHaveLength(3);
    expect(proposal.status).toBe('accepted');
  });

  test('joint skilled work succeeds more often with a skilled partner, and widens the skill veto', () => {
    const lead = person('lead', { skills: { carpentry: 0.4 } });
    const helper = person('helper', { skills: { carpentry: 0.6 } });
    const solo = successChance(lead, 'carpentry', 0.6, readPerson(lead).body.capacity);
    const together = jointSuccessChance(lead, [helper], 'carpentry', 0.6);
    expect(together).toBeGreaterThan(solo + 0.1);
    const ctx = { now: 600, affordances: [], body: readPerson(lead).body, desperation: 0 };
    const hard = aff('hard', { skill: { id: 'carpentry', difficulty: 1 } });
    const novice = person('novice', { skills: { carpentry: 0.38 } });
    expect(vetoFor(novice, hard, ctx)?.reason).toBe('skill:carpentry');
    expect(vetoFor(novice, { ...hard, with: ['helper'], tags: ['joint'] }, ctx)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------
// 2. begin with a promise
// ---------------------------------------------------------------------------------------------

describe('begin with a promise', () => {
  const carry = aff('carry', {
    action: 'carry-injured',
    targetId: 'idris',
    duration: 45,
    effort: 0.5,
    tags: ['help'],
    advertises: { meaning: 0.2 },
  });
  const eat = aff('eat', { advertises: { food: 0.5 }, duration: 20, effort: 0.05 });

  function carrying(withPromise: boolean): Person {
    const p = person('yusuf', { body: { satiety: 0.45 } });
    const rec = decide(p, [carry]);
    begin(p, carry, rec, withPromise ? { promise: { importance: 1, toId: 'idris' } } : {});
    // Twenty minutes in, hunger has crossed the interrupt threshold.
    tick(p, p.now + 20);
    p.body.satiety = 0.22;
    return p;
  }

  test('creates a pending commitment until the activity ends plus slack', () => {
    const p = carrying(true);
    const c = p.agenda.commitments.find((x) => x.id === p.activity?.commitmentId);
    expect(c?.status).toBe('pending');
    expect(c?.actions).toEqual(['carry-injured']);
    expect(c?.targetId).toBe('idris');
    expect(c?.until).toBe((p.activity?.endsAt ?? 0) + 30);
  });

  test('the promise survives a hunger review that would otherwise end the activity', () => {
    const without = carrying(false);
    expect(decide(without, [eat]).chosenAction).toBe('eat');
    const kept = carrying(true);
    const r = decide(kept, [eat]);
    expect(r.chosenAction).toBe('carry-injured');
    const cur = r.considered.find((x) => x.affordanceId === 'carry');
    expect(cur?.terms.some((t) => t.source === 'commitment')).toBe(true);
  });

  test('the promise term fades under starvation-level desperation', () => {
    const p = carrying(true);
    p.body.satiety = 0.01;
    p.body.hydration = 0.01;
    const r = decide(p, [eat]);
    expect(
      r.considered.find((x) => x.affordanceId === 'carry')?.terms.some((t) => t.source === 'commitment'),
    ).toBe(false);
  });

  test('stepCommunity passes World.beginOptions to begin, so a host can promise at begin', () => {
    const p = person('yusuf');
    const c = createCommunity([p]);
    const world: World = {
      ...tinyWorld(() => [carry]),
      beginOptions: (_q, offer) =>
        offer.action === 'carry-injured' ? { promise: { importance: 0.9, toId: 'idris' } } : undefined,
    };
    stepCommunity(c, world, p.now);
    const act = p.activity;
    expect(act?.action).toBe('carry-injured');
    const made = p.agenda.commitments.find((x) => x.id === act?.commitmentId);
    expect(made?.status).toBe('pending');
    expect(made?.toId).toBe('idris');
  });

  test('completing keeps the promise', () => {
    const p = carrying(true);
    const id = p.activity?.commitmentId;
    tick(p, p.activity?.endsAt ?? p.now);
    finish(p, {
      affordanceId: 'carry',
      action: 'carry-injured',
      targetId: 'idris',
      status: 'completed',
      at: p.now,
    });
    expect(p.agenda.commitments.find((x) => x.id === id)?.status).toBe('kept');
  });
});

// ---------------------------------------------------------------------------------------------
// 3. interrupt
// ---------------------------------------------------------------------------------------------

describe('interrupt', () => {
  test('interrupt brings the review forward and the reason reaches the decision', () => {
    const p = person('a');
    begin(p, WORK, decide(p, [WORK]));
    expect(p.activity?.reviewAt).toBeGreaterThan(p.now);
    tick(p, p.now + 5);
    expect(interrupt(p, p.now, 'percept:injury')).toBe(true);
    expect(p.activity?.reviewAt).toBe(p.now);
    const r = decide(p, [WORK, REST]);
    expect(r.interrupt).toBe('percept:injury');
    reviewed(p);
    expect(p.activity?.interrupt).toBeUndefined();
    expect(interrupt(person('idle'), 600, 'x')).toBe(false);
  });

  function injured(at: number, over: Partial<Percept> = {}): Percept {
    return {
      at,
      channel: 'saw',
      kind: 'injury',
      actorId: 'idris',
      targetId: 'idris',
      salience: 0.9,
      valence: -0.8,
      summary: 'Idris is hurt under the cedar',
      ...over,
    };
  }

  test('stepCommunity interrupts on a salient percept flagged near, and not when near is false', () => {
    const run = (near: boolean) => {
      const p = person('yusuf');
      const world = tinyWorld(() => [WORK, REST], { yusuf: [injured(605, { near })] });
      const c = createCommunity([p]);
      const events = stepCommunity(c, world, 640);
      return { p, events };
    };
    const yes = run(true);
    expect(yes.events.some((e) => e.kind === 'interrupt' && e.detail === 'percept:injury')).toBe(true);
    expect(yes.p.trace.some((r) => r.interrupt === 'percept:injury')).toBe(true);
    const no = run(false);
    expect(no.events.some((e) => e.kind === 'interrupt')).toBe(false);
  });

  test('interruptPerson called from a world callback wakes another person that minute', () => {
    const idris = person('idris');
    const yusuf = person('yusuf');
    const fell = aff('fell', { duration: 30 });
    const long = aff('build', { duration: 240 });
    const world = tinyWorld(
      (p) => (p.id === 'idris' ? [fell] : [long]),
      {},
      (p, a) => {
        if (p.id === 'idris' && a.action === 'fell') {
          interruptPerson(c, yusuf, p.now, 'percept:injury');
          return { affordanceId: a.affordanceId, action: a.action, status: 'failed', at: p.now };
        }
        return undefined;
      },
    );
    const c = createCommunity([idris, yusuf]);
    const events = stepCommunity(c, world, 631);
    const at = events.find((e) => e.personId === 'yusuf' && e.kind === 'decide' && e.at === 630);
    expect(at).toBeDefined();
    expect(yusuf.trace.at(-1)?.interrupt).toBe('percept:injury');
  });
});

// ---------------------------------------------------------------------------------------------
// 4. Omission rule for obligatory duties
// ---------------------------------------------------------------------------------------------

describe('omission rule', () => {
  const MAGHRIB_FROM = 1125;
  const MAGHRIB_UNTIL = 1215;
  /** A devout person late in the Maghrib window, keen on work. */
  function devout(now: number, over: Partial<PersonSpec> = {}): Person {
    const p = person('yusuf', {
      now,
      values: { tradition: 0.9, achievement: 0.9 },
      needs: { esteem: 0.1, competence: 0.1 },
      norms: [{ normId: 'salah', standing: 'obligatory', conviction: 0.95 }],
      ...over,
    });
    const [, , , maghrib] = prayerWindows(0);
    if (maghrib) promise(p, maghrib);
    return p;
  }
  const lateInWindow = MAGHRIB_FROM + Math.ceil(0.8 * (MAGHRIB_UNTIL - MAGHRIB_FROM));

  test('a request that would miss the prayer is deferred with a counter-offer naming it', () => {
    const p = devout(lateInWindow);
    const r = decide(p, [WORK, PRAY, REST], { suggestion: ask('work') });
    expect(r.chosenAction).toBe('pray');
    expect(r.suggestion?.verdict).toBe('deferred');
    expect(r.suggestion?.kind).toBe('notNow');
    expect(r.suggestion?.reason).toBe('norm:salah');
    expect(r.suggestion?.counterOffer?.label).toBe('after I pray Maghrib');
    expect(r.suggestion?.says).toMatch(/Maghrib/);
  });

  test('insisting cannot override it: refused, willNot, norm reason', () => {
    const p = devout(lateInWindow);
    const r = decide(p, [WORK, PRAY, REST], { suggestion: ask('work', { insist: true, strength: 1 }) });
    expect(r.chosenAction).toBe('pray');
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('willNot');
    expect(r.suggestion?.reason).toBe('norm:salah');
    expect(r.suggestion?.says).toMatch(/Maghrib/);
  });

  test('it also binds the person’s own choice, but only in the last quarter of the window', () => {
    const early = devout(MAGHRIB_FROM + 10);
    expect(
      decide(early, [WORK, PRAY]).considered.find((x) => x.affordanceId === 'work')?.vetoed,
    ).toBeUndefined();
    const late = devout(lateInWindow);
    const work = decide(late, [WORK, PRAY]).considered.find((x) => x.affordanceId === 'work');
    expect(work?.vetoed).toEqual({ kind: 'willNot', reason: 'norm:salah', omission: expect.any(String) });
  });

  test('an option short enough to finish inside the window is not blocked', () => {
    const p = devout(lateInWindow);
    const quick = aff('quick', { duration: 5, advertises: { esteem: 0.2 } });
    expect(
      decide(p, [quick, PRAY]).considered.find((x) => x.affordanceId === 'quick')?.vetoed,
    ).toBeUndefined();
  });

  test('capacity bounds it: no fulfilling offer, or extreme bodily need, lifts the block', () => {
    const noPrayer = devout(lateInWindow);
    expect(decide(noPrayer, [WORK, REST], { suggestion: ask('work') }).suggestion?.verdict).not.toBe(
      'deferred',
    );
    const starving = devout(lateInWindow, { body: { satiety: 0.02, hydration: 0.02 } });
    const r = decide(starving, [WORK, PRAY], { suggestion: ask('work') });
    expect(r.considered.find((x) => x.affordanceId === 'work')?.vetoed?.omission).toBeUndefined();
  });

  test('low conviction or a recommended standing does not trigger it', () => {
    const weak = devout(lateInWindow, {
      norms: [{ normId: 'salah', standing: 'obligatory', conviction: 0.5 }],
    });
    expect(
      decide(weak, [WORK, PRAY]).considered.find((x) => x.affordanceId === 'work')?.vetoed,
    ).toBeUndefined();
  });

  test('a host duty (care for dependents) works the same way with a generic counter-offer', () => {
    const p = person('maryam', {
      now: 700,
      norms: [{ normId: 'care-dependents', standing: 'obligatory', conviction: 0.95 }],
    });
    promise(p, {
      kind: 'duty',
      actions: ['cook'],
      from: 600,
      until: 720,
      normId: 'care-dependents',
      importance: 0.9,
      label: 'cook the midday meal',
    });
    const cook = aff('cook', { duration: 40, effort: 0.2 });
    const r = decide(p, [WORK, cook], { suggestion: ask('work') });
    expect(r.suggestion?.verdict).toBe('deferred');
    expect(r.suggestion?.counterOffer?.label).toBe('after I cook the midday meal');
  });

  test('other faiths: a host-defined obligatory prayer norm without salah', () => {
    const p = person('danyal', {
      now: 1100,
      values: { tradition: 0.8 },
      norms: [{ normId: 'prayer-christian', standing: 'obligatory', conviction: 0.9 }],
    });
    promise(p, {
      kind: 'worship',
      actions: ['pray'],
      from: 1020,
      until: 1110,
      normId: 'prayer-christian',
      importance: 0.7,
      label: 'Vespers',
      recurEvery: MINUTES_PER_DAY,
    });
    const pray = aff('pray', {
      duration: 15,
      tags: ['worship'],
      norms: [{ normId: 'prayer-christian', relation: 'fulfills' }],
    });
    const r = decide(p, [WORK, pray], { suggestion: ask('work') });
    expect(r.suggestion?.counterOffer?.label).toBe('after I pray Vespers');
    expect(r.intention).toBe('for God');
  });
});

// ---------------------------------------------------------------------------------------------
// 5. Distrust rule, voice history, compliance harm
// ---------------------------------------------------------------------------------------------

describe('distrust and voice history', () => {
  const FOREST = aff('forest', { advertises: { esteem: 0.3, competence: 0.2 }, tags: ['work', 'outdoors'] });

  function burned(trust: number, minutesAgo: number, action = 'forest'): Person {
    const p = person('tariq', {
      voices: [{ voiceId: 'player', trust }],
      needs: { esteem: 0.1, competence: 0.1 },
    });
    remember(p, {
      at: p.now - minutesAgo,
      kind: 'outcome',
      action,
      actorId: p.id,
      valence: -0.7,
      summary: 'Cold, wet and nothing to show for it',
      tags: ['night'],
      voiceId: 'player',
    });
    return p;
  }

  test('low trust plus a recent bad episode at the same action: refused willNot distrust, episode cited', () => {
    const p = burned(0.4, 600);
    const r = decide(p, [FOREST, REST], { suggestion: ask('forest') });
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('willNot');
    expect(r.suggestion?.reason).toBe('distrust');
    expect(r.suggestion?.episodeId).toBe(p.memory.episodes[0]?.id);
    expect(r.suggestion?.says).toMatch(/nothing to show/);
    // Even though forest work is what he would otherwise prefer, he will not do it on this voice's word.
    expect(r.chosenAction).toBe('rest');
    expect(decide(burned(0.4, 600), [FOREST, REST]).chosenAction).toBe('forest');
  });

  test('no refusal at trust ≥ 0.45, for another action, or after 24 hours', () => {
    expect(
      decide(burned(0.5, 600), [FOREST, REST], { suggestion: ask('forest') }).suggestion?.reason,
    ).not.toBe('distrust');
    expect(
      decide(burned(0.4, 600, 'fish'), [FOREST, REST], { suggestion: ask('forest') }).suggestion?.reason,
    ).not.toBe('distrust');
    expect(
      decide(burned(0.4, 1500), [FOREST, REST], { suggestion: ask('forest') }).suggestion?.reason,
    ).not.toBe('distrust');
  });

  test('suggested outcomes record the voice on the episode', () => {
    const p = person('a', { needs: { esteem: 0.1, competence: 0.1 } });
    const rec = decide(p, [WORK], { suggestion: ask('work') });
    begin(p, WORK, rec);
    tick(p, p.activity?.endsAt ?? p.now);
    finish(p, {
      affordanceId: 'work',
      action: 'work',
      status: 'failed',
      at: p.now,
      injury: { part: 'hand', severity: 0.4, healRatePerDay: 0.1 },
    });
    expect(p.memory.episodes.find((e) => e.kind === 'outcome')?.voiceId).toBe('player');
  });

  test('history keeps the last five trust-moving events', () => {
    const p = person('a', { voices: [{ voiceId: 'player', trust: 0.7 }] });
    const res = { voiceId: 'player', verdict: 'assented' as const, reason: 'x', says: '' };
    for (let i = 0; i < 7; i++) learnFromVoice(p, res, i % 2 === 0 ? 0.5 : -0.5, { at: i, action: `a${i}` });
    const h = voiceOf(p, 'player')?.history ?? [];
    expect(h).toHaveLength(WILL_DEFAULTS.maxVoiceHistory);
    expect(h[0]?.at).toBe(2);
    expect(h.at(-1)).toMatchObject({ at: 6, action: 'a6', reason: 'went-well' });
    expect(h[1]?.delta).toBeLessThan(0);
    learnFromVoice(p, { ...res, verdict: 'complied' }, 0.8, { at: 9 });
    expect(voiceOf(p, 'player')?.history).toHaveLength(5);
    expect(voiceOf(p, 'player')?.history.at(-1)?.at).toBe(6); // coerced success moves no trust
  });

  test('harm under protest costs more trust: one bad night takes 0.75 to about 0.41', () => {
    const p = person('a', { voices: [{ voiceId: 'player', trust: 0.75 }] });
    learnFromVoice(p, { voiceId: 'player', verdict: 'complied', reason: 'x', says: '' }, -1);
    expect(voiceOf(p, 'player')?.trust).toBeCloseTo(0.4125, 3);
    expect(voiceOf(p, 'player')?.history[0]?.reason).toBe('harm-under-protest');
  });
});

// ---------------------------------------------------------------------------------------------
// 6. Reactance, emotion sources, labels, preview
// ---------------------------------------------------------------------------------------------

describe('scoring additions', () => {
  test('reactance: a high-pressure voice makes the pushed option less appealing, scaled by self-direction', () => {
    const term = (selfDirection: number, pressure: number) => {
      const p = person('a', { values: { selfDirection }, voices: [{ voiceId: 'player', trust: 0.6 }] });
      const v = voiceOf(p, 'player');
      if (v) v.pressure = pressure;
      const r = decide(p, [WORK, REST], { suggestion: ask('work') });
      return (
        r.considered.find((x) => x.affordanceId === 'work')?.terms.find((t) => t.source === 'autonomy')
          ?.value ?? 0
      );
    };
    expect(term(0.9, 0.1)).toBe(0);
    expect(term(0.9, 0.9)).toBeLessThan(0);
    expect(term(0.9, 0.9)).toBeLessThan(term(0.3, 0.9));
    expect(term(0, 0.9)).toBe(0);
  });

  test('emotion terms name the emotion and the tag it acts through', () => {
    const p = person('a');
    feel(p, 'fear', 0.8, 'event:storm', p.now);
    const risky = aff('climb', { tags: ['risky'] });
    const r = decide(p, [risky, REST]);
    const sources = r.considered.find((x) => x.affordanceId === 'climb')?.terms.map((t) => t.source) ?? [];
    expect(sources).toContain('emotion:fear:risky');
  });

  test('considered options carry their label', () => {
    const p = person('a');
    const r = decide(p, [WORK, REST]);
    expect(r.considered.find((x) => x.affordanceId === 'work')?.label).toBe('work');
    const ctx = {
      now: p.now,
      body: readPerson(p).body,
      needs: readPerson(p).needs,
      mods: lifeModifiers(p),
      tendencies: {},
      desperation: 0,
      habit: { now: p.now },
    };
    expect(consider(p, REST, { ...ctx, social: socialContext(ctx) }).label).toBe('rest');
  });

  test('preview matches predict and changes nothing', () => {
    const p = person('a', { needs: { esteem: 0.1 } });
    const before = JSON.stringify(p);
    const a = preview(p, [WORK, REST], ask('work'));
    expect(a).toEqual(predict(p, [WORK, REST], ask('work')));
    expect(JSON.stringify(p)).toBe(before);
  });

  test('COGNITION_DEFAULTS exposes the new coefficients', () => {
    expect(COGNITION_DEFAULTS.reactanceScale).toBeGreaterThan(0);
    expect(COGNITION_DEFAULTS.commitmentInertia).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
// 7. Outcome quality, fulfills/advances, percept channels
// ---------------------------------------------------------------------------------------------

describe('outcomes and percepts', () => {
  function worked(quality: number | undefined, protest = false) {
    const p = person('a', { needs: { esteem: 0.3 } });
    const rec = decide(p, [WORK]);
    begin(p, WORK, rec);
    if (protest && p.activity) p.activity.protest = true;
    tick(p, p.activity?.endsAt ?? p.now);
    const out: Outcome = {
      affordanceId: 'work',
      action: 'work',
      status: 'completed',
      at: p.now,
      needs: { esteem: 0.1 },
    };
    if (quality !== undefined) out.quality = quality;
    return { p, report: finish(p, out) };
  }

  test('lower quality lowers felt valence and the learned expectation', () => {
    const good = worked(1);
    const poor = worked(0.3);
    expect(poor.report?.felt).toBeLessThan(good.report?.felt ?? 0);
    const val = (p: Person) => p.memory.expectations.find((x) => x.key === 'work')?.valence ?? 0;
    expect(val(poor.p)).toBeLessThan(val(good.p));
  });

  test('work under protest defaults to protest quality', () => {
    expect(worked(undefined, true).report?.quality).toBe(0.7);
    expect(worked(undefined).report?.quality).toBe(1);
  });

  test('Outcome.fulfills keeps a commitment the action alone would not match; advances moves a goal', () => {
    const p = person('a');
    const c = promise(p, { kind: 'promise', actions: ['help'], from: 0, until: 2000, importance: 0.5 });
    const g = adoptGoal(p, { label: 'barn', serves: ['meaning'], advancedBy: [], importance: 0.5 }, p.now);
    const res = onFinished(p, {
      affordanceId: 'x',
      action: 'carry',
      status: 'completed',
      at: 700,
      fulfills: [c.id],
      advances: [g.id],
    });
    expect(res.kept.map((x) => x.id)).toEqual([c.id]);
    expect(p.agenda.goals.find((x) => x.id === g.id)?.progress).toBeGreaterThan(0);
  });

  test('finish defaults Outcome.fulfills from the affordance', () => {
    const p = person('a');
    const c = promise(p, { kind: 'promise', actions: ['help'], from: 0, until: 2000, importance: 0.5 });
    const odd = aff('odd', { action: 'carry', fulfills: [c.id], duration: 10 });
    begin(p, odd, decide(p, [odd]));
    tick(p, p.activity?.endsAt ?? p.now);
    expect(finish(p, { affordanceId: 'odd', action: 'carry', status: 'completed', at: p.now })?.kept).toEqual(
      [c.id],
    );
  });

  test('outcome and social channels are percepts like any other', () => {
    const p = person('a', { relationships: [{ otherId: 'b', affection: 0.2 }] });
    const got = perceive(p, [
      {
        at: p.now,
        channel: 'social',
        kind: 'thanks',
        actorId: 'b',
        targetId: 'a',
        salience: 0.6,
        valence: 0.5,
        summary: 'b thanked me',
      },
      {
        at: p.now,
        channel: 'outcome',
        kind: 'fact',
        salience: 0.5,
        summary: 'the beam holds',
        claims: [{ prop: 'beam:up', value: true, confidence: 0.8 }],
      },
    ]);
    expect(got).toHaveLength(2);
    expect(p.memory.episodes.some((e) => e.tags.includes('social'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// 8. Recurring worship without normId; several schedules per person
// ---------------------------------------------------------------------------------------------

describe('recurring schedules', () => {
  test('worship commitments without a normId recur, and two schedules in one person recur independently', () => {
    const p = person('danyal', { now: 0 });
    promise(p, {
      kind: 'worship',
      actions: ['pray'],
      from: 360,
      until: 420,
      importance: 0.6,
      recurEvery: MINUTES_PER_DAY,
      label: 'Lauds',
    });
    promise(p, {
      kind: 'worship',
      actions: ['pray'],
      from: 1080,
      until: 1140,
      importance: 0.6,
      recurEvery: MINUTES_PER_DAY,
      label: 'Vespers',
    });
    for (const w of prayerWindows(0)) promise(p, w);
    // Keep the body fed so the person lives through the days (missed windows are what is being tested).
    for (let t = 360; t <= 3 * MINUTES_PER_DAY + 10; t += 360) {
      tick(p, Math.min(t, 3 * MINUTES_PER_DAY + 10));
      p.body.satiety = 0.9;
      p.body.hydration = 0.9;
    }
    tick(p, 3 * MINUTES_PER_DAY + 10);
    const pending = p.agenda.commitments.filter((c) => c.status === 'pending');
    const labels = pending.map((c) => c.label).sort();
    expect(labels).toEqual(['Asr', 'Dhuhr', 'Fajr', 'Isha', 'Lauds', 'Maghrib', 'Vespers']);
    const lauds = pending.find((c) => c.label === 'Lauds');
    expect(lauds?.from).toBe(3 * MINUTES_PER_DAY + 360);
    expect(lauds?.normId).toBeUndefined();
    // No norm, so a missed window records a missed episode but no breach.
    expect(p.conscience.breaches.some((b) => b.normId === undefined)).toBe(false);
    expect(p.memory.episodes.some((e) => e.kind === 'missed' && e.tags.includes('worship'))).toBe(true);
    expect(p.body.alive).toBe(true);
    expect(advanceAgenda(p, p.now).recurred).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------------------------
// 9. types.ts follow-ups
// ---------------------------------------------------------------------------------------------

describe('state counters and directed sources', () => {
  test('belief sources record direction, and confirm recalibrates by it', () => {
    const p = person('a');
    believe(p, 'well:dry', true, 0.8, 'liar', p.now);
    believe(p, 'well:dry', false, 0.8, 'honest', p.now);
    expect(p.memory.beliefs[0]?.sources).toEqual([
      { id: 'liar', value: true },
      { id: 'honest', value: false },
    ]);
    confirm(p, 'well:dry', false, p.now);
    expect(p.memory.sourceTrust.liar ?? 1).toBeLessThan(0.5);
    expect(p.memory.sourceTrust.honest ?? 0).toBeGreaterThan(0.5);
  });

  test('breach and injury ids come from counters and stay unique after eviction', () => {
    const p = person('a', { norms: [{ normId: 'theft', standing: 'forbidden', conviction: 0.9 }] });
    const steal = aff('steal', { norms: [{ normId: 'theft', relation: 'violates' }] });
    recordDeed(p, steal, 'x', 600, true);
    recordDeed(p, steal, 'x', 600, true);
    const ids = p.conscience.breaches.map((b) => b.id);
    expect(new Set(ids).size).toBe(2);
    expect(p.conscience.nextBreach).toBe(2);
    const seen = new Set<string>();
    for (let i = 0; i < BODY_DEFAULTS.maxInjuries + 4; i++)
      seen.add(injure(p, { part: 'hand', severity: 0.1, healRatePerDay: 0.1 }).id);
    expect(seen.size).toBe(BODY_DEFAULTS.maxInjuries + 4);
    expect(p.body.nextId).toBe(BODY_DEFAULTS.maxInjuries + 4);
  });

  test('deed appraisals carry the norm id', () => {
    const p = person('a', { norms: [{ normId: 'theft', standing: 'forbidden', conviction: 0.9 }] });
    const { appraisal } = recordDeed(
      p,
      aff('steal', { norms: [{ normId: 'theft', relation: 'violates' }] }),
      'x',
      600,
      true,
    );
    expect(appraisal[0]?.normId).toBe('theft');
  });

  test('lastProposalDay limits spontaneous goals to one a day', () => {
    const p = person('a', { needs: { belonging: 0, competence: 0, meaning: 0 } });
    const needs = readNeeds(p, readPerson(p).body);
    expect(proposeGoals(p, needs, 600)).toHaveLength(1);
    expect(p.agenda.lastProposalDay).toBe(0);
    expect(proposeGoals(p, needs, 700)).toHaveLength(0);
    expect(proposeGoals(p, needs, MINUTES_PER_DAY + 600)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------
// 10. nextBodyThreshold cache and cost
// ---------------------------------------------------------------------------------------------

describe('body threshold cache', () => {
  test('begin caches the threshold minute on the activity; reviewAt never exceeds it', () => {
    const p = person('a', { body: { satiety: 0.31 } });
    begin(p, WORK, decide(p, [WORK]));
    const act = p.activity as Activity;
    expect(act.thresholdAt).toBeDefined();
    expect(act.reviewAt).toBeLessThanOrEqual(act.thresholdAt ?? Number.POSITIVE_INFINITY);
    const fresh = person('b');
    begin(fresh, REST, decide(fresh, [REST]));
    expect(fresh.activity?.thresholdAt).toBeUndefined();
  });

  // Its cost budget (well under a millisecond a call) is in village.timing.ts, run by `npm run bench`.
});
