/**
 * Headless control for the 2.8.0 game requests: going along with a partner, fullness, and a voice's own promise.
 * Run: node packages/human/examples/game-requests-control.ts
 *
 * 1. Partner leaving. A person rests (15 minutes) beside a close partner. Five minutes in, the partner sets off and
 *    the host forces a review. Arms: N (nothing new), C (`reconsider` only), T (`alongside` only), CT (both). Each
 *    arm runs 12 seeds and counts who goes on. Expected: only CT goes on. Without `alongside` the rest still ranks
 *    first on the merits; without `reconsider` the running rest keeps its inertia bonus.
 * 2. Fullness. A person with nothing to do and full water and food spends 8 hours choosing among short `sip` and
 *    `tidy` offers (4 minutes, advertising water or relief) and a longer `sit` (20 minutes). Arms: off and on
 *    (`enableFullness`). The control counts sips. Expected: on drinks far less, and idle time falls to sitting.
 * 3. A voice's promise. Two people start at trust 0.5 in voice `v`. One hears five kept promises, the other one
 *    broken promise. The control prints both trajectories (kept gains shrink; one broken costs more than one kept).
 *
 * Labels are neutral. Every number is an engineering premise, not an estimate of people.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  enableFullness,
  FRAMEWORK_VERSION,
  finish,
  noteVoicePromise,
  type Person,
  seedVoice,
  voiceOf,
} from '../src/index.ts';

const DAY = 1440;
const PARTNER = 'partner';

function companion(seed: number): Person {
  return createPerson({
    id: 'a',
    name: 'A',
    seed,
    now: 8 * 60,
    bornAt: -30 * 365 * DAY,
    sex: 'female',
    relationships: [{ otherId: PARTNER, affection: 0.6, familiarity: 0.8, trust: 0.7 }],
  });
}

export type PartnerArm = 'N' | 'C' | 'T' | 'CT';

/** One partner-leaving trial: did the person go on with the partner? */
export function partnerTrial(arm: PartnerArm, seed: number): { goes: boolean; terms: string } {
  const p = companion(seed);
  const rest: Affordance = {
    id: 'rest',
    action: 'rest',
    label: 'rest',
    duration: 15,
    effort: 0.02,
    advertises: { rest: 0.12 },
  };
  const goOn: Affordance = {
    id: 'go-on',
    action: 'go-on',
    label: 'go on',
    duration: 30,
    effort: 0.25,
    advertises: { competence: 0.03 },
    ...(arm === 'T' || arm === 'CT' ? { alongside: [PARTNER] } : {}),
  };
  const first = decide(p, [rest], {});
  begin(p, rest, first);
  const r = decide(p, [rest, goOn], {
    now: p.now + 5,
    interrupt: 'partner:leaving',
    ...(arm === 'C' || arm === 'CT' ? { reconsider: true } : {}),
  });
  const go = r.considered.find((c) => c.affordanceId === 'go-on');
  return {
    goes: r.chosenAffordanceId === 'go-on',
    terms: go ? go.terms.map((t) => `${t.source}=${t.value}`).join(' ') : '',
  };
}

export function runPartnerControl(seeds = 12) {
  return (['N', 'C', 'T', 'CT'] as const).map((arm) => {
    let goes = 0;
    for (let s = 1; s <= seeds; s++) if (partnerTrial(arm, s).goes) goes += 1;
    return { arm, goes, of: seeds };
  });
}

/** Eight idle hours at full water: how many sips. */
export function runFullnessArm(on: boolean) {
  const p = createPerson({
    id: on ? 'on' : 'off',
    name: 'F',
    seed: 5,
    now: 8 * 60,
    bornAt: -30 * 365 * DAY,
    sex: 'male',
    body: { hydration: 1, satiety: 1 },
  });
  if (on) enableFullness(p);
  const offers: Affordance[] = [
    { id: 'sip', action: 'sip', label: 'sip', duration: 4, effort: 0.05, advertises: { water: 0.35 } },
    { id: 'tidy', action: 'tidy', label: 'tidy', duration: 4, effort: 0.05, advertises: { relief: 0.8 } },
    { id: 'sit', action: 'sit', label: 'sit', duration: 20, effort: 0.05, advertises: {} },
  ];
  const counts = { sip: 0, tidy: 0, sit: 0 };
  const end = p.now + 8 * 60;
  while (p.now < end) {
    const r = decide(p, offers, {});
    const a = offers.find((x) => x.id === r.chosenAffordanceId);
    if (!a) break;
    counts[a.id as keyof typeof counts] += 1;
    begin(p, a, r);
    finish(p, {
      affordanceId: a.id,
      action: a.action,
      status: 'completed',
      at: p.now + a.duration,
      needs: a.advertises,
    });
  }
  return { fullness: on, ...counts };
}

export function runPromiseControl() {
  const make = (id: string) => {
    const p = createPerson({ id, name: id, seed: 3, now: 0, bornAt: -30 * 365 * DAY, sex: 'female' });
    seedVoice(p, 'v', 0.5);
    return p;
  };
  const kept = make('kept');
  const keptPath = [0.5];
  for (let i = 1; i <= 5; i++) {
    noteVoicePromise(kept, 'v', { kept: true, at: i * 60, action: 'carry' });
    keptPath.push(Math.round((voiceOf(kept, 'v')?.trust ?? 0) * 1000) / 1000);
  }
  const broken = make('broken');
  noteVoicePromise(broken, 'v', { kept: false, at: 60, action: 'carry' });
  return {
    kept: keptPath,
    broken: [0.5, Math.round((voiceOf(broken, 'v')?.trust ?? 0) * 1000) / 1000],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`HF ${FRAMEWORK_VERSION} game-requests control`);
  for (const row of runPartnerControl()) console.log(JSON.stringify(row));
  console.log('go-on terms (CT, seed 1):', partnerTrial('CT', 1).terms);
  console.log(JSON.stringify(runFullnessArm(false)));
  console.log(JSON.stringify(runFullnessArm(true)));
  console.log(JSON.stringify(runPromiseControl()));
}
