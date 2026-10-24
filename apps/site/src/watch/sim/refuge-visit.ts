/** One source-authored day visit. Ada remains Kian's ward; no guardian or home-threat
 * duty is substituted. This agreement does not claim travel or completed care. A host
 * must validate the complete Person plus exact finite agreement before accepting it.
 */
import { isContinuingCommitment, promise, releaseCommitment, selfReport } from '@adam0white/human-framework';
import type { WatchState } from './state.ts';
export interface RefugeVisit {
  version: 'watch-warren-ada/1';
  guardian: 'kian';
  dependent: 'ada';
  sourceMinute: number;
  returnBy: number;
  kianAssented: boolean;
  adaAssented: boolean;
  commitmentId: string;
  returnCommitmentId: string;
  careCompletedAt?: number;
  status: 'agreed' | 'declined' | 'staying';
}
function participants(s: WatchState) {
  return {
    kian: s.community.people.find((p) => p.id === 'kian'),
    ada: s.community.people.find((p) => p.id === 'ada'),
  };
}
function obstacle(s: WatchState): string | undefined {
  const { kian, ada } = participants(s);
  if (s.phase !== 'dawn' || !kian?.body.alive || !ada?.body.alive || s.cast.ada?.status !== 'here')
    return 'Discuss the visit together at a living, off-duty dawn.';
  if (!ada.social.relationships.some((r) => r.otherId === 'kian' && r.roles.includes('guardian')))
    return 'Ada’s actual guardian arrangement does not match this visit.';
  if (
    kian.agenda.commitments.some((c) => isContinuingCommitment(kian.agenda, c) && c.kind !== 'worship') ||
    (kian.agenda.owed?.length ?? 0) > 0 ||
    kian.agenda.lapse ||
    (s.homeThreat.west ?? -1e9) > s.minute - 90
  )
    return 'An existing home, care or work duty still needs Kian here. No visit replaces it.';
  if (kian.agenda.goals.some((g) => g.status === 'active') || kian.projects?.currentGoalId)
    return 'Finish the current project before discussing departure.';
  return undefined;
}
/** The dialogue observes actual fear/pain and the child's guardian tie. No RNG draw or forced assent. */
export function agreeRefugeVisit(s: WatchState): string {
  if (s.refugeVisit?.status === 'agreed')
    return 'Kian and Ada already have this bounded agreement. Keep it or choose to stay.';
  const blocked = obstacle(s);
  if (blocked) return blocked;
  const { kian, ada } = participants(s);
  const k = selfReport(kian!),
    a = selfReport(ada!);
  const kianAssented = k.fear < 0.5 && k.pain < 0.25;
  const adaAssented = a.fear < 0.4 && a.pain < 0.2 && !ada!.body.downed;
  const agreement: RefugeVisit = {
    version: 'watch-warren-ada/1',
    guardian: 'kian',
    dependent: 'ada',
    sourceMinute: s.minute,
    returnBy: s.minute + 1440,
    kianAssented,
    adaAssented,
    commitmentId: '',
    returnCommitmentId: '',
    status: kianAssented && adaAssented ? 'agreed' : 'declined',
  };
  if (agreement.status === 'agreed') {
    const c = promise(kian!, {
      kind: 'duty',
      toId: 'ada',
      targetId: 'ada',
      actions: ['care-ada'],
      from: s.minute,
      until: agreement.returnBy,
      importance: 0.8,
      label: 'Share a small meal and water with Ada, then rest together during the one-day refuge visit',
    });
    agreement.commitmentId = c.id;
    agreement.returnCommitmentId = promise(kian!, {
      kind: 'duty',
      toId: 'ada',
      targetId: 'ada',
      actions: ['return-with-ada'],
      from: s.minute,
      until: agreement.returnBy,
      importance: 0.9,
      label: 'Return together with Ada by the next dawn; remain her guardian throughout the visit',
    }).id;
  }
  s.refugeVisit = agreement;
  return agreement.status === 'agreed'
    ? 'Kian: “Only together, and back by the next dawn.” Ada: “I want to go with you. Stay with me.” They agree to a one-day refuge visit. Ada remains his ward. Save Kian at a quiet action boundary, or choose to stay. No journey or care is completed by this agreement.'
    : `Kian: “${kianAssented ? 'I could go, if Ada wants to.' : 'I need to stay today.'}” Ada: “${adaAssented ? 'Together, perhaps.' : 'I want to stay home today.'}” They stay. No care agreement is created.`;
}
export function stayRefugeVisit(s: WatchState): boolean {
  const visit = s.refugeVisit;
  if (!visit || visit.status !== 'agreed' || s.phase !== 'dawn') return false;
  const { kian } = participants(s);
  if (!kian) return false;
  releaseCommitment(kian, visit.commitmentId);
  releaseCommitment(kian, visit.returnCommitmentId);
  delete s.refugeDeparture;
  visit.status = 'staying';
  return true;
}
/** A bounded referenced dependent snapshot stays in source save/export, not the central shelf. */
export function refugeVisitPassport(s: WatchState) {
  const agreement = s.refugeVisit,
    { kian, ada } = participants(s);
  if (
    !agreement ||
    agreement.status !== 'agreed' ||
    !agreement.kianAssented ||
    !agreement.adaAssented ||
    s.phase !== 'dawn' ||
    !kian ||
    !ada?.body.alive ||
    s.minute >= agreement.returnBy
  )
    return undefined;
  const duty = kian.agenda.commitments.find((c) => c.id === agreement.commitmentId);
  if (
    !duty ||
    duty.status !== 'kept' ||
    !Number.isSafeInteger(agreement.careCompletedAt) ||
    duty.toId !== 'ada' ||
    duty.targetId !== 'ada' ||
    duty.until !== agreement.returnBy ||
    duty.actions.join(',') !== 'care-ada'
  )
    return undefined;
  if (
    kian.agenda.commitments.some(
      (c) =>
        c.id !== duty.id &&
        c.id !== agreement.returnCommitmentId &&
        isContinuingCommitment(kian.agenda, c) &&
        c.kind !== 'worship',
    ) ||
    (s.homeThreat.west ?? -1e9) > s.minute - 90
  )
    return undefined;
  const returning = kian.agenda.commitments.find((c) => c.id === agreement.returnCommitmentId);
  if (
    !returning ||
    returning.status !== 'pending' ||
    returning.toId !== 'ada' ||
    returning.targetId !== 'ada' ||
    returning.until !== agreement.returnBy ||
    returning.actions.join(',') !== 'return-with-ada'
  )
    return undefined;
  if (
    !ada.body.alive ||
    ada.body.health !== 1 ||
    ada.body.injuries.length ||
    ada.body.illnesses.length ||
    ada.activity?.action === 'flee'
  )
    return undefined;
  return {
    agreement: structuredClone(agreement),
    care: { commitment: structuredClone(duty), completedAt: agreement.careCompletedAt! },
    dependent: {
      id: 'ada' as const,
      guardian: 'kian' as const,
      sourceMinute: ada.now,
      ageMinutes: ada.now - ada.life.bornAt,
      alive: true as const,
      satiety: ada.body.satiety,
      hydration: ada.body.hydration,
      sleepPressure: ada.body.sleepPressure,
    },
  };
}

/** Actual completed daylight care: a small meal/water allocation and a quiet rest together. */
export function completedAdaCare(s: WatchState, at: number): boolean {
  const { ada } = participants(s);
  if (
    !s.refugeVisit ||
    s.refugeVisit.status !== 'agreed' ||
    !ada?.body.alive ||
    s.grain < 0.1 ||
    (s.homeThreat.west ?? -1e9) > at - 90
  )
    return false;
  s.grain -= 0.1;
  s.refugeVisit.careCompletedAt = at;
  ada.body.satiety = Math.min(1, ada.body.satiety + 0.35);
  ada.body.hydration = Math.min(1, ada.body.hydration + 0.35);
  ada.body.sleepPressure = Math.max(0, ada.body.sleepPressure - 0.05);
  return true;
}
