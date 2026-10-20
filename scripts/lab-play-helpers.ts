/** Validation, records and operation replies for the tester driver. Browser access is injected. */
export type PlayKind = 'input' | 'note' | 'pulse' | 'first_minute' | 'want_quit' | 'stop' | 'tool';
export type PlayReason = 'CONFUSED' | 'BORED' | 'FRUSTRATED' | 'TASTE' | 'BUDGET' | 'TOOL' | 'FINISHED';
export interface PlayOptions {
  url: string;
  out: string;
  port: number;
  device: 'phone' | 'desktop';
  floor: number;
  ceiling: number;
}
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
interface PlayMetadata {
  kind?: PlayKind;
  reaction?: string;
  input?: JsonValue;
  game_clock?: string | number;
  engagement?: number;
  reason?: PlayReason;
}
type TapTarget =
  | { name: string; role?: string; text?: never; x?: never; y?: never }
  | { text: string; name?: never; role?: never; x?: never; y?: never }
  | { x: number; y: number; name?: never; role?: never; text?: never };
type ScrollTarget =
  | { text: string; x?: never; y?: never }
  | { x: number; y: number; text?: never }
  | { text?: never; x?: never; y?: never };
export type PlayOp = PlayMetadata &
  (
    | { op: 'open' }
    | ({ op: 'tap' } & TapTarget)
    | ({ op: 'select'; option: string } & ({ label: string; name?: never } | { name: string; label?: never }))
    | { op: 'type'; name?: string; text: string }
    | ({ op: 'scroll'; dy: number } & ScrollTarget)
    | { op: 'key'; key: string }
    | { op: 'wait'; s: number }
    | { op: 'shot'; file: string }
    | { op: 'resize'; width: number; height: number }
    | { op: 'log'; kind: PlayKind; reaction: string }
  );
const kinds: readonly string[] = ['input', 'note', 'pulse', 'first_minute', 'want_quit', 'stop', 'tool'];
const reasons: readonly string[] = ['CONFUSED', 'BORED', 'FRUSTRATED', 'TASTE', 'BUDGET', 'TOOL', 'FINISHED'];
const metadata = ['kind', 'reaction', 'input', 'game_clock', 'engagement', 'reason'];

