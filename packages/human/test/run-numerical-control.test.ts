/** SCOPE: one public Run combined 24h control, ten fixed seeds.
 * Advancement and receipts use only actual public step. Pure owner readers
 * measure exported state; a separate opening-only guard proves reader purity.
 * Canonical repeats compare full hourly checkpoint bytes. Fine/daily and
 * irregular reads compare named normalized fields at absolute 1e-9.
 * Truly absent optional categories are distinct from present uncovered fields.
 * Exact semantic clocks/counters/seeded cursors/reached events are separate.
 * Transaction/frame ordinals belong to each target history and are not compared.
 * Archive histories differ with target logs; no archive hash equality is claimed.
 * This is not a 61-field certificate, clinical validation, or restore/replay test.
 */
import { expect, it } from 'vitest';
import * as publicRun from '../src/run.ts';
import type { DeepReadonly, Fidelity, Input, RunOperations, RunState } from '../src/run-schema.ts';
import {
  accepted,
  DAY,
  HOST,
  HOUR,
  measureNumerical,
  numericalPerson,
  numericalSpec,
  PERSON,
  SEEDS,
  semanticInputs,
} from './run-numerical-fixture.ts';

// Bind the actual public runtime, without a cast, mock or injected owner.
const api: Pick<RunOperations, 'createRun' | 'createPerson' | 'step' | 'inspect' | 'exportRun'> = publicRun;

function actor(s: DeepReadonly<RunState>) {
  const a = s.people[PERSON];
  if (!a) throw new Error('public archive lost authored actor');
  return a;
}

function exact(s: DeepReadonly<RunState>) {
  const a = actor(s);
  const c = s.continuations.find((item) => item.person === PERSON);
  if (!c) throw new Error('missing hazard continuation');
  const hazards = [c.doze.hazard, c.crisis.hazard, ...c.life.hazards];
  return {
    hazards: hazards.map((h) => ({
      key: h.key,
      episodeOrdinal: h.episodeOrdinal,
      threshold: h.threshold,
      pendingEvent: h.pendingEvent,
    })),
    numericalClocks: {
      body: c.body.clock,
      affect: c.affect.clock,
      crisis: c.crisis.clock,
      life: c.life.clock,
    },
    pendingPhysicalRoots: c.body.pendingRoots.map((root) => ({ kind: root.kind, recordId: root.recordId })),
    pendingLife: c.life.pending,
    at: s.at,
    ownerClocks: s.ownerClocks,
    counters: {
      nextInput: s.counters.nextInput,
      nextRequest: s.counters.nextRequest,
      nextEvent: s.counters.nextEvent,
      nextActivity: s.counters.nextActivity,
    },
    cursor: {
      at: s.cursor.at,
      closed: s.cursor.closed,
      phase: s.cursor.phase,
      resolutionLane: s.cursor.resolutionLane,
    },
    runRng: s.rng,
    actorClock: a.now,
    actorRng: a.rng,
    randomIdentity: a.randomIdentity,
    body: {
      alive: a.body.alive,
      asleep: a.body.asleep,
      since: a.body.since,
      nextId: a.body.nextId,
      doze: a.body.doze,
      downed: a.body.downed,
      lastSleep: a.body.lastSleep,
      lastDowned: a.body.lastDowned,
    },
    crisis: {
      checkedAt: a.affect.crisis.checkedAt,
      active: a.affect.crisis.active,
      lastBreakAt: a.affect.crisis.lastBreakAt,
      breaks: a.affect.crisis.breaks,
    },
    nextDecision: a.nextDecision,
    activity: a.activity,
    membership: {
      injuries: a.body.injuries.map((x) => x.id),
      illnesses: a.body.illnesses.map((x) => x.id),
      exposures: Object.keys(a.body.exposures).sort(),
    },
    pending: s.pending,
    world: s.world,
  };
}

type Checkpoint = {
  measurement: ReturnType<typeof measureNumerical>;
  state: DeepReadonly<RunState>;
  events: DeepReadonly<RunState['events']>;
};

