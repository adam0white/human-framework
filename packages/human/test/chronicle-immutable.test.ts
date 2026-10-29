import { expect, it } from 'vitest';
import {
  CHRONICLE_DEFAULTS,
  chronicleOwner,
  closeChronicleDay,
  noteChronicleOutcome,
} from '../src/chronicle/chronicle.ts';
import { validateNarrativeJson } from '../src/memory/memory.ts';
import type {
  ChronicleSnapshot,
  EffectiveParameters,
  FrameContext,
  ObservedOutcome,
} from '../src/run-schema.ts';

it('reuses immutable closed days while mutable admissions and accessor values remain checked', () => {
  const snapshot = {
    habits: [],
    will: { voices: [] },
    body: { alive: true, illnesses: [] },
    conscience: { breaches: [] },
    memory: { episodes: [] },
    affect: { mood: { valence: 0.2 } },
    agenda: { commitments: [] },
    retention: { chronicleDays: 7, trace: 10 },
  } as unknown as ChronicleSnapshot;
  const frame = {
    effective: { builtins: { CHRONICLE_DEFAULTS } } as EffectiveParameters,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    at: 86400000,
    priorAt: 0,
    phase: 6,
    fidelity: { mode: 'fine' },
    worldRevision: 0,
    causes: [],
  } as FrameContext;
  const initial = chronicleOwner.initialize({ ...frame, at: 0, snapshot });
  const closed = closeChronicleDay(initial, snapshot, frame).state;
  const before = JSON.stringify(closed);
  const outcome: ObservedOutcome = {
    activityId: 'activity',
    offerId: 'offer',
    actionId: 'work',
    start: 86400000,
    end: 86460000,
    status: 'completed',
    evidenceId: 'receipt',
    actual: { material: 3, exposures: [], observedProgress: [] },
    fulfills: [],
    advances: [],
  };
  const received = noteChronicleOutcome(closed, outcome, []);
  expect(received.days[0]).toBe(closed.days[0]);
  expect(Object.isFrozen(received.days[0]?.illness.onset)).toBe(true);
  expect(received.open.material).toBe(3);
  expect(JSON.stringify(closed)).toBe(before);
  const next = closeChronicleDay(received, snapshot, { ...frame, at: 2 * 86400000 }).state;
  expect(next.days[0]?.state).toBeUndefined();
  expect(closed.days[0]?.state).toBeDefined();
  const mutable = JSON.parse(JSON.stringify(closed));
  expect(chronicleOwner.validate(mutable)).toEqual([]);
  mutable.days[0].material = Number.NaN;
  expect(() => noteChronicleOutcome(mutable, outcome, [])).toThrow();

  const child = { value: 1 };
  const shallow = Object.freeze({ child });
  expect(validateNarrativeJson(shallow)).toEqual([]);
  child.value = Number.NaN;
  expect(validateNarrativeJson(shallow).map((issue) => issue.path)).toEqual(['child.value']);
  let value = 1;
  const accessor = Object.freeze({
    get value() {
      return value;
    },
  });
  expect(validateNarrativeJson(accessor)).toEqual([]);
  value = Number.NaN;
  expect(validateNarrativeJson(accessor).map((issue) => issue.path)).toEqual(['value']);
  // Array length is its sole permitted hidden field. A frozen array accessor
  // still reads its current value rather than becoming an immutable JSON proof.
  let arrayValue = 1;
  const array = [1];
  Object.defineProperty(array, '0', { enumerable: true, get: () => arrayValue });
  Object.freeze(array);
  expect(validateNarrativeJson(array)).toEqual([]);
  arrayValue = Number.NaN;
  expect(validateNarrativeJson(array).map((issue) => issue.path)).toEqual(['0']);
});
