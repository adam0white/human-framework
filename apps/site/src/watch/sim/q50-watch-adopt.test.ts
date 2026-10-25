import { gestureVoiceTrust, type Person } from '@adam0white/human-framework';
import { expect, it, vi } from 'vitest';
import { playYears } from '../../../test/watch/years.ts';
import { takeOffer } from './fair.ts';
import { settleLifeCard } from './life.ts';
import { resolveNightRequest } from './night-actions.ts';
import { KEEPER_ID, personOf } from './people.ts';
import { replay, WatchRun } from './run.ts';
import type { WatchState } from './state.ts';
import { talk } from './talk.ts';

type History = Person['will']['voices'][number]['history'];
type GestureRecord = {
  personId: string;
  beforeTrust: number;
  afterTrust: number;
  before: History;
  after: History;
  reason: string;
  at: number;
};
const arm = vi.hoisted(() => ({ legacy: false, journal: [] as GestureRecord[] }));
// The legacy arm repeats the former mapped trust write (home used an upper-only
// clamp). It then applies only the intended new history effect to the mapped
// relation via HF's tested helper, so whole JSON states can be compared.
vi.mock('@adam0white/human-framework', async (importOriginal) => {
  const hf = await importOriginal<typeof import('@adam0white/human-framework')>();
  return {
    ...hf,
    gestureVoiceTrust: (...args: Parameters<typeof hf.gestureVoiceTrust>) => {
      if (!arm.legacy) return hf.gestureVoiceTrust(...args);
      const [p, id, amount, event] = args;
      const old = p.will.voices.find((v) => v.voiceId === id);
      if (!old) return undefined;
      const before = structuredClone(old.history);
      const beforeTrust = old.trust;
      const shadow = structuredClone(p);
      const expected = hf.gestureVoiceTrust(shadow, id, amount, event);
      const upperOnly = event.reason === 'The Keeper asked about home.';
      p.will.voices = p.will.voices.map((v) =>
        v.voiceId === id
          ? {
              ...v,
              trust: upperOnly ? Math.min(1, v.trust + amount) : Math.max(0, Math.min(1, v.trust + amount)),
              history: structuredClone(expected?.history ?? []),
            }
          : v,
      );
      const next = p.will.voices.find((v) => v.voiceId === id);
      if (!next) throw new Error('Mapped voice went missing');
      arm.journal.push({
        personId: p.id,
        beforeTrust,
        afterTrust: next.trust,
        before,
        after: structuredClone(next.history),
        reason: event.reason,
        at: event.at ?? p.now,
      });
      return next;
    },
    addTiredness: (...args: Parameters<typeof hf.addTiredness>) => {
      if (!arm.legacy) return hf.addTiredness(...args);
      const [p, costs] = args;
      if (costs.sleepPressure) p.body.sleepPressure = Math.min(1, p.body.sleepPressure + costs.sleepPressure);
      if (costs.exertion) p.body.exertion = Math.min(1, p.body.exertion + costs.exertion);
    },
  };
});

// Independent expectation for the new history transition. It retains every
// earlier entry, including entries that are later folded or evicted at cap.
function expectedHistory(record: GestureRecord): History {
  const history = structuredClone(record.before);
  const delta = record.afterTrust - record.beforeTrust;
  if (Math.abs(delta) < 1e-9) return history;
  const last = history.at(-1);
  if (Math.abs(delta) < 0.01 && last?.reason === record.reason) {
    last.from ??= last.at;
    last.count = (last.count ?? 1) + 1;
    last.delta += delta;
    last.at = record.at;
    delete last.action;
    return history;
  }
  history.push({ at: record.at, delta, reason: record.reason });
  if (history.length > 5) history.shift();
  return history;
}

function checkJournal(records: GestureRecord[]) {
  expect(records.length).toBeGreaterThan(0);
  for (const record of records) expect(record.after).toEqual(expectedHistory(record));
}

function earlierKeeperHistory(p: Person, at: number) {
  const old = arm.legacy;
  arm.legacy = false;
  try {
    for (const [i, reason] of [
      'Earlier wall report.',
      'Earlier winter help.',
      'Earlier fair decision.',
      'Earlier night request.',
    ].entries())
      gestureVoiceTrust(p, KEEPER_ID, 0.01, { reason, at: at - 40 + i });
  } finally {
    arm.legacy = old;
  }
  const history = p.will.voices.find((v) => v.voiceId === KEEPER_ID)?.history;
  expect(history?.map((h) => h.reason)).toEqual([
    'Earlier wall report.',
    'Earlier winter help.',
    'Earlier fair decision.',
    'Earlier night request.',
  ]);
}