function timeline(seed: number, fidelity: Fidelity, irregular: boolean): Checkpoint[] {
  const run = accepted(api.createRun(numericalSpec(seed)));
  accepted(api.createPerson(run, numericalPerson(seed)));
  const inputs = semanticInputs();
  const reachedEvents: DeepReadonly<RunState['events'][number]>[] = [];
  const checkpoints: Checkpoint[] = [];
  let sent = 0;
  const advance = (until: number) => {
    const due: Input[] = [];
    while (sent < inputs.length) {
      const input = inputs[sent];
      if (!input || input.at > until) break;
      due.push(input);
      sent++;
    }
    let result = accepted(api.step(run, { until, fidelity, inputs: due }));
    reachedEvents.push(...result.events);
    // Host resolves only actual emitted requests. No forged request IDs, RNG,
    // success observations or unrelated actions. Unexpected routes fail loudly.
    for (let transactions = 0; result.boundary.type === 'world-required'; transactions++) {
      if (transactions >= 32) throw new Error('public request cycle exceeded 32 transactions');
      const responses: Input[] = result.boundary.requests.map((request) => {
        if (request.kind !== 'action' || request.offerId !== 'sleep-at-16h')
          throw new Error(`unexpected host request: ${JSON.stringify(request)}`);
        if (request.stage === 'interrupt') throw new Error('pinned sleep was interrupted');
        if (request.stage === 'start') expect(result.at).toBe(16 * HOUR);
        else expect(result.at).toBe(DAY);
        return {
          id: `accept-${request.id}`,
          at: result.at,
          source: HOST,
          kind: 'action.resolved',
          payload: {
            requestId: request.id,
            requestHash: request.requestHash,
            person: request.person,
            activityId: request.activityId,
            stage: request.stage,
            worldRevision: request.worldRevision,
            disposition: request.stage === 'start' ? 'accepted' : 'completed',
            ...(request.stage === 'finish'
              ? {
                  outcome: {
                    activityId: request.activityId,
                    offerId: request.offerId,
                    actionId: 'sleep',
                    start: 16 * HOUR,
                    end: DAY,
                    status: 'completed' as const,
                    evidenceId: 'sleep-completed',
                    actual: { exposures: [], observedProgress: [] },
                    fulfills: [],
                    advances: [],
                  },
                }
              : {}),
            observations: [],
          },
        };
      });
      result = accepted(api.step(run, { until, fidelity, inputs: responses }));
      reachedEvents.push(...result.events);
    }
    expect(result.reachedUntil).toBe(true);
    expect(result.at).toBe(until);
    if (seed === 1 && until <= HOUR) {
      const archive = api.exportRun(run);
      const a = actor(archive.current);
      const c = archive.current.continuations.find((entry) => entry.person === PERSON);
      if (!c) throw new Error('missing actual prefix continuation');
      console.info(
        'NUMERICAL_FORCING_PREFIX',
        JSON.stringify({
          fidelity,
          irregular,
          at: archive.current.at,
          traits: a.traits,
          characterAnchor: c.narrative.character.anchor,
          storedCharacterTraits: c.narrative.character.state.traits,
          crisisClock: c.crisis.clock,
          needsAnchor: c.deliberation.needs.anchor,
        }),
      );
    }
  };
  for (let hour = 1; hour <= 24; hour++) {
    const until = hour * HOUR;
    if (irregular) {
      advance(until - HOUR + 175);
      advance(until - HOUR + 120001);
      advance(until - HOUR + 1145222);
    }
    advance(until);
    const archive = api.exportRun(run);
    const state = archive.current;
    expect(state.at).toBe(until);
    if (hour >= 16 && hour < 24) {
      expect(actor(state).activity?.offer.actionId).toBe('sleep');
      expect(actor(state).body.asleep).toBe(true);
      expect(actor(state).activity?.startedAt).toBe(16 * HOUR);
    }
    const view = accepted(
      api.inspect(run, { perspective: { kind: 'host' }, people: [PERSON], select: ['body'] }),
    );
    const personView = view.people.find((person) => person.id === PERSON);
    if (personView?.kind !== 'host') throw new Error('missing public host body view');
    const bodyPart = personView.parts.find((part) => part.select === 'body');
    if (bodyPart?.select !== 'body') throw new Error('missing public body readout');
    const measurement = measureNumerical(archive);
    expect(bodyPart.value.readout).toEqual(measurement.body);
    checkpoints.push({ state, measurement, events: structuredClone(reachedEvents) });
  }
  expect(sent).toBe(inputs.length);
  expect(checkpoints).toHaveLength(24);
  expect(checkpoints.at(-1)?.state.at).toBe(DAY);
  return checkpoints;
}

