import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { endState, replay, WatchRun } from './run.ts';
import { buildFrame } from './view.ts';

/** Current cast and actual public actions, not a reconstruction of Nessa's old Mara run. */
it('retains a night Rest account through its actual sleep end, observed return and full cold replay', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'lantern', section: 'west' });
  run.input({ k: 'begin' });
  while (run.state.minute < 1217) run.step();
  expect(run.input({ k: 'down', who: 'samira' })).toBe(true);
  run.step();
  run.step();
  expect(run.state.place.samira).toBe('home');
  const before = actorRuntime(run.state).snapshot();
  const watcher = buildFrame(run.state, 0, false).watchers.find((w) => w.id === 'samira');
  expect(watcher).toHaveProperty('nightHistory');
  expect(JSON.stringify(watcher)).toContain('Asked Samira');
  expect(JSON.stringify(watcher)).toContain('began');
  expect(actorRuntime(run.state).snapshot()).toEqual(before);
  const cold = WatchRun.resume(JSON.parse(run.snapshotText()));
  run.step();
  cold.step();
  expect(cold.snapshotText()).toBe(run.snapshotText());
  // A bell at the Gate cannot be credited to Samira, who is home outside its carry.
  run.input({ k: 'lantern', section: 'gate' });
  while (run.state.lantern.x !== run.state.lantern.target) run.step();
  expect(run.input({ k: 'bell' })).toBe(true);
  expect(run.state.bell.heard.samira).toBeUndefined();
  while (run.state.minute < 1460) run.step();
  expect(run.state.place.samira).toBe('east-1');
  run.input({ k: 'lantern', section: 'east' });
  while (run.state.lantern.x !== run.state.lantern.target) run.step();
  run.step();
  const account = JSON.stringify(buildFrame(run.state, 0, false).watchers.find((w) => w.id === 'samira'));
  expect(account).toMatch(/finished resting|stopped resting|rest ended/);
  expect(account).toContain('Seen back');
  expect(account).not.toContain('the bell brought');
  run.input({ k: 'lantern', section: 'gate' });
  while (run.state.minute < 1574) run.step();
  const beforeBell = run.state.place.kian;
  expect(run.input({ k: 'bell' })).toBe(true);
  for (let n = 0; n < 20; n++) run.step();
  const kianBell = run.state.bellRecords?.findLast((r) => r.who === 'kian');
  expect(kianBell).toBeDefined();
  expect(kianBell?.perceptId).toBeTypeOf('string');
  const heard = actorRuntime(run.state)
    .read({ perspective: { kind: 'host' }, people: ['kian'], select: ['events'] })
    .events.find(
      (e) =>
        e.data.kind === 'observation-attended' &&
        e.data.perceptId === kianBell?.perceptId &&
        e.data.attention > 0,
    );
  expect(kianBell?.heardAt).toBe(heard ? heard.at / 60_000 : undefined);
  const afterBell = run.state.place.kian;
  if (beforeBell === 'home' && afterBell?.startsWith('gate-')) expect(kianBell?.returned).toBeDefined();
  else expect(kianBell?.returned).toBeUndefined();
  console.log('actual-bell-chronology', { beforeBell, afterBell, record: kianBell });
  const full = run.export();
  const again = replay(JSON.parse(JSON.stringify(full)));
  expect(endState(again).fullHash).toBe(full.end.fullHash);
  if (process.env.CENTRAL_HOST_PROOF)
    writeFileSync(
      process.env.CENTRAL_HOST_PROOF,
      JSON.stringify({
        export: full,
        snapshot: JSON.parse(run.snapshotText()),
        replayFullHash: endState(again).fullHash,
      }),
    );
  const restored = WatchRun.resume(JSON.parse(run.snapshotText()));
  run.step();
  restored.step();
  expect(restored.snapshotText()).toBe(run.snapshotText());
}, 300_000);

