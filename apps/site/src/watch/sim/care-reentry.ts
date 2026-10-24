/** Finite re-entry of this host's own prepared Kian/Ada visit. It restores bounded
 * dependent reservoirs and the existing promise; it models no travel, healing or new ward.
 * The source watch-warren-ada/1 contract only publishes clinically healthy Ada.
 */
import { type Commitment, type Person, validateCalendarPersona } from '@adam0white/human-framework';
import type { PersonaEnvelope } from '@adam0white/lab-client';
import type { refugeVisitPassport } from './refuge-visit.ts';
import type { WatchState } from './state.ts';

type Care = NonNullable<ReturnType<typeof refugeVisitPassport>>;
type Portable = ReturnType<typeof validateCalendarPersona>;
export function watchCareReentry(parent: PersonaEnvelope, portable: Portable): Care | undefined {
  if (parent.transfer.watchCare === undefined) return undefined;
  if (
    parent.castId !== 'hf.cast.kian.watch' ||
    parent.source.game !== 'watch' ||
    parent.source.engine !== '2.17.0' ||
    parent.source.rules !== 'cast-1' ||
    parent.transfer.castPassport !== 'site-cast/1' ||
    parent.transfer.sourceRole !== 'kian' ||
    parent.transfer.siteNativeClaim !== undefined ||
    portable.person.source.id !== 'kian'
  )
    throw new Error('Unsupported own-Watch Ada care source.');
  const x = parent.transfer.watchCare as Care;
  const a = x?.agreement,
    d = x?.dependent,
    c = x?.care;
  const keys = (v: object, expected: string[]) =>
    Object.keys(v).sort().join(',') === expected.sort().join(',');
  const integer = Number.isSafeInteger;
  const captured = portable.person.source.now;
  if (
    !x ||
    !a ||
    !d ||
    !c ||
    JSON.stringify(x).length > 16384 ||
    !keys(x, ['agreement', 'care', 'dependent']) ||
    !keys(a, [
      'version',
      'guardian',
      'dependent',
      'sourceMinute',
      'returnBy',
      'kianAssented',
      'adaAssented',
      'commitmentId',
      'returnCommitmentId',
      'careCompletedAt',
      'status',
    ]) ||
    !keys(c, ['commitment', 'completedAt']) ||
    !keys(d, [
      'id',
      'guardian',
      'sourceMinute',
      'ageMinutes',
      'alive',
      'satiety',
      'hydration',
      'sleepPressure',
    ]) ||
    a.version !== 'watch-warren-ada/1' ||
    a.guardian !== 'kian' ||
    a.dependent !== 'ada' ||
    a.status !== 'agreed' ||
    a.kianAssented !== true ||
    a.adaAssented !== true ||
    !integer(a.sourceMinute) ||
    !integer(a.returnBy) ||
    a.returnBy - a.sourceMinute !== 1440 ||
    captured < a.sourceMinute ||
    captured >= a.returnBy ||
    typeof a.commitmentId !== 'string' ||
    !a.commitmentId.length ||
    a.commitmentId.length > 256 ||
    typeof a.returnCommitmentId !== 'string' ||
    !a.returnCommitmentId.length ||
    a.returnCommitmentId.length > 256 ||
    a.commitmentId === a.returnCommitmentId
  )
    throw new Error('Unsupported finite Ada care agreement.');
  const exact = (v: Commitment | undefined, id: string, action: string, status: string) =>
    v?.id === id &&
    v.kind === 'duty' &&
    v.toId === 'ada' &&
    v.targetId === 'ada' &&
    v.actions.join(',') === action &&
    v.status === status &&
    v.from === a.sourceMinute &&
    v.until === a.returnBy &&
    v.recurUntil === undefined &&
    !v.chain &&
    !v.exempt &&
    !v.violatedBy?.length;
  if (
    !c.commitment ||
    !keys(c.commitment, [
      'kind',
      'toId',
      'targetId',
      'actions',
      'from',
      'until',
      'importance',
      'label',
      'id',
      'status',
    ]) ||
    !Number.isFinite(c.commitment.importance) ||
    c.commitment.importance < 0 ||
    c.commitment.importance > 1 ||
    typeof c.commitment.label !== 'string' ||
    c.commitment.label.length > 1000 ||
    !exact(c.commitment, a.commitmentId, 'care-ada', 'kept') ||
    !integer(c.completedAt) ||
    c.completedAt !== a.careCompletedAt ||
    c.completedAt < a.sourceMinute ||
    c.completedAt > captured ||
    !exact(
      portable.calendar.commitments.find((v) => v.id === a.returnCommitmentId),
      a.returnCommitmentId,
      'return-with-ada',
      'pending',
    ) ||
    portable.calendar.commitments.some((v) => v.id !== a.returnCommitmentId && v.kind !== 'worship') ||
    portable.calendar.owed.length ||
    portable.calendar.lapse
  )
    throw new Error('Unsupported Ada care or unrelated home duty.');
  if (
    d.id !== 'ada' ||
    d.guardian !== 'kian' ||
    d.alive !== true ||
    !integer(d.sourceMinute) ||
    d.sourceMinute < a.sourceMinute ||
    d.sourceMinute > captured ||
    captured - d.sourceMinute > 1 ||
    d.sourceMinute >= a.returnBy ||
    !integer(d.ageMinutes) ||
    d.ageMinutes < 8 * 525600 ||
    d.ageMinutes >= 9 * 525600 ||
    [d.satiety, d.hydration, d.sleepPressure].some((v) => !Number.isFinite(v) || v < 0 || v > 1)
  )
    throw new Error('Unsupported actual Ada guardian or reservoirs.');
  return structuredClone(x);
}

export function assertWatchCareTarget(ada: Person | undefined): asserts ada is Person {
  if (
    !ada?.body.alive ||
    ada.id !== 'ada' ||
    ada.body.health !== 1 ||
    ada.body.injuries.length ||
    ada.body.illnesses.length ||
    !ada.social.relationships.some((r) => r.otherId === 'kian' && r.roles.includes('guardian'))
  )
    throw new Error('The authored Ada guardian/health arrangement differs.');
}

export function shiftedKeptMeal(care: Care, offset: number): Commitment {
  return {
    ...structuredClone(care.care.commitment),
    from: care.care.commitment.from + offset,
    until: care.care.commitment.until + offset,
  };
}

/** Called once after all founding people arrive, using the already pinned Kian. */
export function restoreWatchCare(s: WatchState, parent: PersonaEnvelope): void {
  const portable = validateCalendarPersona(parent.transfer.person);
  const care = watchCareReentry(parent, portable);
  if (!care) return;
  const kian = s.community.people.find((p) => p.id === 'kian');
  const ada = s.community.people.find((p) => p.id === 'ada');
  assertWatchCareTarget(ada);
  if (!kian) throw new Error('Missing preflighted Kian.');
  const offset = kian.now - portable.person.source.now;
  const a = care.agreement,
    d = care.dependent;
  s.refugeVisit = {
    ...structuredClone(a),
    sourceMinute: a.sourceMinute + offset,
    returnBy: a.returnBy + offset,
    careCompletedAt: care.care.completedAt + offset,
  };
  ada.now = d.sourceMinute + offset;
  ada.life.bornAt = ada.now - d.ageMinutes;
  ada.body.satiety = d.satiety;
  ada.body.hydration = d.hydration;
  ada.body.sleepPressure = d.sleepPressure;
}
