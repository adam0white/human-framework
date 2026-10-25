/** Finite native agency Selin→Voice map. The source checkpoint remains unchanged.
 * Office work and the shared fictional spring calendar have explicit reverse meanings.
 * Agency encounters stay in the source archive; no placement, care or mutual trust is inferred.
 */
import { DEFAULT_NORMS, ENGINE_VERSION, validateCalendarPersona } from '@adam0white/human-framework';
import { canonicalPersona, type PersonaEnvelope } from '@adam0white/lab-client';
import { requireValue } from './require-value.ts';

export function goodhandsSelinPassport(parent: PersonaEnvelope) {
  const fail = (): never => {
    throw new Error('Unsupported native Good Hands Selin checkpoint, encounter or calendar meaning.');
  };
  const portable = validateCalendarPersona(parent.transfer.agencyPerson);
  const p = portable.person;
  const receipt = parent.transfer.checkpoint as Record<string, unknown> | undefined;
  const guest = parent.transfer.guestMetadata as Record<string, unknown> | undefined;
  const calendar = guest?.calendar as Record<string, unknown> | undefined;
  const host = calendar?.calendarHost as Record<string, unknown> | undefined;
  if (
    p.mappingVersion !== 'goodhands-agency-calendar/1' ||
    p.source.id !== 'selin-voice' ||
    (p.source.engine !== '2.17.0' && p.source.engine !== ENGINE_VERSION) ||
    p.name !== 'Selin' ||
    p.life.sex !== 'female' ||
    portable.calendar.offset !== 0 ||
    !receipt ||
    Object.keys(receipt).sort().join(',') !== 'checkpointDigest,sourceNow,sourceRng,sourceSchema' ||
    receipt.sourceSchema !== p.source.schema ||
    receipt.sourceNow !== p.source.now ||
    canonicalPersona(receipt.sourceRng) !== canonicalPersona(p.rng) ||
    typeof receipt.checkpointDigest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(receipt.checkpointDigest) ||
    guest?.id !== 'selin-voice' ||
    guest.arm !== 'continuing' ||
    guest.status !== 'complete' ||
    !host ||
    Object.keys(host).sort().join(',') !==
      'originSourceNow,ramadanDays,ramadanFirstDay,sourceDayOffset,version' ||
    host.version !== 'voice-spring/1' ||
    host.ramadanFirstDay !== 1 ||
    host.ramadanDays !== 30 ||
    !Number.isSafeInteger(host.originSourceNow) ||
    Number(host.originSourceNow) < 0 ||
    Number(host.originSourceNow) > p.source.now ||
    host.sourceDayOffset !== Math.floor(Number(host.originSourceNow) / 1440) - 1 ||
    !Number.isSafeInteger(guest.arrival) ||
    Number(guest.arrival) < Number(host.originSourceNow) ||
    Number(guest.arrival) > p.source.now ||
    typeof calendar?.sourceRevision !== 'string' ||
    !/^[a-f0-9]{64}$/.test(calendar.sourceRevision) ||
    typeof calendar.sourceCheckpointDigest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(calendar.sourceCheckpointDigest)
  )
    fail();
  const action = (id: string) => {
    if (!['voice-office-work', 'eat', 'drink', 'tea', 'pray', 'pray-qada', 'pray-eid'].includes(id)) fail();
    return id === 'voice-office-work' ? 'work' : id;
  };
  const entity = (id: string) => {
    if (!['self', 'god', 'selin-voice'].includes(id) && !DEFAULT_NORMS.some((n) => n.id === id)) fail();
    return id === 'selin-voice' ? 'self' : id;
  };
  for (const c of portable.calendar.commitments) {
    if (
      c.kind === 'promise' ||
      c.kind === 'duty' ||
      (c.kind === 'job' &&
        (c.actions.join(',') !== 'voice-office-work' ||
          c.chain !== 'voice-office' ||
          c.until - c.from !== 540 ||
          c.from % 1440 !== 540 ||
          c.until % 1440 !== 1080))
    )
      fail();
    c.actions = c.actions.map(action);
    if (c.violatedBy) c.violatedBy = c.violatedBy.map(action);
    if (c.toId) c.toId = entity(c.toId);
    if (c.targetId) c.targetId = entity(c.targetId);
    if (c.chain) {
      if (c.chain !== 'voice-office' && !c.chain.startsWith('sawm:') && !c.chain.startsWith('salah:')) fail();
      if (c.chain === 'voice-office') c.chain = 'job';
    }
  }
  for (const d of portable.calendar.owed) {
    if (!['abstain', 'worship'].includes(d.kind)) fail();
    d.actions = d.actions.map(action);
    if (d.violatedBy) d.violatedBy = d.violatedBy.map(action);
  }
  portable.person.episodes = [];
  portable.person.limitations.push(
    'Agency episodes remain source-local; no placement or care success is inferred.',
  );
  return {
    portable,
    checkpoint: {
      schema: requireValue(receipt).sourceSchema,
      sourceMinute: requireValue(receipt).sourceNow,
      rng: requireValue(receipt).sourceRng,
      sha256: requireValue(receipt).checkpointDigest,
    },
  };
}
