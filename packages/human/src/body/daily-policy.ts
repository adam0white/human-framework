/** SCOPE: daily resolution uses the same derivatives and semantic/hazard boundaries.
 * Its deterministic local numerical estimate is 1e-7 in normalized state units.
 * This is a numerical estimate, not a certified global error bound. Fine resolution
 * keeps its existing mesh and tolerance. Policy identity rebases retained cells when
 * fidelity changes; caller endpoints never anchor the mesh.
 */
import type { DeepReadonly, Fidelity } from '../run-schema.ts';
import { DAY, sampledPath } from './span.ts';

export const DAILY_NUMERICAL_POLICY = 'daily-cells-v1';
export function dailyPolicy(fidelity?: DeepReadonly<Fidelity>): boolean {
  return fidelity?.mode === 'daily';
}
export function numericalTolerance(fidelity?: DeepReadonly<Fidelity>): number {
  return dailyPolicy(fidelity) ? 1e-7 : 1e-12;
}
export function numericalPath(
  from: number,
  to: number,
  read: (at: number) => number,
  fidelity: DeepReadonly<Fidelity>,
) {
  return sampledPath(from, to, read, undefined, undefined, undefined, numericalTolerance(fidelity));
}
export function numericalWidth(width: number, fidelity: DeepReadonly<Fidelity>, initial = false): number {
  return dailyPolicy(fidelity) ? Math.min(DAY, initial ? Math.max(DAY / 4, width) : width) : width;
}