function compareValues(left: Checkpoint, right: Checkpoint, label: string) {
  expect(right.measurement.notApplicable, label).toEqual(left.measurement.notApplicable);
  // A present unsupported reading must remain a visible gap, not a passing omission.
  expect(left.measurement.uncovered, label).toEqual([]);
  expect(right.measurement.uncovered, label).toEqual([]);
  const expected = left.measurement.values;
  const actual = right.measurement.values;
  expect(Object.keys(actual).sort(), label).toEqual(Object.keys(expected).sort());
  for (const [key, value] of Object.entries(expected)) {
    const other = actual[key];
    if (other === undefined) throw new Error(`${label}: missing ${key}`);
    expect(Number.isFinite(value) && Number.isFinite(other), `${label}, ${key}`).toBe(true);
    expect(Math.abs(value - other), `${label}, ${key}`).toBeLessThanOrEqual(1e-9);
  }
}

it('measures actual opening exports with pure readers without advancing the Run', () => {
  const coverage: { seed: number; fields: string[]; notApplicable: string[]; uncovered: string[] }[] = [];
  for (const seed of SEEDS) {
    const run = accepted(publicRun.createRun(numericalSpec(seed)));
    accepted(publicRun.createPerson(run, numericalPerson(seed)));
    const archive = publicRun.exportRun(run);
    const before = JSON.stringify(archive);
    const measured = measureNumerical(archive);
    expect(measureNumerical(archive)).toEqual(measured);
    expect(JSON.stringify(archive)).toBe(before);
    expect(JSON.stringify(publicRun.exportRun(run))).toBe(before);
    expect(archive.current.at).toBe(0);
    expect(measured.uncovered).toEqual([]);
    expect(measured.lifeStage).toBe('adult');
    for (const [key, value] of Object.entries(measured.values))
      expect(Number.isFinite(value), `opening seed=${seed}, ${key}`).toBe(true);
    coverage.push({
      seed,
      fields: Object.keys(measured.values).sort(),
      notApplicable: measured.notApplicable,
      uncovered: measured.uncovered,
    });
  }
  // This is a real opening-state read/purity result. It proves no elapsed runtime numerics.
  console.info('NUMERICAL_OPENING_READERS', JSON.stringify(coverage));
});

type Difference = { path: string; expected: unknown; actual: unknown; absolute?: number };

function differences(expected: unknown, actual: unknown, path = '$'): Difference[] {
  if (Object.is(expected, actual)) return [];
  if (
    expected !== null &&
    actual !== null &&
    typeof expected === 'object' &&
    typeof actual === 'object' &&
    Array.isArray(expected) === Array.isArray(actual)
  ) {
    const left = new Map(Object.entries(expected));
    const right = new Map(Object.entries(actual));
    return [...new Set([...left.keys(), ...right.keys()])]
      .sort()
      .flatMap((key) => differences(left.get(key), right.get(key), `${path}.${key}`));
  }
  return [
    {
      path,
      expected,
      actual,
      ...(typeof expected === 'number' && typeof actual === 'number'
        ? { absolute: Math.abs(expected - actual) }
        : {}),
    },
  ];
}

function diagnostic(left: Checkpoint, right: Checkpoint, hour: number) {
  const expected = left.measurement.values;
  const actual = right.measurement.values;
  const named = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort().map((field) => {
    const a = expected[field],
      b = actual[field];
    return {
      field,
      expected: a,
      actual: b,
      absolute: a !== undefined && b !== undefined ? Math.abs(a - b) : null,
      withinTolerance:
        a !== undefined &&
        b !== undefined &&
        Number.isFinite(a) &&
        Number.isFinite(b) &&
        Math.abs(a - b) <= 1e-9,
    };
  });
  const l = actor(left.state),
    r = actor(right.state);
  return {
    hour,
    at: left.state.at,
    actualAt: right.state.at,
    named,
    notApplicable: { expected: left.measurement.notApplicable, actual: right.measurement.notApplicable },
    uncovered: { expected: left.measurement.uncovered, actual: right.measurement.uncovered },
    exactDifferences: differences(exact(left.state), exact(right.state)),
    eventCounts: { expected: left.events.length, actual: right.events.length },
    eventDifferences: differences(left.events, right.events),
    rngDifferences: differences(
      { run: left.state.rng, actor: l.rng, identity: l.randomIdentity },
      { run: right.state.rng, actor: r.rng, identity: r.randomIdentity },
    ),
    actorNumericDifferences: differences(l, r).filter((entry) => entry.absolute !== undefined),
    crisisContinuations: {
      expected: left.state.continuations.find((c) => c.person === PERSON)?.crisis,
      actual: right.state.continuations.find((c) => c.person === PERSON)?.crisis,
    },
  };
}