it('keeps a witnessed wake as Keeper context separate from the paid dawn response', async () => {
  const { publicFixture } = await import('./public-fixture.ts');
  const { WatchWorld } = await import('./people.ts');
  const { ringBell, stepPeople } = await import('./night.ts');
  const { wakeQuestion } = await import('./night-records.ts');
  const { talk } = await import('./talk.ts');
  const s = publicFixture(1280, (people) => {
    const tamar = people.find((p) => p.id === 'tamar');
    if (!tamar) throw new Error('Missing Tamar');
    tamar.state.body.sleepPressure = 0.8;
  });
  s.phase = 'night';
  s.nightStart = 1080;
  s.place.tamar = 'gate-1';
  s.posts.tamar = 'gate-1';
  s.lantern = { x: 1, target: 1 };
  const world = new WatchWorld(s);
  const offers = world.affordancesFor.bind(world);
  // Author one sleepy opening offer. HF must actually choose, start and interrupt it.
  world.affordancesFor = (p) =>
    p.id === 'tamar' ? offers(p).filter((a) => a.id === 'doze:gate-1') : offers(p);
  const start = stepPeople(s, 1281, world);
  expect(start.some((e) => e.personId === 'tamar' && e.kind === 'begin' && e.action === 'doze')).toBe(true);
  expect(wakeQuestion(s, 'tamar')).toBeNull();
  s.minute = 1281;
  // Authored physical attack fixture, not a played-seed or historical-Nessa claim.
  s.tokens = [{ id: 1, kind: 'wolf', section: 'gate', pos: 1, hp: 3, climb: 0, state: 'foot', since: 1281 }];
  expect(ringBell(s, undefined)).toBe(true);
  const after = stepPeople(s, 1282);
  expect(after.some((e) => e.personId === 'tamar' && e.kind === 'wake')).toBe(true);
  expect(wakeQuestion(s, 'tamar')).toContain('waking at the Gate');
  expect(wakeQuestion(s, 'kian')).toBeNull();
  const before = actorRuntime(s).snapshot();
  const left = s.talks.left;
  const frame = buildFrame(s, 0, false);
  const context = frame.watchers.find((w) => w.id === 'tamar')?.wakeContext;
  expect(context).toContain('You saw Tamar');
  expect(context).toContain('A threat was at that wall when you looked');
  expect(context).not.toMatch(/\d{2}:\d{2}/);
  expect(frame.watchers.find((w) => w.id === 'kian')?.wakeContext).toBeNull();
  expect(actorRuntime(s).snapshot()).toEqual(before);
  expect(s.talks.left).toBe(left);
  s.phase = 'dawn';
  const dawnBefore = actorRuntime(s).snapshot();
  const dawnFrame = buildFrame(s, 0, false);
  expect(dawnFrame.watchers.find((w) => w.id === 'tamar')?.wakeReading).toContain('seems');
  expect(dawnFrame.watchers.find((w) => w.id === 'kian')?.wakeReading).toBeNull();
  expect(s.talks.left).toBe(left);
  expect(actorRuntime(s).snapshot()).toEqual(dawnBefore);
  expect(talk(s, 'tamar', 'night')).toBe(true);
  expect(s.talks.left).toBe(left - 1);
  const words = s.talks.said.at(-1)?.text;
  expect(words).not.toContain('You saw Tamar');
  expect(words).not.toContain('No further account of that moment is recorded.');
  expect(words).not.toMatch(/grateful|because the bell|Holding!/);
  expect(talk(s, 'tamar', 'night')).toBe(false);
});

it('keeps a replaced card request separate from the actual answer and work that follow', async () => {
  const { publicFixture } = await import('./public-fixture.ts');
  const { ask } = await import('./moments.ts');
  const { stepPeople } = await import('./night.ts');
  const { nightHistory } = await import('./night-records.ts');
  const s = publicFixture(1280);
  s.phase = 'night';
  s.nightStart = 1080;
  s.place.tamar = 'gate-1';
  s.posts.tamar = 'gate-1';
  s.lantern = { x: 1, target: 1 };
  ask(s, 'tamar', 'post:gate-1', { kind: 'hold', who: 'tamar', section: 'gate' });
  ask(s, 'tamar', 'post:gate-1', { kind: 'hold', who: 'tamar', section: 'gate' });
  expect(s.nightRecords?.[0]?.answer).toBe('replaced');
  const events = stepPeople(s, 1281);
  expect(
    events.some((e) => e.personId === 'tamar' && e.kind === 'begin' && e.affordanceId === 'post:gate-1'),
  ).toBe(true);
  expect(s.nightRecords?.[1]?.answer).toBe('begun');
  expect(s.nightRecords?.[0]?.answer).toBe('replaced');
  const before = actorRuntime(s).snapshot();
  expect(nightHistory(s, 'tamar').join(' ')).toContain('newer request replaced');
  expect(actorRuntime(s).snapshot()).toEqual(before);
});

