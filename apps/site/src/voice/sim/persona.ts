/** Voice4 portable departures use the public run archive. Earlier Selin calendar files are refused. */
import type { LifePreparation, PersonaEnvelope } from '@adam0white/lab-client';
import type { VoicePerson } from './hf4-model.ts';
export const SELIN_CAST = 'hf.cast.selin.voice';
export interface OneCastRow {
  v: 1;
  probe: 'selin';
  arm: 'fresh' | 'biography' | 'continuing';
  scope: 'shared' | 'local' | 'file';
  castId: string;
  branchId: string;
  revision: string;
  parentRevision: string | null;
  stage: 'checkpoint' | 'admitted';
  outcome: string;
}
export interface SelinTransfer extends Record<string, unknown> {}
export interface SelinReturn {
  life?: LifePreparation;
  version: 1;
  prefix: string;
  initial: string;
  admission: PersonaEnvelope;
  rows: OneCastRow[];
  acceptedHead?: PersonaEnvelope;
}
export function selinCheckpoint(_person: VoicePerson, _opts: unknown): SelinTransfer {
  throw new Error(
    'Selin’s earlier enquiry cannot be carried into this month. Continue through the shared cast shelf and keep the original file.',
  );
}
export function returnedSelin(..._args: unknown[]): never {
  throw new Error(
    'This Selin return uses an older calendar mapping. Start a fresh game; keep the original file.',
  );
}