function controls(legacy: boolean) {
  arm.legacy = legacy;
  arm.journal = [];
  const run = new WatchRun(42);
  run.input({ k: 'start' });
  const s = run.state;
  const pupil = personOf(s, 'kian') as Person;
  const teacher = personOf(s, 'tamar') as Person;
  const other = personOf(s, 'samira') as Person;
  expect(pupil && teacher && other).toBeTruthy();
  earlierKeeperHistory(pupil, s.minute);
  const initial = structuredClone(s);
  const stages: WatchState[] = [];
  const capture = () => stages.push(structuredClone(s));
  for (const choice of ['visit', 'grain']) {
    settleLifeCard(s, { kind: 'birth', who: pupil.id, other: teacher.id }, choice);
    capture();
  }
  for (const choice of ['bless', 'refuse']) {
    settleLifeCard(s, { kind: 'practise', who: pupil.id, other: teacher.id }, choice);
    capture();
  }
  s.phase = 'fair';
  s.gateKeeper = teacher.id;
  s.fair = {
    max: 2,
    picks: [],
    offers: [
      { id: 'heir', target: pupil.id, cost: 0, label: 'Heir', text: 'Heir' },
      { id: 'heir2', target: other.id, cost: 0, label: 'Other', text: 'Other' },
    ],
  };
  expect(takeOffer(s, 'heir')).toBe(true);
  capture();
  s.phase = 'dawn';
  s.talks.left = 2;
  pupil.body.sleepPressure = 0.98;
  expect(talk(s, pupil.id, 'home')).toBe(true);
  expect(pupil.body.sleepPressure).toBe(1);
  capture();
  s.phase = 'night';
  s.nightDepartureEffort = true;
  s.place[pupil.id] = 'mill-1';
  pupil.body.exertion = 0.97;
  s.nightRequests = {
    [pupil.id]: {
      kind: 'help',
      who: teacher.id,
      affordance: 'post:gate-1',
      section: 'gate',
      until: s.minute + 60,
    },
  };
  resolveNightRequest(s, {
    kind: 'begin',
    personId: pupil.id,
    affordanceId: 'post:gate-1',
    at: s.minute,
    detail: '',
  });
  expect(pupil.body.exertion).toBe(1);
  const snapshot = structuredClone(s);
  for (let i = 0; i < 30; i++) run.step();
  return { initial, snapshot, state: s, stages, journal: structuredClone(arm.journal) };
}

it('preserves real event costs, decisions, world, RNG and all other Person fields', () => {
  const old = controls(true);
  const current = controls(false);
  expect(current.initial).toEqual(old.initial);
  checkJournal(old.journal);
  expect(current.snapshot).toEqual(old.snapshot);
  expect(current.state).toEqual(old.state);
  expect(current.stages).toEqual(old.stages);
  expect(old.journal[0]?.before.map((h) => h.reason)).toContain('Earlier wall report.');
  expect(
    old.journal.some(
      (r) => r.before.length === 5 && r.after.length === 5 && r.before[0]?.reason !== r.after[0]?.reason,
    ),
  ).toBe(true);
  const reasons = current.stages.flatMap((stage) =>
    stage.community.people.flatMap((p) => p.will.voices.flatMap((v) => v.history.map((h) => h.reason))),
  );
  for (const reason of [
    'The Keeper visited after the birth.',
    'The Keeper sent grain after the birth.',
    'The Keeper allowed sling lessons.',
    'The Keeper refused sling lessons.',
    'The Keeper named me heir to the Gate.',
    'The Keeper named a Gate heir before I spoke.',
    'The Keeper chose another Gate heir.',
    'The Keeper asked about home.',
  ])
    expect(reasons).toContain(reason);
});

it('keeps bounded seeded year runs identical after intended history transitions and replays exports', () => {
  for (const seed of [7, 42]) {
    arm.legacy = true;
    arm.journal = [];
    const old = playYears(seed, 1);
    const records = structuredClone(arm.journal);
    arm.legacy = false;
    const current = playYears(seed, 1);
    expect(current.log).toEqual(old.log);
    checkJournal(records);
    expect(current.state).toEqual(old.state);
    expect(replay(JSON.parse(JSON.stringify(current.export())))).toEqual(current.state);
  }
}, 120_000);

function foldedVisit(legacy: boolean) {
  arm.legacy = legacy;
  arm.journal = [];
  const run = new WatchRun(9);
  run.input({ k: 'start' });
  const s = run.state;
  const p = personOf(s, 'kian');
  if (!p) throw new Error('Founding watcher missing');
  const v = p.will.voices.find((v) => v.voiceId === KEEPER_ID);
  if (!v) throw new Error('Keeper voice missing');
  v.trust = 0.99;
  const old = arm.legacy;
  arm.legacy = false;
  gestureVoiceTrust(p, KEEPER_ID, 0.005, { reason: 'The Keeper visited after the birth.', at: s.minute - 1 });
  arm.legacy = old;
  expect(v.history.at(-1)?.reason).toBe('The Keeper visited after the birth.');
  const before = structuredClone(v.history);
  settleLifeCard(s, { kind: 'birth', who: p.id, other: p.id }, 'visit');
  return { state: s, before, records: structuredClone(arm.journal) };
}

it('folds a saturated visit into the earlier same-reason entry without losing other history', () => {
  const old = foldedVisit(true);
  const current = foldedVisit(false);
  checkJournal(old.records);
  expect(current.state).toEqual(old.state);
  const record = old.records[0];
  expect(record?.before).toEqual(old.before);
  expect(record?.after).toHaveLength(old.before.length);
  expect(record?.after.at(-1)).toEqual({
    at: current.state.minute,
    from: current.state.minute - 1,
    count: 2,
    delta: (old.before.at(-1)?.delta ?? 0) + (1 - 0.995),
    reason: 'The Keeper visited after the birth.',
  });
});
