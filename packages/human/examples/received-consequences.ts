/**
 * Frozen two-step control. Run: node packages/human/examples/received-consequences.ts
 * Source trust=1, unknown action success=.9, goal importance=.8 and half-life=30min.
 * Request takes 10min; the direct terminal action takes 180min. Received access
 * opens after 20min and terminal work takes 20min. No advice or asking reward.
 * These favorable engineering premises are published, not estimates of humans.
 * The second domain is a structural rename. Refusal is a host event, not consent
 * predicted as fact. No simulation outcomes or future opportunities are fabricated.
 */
import {
  type Affordance,
  begin,
  consequenceEvidence,
  createPerson,
  decide,
  FRAMEWORK_VERSION,
  finish,
  perceive,
  type ReceivedConsequence,
  snapshot,
} from '../src/index.ts';

export function runReceivedConsequenceControl(domain: 'parcel' | 'sample' = 'parcel') {
  const names =
    domain === 'parcel'
      ? { trigger: 'request-route', terminal: 'deliver-parcel', source: 'keeper' }
      : { trigger: 'request-chamber', terminal: 'cool-sample', source: 'custodian' };
  const now = 600;
  const ask: Affordance = {
    id: 'ask',
    action: names.trigger,
    label: 'Request access',
    targetId: names.source,
    duration: 10,
    effort: 0.1,
    advertises: {},
  };
  const direct: Affordance = {
    id: 'direct',
    action: names.terminal,
    label: 'Work directly',
    duration: 180,
    effort: 0.1,
    advertises: {},
  };
  const base = createPerson({
    id: 'person',
    name: 'Person',
    seed: 19,
    now,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    goals: [
      {
        id: 'goal',
        label: 'Complete the work',
        serves: ['achievement'],
        advancedBy: [{ action: names.terminal, amount: 1 }],
        importance: 0.8,
        deadline: 720,
        temporal: { halfLifeMinutes: 30 },
      },
    ],
  });
  base.memory.sourceTrust[names.source] = 1;
  const premise: ReceivedConsequence = {
    id: 'opportunity',
    revision: 0,
    trigger: { action: names.trigger, targetId: names.source },
    successor: { action: names.terminal, duration: 20, effort: 0.1 },
    availableFrom: 620,
    availableUntil: 680,
    expiresAt: 800,
    chance: 1,
    confidence: 1,
  };
  const arms = [
    'useful',
    'late',
    'costly',
    'uncertain',
    'withheld',
    'removed',
    'goal-removed',
    'temporal-off',
    'refused',
  ] as const;
  const results = arms.map((arm) => {
    const p = snapshot(base);
    const received = structuredClone(premise);
    if (arm === 'late') received.availableFrom = 675;
    if (arm === 'costly') received.successor.materialCost = 1_000_000;
    if (arm === 'uncertain') received.confidence = 0.001;
    if (arm !== 'withheld')
      perceive(p, [
        {
          at: now,
          channel: 'told',
          kind: 'opportunity',
          actorId: names.source,
          targetId: p.id,
          salience: 1,
          summary: 'If a request succeeds, this route may become available.',
          consequences: [received],
        },
      ]);
    if (arm === 'removed') delete p.prospection;
    if (arm === 'goal-removed') p.agenda.goals = [];
    if (arm === 'temporal-off') for (const goal of p.agenda.goals) delete goal.temporal;
    const before = snapshot(p);
    const decision = decide(p, [ask, direct]);
    let refusal:
      | { requested: boolean; goalProgress: number; prospectConsumed: boolean; feasibleAfter: boolean }
      | undefined;
    if (arm === 'refused' && decision.chosenAffordanceId === ask.id) {
      begin(p, ask, decision);
      finish(p, {
        affordanceId: ask.id,
        action: ask.action,
        targetId: names.source,
        status: 'completed',
        at: now + ask.duration,
        summary: 'The request was made; the other person refused.',
      });
      // No successor physical offer is emitted. Completed asking already consumed its prospect,
      // even if the person has not yet attended a separate refusal percept.
      refusal = {
        requested: true,
        goalProgress: p.agenda.goals[0]?.progress ?? 0,
        prospectConsumed: p.prospection?.entries[0]?.triggeredAt !== undefined,
        feasibleAfter: consequenceEvidence(p, ask).entries.some((e) => e.feasible),
      };
    }
    return {
      arm,
      received: before.prospection ?? null,
      temporal: before.agenda.goals[0]?.temporal ?? null,
      chosen: decision.chosenAffordanceId,
      considered: decision.considered.map(({ affordanceId, utility, terms }) => ({
        affordanceId,
        utility,
        terms,
      })),
      ...(refusal ? { refusal } : {}),
    };
  });
  return {
    framework: FRAMEWORK_VERSION,
    domain,
    parameters: {
      now,
      sourceTrust: 1,
      actionSuccessPrior: 0.9,
      goalImportance: 0.8,
      halfLifeMinutes: 30,
      offers: [ask, direct],
      premise,
    },
    results,
    limits:
      'Received route valuation only. No graph search, waiting opportunity cost, future body prediction or guarantee of consent/outcome. Temporal-on also changes direct time+success valuation; knowledge ablations retain temporal goals.',
  };
}

if (process.argv[1]?.endsWith('/received-consequences.ts'))
  console.log(
    JSON.stringify(
      [runReceivedConsequenceControl('parcel'), runReceivedConsequenceControl('sample')],
      null,
      2,
    ),
  );
