/** Finite re-entry of this host's own prepared Kian/Ada visit. It restores bounded
 * dependent reservoirs and the existing promise; it models no travel, healing or new ward.
 * The source watch-warren-ada/1 contract only publishes clinically healthy Ada.
 */
import {
  type Commitment,
  ENGINE_VERSION,
  type Person,
  validateCalendarPersona,
} from '@adam0white/human-framework';
import { canonicalPersona, type PersonaEnvelope } from '@adam0white/lab-client';
import { nativeCastSource } from '../../shared/cast-native-sources.ts';
import { requireValue } from '../../shared/require-value.ts';
import type { refugeVisitPassport } from './refuge-visit.ts';
import type { WatchState } from './state.ts';

type Care = NonNullable<ReturnType<typeof refugeVisitPassport>>;
type Portable = ReturnType<typeof validateCalendarPersona>;
export function watchCareReentry(parent: PersonaEnvelope, portable: Portable): Care | undefined {
  if (parent.transfer.watchCare === undefined) return undefined;
  if (
    parent.castId !== 'hf.cast.kian.watch' ||
    parent.source.game !== 'watch' ||
    (parent.source.engine !== '2.17.0' && parent.source.engine !== ENGINE_VERSION) ||
    parent.source.rules !== 'cast-1' ||
    parent.transfer.castPassport !== 'site-cast/1' ||
    parent.transfer.sourceRole !== 'kian' ||
    parent.transfer.siteNativeClaim !== undefined ||
    portable.person.source.id !== 'kian'
  )
    throw new Error('Unsupported own-Watch Ada care source.');
  return validateCare(parent.transfer.watchCare as Care, portable, portable.person.source.now, 1);
}

function validateCare(x: Care, portable: Portable, captured: number, maximumLag: number): Care {
  const a = x?.agreement,
    d = x?.dependent,
    c = x?.care;
  const keys = (v: object, expected: string[]) =>
    Object.keys(v).sort().join(',') === expected.sort().join(',');
  const integer = Number.isSafeInteger;
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
    captured - d.sourceMinute > maximumLag ||
    d.sourceMinute >= a.returnBy ||
    !integer(d.ageMinutes) ||
    d.ageMinutes < 8 * 525600 ||
    d.ageMinutes >= 9 * 525600 ||
    [d.satiety, d.hydration, d.sleepPressure].some((v) => !Number.isFinite(v) || v < 0 || v > 1)
  )
    throw new Error('Unsupported actual Ada guardian or reservoirs.');
  return structuredClone(x);
}

/** Exact native Warren return. The original meal is provenance, not a second outcome. */
export interface WarrenCareReturn {
  version: 'warren-watch-ada/1';
  capturedMinute: number;
  visit: {
    source: Care;
    offset: number;
    agreement: Care['agreement'];
    care: Care['care'];
    returnBy: number;
    dependent: Care['dependent'];
    careCount: number;
    endRequested?: boolean;
    endedAt?: number;
    protection?: 'protected' | 'exposed';
  };
}
export function warrenCareReentry(parent: PersonaEnvelope, portable: Portable): Care | undefined {
  if (parent.transfer.warrenCare === undefined) return undefined;
  if (
    parent.castId !== 'hf.cast.kian.watch' ||
    nativeCastSource('watch', parent)?.mapping !== 'warren-calendar/1' ||
    parent.transfer.castPassport !== 'warren-calendar/1' ||
    parent.transfer.sourceRole !== 'kian' ||
    portable.person.source.id !== 'kian' ||
    parent.transfer.watchCare !== undefined
  )
    throw new Error('Unsupported native Warren Ada care source.');
  const x = parent.transfer.warrenCare as unknown as WarrenCareReturn;
  const v = x?.visit,
    captured = portable.person.source.now;
  const only = (value: object, names: string[]) => Object.keys(value).every((k) => names.includes(k));
  if (
    !x ||
    !v ||
    JSON.stringify(x).length > 32768 ||
    !only(x, ['version', 'capturedMinute', 'visit']) ||
    !only(v, [
      'source',
      'offset',
      'agreement',
      'care',
      'returnBy',
      'dependent',
      'careCount',
      'endRequested',
      'endedAt',
      'protection',
    ]) ||
    x.version !== 'warren-watch-ada/1' ||
    x.capturedMinute !== captured ||
    !Number.isSafeInteger(v.offset) ||
    !Number.isSafeInteger(v.endedAt) ||
    requireValue(v.endedAt) > captured ||
    v.endRequested !== true ||
    (v.protection !== undefined && !['protected', 'exposed'].includes(v.protection)) ||
    !Number.isSafeInteger(v.careCount) ||
    v.careCount < 0 ||
    v.careCount > 48
  )
    throw new Error('Unsupported actual Warren care/end record.');
  const current = validateCare(
    { agreement: v.agreement, care: v.care, dependent: v.dependent },
    portable,
    captured,
    1440,
  );
  const originalPortable = structuredClone(portable);
  for (const c of originalPortable.calendar.commitments) {
    c.from -= v.offset;
    c.until -= v.offset;
  }
  const source = validateCare(v.source, originalPortable, v.source.care.completedAt, 1);
  const shiftedAgreement = {
    ...source.agreement,
    sourceMinute: source.agreement.sourceMinute + v.offset,
    returnBy: source.agreement.returnBy + v.offset,
    careCompletedAt: source.care.completedAt + v.offset,
  };
  const shiftedCare = {
    commitment: shiftedKeptMeal(source, v.offset),
    completedAt: source.care.completedAt + v.offset,
  };
  if (
    canonicalPersona(v.agreement) !== canonicalPersona(shiftedAgreement) ||
    canonicalPersona(v.care) !== canonicalPersona(shiftedCare) ||
    v.returnBy !== shiftedAgreement.returnBy ||
    requireValue(v.endedAt) < v.care.completedAt ||
    v.dependent.sourceMinute < source.dependent.sourceMinute + v.offset ||
    v.dependent.sourceMinute > requireValue(v.endedAt) ||
    v.dependent.ageMinutes !== source.dependent.ageMinutes ||
    Math.abs(v.dependent.satiety - Math.min(1, source.dependent.satiety + 0.35 * v.careCount)) > 1e-12 ||
    Math.abs(v.dependent.hydration - Math.min(1, source.dependent.hydration + 0.35 * v.careCount)) > 1e-12 ||
    Math.abs(v.dependent.sleepPressure - Math.max(0, source.dependent.sleepPressure - 0.05 * v.careCount)) >
      1e-12
  )
    throw new Error('Warren care provenance or actual bounded outcome differs.');
  return current;
}
export function carriedCare(parent: PersonaEnvelope, portable: Portable): Care | undefined {
  return warrenCareReentry(parent, portable) ?? watchCareReentry(parent, portable);
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
  const care = carriedCare(parent, portable);
  if (!care) return;
  const kian = s.community.people.find((p) => p.id === 'kian');
  const ada = s.community.people.find((p) => p.id === 'ada');
  assertWatchCareTarget(ada);
  if (!kian) throw new Error('Missing preflighted Kian.');
  const offset = kian.now - portable.person.source.now;
  const a = care.agreement,
    d = care.dependent;
  if (parent.transfer.warrenCare)
    s.warrenCareReturn = {
      source: structuredClone(parent.transfer.warrenCare) as unknown as WarrenCareReturn,
      onwardOffset: offset,
    };
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
