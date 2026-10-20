/**
 * Headless 2.10.0 control: word and witness, four people over 20 lived days.
 * Run: node packages/human/examples/word-and-witness-control.ts
 *
 * A misses a promise on day 3. B and C see it; A sees the witnesses named by the arm. On day 5 D tells B
 * that A checked a shared resource, and tells C the opposite. On day 7 C reports D's account to B.
 * Each day A chooses between ordinary work and an apology to B. Meals and sleep are host supplied.
 * The promise has no linked conscience norm: the close choice isolates the new regard term. C holds a
 * promise-keeping norm, so C's separate percept also demonstrates a witness's own judgement.
 *
 * Arms omit only witnesses, reports, provenance metadata, or A's knowledge that C witnessed the breach.
 * Two domains rename people, offers and the proposition without changing structure or seeds.
 * Only the breach supplies regard evidence; the host supplies no feedback about an apology's reception.
 * All numbers are engineering premises, not estimates of people. An apology guarantees no forgiveness.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  FRAMEWORK_VERSION,
  finish,
  MINUTES_PER_DAY,
  type Percept,
  type Person,
  perceive,
  promise,
  provenanceOf,
  regardOf,
  seedSourceTrust,
  tick,
  trustOf,
} from '../src/index.ts';

const DAY = MINUTES_PER_DAY;
export const ARMS = ['full', 'no-regard', 'no-contradiction', 'no-provenance', 'secret-witness'] as const;
export type Arm = (typeof ARMS)[number];
const DOMAINS = {
  stairwell: { ids: { A: 'ada', B: 'bea', C: 'cem', D: 'deniz' }, resource: 'landing', work: 'sweep' },
  dock: { ids: { A: 'elin', B: 'finn', C: 'gale', D: 'hale' }, resource: 'mooring', work: 'coil' },
} as const;
export type Domain = keyof typeof DOMAINS;

const offer = (id: string, extra: Partial<Affordance> = {}): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 30,
  effort: 0,
  advertises: {},
  ...extra,
});
const MEAL = offer('meal', { advertises: { food: 0.6, water: 0.6 } });
const SLEEP = offer('sleep', { mode: 'sleep', duration: 8 * 60, advertises: { sleep: 1 } });

/** Complete an actual host-supplied act; keep every person's clock on the same schedule. */
function complete(p: Person, aff: Affordance, record = decide(p, [aff])): void {
  if (record.chosenAffordanceId !== aff.id) throw new Error(`Could not begin ${aff.id}`);
  begin(p, aff, record);
  finish(p, {
    affordanceId: aff.id,
    action: aff.action,
    status: 'completed',
    at: p.now + aff.duration,
    needs: aff.advertises,
  });
}

