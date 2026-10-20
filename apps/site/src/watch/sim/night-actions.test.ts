import { describe, expect, it } from 'vitest';
import { clockRuns } from './night.ts';
import { type NightInput, nightActs, resolveNightRequest } from './night-actions.ts';
import { personOf } from './people.ts';
import { WatchRun } from './run.ts';
import { buildFrame } from './view.ts';

/** Controlled bodies and places; decisions still run through the real HF community. */
function night() {
  const run = new WatchRun(4242);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.step();
  const s = run.state;
  s.tokens = [];
  s.spawns = [];
  s.warned = 'east';
  s.warnedAlso = null;
  s.lantern = { x: 1, target: 1 };
  for (const p of s.community.people) {
    s.place[p.id] = 'home';
    s.posts[p.id] = null;
    p.body.asleep = false;
    p.body.downed = undefined;
    p.body.sleepPressure = 0.05;
    p.body.exertion = 0;
    p.body.sleepDebt = 0;
    p.body.pain = 0;
    p.body.injuries = [];
    p.social.reserve = { fatigue: 0, pain: 0 };
    if (p.activity) p.activity.action = 'hold-post';
  }
  s.place.tamar = 'gate-1';
  s.posts.tamar = 'gate-1';
  s.place.kian = 'mill-1';
  s.posts.kian = 'mill-1';
  const target = personOf(s, 'tamar');
  const helper = personOf(s, 'kian');
  if (!target || !helper) throw new Error('Expected founding watchers');
  target.body.sleepPressure = 1;
  target.body.exertion = 1;
  return { run, s, target, helper };
}

function hurt(target: ReturnType<typeof night>['target']) {
  target.body.sleepPressure = 0.05;
  target.body.exertion = 0;
  target.body.pain = 0.6;
  target.body.injuries = [
    {
      id: 'test-bite',
      part: 'leftLeg',
      severity: 0.35,
      bleeding: 0.1,
      since: target.now,
      healRatePerDay: 0.1,
    },
  ];
}

function act(s: ReturnType<typeof night>['s'], k: NightInput['k'], by = 'kian') {
  return nightActs(s, 'tamar').find((a) => a.input.k === k && (a.input.k === 'down' || a.input.by === by));
}

