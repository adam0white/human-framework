/** SCOPE: internal deterministic numerical cells. No state/RNG outside returned data.
 * DP5(4) with Shampine quartic extension; estimates are not certified global error bounds.
 * Integer-ms adaptive mesh is anchored to physical conditions, never caller targets.
 */
import { cloneData } from '../core/clone.ts';
import { dexp, dlog } from '../core/libm.ts';
import { random } from '../core/random.ts';
import type {
  ActorRandomCursor,
  DeepReadonly,
  HazardContinuation,
  HazardKey,
  NumericalClock,
  OwnerOutput,
  ScalarCell,
  ScalarTrajectory,
  ValidationIssue,
} from '../run-schema.ts';
export const clip = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const smooth = (a: number, b: number, x: number) => {
  const q = clip((x - a) / (b - a));
  return q * q * (3 - 2 * q);
};
export const LN2 = Math.LN2;
export const DAY = 86400000;
export const YEAR = 365.25 * DAY;
export function minutes(a: number, b: number): number {
  const dt = BigInt(b) - BigInt(a);
  if (dt < 0n || dt > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('unsupported time span');
  return Number(dt) / 60000;
}
export function output<S>(state: S, at: number): OwnerOutput<S> {
  return {
    state,
    effects: { terms: [], modifiers: [], appraisals: [] },
    events: [],
    nextBoundary: null,
    advancedThrough: at,
  };
}
export function clock(at: number, id: string, hash: string): NumericalClock {
  return { advancedThroughMs: at, conditionAnchorMs: at, conditionId: id, effectiveParametersHash: hash };
}
export function validateNumbers(value: unknown, path = 'state'): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const walk = (v: unknown, p: string) => {
    if (typeof v === 'number' && !Number.isFinite(v))
      out.push({ path: p, code: 'invalid-schema', message: 'finite number required' });
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
  };
  walk(value, path);
  return out;
}
export function assertValid(value: unknown): void {
  if (validateNumbers(value).length) throw new RangeError('nonfinite owner state');
}
export function evaluateCell(c: DeepReadonly<ScalarCell>, at: number): number {
  const x = ((at - c.originMs) / 60000 - c.leftOffsetMinutes) / (c.rightOffsetMinutes - c.leftOffsetMinutes);
  const q = c.coefficients;
  if (q.length !== 5) throw new RangeError('invalid quartic cell');
  return (
    (((required(q[4]) * x + required(q[3])) * x + required(q[2])) * x + required(q[1])) * x + required(q[0])
  );
}
export function scalarAt(p: DeepReadonly<ScalarTrajectory>, at: number): number {
  const s = p.segments.find((s) => at >= s.from && at <= s.to);
  if (!s) throw new RangeError('trajectory does not cover numerical dependency');
  const h = (at - s.from) / 60000;
  switch (s.kind) {
    case 'constant':
      return s.value;
    case 'linear':
      return s.initial + s.ratePerMinute * h;
    case 'exponential':
      return s.target + (s.initial - s.target) * dexp(-s.ratePerMinute * h);
    case 'quartic':
      return evaluateCell(s.cell, at);
  }
}
const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const E = [
  35 / 384 - 5179 / 57600,
  0,
  500 / 1113 - 7571 / 16695,
  125 / 192 - 393 / 640,
  -2187 / 6784 + 92097 / 339200,
  11 / 84 - 187 / 2100,
  -1 / 40,
];
const P = [
  [1, -8048581381 / 2820520608, 8663915743 / 2820520608, -12715105075 / 11282082432],
  [0, 0, 0, 0],
  [0, 131558114200 / 32700410799, -68118460800 / 10900136933, 87487479700 / 32700410799],
  [0, -1754552775 / 470086768, 14199869525 / 1410260304, -10690763975 / 1880347072],
  [0, 127303824393 / 49829197408, -318862633887 / 49829197408, 701980252875 / 199316789632],
  [0, -282668133 / 205662961, 2019193451 / 616988883, -1453857185 / 822651844],
  [0, 40617522 / 29380423, -110615467 / 29380423, 69997945 / 29380423],
];
export function monotoneCell(c: ScalarCell): boolean {
  const q = c.coefficients;
  const at = (x: number) => q[1] + 2 * q[2] * x + 3 * q[3] * x * x + 4 * q[4] * x * x * x;
  const points = [0, 1];
  const a = 12 * q[4],
    b = 6 * q[3],
    d = 2 * q[2];
  if (a === 0) {
    if (b !== 0) points.push(-d / b);
  } else {
    const disc = b * b - 4 * a * d;
    if (disc >= 0) {
      points.push((-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a));
    }
  }
  return points.filter((x) => x >= 0 && x <= 1).every((x) => at(x) >= -1e-15);
}
export type Derivative = (at: number, y: readonly number[]) => number[];
export function integrateCell(
  at: number,
  y: readonly number[],
  widthMs: number,
  f: Derivative,
  tolerance = 1e-12,
  scales: readonly number[] = y.map(() => 1),
  monotoneIndices: readonly number[] = [],
) {
  let w = Math.max(1, Math.floor(widthMs));
  if (!Number.isSafeInteger(at)) throw new RangeError('safe numerical anchor required');
  if (!Number.isSafeInteger(at + w)) w = Number.MAX_SAFE_INTEGER - at;
  if (w < 1) throw new RangeError('no supported future numerical interval');
  let calls = 0;
  while (true) {
    const h = w / 60000;
    const k: number[][] = [];
    for (let j = 0; j < 7; j++) {
      const yy = y.map((v, i) => v + h * (A[j] ?? []).reduce((s, a, l) => s + a * (k[l]?.[i] ?? 0), 0));
      k.push(f(at + (C[j] ?? 0) * w, yy));
      calls++;
    }
    const err = Math.max(
      ...y.map((_, i) => Math.abs(h * E.reduce((s, e, j) => s + e * (k[j]?.[i] ?? 0), 0)) / (scales[i] ?? 1)),
    );
    if (!Number.isFinite(err)) throw new RangeError('nonfinite numerical derivative');
    if (err <= tolerance) {
      const cells = y.map(
        (v, i): ScalarCell => ({
          originMs: at,
          leftOffsetMinutes: 0,
          rightOffsetMinutes: h,
          coefficients: [
            v,
            ...[0, 1, 2, 3].map((l) => h * P.reduce((s, p, j) => s + (p[l] ?? 0) * (k[j]?.[i] ?? 0), 0)),
          ] as [number, number, number, number, number],
          estimatedError: err,
        }),
      );
      if (monotoneIndices.some((i) => !monotoneCell(required(cells[i])))) {
        if (w === 1) throw new RangeError('limit-exceeded: nonmonotone hazard cell');
        w = Math.max(1, Math.floor(w / 2));
        continue;
      }
      return {
        to: at + w,
        cells,
        values: cells.map((c) => evaluateCell(c, at + w)),
        nextWidth: err < tolerance / 32 ? w * 2 : w,
        calls,
        error: err,
      };
    }
    if (w === 1 || calls >= 8192)
      throw new RangeError('limit-exceeded: numerical cell unresolved; use shorter span');
    w = Math.max(1, Math.floor(w / 2));
  }
}
export function initialWidth(timeConstantMinutes: number): number {
  let width = 1;
  const limit = Math.max(1, (timeConstantMinutes * 60000) / 8);
  while (width * 2 <= limit) width *= 2;
  return width;
}
export function newHazard(key: HazardKey, at: number, id: string, hash: string): HazardContinuation {
  return {
    key,
    episodeOrdinal: 0,
    clock: clock(at, id, hash),
    eligibility: 'closed',
    threshold: null,
    anchorIntegral: 0,
    acceptedIntegral: 0,
    absoluteIntegralError: 0,
    acceptedThroughMs: at,
    materializedAtMs: at,
    activeIntegralCell: null,
    nextTrialWidthMinutes: 1,
    crossing: null,
    pendingEvent: null,
  };
}
export function draw(cursor: DeepReadonly<ActorRandomCursor>): { value: number; rng: ActorRandomCursor } {
  const rng: ActorRandomCursor = cloneData(cursor);
  if (
    !Number.isSafeInteger(rng.identity.uniformDraws) ||
    rng.identity.uniformDraws >= Number.MAX_SAFE_INTEGER
  )
    throw new RangeError('limit-exceeded: actor random draw counter');
  const value = random(rng.words);
  rng.identity.uniformDraws++;
  return { value, rng };
}
export function arm(h: DeepReadonly<HazardContinuation>, rng: DeepReadonly<ActorRandomCursor>, at: number) {
  const d = draw(rng);
  return {
    hazard: {
      ...copy<HazardContinuation>(h),
      threshold: {
        exponentialBudget: -dlog(1 - d.value),
        drawOrdinal: d.rng.identity.uniformDraws,
        allocatedAtMs: at,
      },
      eligibility: 'positive' as const,
    },
    rng: d.rng,
  };
}
export function firstMs(lo: number, hi: number, predicate: (at: number) => boolean): number {
  while (lo < hi) {
    const m = lo + Math.floor((hi - lo) / 2);
    if (predicate(m)) hi = m;
    else lo = m + 1;
  }
  return lo;
}
/** Quartic interpolation for closed readout algebra; refine by midpoint residual. */
export function sampledPath(
  from: number,
  to: number,
  f: (at: number) => number,
  depth = 0,
): ScalarTrajectory['segments'] {
  if (to === from) return [{ kind: 'constant', from, to, value: f(from) }];
  const xs = [0, 0.25, 0.5, 0.75, 1],
    ys = xs.map((x) => f(from + x * (to - from)));
  const coefficients = [0, 0, 0, 0, 0];
  for (let j = 0; j < 5; j++) {
    let poly = [1],
      den = 1;
    for (let k = 0; k < 5; k++)
      if (k !== j) {
        const next = Array(poly.length + 1).fill(0) as number[];
        for (let l = 0; l < poly.length; l++) {
          next[l] = (next[l] ?? 0) - (xs[k] ?? 0) * (poly[l] ?? 0);
          next[l + 1] = (next[l + 1] ?? 0) + (poly[l] ?? 0);
        }
        poly = next;
        den *= (xs[j] ?? 0) - (xs[k] ?? 0);
      }
    for (let l = 0; l < 5; l++)
      coefficients[l] = (coefficients[l] ?? 0) + ((ys[j] ?? 0) * (poly[l] ?? 0)) / den;
  }
  const cell: ScalarCell = {
    originMs: from,
    leftOffsetMinutes: 0,
    rightOffsetMinutes: (to - from) / 60000,
    coefficients: coefficients as [number, number, number, number, number],
    estimatedError: 0,
  };
  const error = Math.max(
    ...[0.125, 0.375, 0.625, 0.875].map((x) =>
      Math.abs(f(from + x * (to - from)) - evaluateCell(cell, from + x * (to - from))),
    ),
  );
  if (error > 1e-12 && to - from > 1) {
    if (depth >= 20) throw new RangeError('limit-exceeded: readout interpolation');
    const mid = from + Math.floor((to - from) / 2);
    return [...sampledPath(from, mid, f, depth + 1), ...sampledPath(mid, to, f, depth + 1)];
  }
  return [{ kind: 'quartic', from, to, cell: { ...cell, estimatedError: error } }];
}
/** Detached data clone; DeepReadonly maps tuple arrays to readonly arrays in v3. */
export function copy<T>(value: DeepReadonly<T>): T {
  return cloneData(value) as T;
}
export function advanceHazard(
  input: DeepReadonly<HazardContinuation>,
  from: number,
  to: number,
  lambda: (at: number) => number,
  coverageTo = Infinity,
  coverageAt: (at: number) => number = () => coverageTo,
): { hazard: HazardContinuation; at: number; boundary: import('../run-schema.ts').HazardBoundary | null } {
  let h = copy<HazardContinuation>(input),
    at = from,
    calls = 0,
    cells = 0;
  if (!h.threshold && lambda(from) > 0)
    return {
      hazard: { ...h, materializedAtMs: from, clock: { ...h.clock, advancedThroughMs: from } },
      at: from,
      boundary: { key: h.key, at: from, operation: 'allocate' },
    };
  while (at < to) {
    let cell = h.activeIntegralCell,
      end = h.acceptedThroughMs;
    if (!cell || at >= end) {
      const start = cell ? end : h.clock.conditionAnchorMs;
      const width = Math.min(Math.max(1, h.nextTrialWidthMinutes * 60000), coverageAt(start) - start);
      if (width < 1) throw new RangeError('missing canonical hazard forcing interval');
      if (start + width > coverageTo) throw new RangeError('trajectory does not cover canonical hazard cell');
      const r = integrateCell(start, [h.acceptedIntegral], width, (t) => [lambda(t)], 1e-12, [1], [0]);
      calls += r.calls;
      if (calls > 8192 || ++cells > 1024) throw new RangeError('limit-exceeded: hazard span');
      cell = required(r.cells[0]);
      end = r.to;
      h = {
        ...h,
        activeIntegralCell: cell,
        acceptedThroughMs: end,
        acceptedIntegral: required(r.values[0]),
        absoluteIntegralError: h.absoluteIntegralError + r.error,
        nextTrialWidthMinutes: r.nextWidth / 60000,
      };
    }
    const stop = Math.min(to, end),
      atIntegral = (t: number) => evaluateCell(required(cell), t);
    if (h.threshold && atIntegral(stop) >= h.threshold.exponentialBudget) {
      const eventAt = firstMs(at, stop, (t) => atIntegral(t) >= required(h.threshold).exponentialBudget);
      return {
        hazard: { ...h, materializedAtMs: eventAt, clock: { ...h.clock, advancedThroughMs: eventAt } },
        at: eventAt,
        boundary: { key: h.key, at: eventAt, operation: 'fire' },
      };
    }
    if (!h.threshold && atIntegral(stop) > h.anchorIntegral) {
      const eventAt = firstMs(at, stop, (t) => atIntegral(t) > h.anchorIntegral);
      return {
        hazard: { ...h, materializedAtMs: eventAt, clock: { ...h.clock, advancedThroughMs: eventAt } },
        at: eventAt,
        boundary: { key: h.key, at: eventAt, operation: 'allocate' },
      };
    }
    at = stop;
    h = {
      ...h,
      materializedAtMs: at,
      clock: { ...h.clock, advancedThroughMs: at },
      eligibility: lambda(at) > 0 ? 'positive' : 'closed',
    };
    if (at === end) h = { ...h, anchorIntegral: atIntegral(end) };
  }
  return { hazard: h, at, boundary: null };
}
export function issue(path: string, message: string): ValidationIssue {
  return { path, code: 'invalid-schema', message };
}
export function numericalIssues(
  c: DeepReadonly<NumericalClock>,
  materialized: number,
  accepted: number,
): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  for (const n of [c.advancedThroughMs, c.conditionAnchorMs, materialized, accepted])
    if (!Number.isSafeInteger(n)) out.push(issue('continuation.clock', 'safe integer milliseconds required'));
  if (c.conditionAnchorMs > materialized || c.advancedThroughMs !== materialized || materialized > accepted)
    out.push(issue('continuation.clock', 'incoherent continuation clocks'));
  return out;
}
export function hazardIssues(h: DeepReadonly<HazardContinuation>): ValidationIssue[] {
  const out = validateNumbers(h);
  if (h.anchorIntegral < 0 || h.acceptedIntegral < h.anchorIntegral || h.absoluteIntegralError < 0)
    out.push(issue('hazard.integral', 'nonnegative monotone integral required'));
  if (
    h.threshold &&
    (h.threshold.exponentialBudget < 0 ||
      !Number.isSafeInteger(h.threshold.drawOrdinal) ||
      h.threshold.drawOrdinal < 0)
  )
    out.push(issue('hazard.threshold', 'invalid budget/draw ordinal'));
  if (h.activeIntegralCell && h.activeIntegralCell.coefficients.length !== 5)
    out.push(issue('hazard.cell', 'five coefficients required'));
  if (!Number.isSafeInteger(h.episodeOrdinal) || h.episodeOrdinal < 0)
    out.push(issue('hazard.episode', 'nonnegative integer required'));
  return out;
}