it('preserves combined public Run numerics over ten actual 24h timelines', () => {
  const completed: {
    seed: number;
    fine: Checkpoint[];
    canonicalRepeat: Checkpoint[];
    daily: Checkpoint[];
    extraReads: Checkpoint[];
  }[] = [];
  // Gather every actual 24h trajectory before any comparison can stop at hour1.
  // Original acceptance assertions remain below, unchanged in strength.
  for (const seed of SEEDS) {
    const fine = timeline(seed, { mode: 'fine' }, false);
    const canonicalRepeat = timeline(seed, { mode: 'fine' }, false);
    const daily = timeline(seed, { mode: 'daily', dayMs: 86400000, anchor: 0 }, false);
    const extraReads = timeline(seed, { mode: 'fine' }, true);
    const point = { seed, fine, canonicalRepeat, daily, extraReads };
    completed.push(point);
    console.info(
      'NUMERICAL_24H_DIAGNOSTIC',
      JSON.stringify({
        seed,
        sameFidelity: fine.map((f, i) => {
          const r = extraReads[i];
          if (!r) throw new Error('missing irregular checkpoint');
          return diagnostic(f, r, i + 1);
        }),
        fineDaily: fine.map((f, i) => {
          const d = daily[i];
          if (!d) throw new Error('missing daily checkpoint');
          return diagnostic(f, d, i + 1);
        }),
        canonicalRepeatExact: JSON.stringify(fine) === JSON.stringify(canonicalRepeat),
        completedHours: {
          fine: fine.length,
          repeat: canonicalRepeat.length,
          daily: daily.length,
          irregular: extraReads.length,
        },
      }),
    );
  }
  for (const { seed, fine, canonicalRepeat, daily, extraReads } of completed) {
    for (let i = 0; i < fine.length; i++) {
      const f = fine[i],
        c = canonicalRepeat[i],
        d = daily[i],
        r = extraReads[i];
      if (!f || !c || !d || !r) throw new Error('missing common hourly checkpoint');
      const label = `seed=${seed}, hour=${i + 1}`;
      // Identical canonical 60min call histories must materialize byte-identically.
      expect(JSON.stringify(c), `${label}, canonical repeat`).toBe(JSON.stringify(f));
      // Extra targets never create same-fidelity decisions, events or random draws.
      expect(exact(r.state), `${label}, same fidelity`).toEqual(exact(f.state));
      // Ruling 26: the event set, order and identity stay exact across chunking;
      // continuous payload fields (mood included) compare within absolute 1e-9.
      expect(
        differences(f.events, r.events).filter((d) => !(d.absolute !== undefined && d.absolute <= 1e-9)),
        `${label}, same fidelity events`,
      ).toEqual([]);
      compareValues(f, r, `${label}, same fidelity irregular`);
      // Fidelity may legitimately alter autonomous opportunities. This bounded
      // shared-input comparison is not a universal promise of identical choices.
      // A difference fails acceptance here with this qualification, not a claim
      // that different legitimate opportunity logs are themselves runtime bugs.
      compareValues(f, d, `${label}, fine/daily shared inputs; qualify autonomous opportunity differences`);
      const physical = (point: Checkpoint) =>
        point.events
          .filter(
            (event) =>
              event.data.kind === 'body-change' ||
              event.data.kind === 'lifecycle' ||
              event.data.kind === 'crisis',
          )
          .map((event) => ({ at: event.at, phase: event.phase, person: event.person, data: event.data }));
      expect(physical(d), `${label}, shared-condition physical events`).toEqual(physical(f));
    }
  }
}, 120_000);
