/** Local Workers AI admission. Durable reservations precede requests; uncertainty retains the reservation.
 * Account analytics is advisory (sampled and delayed). The shared 12,000-neuron daily ceiling
 * bounds this tool's paid usage even if account analytics lies. It cannot cap unrelated callers.
 */
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statfsSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
export const ACCOUNT = 'a20259cba74e506296745f9c67c1f3bc';
export { DAILY_HARD_NEURONS } from '../apps/site/worker/wai-budget.ts';

import { DAILY_HARD_NEURONS } from '../apps/site/worker/wai-budget.ts';
export const LOCAL_BUDGET_USD = 4;
const ROOT = join(homedir(), 'code/.lab-scratch/wai-daily');
// Published neuron rates per million input/output tokens, checked 2026-10-23.
export const RATES: Record<string, readonly [number, number]> = {
  '@cf/qwen/qwen3-30b-a3b-fp8': [4625, 30475],
  '@cf/meta/llama-3.2-3b-instruct': [4625, 30475],
  '@cf/mistralai/mistral-small-3.1-24b-instruct': [31876, 50488],
  '@cf/meta/llama-3.2-11b-vision-instruct': [4410, 61493],
  '@cf/cloudflare/clef': [21818, 0],
  '@cf/cloudflare/clairic': [9091, 0],
};
export interface ModelSpend {
  neurons: number;
  reservedNeurons: number;
  usd: number;
  calls: number;
}
interface Day {
  models: Record<string, ModelSpend>;
  reservedNeurons: number;
  neurons: number;
}
export interface BudgetState {
  version: 1;
  historicalUSD: number;
  reservedUSD: number;
  days: Record<string, Day>;
}
const statePath = join(ROOT, 'budget.json');
const lockPath = join(ROOT, 'budget.lock');
let token = '';
export function waiAuth(): string {
  if (!token) {
    try {
      const raw = execFileSync('npx', ['wrangler', 'auth', 'token', '--json'], {
        cwd: import.meta.dirname,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const value = JSON.parse(raw.slice(raw.indexOf('{'))) as {
        token?: unknown;
      };
      if (typeof value.token !== 'string' || !value.token) throw new Error();
      token = value.token;
    } catch {
      throw new Error('Cloudflare authentication unavailable');
    }
  }
  return token;
}
export const utcDate = (now = new Date()) => now.toISOString().slice(0, 10);
export function diskCheck(): void {
  const s = statfsSync(homedir());
  if (s.bavail * s.bsize < 5_000_000_000) throw new Error('STOP: less than 5 GB free');
}
function initial(): BudgetState {
  return { version: 1, historicalUSD: 0.207, reservedUSD: 0.207, days: {} };
}
export function waiSummary(): BudgetState {
  let value: BudgetState;
  try {
    value = JSON.parse(readFileSync(statePath, 'utf8')) as BudgetState;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return initial();
    throw new Error('Budget state unreadable; refusing inference');
  }
  if (
    value.version !== 1 ||
    !Number.isFinite(value.reservedUSD) ||
    value.reservedUSD < 0.207 ||
    !value.days ||
    typeof value.days !== 'object'
  )
    throw new Error('Budget state invalid');
  return value;
}
function save(state: BudgetState): void {
  const next = `${statePath}.${process.pid}.tmp`;
  writeFileSync(next, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(next, statePath);
}
export interface AccountUsage {
  date: string;
  neurons: number;
  remaining: number;
}
export async function waiUsage(): Promise<AccountUsage | null> {
  const date = utcDate();
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const query = `query { viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) { aiInferenceAdaptiveGroups(limit: 1, filter: {datetime_geq: "${date}T00:00:00Z", datetime_lt: "${next.toISOString()}"}) { sum { totalNeurons } } } } }`;
  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${waiAuth()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await response.json()) as {
      errors?: unknown;
      data?: {
        viewer?: {
          accounts?: {
            aiInferenceAdaptiveGroups?: { sum?: { totalNeurons?: number } }[];
          }[];
        };
      };
    };
    if (!response.ok || json.errors) return null;
    const accounts = json.data?.viewer?.accounts;
    if (accounts?.length !== 1) return null;
    const groups = accounts[0]?.aiInferenceAdaptiveGroups;
    if (!groups) return null;
    const neurons = groups.length === 0 ? 0 : groups[0]?.sum?.totalNeurons;
    if (typeof neurons !== 'number' || !Number.isFinite(neurons) || neurons < 0) return null;
    return { date, neurons, remaining: Math.max(0, 10_000 - neurons) };
  } catch {
    return null;
  }
}
export async function waiModels(): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/models/search?per_page=100`,
      {
        headers: { authorization: `Bearer ${waiAuth()}` },
        signal: AbortSignal.timeout(30_000),
      },
    );
    const json = (await response.json()) as {
      success?: boolean;
      result?: { name?: string }[];
    };
    if (!response.ok || json.success === false || !Array.isArray(json.result)) throw new Error();
    return json.result.flatMap((m) => (typeof m.name === 'string' ? [m.name] : []));
  } catch {
    throw new Error('Live model catalogue unavailable');
  }
}
/** UTF-8 bytes upper-bound text BPE tokens, plus framing. Clairic bills each field pass.
 * Images reserve the whole documented 128k Mistral context, so the hard guard may reject them.
 */
export function reservation(model: string, body: Record<string, unknown>): number {
  const rate = RATES[model];
  if (!rate) throw new Error('Model not allowlisted');
  const raw = JSON.stringify(body);
  const image = raw.includes('image_url') || raw.includes('"image"');
  const input = image ? 128_000 : Buffer.byteLength(raw) + 1024;
  const output = model.includes('/clef') || model.includes('/clairic') ? 0 : Number(body.max_tokens);
  if (!Number.isInteger(output) || output < 0 || output > 1024)
    throw new Error('max_tokens must be bounded at 1024');
  const fields = model.endsWith('/clairic')
    ? Math.max(1, Object.keys((body.fields ?? body.schema ?? body.queries ?? {}) as object).length)
    : 1;
  return Math.ceil((input * rate[0] * fields + output * rate[1]) / 1e6);
}
export function usageNeurons(model: string, result: Record<string, unknown>): number {
  const usage = result.usage as Record<string, unknown> | undefined;
  const direct = usage?.neurons;
  if (typeof direct === 'number' && Number.isFinite(direct) && direct >= 0) return direct;
  const input = usage?.input_tokens ?? usage?.prompt_tokens;
  const output =
    usage?.output_tokens ??
    usage?.completion_tokens ??
    (model.endsWith('/clef') || model.endsWith('/clairic') ? 0 : undefined);
  if (
    typeof input !== 'number' ||
    !Number.isInteger(input) ||
    input < 0 ||
    typeof output !== 'number' ||
    !Number.isInteger(output) ||
    output < 0
  )
    throw new Error('Response usage unreadable; reservation retained');
  const rate = RATES[model];
  if (!rate) throw new Error('Model not allowlisted');
  return (input * rate[0] + output * rate[1]) / 1e6;
}
/** Analytics can lag; the local hard limit remains independent of the account high-water gate. */
export function admissionAllowed(
  accountNeurons: number | null,
  localReserved: number,
  reserve: number,
): boolean {
  return (
    (accountNeurons === null
      ? localReserved + reserve <= 8_000
      : Math.max(accountNeurons, localReserved) + reserve <= 9_900) &&
    localReserved + reserve <= DAILY_HARD_NEURONS
  );
}
// Best-effort local headroom; other account callers and shared admission can still consume capacity.
export type BudgetPhase = 'preplay' | 'focused' | 'control';
export const HEADROOM_STOP = 'STOP: protected play headroom';
export function headroomAllowed(
  phase: BudgetPhase,
  accountNeurons: number | null,
  localReserved: number,
  reserve: number,
  reservedUSD: number,
): boolean {
  const headroom = phase === 'preplay' ? 5_500 : phase === 'focused' ? 1_000 : 0;
  return (
    admissionAllowed(accountNeurons, localReserved, reserve + headroom) &&
    reservedUSD + (reserve + headroom) * 0.000011 <= LOCAL_BUDGET_USD
  );
}
export async function waiRun(
  model: string,
  body: Record<string, unknown>,
  expectedDay?: string,
  phase: BudgetPhase = 'control',
): Promise<{ result: Record<string, unknown>; neurons: number; usd: number }> {
  diskCheck();
  mkdirSync(ROOT, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(lockPath, `${process.pid}\n`, { flag: 'wx', mode: 0o600 });
  } catch {
    throw new Error('Budget locked by another caller; inspect exact PID before recovering');
  }
  try {
    const state = waiSummary();
    const date = utcDate();
    if (expectedDay && expectedDay !== date) throw new Error('STOP: UTC day ended');
    state.days[date] ??= { models: {}, reservedNeurons: 0, neurons: 0 };
    const day = state.days[date];
    if (!Number.isFinite(day.reservedNeurons) || day.reservedNeurons < 0)
      throw new Error('Invalid daily budget');
    const reserve = reservation(model, body);
    const account = await waiUsage();
    if (utcDate() !== date) throw new Error('STOP: UTC day ended');
    if (!admissionAllowed(account?.neurons ?? null, day.reservedNeurons, reserve))
      throw new Error('STOP: daily neuron cap reached');
    const usdReserve = reserve * 0.000011;
    if (state.reservedUSD + usdReserve > LOCAL_BUDGET_USD)
      throw new Error('STOP: $4 local experiments allocation exhausted');
    if (!headroomAllowed(phase, account?.neurons ?? null, day.reservedNeurons, reserve, state.reservedUSD))
      throw new Error(HEADROOM_STOP);
    state.reservedUSD += usdReserve;
    day.reservedNeurons += reserve;
    day.models[model] ??= { neurons: 0, reservedNeurons: 0, usd: 0, calls: 0 };
    const spend = day.models[model];
    spend.reservedNeurons += reserve;
    spend.calls++;
    save(state); // Retain reservations for timeout, crash or invalid answers.
    const receipt = join(ROOT, `${date}-inference.jsonl`);
    const requestId = `${process.pid}-${Date.now()}-${spend.calls}`;
    appendFileSync(
      receipt,
      `${JSON.stringify({ requestId, model, phase, reserve, status: 'reserved', timestamp: new Date().toISOString() })}\n`,
      { mode: 0o600 },
    );
    // Persist locally first: an ambiguous remote admission must never permit a retry to reclaim spend.
    try {
      const key = readFileSync(join(ROOT, 'admission-key'), 'utf8').trim();
      if (!key) throw new Error();
      const admission = await fetch('https://human.adamwhite.work/lab/api/wai-budget', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${key}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ day: date, neurons: day.reservedNeurons }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!admission.ok || ((await admission.json()) as { admitted?: boolean }).admitted !== true)
        throw new Error();
      if (utcDate() !== date) throw new Error();
    } catch {
      throw new Error('STOP: shared daily admission unavailable or capped; reservation retained');
    }
    let response: Response;
    try {
      const auth = waiAuth();
      if (utcDate() !== date) throw new Error('STOP: UTC day ended; reservation retained');
      response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${model}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${auth}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new Error('Inference unavailable; reservation retained');
    }
    if (response.status === 429) throw new Error('USAGE LIMIT: Workers AI HTTP 429; stop');
    if (!response.ok) throw new Error(`Inference HTTP ${response.status}; reservation retained`);
    let json: { success?: boolean; result?: Record<string, unknown> };
    try {
      json = (await response.json()) as typeof json;
    } catch {
      throw new Error('Invalid inference JSON; reservation retained');
    }
    if (json.success === false || !json.result || typeof json.result !== 'object')
      throw new Error('Inference failed; reservation retained');
    const neurons = usageNeurons(model, json.result);
    const usd = neurons * 0.000011;
    spend.neurons += neurons;
    spend.usd += usd;
    day.neurons += neurons;
    if (neurons > reserve) {
      state.reservedUSD = LOCAL_BUDGET_USD;
      save(state);
      throw new Error('STOP: response exceeded conservative reservation; budget frozen pending audit');
    }
    const refund = reserve - neurons;
    spend.reservedNeurons -= refund;
    day.reservedNeurons -= refund;
    state.reservedUSD -= refund * 0.000011;
    save(state);
    appendFileSync(
      receipt,
      `${JSON.stringify({ requestId, model, phase, reserve, neurons, status: 'complete', timestamp: new Date().toISOString() })}\n`,
      { mode: 0o600 },
    );
    return { result: json.result, neurons, usd };
  } finally {
    unlinkSync(lockPath);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const usage = await waiUsage();
  console.log(
    usage
      ? JSON.stringify({ ...usage, local: waiSummary().days[usage.date] ?? null }, null, 2)
      : 'Account neuron usage unavailable; inference uses local reservations.',
  );
  if (!usage) process.exitCode = 1;
}
