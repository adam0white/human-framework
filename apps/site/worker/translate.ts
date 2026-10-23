/** Opt-in host prototype. One atomic R2 object reserves spend BEFORE inference; failures are never refunded. */
import { CLAIRIC, CLEF, candidate, clairicInput, clefInput, type ListedAct } from '../src/free-text/core.ts';
import type { Env } from './lab.ts';

export type TranslationEnv = Pick<Env, 'LAB' | 'AI'>;

export const RESERVATION_USD = 0.04;
const CAP = 25; // $1 lifetime allocation from the owner's $5 experiments budget.
const KEY = 'ai-budget/free-text-v1.json'; // Keep forever: deleting this counter resets the spend ceiling.
type Counter = {
  blocked?: boolean;
  count: number;
  day: string;
  daily: number;
  browsers: Record<string, number>;
};
export async function reserveTranslation(bucket: Env['LAB'], browser: string, day: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const old = await bucket.get(KEY);
    let state: Counter = { count: 0, day, daily: 0, browsers: {} };
    if (old) {
      state = await old.json<Counter>();
      if (
        !Number.isInteger(state.count) ||
        state.count < 0 ||
        !Number.isInteger(state.daily) ||
        state.daily < 0 ||
        typeof state.day !== 'string' ||
        !state.browsers ||
        typeof state.browsers !== 'object'
      )
        return false;
    }
    if (state.blocked || state.count >= CAP) return false;
    if (state.day !== day) state = { ...state, day, daily: 0, browsers: {} };
    const used = state.browsers[browser] ?? 0;
    if (!Number.isInteger(used) || used < 0 || used >= 10 || state.daily >= 10) return false;
    const next: Counter = {
      count: state.count + 1,
      day,
      daily: state.daily + 1,
      browsers: { ...state.browsers, [browser]: used + 1 },
    };
    const saved = await bucket.put(KEY, JSON.stringify(next), {
      onlyIf: old ? { etagMatches: old.etag } : { etagDoesNotMatch: '*' },
    });
    if (saved) return true;
  }
  return false;
}
async function stopTranslation(bucket: Env['LAB']): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const old = await bucket.get(KEY);
    if (!old) throw Error('Budget missing');
    const state = await old.json<Counter>();
    const saved = await bucket.put(KEY, JSON.stringify({ ...state, blocked: true }), {
      onlyIf: { etagMatches: old.etag },
    });
    if (saved) return;
  }
  throw Error('Budget busy');
}
export function translationRequest(
  value: unknown,
): { text: string; browser: string; acts: ListedAct[] } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.text !== 'string' ||
    !v.text.trim() ||
    v.text.length > 400 ||
    typeof v.browser !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(v.browser) ||
    !Array.isArray(v.acts) ||
    v.acts.length < 1 ||
    v.acts.length > 32
  )
    return null;
  const acts: ListedAct[] = [];
  for (const item of v.acts) {
    if (!item || typeof item !== 'object') return null;
    const a = item as Record<string, unknown>;
    if (
      typeof a.id !== 'string' ||
      !/^[a-z0-9][a-z0-9:-]{0,59}$/.test(a.id) ||
      a.id === 'none' ||
      typeof a.label !== 'string' ||
      !a.label ||
      a.label.length > 120 ||
      acts.some((old) => old.id === a.id)
    )
      return null;
    acts.push({ id: a.id, label: a.label });
  }
  return { text: v.text.trim(), browser: v.browser, acts };
}
export async function translate(value: unknown, env: TranslationEnv) {
  const input = translationRequest(value);
  if (!input) return { status: 400, body: { error: 'Choose from the menu or shorten this request.' } };
  if (!env.AI) return { status: 503, body: { error: 'Translation is unavailable. The menu still works.' } };
  if (!(await reserveTranslation(env.LAB, input.browser, new Date().toISOString().slice(0, 10))))
    return { status: 429, body: { error: 'Translation limit reached. Choose from the menu.' } };
  try {
    // No retries: both calls share one reservation. A timeout in the browser does not refund it.
    const clef = await env.AI.run(CLEF, clefInput(input.text, input.acts));
    const clairic = await env.AI.run(CLAIRIC, clairicInput(input.text));
    return { status: 200, body: { candidate: candidate(input.text, input.acts, clef, clairic) } };
  } catch {
    // Circuit-break on every provider error, including actual usage limits. Manual review is required.
    await stopTranslation(env.LAB);
    return { status: 503, body: { error: 'Translation failed. Choose from the menu.' } };
  }
}