it('keeps an actual refused Rest distinct from the later request-window end', async () => {
  const { publicFixture } = await import('./public-fixture.ts');
  const { applyNightAct } = await import('./night-actions.ts');
  const { stepPeople } = await import('./night.ts');
  const s = publicFixture(1280, (people) => {
    const p = people.find((p) => p.id === 'tamar');
    if (!p) throw new Error('Missing Tamar');
    // Authored opening, not a live Person mutation or production balance change.
    p.state.body.exertion = 0.9;
    p.state.body.sleepDebtHours = 8;
    p.state.body.sleepPressure = 0.1;
  });
  s.phase = 'night';
  s.nightStart = 1080;
  s.place.tamar = 'gate-1';
  s.posts.tamar = 'gate-1';
  s.lantern = { x: 1, target: 1 };
  expect(applyNightAct(s, { k: 'down', who: 'tamar' })).toBe(true);
  const events = stepPeople(s, 1281);
  s.minute = 1281;
  const refusal = events.find(
    (e) => e.kind === 'decide' && e.personId === 'tamar' && e.verdict === 'refused',
  );
  expect(refusal).toBeDefined();
  expect(s.nightRecords?.[0]).toMatchObject({ answer: 'refused', answeredAt: refusal?.at });
  while (s.minute < 1341) {
    stepPeople(s, s.minute + 1);
    s.minute++;
  }
  expect(s.nightRecords?.[0]).toMatchObject({ answer: 'refused', requestEndedAt: 1340 });
  expect(s.nightRecords?.[0]?.ended).toBeUndefined();
  const before = actorRuntime(s).snapshot();
  expect(JSON.stringify(buildFrame(s, 0, false))).toContain('declined');
  expect(actorRuntime(s).snapshot()).toEqual(before);
});

it('keeps actual relief and outgoing sleep as separate named acts after the request window ends', async () => {
  const { publicFixture } = await import('./public-fixture.ts');
  const { applyNightAct } = await import('./night-actions.ts');
  const { stepPeople } = await import('./night.ts');
  const s = publicFixture(1280, (people) => {
    const p = people.find((p) => p.id === 'tamar');
    if (!p) throw new Error('Missing Tamar');
    p.state.body.exertion = 0.9;
    p.state.body.sleepDebtHours = 8;
    p.state.body.sleepPressure = 0.9;
  });
  s.phase = 'night';
  s.nightStart = 1080;
  s.place.tamar = 'gate-1';
  s.posts.tamar = 'gate-1';
  s.place.kian = 'gate-2';
  s.place.samira = 'gate-2';
  s.lantern = { x: 1, target: 1 };
  expect(applyNightAct(s, { k: 'relieve', who: 'tamar', by: 'kian' })).toBe(true);
  const first = stepPeople(s, 1281);
  s.minute = 1281;
  expect(
    first.some((e) => e.personId === 'kian' && e.kind === 'begin' && e.affordanceId === 'post:gate-1'),
  ).toBe(true);
  const second = stepPeople(s, 1282);
  s.minute = 1282;
  expect(second.some((e) => e.personId === 'tamar' && e.kind === 'begin' && e.affordanceId === 'sleep')).toBe(
    true,
  );
  expect(s.nightRecords).toMatchObject([
    { kind: 'relieve', who: 'tamar', by: 'kian', answer: 'begun' },
    { kind: 'down', who: 'tamar', by: 'tamar', answer: 'begun' },
  ]);
  while (s.minute < 1341) {
    stepPeople(s, s.minute + 1);
    s.minute++;
  }
  expect(s.nightRecords?.[0]?.ended?.receipt).toBeTypeOf('string');
  expect(s.nightRecords?.[1]).toMatchObject({ answer: 'begun', requestEndedAt: 1340 });
  expect(s.nightRecords?.[1]?.ended).toBeUndefined();
  expect(s.place.tamar).toBe('home');
});

it('bases the named bell guess on an observed hold answer', async () => {
  const { publicFixture } = await import('./public-fixture.ts');
  const { bellWords, readBell } = await import('./moments.ts');
  const s = publicFixture(1280);
  expect(bellWords(readBell(s, 'tamar'))).toContain('You cannot tell whether Tamar');
  s.nightRecords = [
    {
      id: 0,
      nightStart: 1080,
      kind: 'hold',
      who: 'tamar',
      by: 'tamar',
      section: 'gate',
      affordance: 'post:gate-1',
      sentAt: 1200,
      until: 1260,
      answer: 'begun',
    },
  ];
  expect(bellWords(readBell(s, 'tamar'))).toContain('held the wall when asked before');
  expect(bellWords(readBell(s, 'kian'))).toContain('You cannot tell whether Kian');
});
