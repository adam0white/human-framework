/** Older finite care passports cannot manufacture a supported HF4 care continuation.
 * Current Watch duties remain in its one public run and in its complete source archive.
 */
import type { PersonaEnvelope } from '@adam0white/lab-client';
import type { Person } from './actor.ts';
import type { refugeVisitPassport } from './refuge-visit.ts';
import type { WatchState } from './state.ts';

type Care = NonNullable<ReturnType<typeof refugeVisitPassport>>;
export interface WarrenCareReturn {
  version: string;
  visit: unknown;
  [key: string]: unknown;
}
const refusal =
  'This saved care arrangement has no supported HF4 reader. Keep Kian and Ada in their source chapter.';
export function watchCareReentry(parent: PersonaEnvelope, _portable: unknown): Care | undefined {
  if (parent.transfer.watchCare !== undefined) throw new Error(refusal);
  return undefined;
}
export function warrenCareReentry(parent: PersonaEnvelope, _portable: unknown): Care | undefined {
  if (parent.transfer.warrenCare !== undefined) throw new Error(refusal);
  return undefined;
}
export function carriedCare(parent: PersonaEnvelope, portable: unknown): Care | undefined {
  return watchCareReentry(parent, portable) ?? warrenCareReentry(parent, portable);
}
export function assertWatchCareTarget(ada: Person | undefined): asserts ada is Person {
  if (ada?.id !== 'ada' || !ada.body.alive) throw new Error('Ada is not here for the care agreement.');
}
export function shiftedKeptMeal(_care: Care, _offset: number): never {
  throw new Error(refusal);
}
export function restoreWatchCare(_s: WatchState, parent: PersonaEnvelope): void {
  if (parent.transfer.watchCare !== undefined || parent.transfer.warrenCare !== undefined)
    throw new Error(refusal);
}