export function parsePlayArgs(args: string[]): PlayOptions {
  const values: Record<string, string> = {};
  for (const arg of args) {
    const split = arg.indexOf('=');
    const key = arg.slice(0, split);
    const value = arg.slice(split + 1);
    if (
      split < 1 ||
      !['url', 'out', 'port', 'device', 'floor', 'ceiling'].includes(key) ||
      !value.trim() ||
      Object.hasOwn(values, key)
    )
      throw new Error(`Invalid or duplicate option: ${arg}`);
    values[key] = value;
  }
  if (!values.url || !values.out || !values.port || !values.device)
    throw new Error('Usage: npm run lab:play -- url=<url> out=<dir> port=<n> device=phone|desktop');
  let url: URL;
  try {
    url = new URL(values.url);
  } catch {
    throw new Error('url must be an HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('url must be an HTTP(S) URL');
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('port must be an integer 1–65535');
  if (values.device !== 'phone' && values.device !== 'desktop') throw new Error('Invalid device');
  const floor = Number(values.floor ?? 15);
  const ceiling = Number(values.ceiling ?? 25);
  if (!Number.isFinite(floor) || floor < 0) throw new Error('floor must be a finite nonnegative number');
  if (!Number.isFinite(ceiling) || ceiling <= 0 || ceiling > 2_147_483_647 / 60_000)
    throw new Error('ceiling must be positive and within the Node timer limit');
  return { url: values.url, out: values.out, port, device: values.device, floor, ceiling };
}
function textField(record: Record<string, unknown>, key: string, allowEmpty = false): void {
  if (typeof record[key] !== 'string' || (!allowEmpty && !record[key].trim()))
    throw new Error(`${key} must be ${allowEmpty ? 'a string' : 'a nonempty string'}`);
}
function numberField(record: Record<string, unknown>, key: string, minimum = -Infinity): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum)
    throw new Error(`${key} must be a finite number >= ${minimum}`);
  return value;
}
function point(record: Record<string, unknown>): void {
  numberField(record, 'x', 0);
  numberField(record, 'y', 0);
}
function isJson(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return false;
  const next = new Set(ancestors).add(value);
  return Object.values(value).every((child) => isJson(child, next));
}
export function validatePlayOp(value: unknown): PlayOp {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Op must be an object');
  const record = value as Record<string, unknown>;
  const fields: Record<string, string[]> = {
    open: [],
    tap: ['name', 'role', 'text', 'x', 'y'],
    select: ['label', 'name', 'option'],
    type: ['name', 'text'],
    scroll: ['dy', 'text', 'x', 'y'],
    key: ['key'],
    wait: ['s'],
    shot: ['file'],
    resize: ['width', 'height'],
    log: [],
  };
  if (typeof record.op !== 'string' || !Object.hasOwn(fields, record.op)) throw new Error('Unsupported op');
  const allowed = ['op', ...metadata, ...(fields[record.op] ?? [])];
  for (const key of Object.keys(record))
    if (!allowed.includes(key)) throw new Error(`Unsupported field: ${key}`);
  if (record.kind !== undefined && (typeof record.kind !== 'string' || !kinds.includes(record.kind)))
    throw new Error('Invalid kind');
  if (record.reason !== undefined && (typeof record.reason !== 'string' || !reasons.includes(record.reason)))
    throw new Error('Invalid reason');
  if (record.reaction !== undefined) textField(record, 'reaction', true);
  if (record.input !== undefined && !isJson(record.input)) throw new Error('input must be a JSON value');
  if (record.game_clock !== undefined && typeof record.game_clock !== 'string')
    numberField(record, 'game_clock');
  if (record.engagement !== undefined) {
    const engagement = numberField(record, 'engagement', 1);
    if (!Number.isInteger(engagement) || engagement > 5) throw new Error('engagement must be an integer 1–5');
  }
  const has = (key: string) => Object.hasOwn(record, key);
  switch (record.op) {
    case 'tap': {
      const targets = Number(has('name')) + Number(has('text')) + Number(has('x') || has('y'));
      if (targets !== 1 || (has('role') && !has('name'))) throw new Error('tap needs exactly one target');
      if (has('name')) textField(record, 'name');
      if (has('role')) textField(record, 'role');
      if (has('text')) textField(record, 'text');
      if (has('x') || has('y')) point(record);
      break;
    }
    case 'select':
      if (has('name') === has('label')) throw new Error('select needs exactly one label or name');
      textField(record, has('name') ? 'name' : 'label');
      textField(record, 'option');
      break;
    case 'type':
      textField(record, 'text', true);
      if (has('name')) textField(record, 'name');
      break;
    case 'scroll':
      numberField(record, 'dy');
      if (has('text') && (has('x') || has('y'))) throw new Error('scroll targets cannot be mixed');
      if (has('text')) textField(record, 'text');
      if (has('x') || has('y')) point(record);
      break;
    case 'key':
      textField(record, 'key');
      break;
    case 'wait':
      if (numberField(record, 's', 0) > 30) throw new Error('wait cannot exceed 30 seconds');
      break;
    case 'shot':
      textField(record, 'file');
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.png$/.test(record.file as string))
        throw new Error('file must be a PNG basename (letters, numbers, underscore, hyphen)');
      break;
    case 'resize':
      for (const key of ['width', 'height'])
        if (!Number.isInteger(numberField(record, key, 1)))
          throw new Error(`${key} must be a positive integer`);
      break;
    case 'log':
      if (record.kind === undefined) throw new Error('log needs kind');
      textField(record, 'reaction', true);
      break;
  }
  return record as unknown as PlayOp;
}
export function makeLogLine(
  op: Record<string, unknown>,
  timing: { now: number; openedAt: number | null; op_ms: number },
  error?: string,
  requestedControlPresentBefore?: boolean | null,
) {
  return {
    t: new Date(timing.now).toISOString(),
    elapsed_s: timing.openedAt === null ? null : Math.max(0, (timing.now - timing.openedAt) / 1000),
    kind:
      error !== undefined
        ? 'tool'
        : typeof op.kind === 'string' && kinds.includes(op.kind)
          ? op.kind
          : 'input',
    op: typeof op.op === 'string' ? op.op : null,
    input:
      op.input !== undefined
        ? isJson(op.input)
          ? op.input
          : null
        : op.op === 'log'
          ? null
          : Object.fromEntries(Object.entries(op).filter(([key]) => key !== 'op' && !metadata.includes(key))),
    reaction: typeof op.reaction === 'string' ? op.reaction : null,
    game_clock:
      typeof op.game_clock === 'string' ||
      (typeof op.game_clock === 'number' && Number.isFinite(op.game_clock))
        ? op.game_clock
        : null,
    engagement:
      typeof op.engagement === 'number' &&
      Number.isInteger(op.engagement) &&
      op.engagement >= 1 &&
      op.engagement <= 5
        ? op.engagement
        : null,
    reason: typeof op.reason === 'string' && reasons.includes(op.reason) ? op.reason : null,
    op_ms: timing.op_ms,
    error: error ?? null,
    ...(requestedControlPresentBefore !== undefined
      ? { requested_control_present_before: requestedControlPresentBefore }
      : {}),
  };
}

