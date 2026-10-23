/** Selin's bounded chapter projection. Source decisions finish normally; no running action or duty is erased. */
import {
  admitPersona,
  createAgenda,
  type Person,
  type PersonaProjection,
  type PersonaProjectionSnapshot,
  projectPersona,
  restore,
  snapshot,
} from '@adam0white/human-framework';
import type { PersonaEnvelope } from '@adam0white/lab-client';
import { createTown, TOWN_EID_DAY, type TownOptions, type TownState } from './town.ts';

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
export interface SelinTransfer extends Record<string, unknown> {
  person: PersonaProjectionSnapshot;
  history: { id: string; summary: string; at: number; sourceGame: string; sourceEpisodeId: string }[];
  targetOpening: number;
}
export interface SelinReturn {
  version: 1;
  /** Original host-local departure file; never stored on the shared shelf. */
  prefix: string;
  initial: string;
  admission: PersonaEnvelope;
  rows: OneCastRow[];
  acceptedHead?: PersonaEnvelope;
}

export function selinCheckpoint(p: Person): SelinTransfer {
  if (p.id !== 'selin' || p.now < (TOWN_EID_DAY + 1) * 1440 || p.now % 1440 < 18 * 60)
    throw new Error('Selin can make an enquiry after work, after Eid.');
  const targetOpening = p.now % 1440;
  const offset = targetOpening - p.now;
  const mapping: PersonaProjection = { version: 'voice-selin/1', skills: {}, commitments: {}, episodes: {} };
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending') continue;
    if (c.kind !== 'job' || c.actions.join(',') !== 'work' || c.normId || c.toId || c.targetId)
      throw new Error('Selin still has a duty this enquiry cannot carry.');
    mapping.commitments![c.id] = {
      id: 'voice-office-job',
      actions: ['voice-office-work'],
      from: c.from + offset,
      until: c.until + offset,
      ...(c.chain ? { chain: 'voice-office' } : {}),
    };
  }
  const attended = [...p.memory.episodes]
    .reverse()
    .find((e) => e.kind === 'outcome' && e.actorId === p.id && e.action === 'work' && e.at <= p.now);
  if (!attended) throw new Error('Selin has no attended office-work episode to carry yet.');
  mapping.episodes![attended.id] = {
    id: `voice-selin-${attended.id}`,
    action: 'voice-office-work',
    actorId: 'selin-voice',
    ...(attended.placeId ? { placeId: 'voice-office' } : {}),
    ...(attended.targetId ? { targetId: 'voice-office' } : {}),
    ...(attended.voiceId ? { voiceId: 'voice-source' } : {}),
    tags: ['work'],
  };
  const person = projectPersona(p, mapping);
  return {
    person,
    targetOpening,
    history: [
      {
        id: `voice-selin-${attended.id}`,
        summary: attended.summary,
        at: attended.at,
        sourceGame: 'voice',
        sourceEpisodeId: attended.id,
      },
    ],
  };
}

/** Called only while constructing a new return chapter from its original departure prefix. */
export function returnedSelin(envelope: PersonaEnvelope, opening: Person): Person {
  if (envelope.castId !== SELIN_CAST || envelope.castRevision !== '1' || envelope.source.game !== 'goodhands')
    throw new Error('This is not Selin returning from Good Hands.');
  const transfer = envelope.transfer as Partial<SelinTransfer>;
  if (!transfer.person || !Array.isArray(transfer.history) || transfer.history.length > 8)
    throw new Error('Selin has no supported enquiry answer.');
  const projected = transfer.person;
  if (projected.mappingVersion !== 'goodhands-selin/1' || projected.source.id !== 'selin-voice')
    throw new Error('Unsupported Selin return mapping.');
  const target = restore(snapshot(opening));
  if (
    target.agenda.commitments.some(
      (c) => c.status === 'pending' && (c.kind !== 'job' || c.actions.join(',') !== 'work'),
    ) ||
    target.agenda.goals.some((g) => g.status === 'active')
  )
    throw new Error('The source chapter still has an unsupported duty or project.');
  // This is a detached new chapter opening. Its office role comes once from the portable actual duty;
  // the original role/history remains in the pinned prefix, with no fictional employment waiver.
  target.agenda = createAgenda({}, target.now);
  // The chapter has passed while Selin was away; keep her age rather than resetting it to the original opening.
  target.life.bornAt = projected.life.bornAt + target.now - projected.source.now;
  const { person } = admitPersona(projected, target, {
    mappingVersion: 'goodhands-selin/1',
    sourceId: 'selin-voice',
    targetId: 'selin',
  });
  return person;
}

/** A fresh answer gets one new delivery marker; its original source world remains unchanged. */
export function selinReturnTown(people: Person[], options: TownOptions, source: TownState, answer: string) {
  const state = structuredClone(source);
  delete state.selinEnquirySaidAt;
  return createTown(people, { ...options, seed: 0, state, selinEnquiryAnswer: answer });
}

/** The agency answer is Nermin speaking to Selin, not Selin speaking to the agency. */
export function selinEnquiryAnswer(person: Person): string {
  const answer = person.memory.episodes.find(
    (episode) =>
      episode.action === 'selin-enquiry' &&
      episode.actorId === 'nermin-goodhands' &&
      episode.targetId === 'selin',
  );
  if (!answer) throw new Error('No attended agency answer in returned Selin.');
  return answer.summary;
}
