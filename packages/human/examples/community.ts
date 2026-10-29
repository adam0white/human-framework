/** Two independent actors, one host, exact current checkpoint continuation.
 * Uses the same step/receipt path before and after restore. No silent/alternate community driver.
 */
import {
  createPerson,
  createRun,
  exportRun,
  readRunHistory,
  replay,
  restoreRun,
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
  openingInputs,
  restoredHost,
  START,
  serve,
} from './minimal.ts';

export function main() {
  const run = need(createRun(exampleSpec(19)));
  need(createPerson(run, authoredPerson('ada', 'Ada')));
  need(createPerson(run, authoredPerson('bora', 'Bora', 'male')));
  const people = ['ada', 'bora'].map((id) => ({ id, offers: exampleOffers(id) }));
  const offers = new Map(people.map((p) => [p.id, p.offers]));
  const host = freshHost();
  const initial = need(step(run, { until: START, inputs: openingInputs(people) }));
  if (initial.boundary.type !== 'world-required')
    throw new Error('Expected the actual opening host boundary');
  const issued = initial.boundary.requests.filter((request) => request.kind === 'action');
  if (
    issued.length !== 2 ||
    issued.some((request) => request.stage !== 'start' || request.worldRevision !== 0) ||
    new Set(issued.map((request) => request.person)).size !== 2
  )
    throw new Error('Expected two actual start requests issued against the same opening revision');
  serve(run, host, offers, START + 30 * MINUTE, [], initial);
  const checkpoint = exportRun(run);
  const startReceipts = readRunHistory(checkpoint)
    .flatMap((transaction) => transaction.inputs)
    .filter(
      (input) =>
        input.kind === 'action.resolved' && issued.some((request) => request.id === input.payload.requestId),
    );
  const issuedPairSettled = issued.every((request) => {
    const settlements = checkpoint.current.receipts.settlements.filter(
      (receipt) => receipt.requestId === request.id,
    );
    return (
      settlements.length === 1 &&
      settlements[0]?.requestHash === request.requestHash &&
      !checkpoint.current.pending.some((pending) => pending.id === request.id)
    );
  });
  const currentRevisionChain =
    startReceipts.length === 2 &&
    startReceipts.every(
      (input, index) =>
        input.kind === 'action.resolved' &&
        input.payload.worldRevision === index &&
        input.payload.worldChange?.expectedRevision === index &&
        input.payload.worldChange.revision === index + 1,
    );
  if (!issuedPairSettled || !currentRevisionChain)
    throw new Error('Two issued requests did not settle with the exact revision chain');
  const resumed = need(restoreRun(checkpoint));
  const resumedHost = restoredHost(checkpoint);
  // Same future calls and actual host rules in the original and restored runs.
  serve(run, host, offers, START + 60 * MINUTE);
  serve(resumed, resumedHost, offers, START + 60 * MINUTE);
  const archive = exportRun(run),
    restored = exportRun(resumed);
  const sameContinuation = archive.hashes.full === restored.hashes.full;
  if (!sameContinuation) throw new Error('Current checkpoint continuation differs');
  const verified = need(replay(archive));
  if (verified.fullHash !== archive.hashes.full) throw new Error('Current replay hash differs');
  return {
    archive,
    sameContinuation,
    issuedPairSettled,
    currentRevisionChain,
    replayVerified: verified.verified,
    completed: host.completed,
    checkpointCompleted: checkpoint.current.world.hostState,
  };
}
if (isMain(import.meta.url)) {
  const result = main();
  console.log(
    JSON.stringify(
      {
        engine: result.archive.engine,
        at: result.archive.current.at,
        completed: result.completed,
        sameContinuation: result.sameContinuation,
        issuedPairSettled: result.issuedPairSettled,
        currentRevisionChain: result.currentRevisionChain,
        replayVerified: result.replayVerified,
      },
      null,
      2,
    ),
  );
}
