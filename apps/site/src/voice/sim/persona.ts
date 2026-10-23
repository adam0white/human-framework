/** Selin's bounded chapter projection. Source decisions finish normally; no running action or duty is erased. */
import {
  admitCalendarPersona,
  type CalendarPersonaProjection,
  type CalendarPersonaSnapshot,
  calendarRetimer,
  createAgenda,
  DEFAULT_NORMS,
  isContinuingCommitment,
  type Person,
  projectCalendarPersona,
  restore,
  retimeCommitments,
  snapshot,
  validateCalendarPersona,
} from '@adam0white/human-framework';
import type { PersonaEnvelope } from '@adam0white/lab-client';
import { createTown, TOWN_DEFAULTS, type TownOptions, type TownState, townCalendar } from './town.ts';

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
  person: CalendarPersonaSnapshot;
  history: { id: string; summary: string; at: number; sourceGame: string; sourceEpisodeId: string }[];
  targetOpening: number;
  calendarHost: SelinCalendarHost;
}
export interface SelinCalendarHost {
  version: 'voice-spring/1';
  originSourceNow: number;
  sourceDayOffset: number;
  ramadanFirstDay: number;
  ramadanDays: number;
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

export function selinCheckpoint(p: Person, options: TownOptions = {}): SelinTransfer {
  if (p.id !== 'selin' || p.now % 1440 < 18 * 60) throw new Error('Selin can make an enquiry after work.');
  const targetOpening = (p.now % 1440) + 1440;
  const offset = targetOpening - p.now;
  const references: CalendarPersonaProjection['calendar']['references'] = {
    commitments: {},
    chains: {},
    actions: {},
    entities: {},
    norms: Object.fromEntries(DEFAULT_NORMS.map((n) => [n.id, n.id])),
  };
  const action = (id: string) => {
    if (id === 'work') return 'voice-office-work';
    if (['eat', 'drink', 'tea', 'pray', 'pray-qada', 'pray-eid'].includes(id)) return id;
    throw new Error(`This enquiry does not support Selin's ${id} action.`);
  };
  const entity = (id: string) => {
    if (id === 'selin') return 'selin-voice';
    if (id === 'self' || id === 'god' || DEFAULT_NORMS.some((n) => n.id === id)) return id;
    throw new Error(`This enquiry does not support Selin's ${id} relationship duty.`);
  };
  const debts = p.agenda.owed ?? [];
  const retained = p.agenda.commitments.filter(
    (c) =>
      isContinuingCommitment(p.agenda, c) || debts.some((d) => d.ofId === c.id || d.scheduledAs === c.id),
  );
  const bindId = (id: string) => {
    references.commitments[id] = `voice-selin:${id}`;
  };
  for (const c of retained) {
    if ((c.kind === 'job' && c.actions.join(',') !== 'work') || c.kind === 'promise' || c.kind === 'duty')
      throw new Error('Selin has an unsupported role commitment.');
    bindId(c.id);
    if (c.makeUpOf) bindId(c.makeUpOf);
    for (const id of [...c.actions, ...(c.violatedBy ?? [])]) references.actions[id] = action(id);
    for (const id of [c.toId, c.targetId]) if (id !== undefined) references.entities[id] = entity(id);
    if (c.chain) {
      if (c.chain !== 'job' && !c.chain.startsWith('sawm:') && !c.chain.startsWith('salah:'))
        throw new Error('Unsupported Selin calendar chain.');
      references.chains[c.chain] = c.chain === 'job' ? 'voice-office' : c.chain;
    }
  }
  for (const owed of debts) {
    if (!['worship', 'abstain'].includes(owed.kind)) throw new Error('Unsupported Selin make-up kind.');
    bindId(owed.ofId);
    if (owed.scheduledAs) bindId(owed.scheduledAs);
    for (const id of [...owed.actions, ...(owed.violatedBy ?? [])]) references.actions[id] = action(id);
  }
  const mapping: CalendarPersonaProjection = {
    version: 'voice-selin-calendar/1',
    skills: {},
    episodes: {},
    calendar: { version: 'hf-persona-calendar-map/1', offset, references, sourceNorms: DEFAULT_NORMS },
  };
  const attended = [...p.memory.episodes]
    .reverse()
    .find((e) => e.kind === 'outcome' && e.actorId === p.id && e.action === 'work' && e.at <= p.now);
  if (!attended) throw new Error('Selin has no attended office-work episode to carry yet.');
  const episode = {
    id: `voice-selin-${attended.id}`,
    action: 'voice-office-work',
    actorId: 'selin-voice',
    ...(attended.placeId ? { placeId: 'voice-office' } : {}),
    ...(attended.targetId ? { targetId: 'voice-office' } : {}),
    ...(attended.voiceId ? { voiceId: 'voice-source' } : {}),
    tags: ['work'],
  };
  mapping.episodes = { [attended.id]: episode };
  const person = projectCalendarPersona(p, mapping);
  return {
    person,
    targetOpening,
    calendarHost: {
      version: 'voice-spring/1',
      originSourceNow: p.now,
      sourceDayOffset: Math.floor(p.now / 1440) - Math.floor(targetOpening / 1440),
      ramadanFirstDay: options.ramadanFirstDay ?? TOWN_DEFAULTS.ramadanFirstDay,
      ramadanDays: options.ramadanDays ?? TOWN_DEFAULTS.ramadanDays,
    },
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
export function returnedSelin(
  envelope: PersonaEnvelope,
  opening: Person,
  departure: PersonaEnvelope,
  options: TownOptions = {},
): Person {
  if (envelope.castId !== SELIN_CAST || envelope.castRevision !== '1' || envelope.source.game !== 'goodhands')
    throw new Error('This is not Selin returning from Good Hands.');
  const transfer = envelope.transfer as Partial<SelinTransfer>;
  if (!transfer.person || !Array.isArray(transfer.history) || transfer.history.length > 8)
    throw new Error('Selin has no supported enquiry answer.');
  const original = departure.transfer as Partial<SelinTransfer> & {
    checkpoint?: {
      sourceSchema?: unknown;
      sourceNow?: unknown;
      sourceRng?: unknown;
      checkpointDigest?: unknown;
    };
  };
  const digest = original.checkpoint?.checkpointDigest;
  if (
    departure.castId !== SELIN_CAST ||
    departure.castRevision !== '1' ||
    departure.source.game !== 'voice' ||
    departure.source.rules !== 'voice-4' ||
    departure.branchId !== envelope.branchId ||
    transfer.sourceRevision !== departure.revision ||
    typeof digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(digest) ||
    transfer.sourceCheckpointDigest !== digest ||
    original.checkpoint?.sourceSchema !== opening.schema ||
    original.checkpoint.sourceNow !== opening.now ||
    JSON.stringify(original.checkpoint.sourceRng) !== JSON.stringify(opening.rng)
  )
    throw new Error('Selin return does not match the pinned source checkpoint.');
  const projected = validateCalendarPersona(transfer.person);
  if (
    projected.person.mappingVersion !== 'goodhands-selin-calendar/1' ||
    projected.person.source.id !== 'selin-voice'
  )
    throw new Error('Unsupported Selin return mapping.');
  const calendarHost = transfer.calendarHost;
  if (
    calendarHost?.version !== 'voice-spring/1' ||
    !Number.isFinite(calendarHost.originSourceNow) ||
    !Number.isInteger(calendarHost.sourceDayOffset) ||
    calendarHost.sourceDayOffset !== Math.floor(calendarHost.originSourceNow / 1440) - 1 ||
    !Number.isInteger(calendarHost.ramadanFirstDay) ||
    !Number.isInteger(calendarHost.ramadanDays) ||
    calendarHost.ramadanFirstDay !== (options.ramadanFirstDay ?? TOWN_DEFAULTS.ramadanFirstDay) ||
    calendarHost.ramadanDays !== (options.ramadanDays ?? TOWN_DEFAULTS.ramadanDays) ||
    calendarHost.ramadanDays < 1 ||
    calendarHost.ramadanDays > 30 ||
    Object.keys(calendarHost).sort().join(',') !==
      'originSourceNow,ramadanDays,ramadanFirstDay,sourceDayOffset,version' ||
    opening.now !== calendarHost.originSourceNow ||
    transfer.targetOpening !== opening.now
  )
    throw new Error('Unsupported Selin return calendar.');
  for (const key of [
    'version',
    'originSourceNow',
    'sourceDayOffset',
    'ramadanFirstDay',
    'ramadanDays',
  ] as const)
    if (original.calendarHost?.[key] !== calendarHost[key])
      throw new Error('Selin return changed the pinned source calendar.');
  const target = restore(snapshot(opening));
  if (target.agenda.goals.some((g) => g.status === 'active'))
    throw new Error('The source chapter still has an unsupported project.');
  // This detached opening takes its complete quiet calendar from the returned projection.
  // The original obligations stay in the pinned source prefix; no debt is retired or waived here.
  target.agenda = createAgenda({}, target.now);
  target.life.bornAt = projected.person.life.bornAt + target.now - projected.person.source.now;
  const { person } = admitCalendarPersona(projected, target, {
    mappingVersion: 'goodhands-selin-calendar/1',
    sourceId: 'selin-voice',
    targetId: 'selin',
    targetNorms: DEFAULT_NORMS,
  });
  retimeSelinCalendar(person);
  return person;
}

/** Reapply this chapter's authored windows through HF's owning retimer; no commitment is settled. */
export function retimeSelinCalendar(person: Person): void {
  const calendar = calendarRetimer(townCalendar);
  retimeCommitments(person, person.now, (c) => {
    if (c.kind === 'job' && c.chain === 'job') {
      const day = Math.floor(c.from / 1440);
      return { from: day * 1440 + 540, until: day * 1440 + 1080 };
    }
    return calendar(c);
  });
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
