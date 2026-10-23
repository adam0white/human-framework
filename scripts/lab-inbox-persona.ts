/** Private One cast measurement from received, complete replay exports. No inferred recognition. */
import { type LinkedRecord, linkedKey, linkedUploads } from './lab-inbox-linked.ts';

export type PersonaMeasurement = {
  player: string;
  game: string;
  runId: string;
  probe: string;
  arm: string;
  scope: string;
  castId: string;
  branchId: string;
  revision: string;
  parentRevision: string | null;
  stage: string;
  outcome: string;
};
const token = /^[a-zA-Z0-9_.:-]{1,96}$/;
const hash = /^[a-f0-9]{64}$/;
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
function metadata(value: unknown) {
  if (!record(value) || value.v !== 1) return null;
  if (
    !['probe', 'castId', 'branchId', 'stage', 'outcome'].every(
      (key) => typeof value[key] === 'string' && token.test(value[key]),
    )
  )
    return null;
  if (
    !['fresh', 'biography', 'continuing'].includes(String(value.arm)) ||
    !['shared', 'local', 'file'].includes(String(value.scope)) ||
    typeof value.revision !== 'string' ||
    !hash.test(value.revision) ||
    !(
      value.parentRevision === null ||
      (typeof value.parentRevision === 'string' && hash.test(value.parentRevision))
    )
  )
    return null;
  return value as Omit<PersonaMeasurement, 'player' | 'game' | 'runId'>;
}
export function personaMeasurements(records: LinkedRecord[]) {
  const groups = new Map<string, LinkedRecord[]>();
  for (const r of records) {
    const key = linkedKey(r);
    const group = groups.get(key) ?? [];
    group.push(r);
    groups.set(key, group);
  }
  const rows: PersonaMeasurement[] = [];
  const seen = new Set<string>();
  let incomplete = 0;
  for (const group of groups.values()) {
    const first = group[0];
    if (!first) continue;
    for (const upload of linkedUploads(group).filter((u) => u.kind === 'run')) {
      if (upload.status !== 'complete') {
        incomplete++;
        continue;
      }
      if (!record(upload.value)) continue;
      const raw = upload.value.oneCast;
      for (const entry of Array.isArray(raw) ? raw : [raw]) {
        const data = metadata(entry);
        if (!data) continue;
        const row = { ...data, player: first.player, game: first.game, runId: first.runId };
        const key = [row.player, row.game, row.runId, row.probe, row.castId, row.stage, row.revision].join(
          '|',
        );
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
    }
  }
  const joined = new Set<string>();
  const fileJoined = new Set<string>();
  for (const target of rows) {
    if (
      !['shared', 'file'].includes(target.scope) ||
      target.arm !== 'continuing' ||
      target.stage !== 'admitted' ||
      target.outcome !== 'accepted'
    )
      continue;
    const source = rows.find(
      (r) =>
        r.player === target.player &&
        r.game !== target.game &&
        ['shared', 'file'].includes(r.scope) &&
        r.outcome === 'accepted' &&
        r.castId === target.castId &&
        r.branchId === target.branchId &&
        r.stage === 'checkpoint' &&
        r.revision === target.parentRevision,
    );
    if (source) {
      const destination = source.scope === 'file' || target.scope === 'file' ? fileJoined : joined;
      destination.add([target.player, target.probe, target.castId, target.branchId].join('|'));
    }
  }
  const milestones = new Set(
    rows.map((r) => [r.player, r.game, r.runId, r.probe, r.castId, r.stage].join('|')),
  ).size;
  return { rows, joins: joined.size, fileJoins: fileJoined.size, incomplete, milestones };
}