describe('night asks on a watcher', () => {
  it.each(['relieve', 'help', 'down'] as const)('%s is legal only at night', (k) => {
    const { run, s, target } = night();
    hurt(target);
    target.body.exertion = 1;
    target.body.sleepPressure = 1;
    const input: NightInput = k === 'down' ? { k, who: 'tamar' } : { k, who: 'tamar', by: 'kian' };
    for (const phase of [
      'goal',
      'dusk',
      'dawn',
      'fallen',
      'thaw',
      'spring',
      'summer',
      'autumn',
      'fair',
      'closed',
    ] as const) {
      s.phase = phase;
      expect(nightActs(s, 'tamar')).toEqual([]);
      const before = JSON.stringify(s);
      expect(run.input(input)).toBe(false);
      expect(JSON.stringify(s)).toBe(before);
    }
  });

  it('offers relief for tiredness and help for injury, with a words-only read of its cost', () => {
    const { s, target } = night();
    expect(act(s, 'relieve')?.available).toBe(true);
    expect(act(s, 'relieve')?.read).toMatch(/leaves .*mill.* empty/);
    expect(act(s, 'relieve')?.read).toMatch(/relief takes over before.*sleep/);
    expect(act(s, 'help')).toBeUndefined();
    hurt(target);
    expect(act(s, 'help')?.available).toBe(true);
    expect(act(s, 'relieve')).toBeUndefined();
    expect(act(s, 'down')?.label).toMatch(/hall/);
    for (const a of nightActs(s, 'tamar')) expect(`${a.label} ${a.read}`).not.toMatch(/\d|%/);
  });

  it('includes an awake helper in the hall and excludes self, sleepers, downed people and people at home', () => {
    const { s, helper } = night();
    expect(nightActs(s, 'tamar').some((a) => a.input.k !== 'down' && a.input.by === 'tamar')).toBe(false);
    s.place.kian = 'hall';
    expect(act(s, 'relieve')?.available).toBe(true);
    helper.body.asleep = true;
    expect(act(s, 'relieve')).toBeUndefined();
    helper.body.asleep = false;
    if (!helper.activity) throw new Error('Expected helper activity');
    helper.activity.action = 'doze';
    expect(act(s, 'relieve')).toBeUndefined();
    helper.activity.action = 'hold-post';
    helper.body.downed = { since: s.minute, reason: 'injury' };
    expect(act(s, 'relieve')).toBeUndefined();
    helper.body.downed = undefined;
    s.place.kian = 'home';
    expect(act(s, 'relieve')).toBeUndefined();
    s.place.kian = 'village';
    expect(act(s, 'relieve')).toBeUndefined();
  });

  it.each(['relieve', 'help'] as const)(
    'keeps distant %s candidates visible with a reason and rejects the input',
    (k) => {
      const { run, s, target } = night();
      if (k === 'help') hurt(target);
      s.place.kian = 'east-1';
      expect(act(s, k)?.available).toBe(false);
      expect(act(s, k)?.read).toMatch(/Too far to call Kian.*light.*east/);
      const before = JSON.stringify(s);
      expect(run.input({ k, who: 'tamar', by: 'kian' })).toBe(false);
      expect(JSON.stringify(s)).toBe(before);
      s.lantern = { x: 2, target: 2 };
      expect(act(s, k)?.available).toBe(true);
    },
  );

  it('rejects forged helper identities and invalid targets', () => {
    const { run, s } = night();
    for (const by of ['tamar', 'missing', 'mara'])
      expect(run.input({ k: 'relieve', who: 'tamar', by })).toBe(false);
    expect(run.input({ k: 'down', who: 'missing' })).toBe(false);
    s.place.tamar = 'hall';
    expect(run.input({ k: 'down', who: 'tamar' })).toBe(false);
  });

  it.each(['relieve', 'help', 'down'] as const)('shows why a distant target cannot receive %s', (k) => {
    const { run, s, target } = night();
    if (k === 'help') hurt(target);
    s.place.tamar = 'east-1';
    const option = act(s, k);
    expect(option?.available).toBe(false);
    expect(option?.read).toMatch(/Too far to call Tamar.*light.*east/);
    const input: NightInput = k === 'down' ? { k, who: 'tamar' } : { k, who: 'tamar', by: 'kian' };
    expect(run.input(input)).toBe(false);
    s.lantern = { x: 2, target: 2 };
    expect(act(s, k)?.available).toBe(true);
  });

  it('a downed watcher needs a carrier and cannot be asked to walk down or be relieved', () => {
    const { run, s, target } = night();
    target.body.downed = { since: s.minute, reason: 'bite' };
    expect(act(s, 'relieve')).toBeUndefined();
    expect(act(s, 'down')?.available).toBe(false);
    expect(act(s, 'down')?.read).toMatch(/carry/);
    expect(run.input({ k: 'down', who: 'tamar' })).toBe(false);
    expect(run.input({ k: 'help', who: 'tamar', by: 'kian' })).toBe(true);
    expect(s.asks.kian?.sug.affordanceId).toBe('carry:tamar');
  });

  it('a wolf at the foot of a watcher’s stretch offers help before a bite', () => {
    const { s, target } = night();
    target.body.sleepPressure = 0.05;
    target.body.exertion = 0;
    s.tokens = [
      { id: 100, kind: 'wolf', section: 'gate', pos: 1, hp: 1, climb: 0, state: 'foot', since: s.minute },
    ];
    expect(act(s, 'help')?.available).toBe(true);
  });

  it('projects reads without changing state, RNG, time or moments', () => {
    const { s } = night();
    const before = JSON.stringify(s);
    const first = nightActs(s, 'tamar');
    expect(first.length).toBeGreaterThan(0);
    expect(nightActs(s, 'tamar')).toEqual(first);
    buildFrame(s, 0, false);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('queues an ask without opening or changing a moment, consuming its cap or pausing time', () => {
    const { run, s } = night();
    s.moment = {
      id: 70,
      kind: 'waver',
      who: 'mara',
      section: 'gate',
      opened: s.minute,
      until: s.minute + 3,
      text: 'Mara looks back.',
      options: [{ id: 'let', label: 'Let her go' }],
    };
    s.nextMomentId = 71;
    s.momentLog = Array.from({ length: 3 }, () => ({
      kind: 'waver' as const,
      who: 'mara',
      minute: s.minute,
      choice: null,
    }));
    const before = JSON.stringify({ moment: s.moment, log: s.momentLog, next: s.nextMomentId });
    const minute = s.minute;
    expect(run.input({ k: 'relieve', who: 'tamar', by: 'kian' })).toBe(true);
    expect(JSON.stringify({ moment: s.moment, log: s.momentLog, next: s.nextMomentId })).toBe(before);
    expect(s.minute).toBe(minute);
    expect(clockRuns(s)).toBe(true);
    expect(s.asks.kian?.sug.affordanceId).toBe('post:gate-1');
    expect(s.place.tamar).toBe('gate-1');
  });

  it('does not open a moment or reset its count when there is no card', () => {
    const { run, s } = night();
    s.moment = null;
    s.momentLog = [];
    const next = s.nextMomentId;
    expect(run.input({ k: 'down', who: 'tamar' })).toBe(true);
    expect(s.moment).toBeNull();
    expect(s.momentLog).toEqual([]);
    expect(s.nextMomentId).toBe(next);
    expect(run.input({ k: 'down', who: 'tamar' })).toBe(false);
  });

  it('an accepted relief puts the replacement on the post before the tired watcher leaves', () => {
    const { run, s } = night();
    expect(run.input({ k: 'relieve', who: 'tamar', by: 'kian' })).toBe(true);
    expect(s.place.tamar).toBe('gate-1');
    for (let i = 0; i < 15 && s.place.tamar === 'gate-1'; i++) {
      run.step();
      expect([s.place.tamar, s.place.kian]).toContain('gate-1');
    }
    expect(s.place.kian).toBe('gate-1');
    expect(s.posts.kian).toBe('gate-1');
    expect(s.posts.tamar).toBeNull();
    expect(s.letGo.tamar).toBe('gate-1');
    expect(s.place.tamar).toBe('home');
    expect(s.alerts.some((a) => a.who === 'kian' && /“.*(?:take|coming)/i.test(a.text))).toBe(true);
  });

  it('a hurt watcher can accept an ask to go to the hall', () => {
    const { run, s, target } = night();
    hurt(target);
    target.conscience.norms.forEach((n) => {
      n.conviction = 0;
    });
    expect(run.input({ k: 'down', who: 'tamar' })).toBe(true);
    for (let i = 0; i < 15 && s.place.tamar !== 'hall'; i++) run.step();
    expect(s.place.tamar).toBe('hall');
    expect(s.posts.tamar).toBeNull();
    expect(s.letGo.tamar).toBe('gate-1');
    expect(s.alerts.some((a) => a.who === 'tamar' && /“.*hall/.test(a.text))).toBe(true);
  });

  it('does not answer a newly queued rest ask with a decision already produced in the same minute', () => {
    const { run, s } = night();
    expect(run.input({ k: 'relieve', who: 'tamar', by: 'kian' })).toBe(true);
    // readEvents receives a complete community batch. Kian's arrival queues a new ask for Tamar,
    // but Tamar's later-listed decision in this batch was made before that ask existed.
    resolveNightRequest(s, {
      at: s.minute,
      kind: 'begin',
      personId: 'kian',
      affordanceId: 'post:gate-1',
      detail: '',
    });
    resolveNightRequest(s, {
      at: s.minute,
      kind: 'decide',
      personId: 'tamar',
      affordanceId: 'post:gate-1',
      review: true,
      detail: '',
    });
    expect(s.nightRequests?.tamar?.affordance).toBe('sleep');
    expect(s.asks.tamar?.sug.affordanceId).toBe('sleep');
    expect(s.alerts.some((a) => a.who === 'tamar')).toBe(false);
    s.minute += 1;
    resolveNightRequest(s, {
      at: s.minute,
      kind: 'begin',
      personId: 'tamar',
      affordanceId: 'sleep',
      detail: '',
    });
    expect(s.nightRequests?.tamar).toBeUndefined();
    expect(s.alerts.some((a) => a.who === 'tamar' && a.text.includes('sleep'))).toBe(true);
  });

  it('accepts a relief when the helper is already holding the same post', () => {
    const { run, s, helper } = night();
    s.place.kian = 'gate-1';
    if (!helper.activity) throw new Error('Expected a running watch activity');
    helper.activity = { ...helper.activity, affordanceId: 'post:gate-1', action: 'hold-post' };
    expect(run.input({ k: 'relieve', who: 'tamar', by: 'kian' })).toBe(true);
    for (let i = 0; i < 3 && s.nightRequests?.kian; i++) run.step();
    expect(s.nightRequests?.kian).toBeUndefined();
    expect(s.posts.kian).toBe('gate-1');
    expect(s.posts.tamar).toBeNull();
    expect(s.alerts.some((a) => a.who === 'kian' && a.text.includes('I’ll take'))).toBe(true);
  });

  it('a watcher who refuses to go down speaks about leaving rather than taking a post', () => {
    const { run, s, target } = night();
    target.body.sleepPressure = 0.05;
    target.body.exertion = 0;
    s.notes.push({ minute: s.minute, who: 'tamar', kind: 'bitten', section: 'gate' });
    expect(run.input({ k: 'down', who: 'tamar' })).toBe(true);
    for (let i = 0; i < 5 && s.nightRequests?.tamar; i++) run.step();
    expect(s.place.tamar).toBe('gate-1');
    const refusal = s.alerts.find((a) => a.who === 'tamar' && a.text.includes('won’t'));
    expect(refusal?.text).toContain('won’t go down yet');
    expect(refusal?.text).not.toContain('won’t take');
  });

  it('a rested helper can join a hurt watcher without sending the hurt watcher away', () => {
    const { run, s, target } = night();
    hurt(target);
    expect(run.input({ k: 'help', who: 'tamar', by: 'kian' })).toBe(true);
    for (let i = 0; i < 5 && s.place.kian !== 'gate-1'; i++) run.step();
    expect(s.place.kian).toBe('gate-1');
    expect(s.posts.tamar).toBe('gate-1');
    expect(s.place.tamar).toBe('gate-1');
  });

  it('an exhausted candidate can refuse in their own words instead of being moved by the input', () => {
    const { run, s, helper } = night();
    helper.body.sleepPressure = 1;
    helper.body.exertion = 1;
    helper.conscience.norms.forEach((n) => {
      n.conviction = 0;
    });
    expect(run.input({ k: 'relieve', who: 'tamar', by: 'kian' })).toBe(true);
    for (let i = 0; i < 5; i++) run.step();
    expect(s.place.kian).not.toBe('gate-1');
    expect(s.posts.tamar).toBe('gate-1');
    expect(s.alerts.some((a) => a.who === 'kian' && /“.*(?:eyes|sleep|nothing left|cold)/.test(a.text))).toBe(
      true,
    );
  });
});

describe('the night account speaks about the person', () => {
  it('lets a bitten watcher say so and lets a proud watcher understate it', () => {
    const { s, target } = night();
    hurt(target);
    s.notes.push({ minute: s.minute, who: 'tamar', kind: 'bitten', section: 'gate' });
    const account = () => buildFrame(s, 0, false).watchers.find((w) => w.id === 'tamar')?.account;
    expect(account()?.text).toContain('It bit my leg.');
    s.tokens.push({
      id: 991,
      kind: 'wolf',
      section: 'gate',
      pos: 1,
      hp: 1,
      climb: 0,
      state: 'foot',
      since: s.minute,
    });
    expect(account()?.text).toContain('It’s got my leg!');
    target.social.reserve = { pain: 1 };
    expect(account()?.text).toContain('It’s a scratch.');
    s.place.tamar = 'east-1';
    expect(account()).toEqual({ text: 'Too far away for your voice to reach.', spoken: false });
  });

  it('admits tiredness and injury in words, with reserve filtering the self-report', () => {
    const { s, target } = night();
    const account = () => buildFrame(s, 0, false).watchers.find((w) => w.id === 'tamar')?.account;
    expect(account()?.spoken).toBe(true);
    expect(account()?.text).toMatch(/eyes|tired|sleep/i);
    hurt(target);
    expect(account()?.text).toMatch(/leg|hurt|bleed|bit/i);
    expect(account()?.text).not.toMatch(/\d|%/);
    target.social.reserve = { fatigue: 1, pain: 1 };
    expect(account()?.text).not.toMatch(/leg|hurt|bleed|bit/i);
  });
});