export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new RangeError('missing required owner datum');
  return value;
}
/** Canonical forcing segmentation, never the requested materialization target. */
export function nextPathBoundary(at: number, paths: readonly DeepReadonly<ScalarTrajectory>[]): number {
  let end = Infinity;
  for (const p of paths) {
    const segment = p.segments.find((s) => s.from <= at && s.to > at);
    if (!segment) throw new RangeError('trajectory lacks next canonical forcing cell');
    end = Math.min(end, segment.to);
  }
  return end;
}
export function cellExtrema(c: DeepReadonly<ScalarCell>, from: number, to: number): number[] {
  const q = c.coefficients;
  if (q.length !== 5) throw new RangeError('invalid quartic');
  const a = 12 * required(q[4]),
    b = 6 * required(q[3]),
    d = 2 * required(q[2]);
  const duration = (c.rightOffsetMinutes - c.leftOffsetMinutes) * 60000,
    start = c.originMs + c.leftOffsetMinutes * 60000;
  const lo = (from - start) / duration,
    hi = (to - start) / duration,
    part = [lo, hi];
  if (a === 0) {
    if (b !== 0) part.push(-d / b);
  } else {
    const disc = b * b - 4 * a * d;
    if (disc >= 0) part.push((-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a));
  }
  const breaks = part.filter((x) => x >= lo && x <= hi).sort((x, y) => x - y);
  const derivative = (x: number) =>
    required(q[1]) + 2 * required(q[2]) * x + 3 * required(q[3]) * x * x + 4 * required(q[4]) * x * x * x;
  const candidates = [...breaks];
  for (let j = 0; j < breaks.length - 1; j++) {
    let l = required(breaks[j]),
      r = required(breaks[j + 1]);
    if (derivative(l) * derivative(r) > 0) continue;
    for (let k = 0; k < 52; k++) {
      const m = (l + r) / 2;
      if (derivative(l) * derivative(m) <= 0) r = m;
      else l = m;
    }
    candidates.push((l + r) / 2);
  }
  return candidates.map((x) => start + x * duration);
}
export function maximumCell(c: DeepReadonly<ScalarCell>, from: number, to: number): number {
  return Math.max(...cellExtrema(c, from, to).map((t) => evaluateCell(c, t)));
}
export function thresholdTimes(
  c: DeepReadonly<ScalarCell>,
  from: number,
  to: number,
  threshold: number,
): number[] {
  const stops = [...new Set(cellExtrema(c, from, to))].sort((a, b) => a - b),
    roots: number[] = [];
  const f = (t: number) => evaluateCell(c, t) - threshold;
  for (const t of stops) if (f(t) === 0) roots.push(t);
  for (let j = 0; j < stops.length - 1; j++) {
    let lo = required(stops[j]),
      hi = required(stops[j + 1]);
    if (f(lo) * f(hi) >= 0) continue;
    for (let k = 0; k < 52; k++) {
      const mid = (lo + hi) / 2;
      if (f(lo) * f(mid) <= 0) hi = mid;
      else lo = mid;
    }
    roots.push((lo + hi) / 2);
  }
  return roots;
}
export function rebaseHazard(
  h: DeepReadonly<HazardContinuation>,
  at: number,
  id: string,
  hash: string,
): HazardContinuation {
  const integral = h.activeIntegralCell ? evaluateCell(h.activeIntegralCell, at) : h.acceptedIntegral;
  return {
    ...copy<HazardContinuation>(h),
    clock: clock(at, id, hash),
    anchorIntegral: integral,
    acceptedIntegral: integral,
    acceptedThroughMs: at,
    materializedAtMs: at,
    activeIntegralCell: null,
    crossing: null,
    pendingEvent: null,
  };
}
export function ageYearsAt(birthAt: number, at: number): number {
  if (!Number.isSafeInteger(birthAt) || !Number.isSafeInteger(at))
    throw new RangeError('safe authored age clocks required');
  const delta = BigInt(at) - BigInt(birthAt);
  if (delta > BigInt(Number.MAX_SAFE_INTEGER) || delta < -BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError('unsupported age duration');
  return Number(delta) / YEAR;
}
export function addTime(at: number, durationMs: number): number {
  const end = BigInt(at) + BigInt(durationMs);
  if (end > BigInt(Number.MAX_SAFE_INTEGER) || end < -BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError('time overflow');
  return Number(end);
}
/** Engine coefficient data are immutable, including nested arrays/part tables. */
export function freezeData<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeData(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
