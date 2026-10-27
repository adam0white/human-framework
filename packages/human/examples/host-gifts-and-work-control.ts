/** HF4 host recipe: inventory belongs to the host; recipient knowledge needs separate evidence.
 * This pure preparation changes no stock. Submit the returned receipt through step and retain
 * the host state only when that batch is admitted. Current Run integration lives in the matching test.
 */
import type {
  ActionRequest,
  ActionResolution,
  ActorActivity,
  DeepReadonly,
  Json,
  PerceptData,
  WorldSnapshot,
} from '../src/run-schema.ts';

const record = (value: Json): value is { readonly [key: string]: Json } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** This example's exact host schema has two inventories, named by the actual actor IDs. */
export function giftStock(world: DeepReadonly<WorldSnapshot>, donor: string, recipient: string) {
  const data = world.hostState;
  if (!record(data) || Object.keys(data).join(',') !== 'stock') throw new Error('Invalid gift host schema');
  const inventories = data.stock ?? null;
  if (!record(inventories)) throw new Error('Invalid gift inventories');
  const from = inventories[donor],
    to = inventories[recipient];
  if (
    typeof from !== 'number' ||
    typeof to !== 'number' ||
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from < 0 ||
    to < 0 ||
    Object.keys(inventories).sort().join('\0') !== [donor, recipient].sort().join('\0')
  )
    throw new Error('Invalid gift inventories');
  return { from, to };
}

export function giftSettlement(
  world: DeepReadonly<WorldSnapshot>,
  request: DeepReadonly<ActionRequest>,
  activity: DeepReadonly<ActorActivity>,
  recipient: string,
  requested = 2,
): ActionResolution {
  if (request.stage === 'start') throw new Error('Accept the actual start before completing a gift');
  if (
    request.activityId !== activity.id ||
    request.offerId !== activity.offer.id ||
    request.person !== activity.offer.person ||
    activity.offer.target !== recipient
  )
    throw new Error('Gift request does not match the actual activity');
  if (!Number.isSafeInteger(requested) || requested < 1) throw new Error('Invalid requested amount');
  if (
    request.boundaryAt < activity.startedAt ||
    (request.stage === 'finish' && request.boundaryAt < activity.endsAt)
  )
    throw new Error('Gift has not finished');
  const stock = giftStock(world, request.person, recipient);
  // Revalidate current stock, not the quantity advertised when work started.
  const amount = request.stage === 'finish' ? Math.min(requested, stock.from) : 0;
  if (!Number.isSafeInteger(stock.to + amount)) throw new Error('Gift inventory exceeds exact range');
  if (amount > 0 && !Number.isSafeInteger(world.revision + 1))
    throw new Error('Gift revision exceeds exact range');
  const status = request.stage === 'interrupt' ? 'interrupted' : amount > 0 ? 'completed' : 'failed';
  const percept: PerceptData = {
    id: `gift:${request.id}`,
    occurredAt: request.boundaryAt,
    channel: 'saw',
    kind: 'gift',
    actorId: request.person,
    targetId: recipient,
    valence: 0.5,
    salience: 1,
    summary: `${request.person} gave me ${amount} portions.`,
    claims: [],
    norms: [],
    advice: [],
    consequences: [],
    withdrawConsequences: [],
    witnesses: [recipient],
    reports: [],
    provenance: ['world'],
  };
  return {
    requestId: request.id,
    requestHash: request.requestHash,
    person: request.person,
    activityId: request.activityId,
    stage: request.stage,
    worldRevision: world.revision,
    disposition: status,
    observations: amount > 0 ? [{ person: recipient, percepts: [percept] }] : [],
    ...(amount > 0
      ? {
          worldChange: {
            expectedRevision: world.revision,
            revision: world.revision + 1,
            put: [],
            remove: [],
            hostState: { stock: { [request.person]: stock.from - amount, [recipient]: stock.to + amount } },
          },
        }
      : {}),
    outcome: {
      activityId: activity.id,
      offerId: activity.offer.id,
      actionId: activity.offer.actionId,
      target: recipient,
      start: activity.startedAt,
      end: request.boundaryAt,
      status,
      evidenceId: `gift-outcome:${request.id}`,
      quality: amount / requested,
      actual: { exposures: [], observedProgress: [] },
      fulfills: status === 'completed' ? activity.offer.fulfills : [],
      advances: status === 'completed' ? activity.offer.advances : [],
    },
  };
}
