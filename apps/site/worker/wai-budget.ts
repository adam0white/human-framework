/** One UTC-day ceiling for local scripts and the translator. R2 CAS serializes admissions.
 * Local scripts submit their durable cumulative high-water mark under a machine-wide lock.
 * Translator reservations are never refunded. This cannot bound unrelated account callers.
 */
import type { Env } from './lab.ts';
export const DAILY_HARD_NEURONS = 12_000;
export const dailyKey = (day: string) => `ai-budget/daily-v1/${day}.json`;
type Daily = { local: number; translator: number };
export async function admitDaily(
  bucket: Env['LAB'],
  day: string,
  caller: 'local' | 'translator',
  neurons: number,
): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(neurons) || neurons < 0) return false;
  for (let i = 0; i < 8; i++) {
    const old = await bucket.get(dailyKey(day));
    const state: Daily = old ? await old.json<Daily>() : { local: 0, translator: 0 };
    if (![state.local, state.translator].every((n) => Number.isFinite(n) && n >= 0)) return false;
    const next =
      caller === 'local'
        ? { ...state, local: Math.max(state.local, neurons) }
        : { ...state, translator: state.translator + neurons };
    if (next.local + next.translator > DAILY_HARD_NEURONS) return false;
    if (
      await bucket.put(dailyKey(day), JSON.stringify(next), {
        onlyIf: old ? { etagMatches: old.etag } : { etagDoesNotMatch: '*' },
      })
    )
      return true;
  }
  return false;
}
/** A private machine credential authorizes only cumulative local reservations, never refunds. */
export async function dailyAdmission(
  req: Request,
  env: Pick<Env, 'LAB' | 'WAI_BUDGET_KEY'>,
): Promise<Response> {
  const supplied = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!env.WAI_BUDGET_KEY || !supplied || req.method !== 'POST') return new Response(null, { status: 403 });
  const hash = async (s: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([hash(supplied), hash(env.WAI_BUDGET_KEY)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (difference) return new Response(null, { status: 403 });
  try {
    const raw = await req.text();
    if (raw.length > 256) return new Response(null, { status: 413 });
    const value = JSON.parse(raw) as { day?: string; neurons?: number };
    const day = new Date().toISOString().slice(0, 10);
    if (value.day !== day || typeof value.neurons !== 'number') return new Response(null, { status: 400 });
    const admitted = await admitDaily(env.LAB, day, 'local', value.neurons);
    return Response.json(
      { admitted },
      { status: admitted ? 200 : 429, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return new Response(null, { status: 503 });
  }
}
