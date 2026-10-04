/**
 * Playtest state for Game 1: what is hashed and what a file's snapshot carries. The input log is the game's own
 * `ColonyGame.log` (minute-stamped orders, cancels, dismissed cards and "Another day"), replayed by
 * `ColonyGame.replay`; real time, pause, speed and auto-pause are not logged because they never change the state.
 *
 * Covers: the comparable state (every engine field, both worlds, Classic's units and the Human side's
 * `snapshot()`), its hash, a slim snapshot, and `replayColony` (replay to the file's minute). Does not cover: the
 * Solo control (built lazily by `summary()`; it is a second game from the same seed with no orders).
 */
import { check, hashState } from '../../shared/playtest.ts';
import { ColonyGame, type LogEntry } from './game.ts';
import type { HumanSideFactory } from './human-side.ts';
import { PLACES, type PlaceId } from './map.ts';
import { APPEALS, type AppealChip, type OrderInput } from './orders.ts';
import { DAY3_END, VILLAGERS, type VillagerId } from './world-types.ts';

export function colonyState(g: ColonyGame): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(g)) {
    if (k === 'factory' || k === 'soloGame') continue;
    out[k] = k === 'human' ? g.human.snapshot() : v;
  }
  return out;
}

export const colonyHash = (g: ColonyGame): string => hashState(colonyState(g));

/** For a reader: the engine's state with each person's decision trace, episodic memory and chronicle dropped. */
export function colonySnapshot(g: ColonyGame): Record<string, unknown> {
  const s = colonyState(g);
  const human = s.human as { people?: Record<string, unknown>[] } & Record<string, unknown>;
  s.human = {
    ...human,
    people: (human.people ?? []).map(({ trace: _t, memory: _m, chronicle: _c, chronicleDay: _d, ...p }) => p),
  };
  delete s.log;
  return s;
}

/** Replay a seed and log up to `minute` (the minute the file was saved at). */
export function replayColony(
  seed: number,
  factory: HumanSideFactory,
  log: readonly LogEntry[],
  minute: number,
): ColonyGame {
  return ColonyGame.replay(seed, factory, log, minute);
}

const PLACE_IDS = PLACES.map((p) => p.id) as PlaceId[];
const VILLAGER_IDS = VILLAGERS.map((v) => v.id) as VillagerId[];
const APPEAL_IDS = APPEALS.map((a) => a.id) as AppealChip[];
const MAX_ENTRIES = 20_000;

function orderOf(x: unknown, what: string): OrderInput {
  const o = check.obj(x, what);
  check.keys(o, ['personId', 'placeId', 'rush', 'insist', 'appeal'], what);
  const input: OrderInput = {
    personId: check.oneOf(o.personId, VILLAGER_IDS, `${what}.personId`),
    placeId: check.oneOf(o.placeId, PLACE_IDS, `${what}.placeId`),
  };
  if (o.rush !== undefined) input.rush = check.bool(o.rush, `${what}.rush`);
  if (o.insist !== undefined) input.insist = check.bool(o.insist, `${what}.insist`);
  if (o.appeal !== undefined) input.appeal = check.oneOf(o.appeal, APPEAL_IDS, `${what}.appeal`);
  return input;
}

/** Check every entry of an imported Game 1 log (kinds, fields, minutes in order) and return it typed. */
export function validateColonyLog(log: readonly unknown[]): LogEntry[] {
  if (log.length > MAX_ENTRIES) throw new Error('the log is too long');
  let last = 0;
  return log.map((e, i): LogEntry => {
    const what = `entry ${i}`;
    const o = check.obj(e, what);
    const minute = check.int(o.minute, `${what}.minute`, last, DAY3_END);
    last = minute;
    const kind = check.oneOf(o.kind, ['order', 'cancel', 'dismiss', 'continue'] as const, `${what}.kind`);
    switch (kind) {
      case 'order': {
        check.keys(o, ['minute', 'kind', 'input', 'nudgeId'], what);
        const out: LogEntry = { minute, kind, input: orderOf(o.input, `${what}.input`) };
        if (o.nudgeId !== undefined) out.nudgeId = check.str(o.nudgeId, `${what}.nudgeId`, 80);
        return out;
      }
      case 'cancel':
        check.keys(o, ['minute', 'kind', 'orderId'], what);
        return { minute, kind, orderId: check.str(o.orderId, `${what}.orderId`, 80) };
      case 'dismiss':
        check.keys(o, ['minute', 'kind', 'nudgeId'], what);
        return { minute, kind, nudgeId: check.str(o.nudgeId, `${what}.nudgeId`, 80) };
      case 'continue':
        check.keys(o, ['minute', 'kind'], what);
        return { minute, kind };
      default:
        throw new Error(`${what}.kind is not known`);
    }
  });
}
