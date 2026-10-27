/** One coupled word/witness case, with actual received information.
 * This is mechanism evidence, not human validity.
 */
import {
  createPerson,
  createRun,
  exportRun,
  type Input,
  type Offer,
  type PerceptData,
  replay,
  step,
} from '@adam0white/human-framework';
import {
  authoredPerson,
  exampleOffers,
  exampleSpec,
  freshHost,
  isMain,
  MINUTE,
  need,
  START,
  serve,
} from './minimal.ts';

export function main() {
  const spec = exampleSpec(17);
  // Authored testimony trust names declared information sources, not merely actor IDs.
  spec.definitions.sources = [
    ...spec.definitions.sources,
    ...['a', 'b', 'c', 'd'].map((id) => ({ type: 'person' as const, id })),
  ];
  spec.definitions.actions = [
    ...spec.definitions.actions,
    {
      id: 'apologize',
      label: 'apologize',
      demands: { effort: 0.1, focus: 0, mode: 'awake', requires: {} },
      tags: ['repair', 'apologize'],
      norms: [],
    },
  ];
  const run = need(createRun(spec));
  need(createPerson(run, authoredPerson('d', 'Deniz')));
  const c = authoredPerson('c', 'Cem', 'male');
  c.state.sourceTrust = [{ sourceId: 'd', trust: 0.8 }];
  need(createPerson(run, c));
  const b = authoredPerson('b', 'Bora', 'male');
  b.state.sourceTrust = [{ sourceId: 'd', trust: 0.8 }];
  need(createPerson(run, b));
  const a = authoredPerson('a', 'Ada');
  a.state.agenda.commitments = [
    {
      id: 'word',
      kind: 'promise',
      toId: 'b',
      actions: ['work'],
      from: START,
      until: START + MINUTE,
      importance: 0.4,
      label: 'check the landing',
    },
  ];
  need(createPerson(run, a));
  const advance = (at: number, inputs: readonly Input[]) => {
    const result = need(step(run, { until: at, inputs }));
    if (!result.reachedUntil || result.boundary.type !== 'until')
      throw new Error('Unexpected host boundary in evidence case');
    return exportRun(run);
  };
  // No work is offered. Confirm the actual deadline result before authoring any report about it.
  const expired = advance(START + 2 * MINUTE, []);
  if (expired.current.people.a?.agenda.commitments.find((x) => x.id === 'word')?.status !== 'broken')
    throw new Error('The declared promise did not produce an actual broken record');
  const priorC = expired.current.people.a?.social.impressions
    .find((x) => x.targetId === 'c')
    ?.cues.find((x) => x.key === 'regard');
  const source = { type: 'host' as const, id: 'world' };
  const witnessedAt = expired.current.at + 1; // explicit host delivery latency; no late same-time input
  const percept = (person: string): PerceptData => ({
    id: `breach:${person}`,
    occurredAt: START + MINUTE,
    channel: 'saw',
    kind: 'promise-broken',
    actorId: 'a',
    targetId: 'b',
    valence: -0.6,
    salience: 1,
    summary: 'Ada did not keep the promise.',
    claims: [],
    norms: [],
    advice: [],
    consequences: [],
    withdrawConsequences: [],
    reports: [],
    provenance: ['world'],
    witnesses: person === 'a' ? ['b'] : [],
  });
  const witnessed = advance(
    witnessedAt,
    ['a', 'b', 'c'].map((person) => ({
      id: `host:witness:${person}`,
      at: witnessedAt,
      source,
      kind: 'observation.received',
      payload: { person, evidenceId: `breach-evidence:${person}`, percepts: [percept(person)] },
    })),
  );
  const witnessCue = witnessed.current.people.a?.social.impressions
    .find((x) => x.targetId === 'b')
    ?.cues.find((x) => x.key === 'regard');
  const afterC = witnessed.current.people.a?.social.impressions
    .find((x) => x.targetId === 'c')
    ?.cues.find((x) => x.key === 'regard');
  const sawWitnessChanged = witnessCue !== undefined && witnessCue.mean < 0 && witnessCue.weight > 0;
  const unseenWitnessStayedUnknown = JSON.stringify(priorC ?? null) === JSON.stringify(afterC ?? null);
  const secretWitnessReceived =
    witnessed.current.people.c?.memory.episodes.some((x) => x.kind === 'promise-broken') ?? false;

  const prop = 'a:kept-promise',
    toldAt = witnessedAt + 1;
  const told = advance(
    toldAt,
    ['b', 'c'].map((person) => ({
      id: `host:word:${person}`,
      at: toldAt,
      source,
      kind: 'testimony.received',
      payload: {
        person,
        evidenceId: `word:${person}`,
        teller: 'd',
        claims: [
          {
            prop,
            value: true,
            confidence: 0.9,
            sourceId: 'd',
            evidenceId: `claim:${person}`,
            provenance: ['d'],
            origin: 'd',
            lineage: 'example-chain',
          },
        ],
      },
    })),
  );
  const beforeB = told.current.people.b?.memory.sourceTrust.d,
    beforeC = told.current.people.c?.memory.sourceTrust.d;
  const reportedAt = toldAt + 1;
  const reported = advance(reportedAt, [
    {
      id: 'host:report:b',
      at: reportedAt,
      source,
      kind: 'contradiction.received',
      payload: {
        person: 'b',
        evidenceId: 'contradiction:b',
        sourceId: 'd',
        prop,
        value: false,
        reporterId: 'a',
      },
    },
  ]);
  const afterB = reported.current.people.b?.memory.sourceTrust.d,
    unchangedC = reported.current.people.c?.memory.sourceTrust.d;
  const onlyRecipientTrustChanged =
    typeof beforeB === 'number' &&
    typeof afterB === 'number' &&
    typeof beforeC === 'number' &&
    typeof unchangedC === 'number' &&
    afterB < beforeB &&
    beforeC === unchangedC;
  const provenance = reported.current.people.b?.memory.beliefs.find((x) => x.prop === prop)?.provenance;
  const firstOriginRetained =
    provenance?.origin === 'd' && provenance.firstFrom === 'd' && provenance.lineage === 'example-chain';

  const at = reportedAt + 1;
  const ordinary = exampleOffers('a')[0];
  if (!ordinary) throw new Error('Missing ordinary offer');
  const apology: Offer = {
    ...ordinary,
    id: 'apology:b',
    actionId: 'apologize',
    label: 'apologize to Bora',
    target: 'b',
    demands: { effort: 0.1, focus: 0, mode: 'awake', requires: {} },
    tags: ['repair', 'apologize'],
  };
  const offers = [ordinary, apology];
  serve(run, freshHost(), new Map([['a', offers]]), at, [
    {
      id: 'host:0-repair-offers',
      at,
      source,
      kind: 'offers.received',
      payload: { person: 'a', revision: 1, offers },
    },
    {
      id: 'host:1-repair-decision',
      at,
      source,
      kind: 'decision.requested',
      payload: {
        person: 'a',
        reason: 'available repair',
        treatment: 'ordinary',
        offerRevision: 1,
      },
    },
  ]);
  const archive = exportRun(run);
  const decisionEvent = archive.current.events.findLast(
    (e) => e.person === 'a' && e.at === at && e.data.kind === 'decision',
  );
  const decision = decisionEvent?.data.kind === 'decision' ? decisionEvent.data.decision : undefined;
  const repairPull =
    decision?.considered
      .find((x) => x.affordanceId === 'apology:b')
      ?.terms.find((x) => x.source === 'regard:b')?.value ?? 0;
  if (
    !sawWitnessChanged ||
    !unseenWitnessStayedUnknown ||
    !secretWitnessReceived ||
    !onlyRecipientTrustChanged ||
    !firstOriginRetained ||
    repairPull <= 0
  )
    throw new Error('Current word/witness control failed');
  const verified = need(replay(archive));
  if (verified.fullHash !== archive.hashes.full) throw new Error('Word/witness replay differs');
  return {
    engine: archive.engine,
    sawWitnessChanged,
    unseenWitnessStayedUnknown,
    secretWitnessReceived,
    onlyRecipientTrustChanged,
    firstOriginRetained,
    beforeB,
    afterB,
    beforeC,
    unchangedC,
    provenance,
    repairPull,
    chosenAction: decision?.chosenAction,
    replayVerified: verified.verified,
  };
}
if (isMain(import.meta.url)) console.log(JSON.stringify(main(), null, 2));
