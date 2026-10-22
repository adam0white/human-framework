/** Private linked inbox exports. Uploads are joined only within their complete linkage tuple. */
export type LinkedRecord = {
  v: 2;
  id: string;
  player: string;
  session: string;
  runId: string;
  game: string;
  kind: 'events' | 'run' | 'save' | 'logs' | 'note';
  at: number;
  build: Record<string, string>;
  data: unknown;
  name?: string;
};
export type LinkedEntry = Omit<LinkedRecord, 'v' | 'data'> & { key: string; size: number };
const hex = /^[a-f0-9]{32}$/;
export function linkedRecord(value: unknown): value is LinkedRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as LinkedRecord;
  return (
    r.v === 2 &&
    [r.id, r.player, r.session, r.runId].every((v) => typeof v === 'string' && hex.test(v)) &&
    typeof r.game === 'string' &&
    /^[a-z][a-z0-9-]{0,47}$/.test(r.game) &&
    ['events', 'run', 'save', 'logs', 'note'].includes(r.kind) &&
    Number.isSafeInteger(r.at)
  );
}
export function linkedKey(record: LinkedRecord) {
  return [record.player, record.game, record.session, record.runId].join('-');
}
export type LinkedUpload = { name: string; kind: 'run' | 'save'; value?: unknown; status: string };
export function linkedUploads(records: LinkedRecord[]): LinkedUpload[] {
  const result: LinkedUpload[] = [];
  const chunks = new Map<
    string,
    { record: LinkedRecord; parts: Map<number, string>; total: number; invalid: boolean }
  >();
  for (const r of records) {
    if (r.kind !== 'run' && r.kind !== 'save') continue;
    const d = r.data as Record<string, unknown> | null;
    if (!d || typeof d !== 'object' || d.encoding !== 'json') {
      result.push({
        name: `${linkedKey(r)}-${r.kind}-${r.id}`,
        kind: r.kind,
        value: r.data,
        status: 'complete',
      });
      continue;
    }
    if (typeof d.upload !== 'string' || !hex.test(d.upload)) continue;
    const name = `${linkedKey(r)}-${r.kind}-${d.upload}`;
    let group = chunks.get(name);
    if (!group) {
      group = { record: r, parts: new Map(), total: Number(d.total), invalid: false };
      chunks.set(name, group);
    }
    if (
      !Number.isInteger(d.total) ||
      Number(d.total) < 1 ||
      Number(d.total) > 128 ||
      !Number.isInteger(d.index) ||
      Number(d.index) < 0 ||
      Number(d.index) >= Number(d.total) ||
      typeof d.text !== 'string' ||
      Buffer.byteLength(d.text) > 256 * 1024 ||
      group.total !== d.total
    ) {
      group.invalid = true;
      continue;
    }
    const prior = group.parts.get(Number(d.index));
    if (prior !== undefined && prior !== d.text) group.invalid = true;
    group.parts.set(Number(d.index), d.text);
  }
  for (const [name, group] of chunks) {
    const kind = group.record.kind as 'run' | 'save';
    if (group.invalid || group.parts.size !== group.total) {
      result.push({
        name,
        kind,
        status: group.invalid
          ? 'conflicting or invalid chunks'
          : `incomplete (${group.parts.size}/${group.total} chunks)`,
      });
      continue;
    }
    try {
      const text = Array.from({ length: group.total }, (_, index) => group.parts.get(index)).join('');
      result.push({ name, kind, value: JSON.parse(text), status: 'complete' });
    } catch {
      result.push({ name, kind, status: 'invalid assembled JSON' });
    }
  }
  return result;
}

/** Latest explicit feedback name labels the whole player timeline, across games. */
export function playerNames(records: LinkedRecord[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const r of [...records].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))) {
    if (!names.has(r.player)) names.set(r.player, '');
    if (r.kind !== 'note') continue;
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 60) : '';
    if (name) names.set(r.player, name);
  }
  return names;
}

/** Legacy labels are hints: exact player id, or one unique current name. Never merge player ids. */
export function legacyPlayer(
  env: { who?: string; name?: string },
  names: Map<string, string>,
): string | undefined {
  const label = (env.name || env.who)?.trim();
  if (!label) return undefined;
  if (names.has(label)) return label;
  const matches = [...names].filter(([, name]) => name === label);
  return matches.length === 1 ? matches[0]?.[0] : undefined;
}