export interface PlaySnapshot {
  visible: string;
  controls: string;
  takenAt: number;
}
export class MissingPlayControl extends Error {
  readonly control: string;
  constructor(control: string, message: string) {
    super(message);
    this.control = control;
  }
}
/** Keep the complete requested name, including live status. A stale name must be refused. */
export async function clickNamedPlayControl<T>(
  page: { getByRole(role: string, options: { name: string; exact: true }): T },
  click: (target: T) => Promise<boolean>,
  name: string,
  role?: string,
): Promise<boolean> {
  if (await click(page.getByRole(role ?? 'button', { name, exact: true }))) return true;
  return !role && click(page.getByRole('link', { name, exact: true }));
}
function requestedControlPresent(snapshot: PlaySnapshot | null, op: Record<string, unknown>): boolean | null {
  if (op.op !== 'tap' || (typeof op.name !== 'string' && typeof op.text !== 'string')) return null;
  if (!snapshot) return false;
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  const wanted = normalize(typeof op.name === 'string' ? op.name : String(op.text));
  const roles = typeof op.role === 'string' ? [op.role] : ['button', 'link'];
  for (const line of snapshot.controls.split('\n')) {
    // ariaSnapshot emits a YAML single-quoted entry when the label contains ": ".
    const entry = line.replace(/^\s*-\s+/, '');
    const unquoted = entry.startsWith("'")
      ? entry.slice(1, entry.lastIndexOf("'")).replace(/''/g, "'")
      : entry;
    const match = /^(\S+)\s+"((?:\\.|[^"\\])*)"/.exec(unquoted);
    if (!match?.[1] || match[2] === undefined) continue;
    let name: string;
    try {
      name = JSON.parse(`"${match[2]}"`) as string;
    } catch {
      continue;
    }
    if (normalize(name) === wanted && (typeof op.text === 'string' || roles.includes(match[1]))) return true;
  }
  return (
    typeof op.text === 'string' && snapshot.visible.split('\n').some((line) => normalize(line) === wanted)
  );
}
interface PlayOutcome {
  status: number;
  snapshot: PlaySnapshot | null;
  snapshotAvailable: boolean;
  screenshot?: string;
  error?: string;
  snapshot_warning?: string;
  requested_control_present_before: boolean | null;
}
export async function runPlayOperation(
  op: Record<string, unknown>,
  options: {
    act: () => Promise<string | undefined>;
    snapshot: (timeout: number) => Promise<Omit<PlaySnapshot, 'takenAt'>>;
    previous: PlaySnapshot | null;
    now?: () => number;
  },
): Promise<PlayOutcome> {
  const now = options.now ?? Date.now;
  const result: PlayOutcome = {
    status: 200,
    snapshot: options.previous,
    snapshotAvailable: options.previous !== null,
    requested_control_present_before: requestedControlPresent(options.previous, op),
  };
  let operationError: unknown;
  try {
    const shot = await options.act();
    if (shot) result.screenshot = shot;
  } catch (error) {
    operationError = error;
    result.status = 500;
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    if (op.op !== 'log') {
      // Snapshot failure must never retry the action or change its result.
      result.snapshot = null;
      result.snapshotAvailable = false;
      for (const timeout of [5000, 15_000]) {
        try {
          result.snapshot = { ...(await options.snapshot(timeout)), takenAt: now() };
          result.snapshotAvailable = true;
          if (timeout > 5000) result.snapshot_warning = 'Snapshot was unavailable; refreshed on retry.';
          break;
        } catch {
          result.snapshot_warning =
            'Snapshot unavailable. No controls list is available; request a fresh snapshot.';
        }
      }
    }
  }
  if (
    operationError instanceof MissingPlayControl &&
    result.requested_control_present_before &&
    result.snapshotAvailable &&
    requestedControlPresent(result.snapshot, op) === false &&
    options.previous
  ) {
    const age = Math.max(0, (now() - options.previous.takenAt) / 1000);
    result.error = `${operationError.control} is not on the page now; it was listed ${Math.round(age)} s ago and the page has changed (game state, not a driver failure)`;
  }
  if (!result.snapshotAvailable && !result.snapshot_warning)
    result.snapshot_warning = 'Snapshot unavailable. No controls list has been captured.';
  return result;
}
export function makePlayReply(
  result: PlayOutcome,
  timing: { now: number; started: number; openedAt: number | null },
) {
  return {
    elapsed_s: timing.openedAt === null ? 0 : (timing.now - timing.openedAt) / 1000,
    op_ms: timing.now - timing.started,
    visible: result.snapshotAvailable ? (result.snapshot?.visible ?? '') : '',
    controls: result.snapshotAvailable ? (result.snapshot?.controls ?? '') : '',
    snapshot_ms: result.snapshotAvailable && result.snapshot ? timing.now - result.snapshot.takenAt : null,
    requested_control_present_before: result.requested_control_present_before,
    ...(result.screenshot ? { screenshot: result.screenshot } : {}),
    ...(result.error !== undefined ? { error: result.error } : {}),
    ...(result.snapshot_warning ? { snapshot_warning: result.snapshot_warning } : {}),
  };
}
