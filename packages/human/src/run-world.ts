/** SCOPE: C0 host-world and pending-request bookkeeping at a reached frame.
 * Original issued request identity remains immutable. Each resolution refers to
 * the current projected world revision, including changes from earlier receipts.
 * Faculty settlement effects are returned to the dispatcher, never fabricated.
 */
import type * as T from './run-schema.ts';

function failure(code: T.ContractError['code'], path: string, message: string): T.Result<never> {
  return { ok: false, error: { code, path, message } };
}

export function applyWorldChange(
  world: T.DeepReadonly<T.WorldSnapshot>,
  change: T.DeepReadonly<T.WorldChange>,
  at: T.Time,
): T.Result<T.WorldSnapshot> {
  if (
    change.expectedRevision !== world.revision ||
    change.revision !== world.revision + 1 ||
    !Number.isSafeInteger(change.revision)
  )
    return failure('world-revision', '$.worldChange', 'world change does not continue the reached revision');
  const put = new Set<T.Id>();
  const remove = new Set<T.Id>();
  for (const fact of change.put) {
    if (put.has(fact.id)) return failure('duplicate-id', '$.worldChange.put', 'duplicate world fact');
    if (fact.at > at)
      return failure('invalid-admission', '$.worldChange.put', 'world change contains future evidence');
    put.add(fact.id);
  }
  for (const id of change.remove) {
    if (remove.has(id) || put.has(id))
      return failure('duplicate-id', '$.worldChange.remove', 'ambiguous world removal');
    remove.add(id);
  }
  const facts = new Map(world.facts.filter((fact) => !remove.has(fact.id)).map((fact) => [fact.id, fact]));
  for (const fact of change.put) facts.set(fact.id, fact);
  return {
    ok: true,
    value: { revision: change.revision, facts: [...facts.values()], hostState: change.hostState },
  };
}

export type ConsumedHostResolution = {
  state: T.RunState;
  request: T.HostRequest;
  input: T.DeepReadonly<T.Input<'action.resolved' | 'communication.resolved'>>;
};
export function consumeHostResolution(
  state: T.RunState,
  input: T.DeepReadonly<T.Input<'action.resolved' | 'communication.resolved'>>,
): T.Result<ConsumedHostResolution> {
  const receipt = input.payload;
  const request = state.pending.find((candidate) => candidate.id === receipt.requestId);
  if (
    !request ||
    request.boundaryAt !== state.at ||
    input.at !== state.at ||
    request.requestHash !== receipt.requestHash
  )
    return failure('request-mismatch', '$.payload', 'resolution does not match the reached pending request');
  if (receipt.worldRevision !== state.world.revision)
    return failure(
      'world-revision',
      '$.payload.worldRevision',
      'resolution must use the current projected world revision',
    );
  if (input.kind === 'action.resolved') {
    const action = input.payload;
    if (
      request.kind !== 'action' ||
      request.person !== action.person ||
      request.activityId !== action.activityId ||
      request.stage !== action.stage
    )
      return failure(
        'request-mismatch',
        '$.payload',
        'action resolution changed its issued identity or stage',
      );
  } else if (request.kind !== 'communication' || request.speaker !== input.payload.speaker)
    return failure('request-mismatch', '$.payload', 'communication resolution changed its issued speaker');
  let world = state.world;
  if (receipt.worldChange) {
    const changed = applyWorldChange(world, receipt.worldChange, state.at);
    if (!changed.ok) return changed;
    world = changed.value;
  }
  return {
    ok: true,
    value: {
      state: {
        ...state,
        world,
        pending: state.pending.filter((candidate) => candidate.id !== request.id),
        cursor: {
          ...state.cursor,
          resolutionLane: state.cursor.resolutionLane.filter((id) => id !== request.id),
        },
      },
      request,
      input,
    },
  };
}