/** Return only plain JSON observations, including each retained belief and the report's trust measurements. */
export function runArm(domain: Domain, arm: Arm) {
  const { ids, resource, work } = DOMAINS[domain];
  const prop = `${ids.A}:checked:${resource}`;
  const people = Object.fromEntries(
    (['A', 'B', 'C', 'D'] as const).map((role, index) => [
      role,
      createPerson({
        id: ids[role],
        name: ids[role],
        seed: 17 + index,
        now: 0,
        bornAt: -30 * 365 * DAY,
        sex: 'female',
        traits: { agreeableness: 0.5 },
        norms: role === 'C' ? [{ normId: 'keeping-promises', standing: 'obligatory', conviction: 0.8 }] : [],
      }),
    ]),
  ) as Record<'A' | 'B' | 'C' | 'D', Person>;
  const { A, B, C } = people;
  const everyone = Object.values(people);
  seedSourceTrust(B, ids.D, 0.8);
  seedSourceTrust(C, ids.D, 0.8);
  seedSourceTrust(B, ids.C, 0.9);
  const priorC = regardOf(A, ids.C, A.now);
  const word = promise(A, {
    kind: 'promise',
    label: `check the ${resource} for ${ids.B}`,
    actions: [`check:${resource}`],
    from: 2 * DAY + 9 * 60,
    until: 2 * DAY + 10 * 60,
    importance: 0.4,
    toId: ids.B,
  });
  const ordinary = offer(work, { placeId: resource });
  const apology = offer(`apology:${resource}`, {
    action: 'apology',
    targetId: ids.B,
    tags: ['repair'],
    placeId: resource,
    effort: 0.1,
  });
  const decisions: { day: number; choice: 'apology' | 'ordinary' }[] = [];
  const evidence = {
    broken: false,
    breachAttended: { A: false, B: false, C: false },
    accounts: {} as { B?: boolean; C?: boolean },
    reportAttended: false,
  };
  const trust = {
    beforeB: trustOf(B, ids.D),
    afterB: trustOf(B, ids.D),
    reporterTrust: trustOf(B, ids.C),
    finalB: trustOf(B, ids.D),
    beforeC: trustOf(C, ids.D),
    finalC: trustOf(C, ids.D),
  };
  const at = (minute: number) => {
    for (const p of everyone) tick(p, minute);
  };
  const feed = (minute: number) => {
    at(minute);
    for (const p of everyone) complete(p, MEAL);
  };
  for (let day = 1; day <= 20; day++) {
    const base = (day - 1) * DAY;
    feed(base + 8 * 60);
    at(base + 11 * 60);
    if (day === 3) {
      evidence.broken = word.status === 'broken';
      const breach: Percept = {
        kind: 'promise-broken',
        summary: `${ids.A} did not check the ${resource} as promised to ${ids.B}`,
        actorId: ids.A,
        targetId: ids.B,
        channel: 'saw',
        salience: 1,
        at: A.now,
      };
      const own = {
        ...breach,
        ...(arm === 'no-regard' ? {} : { witnesses: arm === 'secret-witness' ? [ids.B] : [ids.B, ids.C] }),
      };
      evidence.breachAttended.A = perceive(A, [own]).includes(own);
      evidence.breachAttended.B = perceive(B, [breach]).includes(breach);
      const witnessed: Percept = {
        ...breach,
        norms: [{ normId: 'keeping-promises', relation: 'violates' }],
      };
      evidence.breachAttended.C = perceive(C, [witnessed]).includes(witnessed);
    }
    if (day === 5) {
      for (const [listener, value] of [
        [B, true],
        [C, false],
      ] as const) {
        // These are D's actual, incompatible utterances; the host asserts neither as world truth.
        perceive(listener, [
          {
            kind: 'fact',
            summary: `${ids.D} says ${ids.A} ${value ? 'checked' : 'did not check'} the ${resource}`,
            actorId: ids.D,
            channel: 'told',
            at: listener.now,
            salience: 1,
            claims: [
              { prop, value, confidence: 0.95, ...(arm === 'no-provenance' ? {} : { origin: ids.D }) },
            ],
          },
        ]);
      }
      evidence.accounts.B = B.memory.beliefs
        .find((b) => b.prop === prop)
        ?.sources.find((s) => s.id === ids.D)?.value;
      evidence.accounts.C = C.memory.beliefs
        .find((b) => b.prop === prop)
        ?.sources.find((s) => s.id === ids.D)?.value;
    }
    if (day === 7) {
      const account = C.memory.beliefs.find((b) => b.prop === prop)?.sources.find((s) => s.id === ids.D);
      if (!account) throw new Error('C did not retain an account from D');
      trust.beforeB = trustOf(B, ids.D);
      trust.reporterTrust = trustOf(B, ids.C);
      const report: Percept = {
        kind: 'account',
        summary: `${ids.C} tells ${ids.B} what ${ids.D} said about ${ids.A}`,
        actorId: ids.C,
        channel: 'told',
        at: B.now,
        salience: 1,
        ...(arm === 'no-contradiction' ? {} : { reports: [{ sourceId: ids.D, prop, value: account.value }] }),
      };
      evidence.reportAttended = perceive(B, [report]).includes(report);
      trust.afterB = trustOf(B, ids.D);
    }
    feed(base + 13 * 60);
    at(base + 18 * 60);
    const record = decide(A, [ordinary, apology]);
    const chosen = record.chosenAffordanceId === apology.id ? apology : ordinary;
    decisions.push({ day, choice: chosen === apology ? 'apology' : 'ordinary' });
    complete(A, chosen, record);
    feed(base + 19 * 60);
    at(base + 22 * 60);
    for (const p of everyone) complete(p, SLEEP);
  }
  trust.finalB = trustOf(B, ids.D);
  trust.finalC = trustOf(C, ids.D);
  const provenanceB = provenanceOf(B, prop);
  return {
    domain,
    arm,
    ids: { ...ids },
    prop,
    days: decisions.length,
    clocks: { A: A.now, B: B.now, C: C.now, D: people.D.now },
    decisions,
    regard: { B: regardOf(A, ids.B, A.now), C: regardOf(A, ids.C, A.now), priorC },
    trust,
    evidence,
    beliefs: { A: A.memory.beliefs, B: B.memory.beliefs, C: C.memory.beliefs, D: people.D.memory.beliefs },
    ...(provenanceB === undefined ? {} : { provenanceB }),
    alive: { A: A.body.alive, B: B.body.alive, C: C.body.alive, D: people.D.body.alive },
  };
}

export function main() {
  return (Object.keys(DOMAINS) as Domain[]).flatMap((domain) => ARMS.map((arm) => runArm(domain, arm)));
}

if (process.argv[1]?.endsWith('/word-and-witness-control.ts')) {
  console.log(`HF ${FRAMEWORK_VERSION} word and witness control (20 days)`);
  console.table(
    main().map((r) => ({
      domain: r.domain,
      arm: r.arm,
      regardB: r.regard.B.value,
      regardC: r.regard.C.value,
      apologyDay: r.decisions.find((d) => d.choice === 'apology')?.day ?? 'never',
      sourceTrustB: r.trust.finalB,
      sourceTrustC: r.trust.finalC,
      originB: r.provenanceB?.origin ?? 'absent',
    })),
  );
}
