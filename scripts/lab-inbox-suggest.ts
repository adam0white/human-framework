/** Clef's validated inbox definitions and local suggestions. No run payload is sent. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ACCOUNT = 'a20259cba74e506296745f9c67c1f3bc';
export const MODEL = '@cf/cloudflare/clef';
export const PRICE_IN = 0.24; // USD per million input tokens; output is free

export const CATEGORIES: Record<string, string> = {
  bug: 'Something is broken or behaves wrongly (a control fails, an error, an impossible situation)',
  unclear: 'The player cannot read the rules, the state, or what their action did',
  layout: 'Screen layout or phone fit: clipped, below the fold, hard to tap, hard to read on a small screen',
  pacing: 'Too little to do, empty or dragging time, the session does not hold attention, players get bored',
  difficulty: 'Too hard, unfair, too easy, or no pressure',
  repetition: 'The same line, answer or instruction repeated too often',
  agency: 'The player cannot do what they want, or their input does not seem to matter',
  delight: 'A positive moment, praise, or wanting to come back',
  direction: 'Advice, a design recommendation or a direction about what to build',
  tooling: 'About the test harness, telemetry or lab tools rather than the game',
};
export const VERDICTS: Record<string, string> = {
  keep: 'Positive: would come back',
  quit: 'Stopped, bored or frustrated, would not come back',
  mixed: 'A complaint or mixed reaction, but not a quit',
  none: 'Not a verdict on the game (a direction, a measurement, a tooling note)',
};
export const SEVERITY = [
  'None (praise or neutral)',
  'Minor',
  'Real friction',
  'Made the player quit or blocks play',
];

let token = '';
export function clefAuth() {
  if (!token) {
    try {
      const raw = execFileSync('npx', ['wrangler', 'auth', 'token', '--json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      token = (JSON.parse(raw.slice(raw.indexOf('{'))) as { token: string }).token;
      if (typeof token !== 'string' || !token) throw new Error('Missing token');
    } catch {
      // Child-process stdout and JSON syntax errors can contain the token. Never attach the cause.
      throw new Error('Could not read Cloudflare token from Wrangler');
    }
  }
  return token;
}

export const SUGGEST_CAP_USD = 0.05;
export const canSuggest = (spent: number) => Number.isFinite(spent) && spent < SUGGEST_CAP_USD;
export const noteState = (kind: string, words: string) => `Source kind: ${kind}\nFeedback: ${words}`;

export function noteQuestions() {
  const qs: Record<string, unknown> = {
    verdict: {
      type: 'choice',
      instructions: 'What is the speaker’s verdict on the game?',
      criteria: VERDICTS,
    },
    severity: {
      type: 'score',
      instructions: 'How severe is the worst problem the speaker raises?',
      criteria: SEVERITY,
    },
  };
  for (const [k, v] of Object.entries(CATEGORIES))
    qs[`has_${k}`] = { type: 'noul', instructions: `Does the feedback include this? ${v}` };
  return qs;
}

export function buildNoteRequest(who: string | undefined, note: string | undefined) {
  if (!note || note.trim().split(/\s+/u).length < 3) return null;
  const kind = who?.trim().split(/\s+/u)[0] || 'unknown';
  return { model: 'clef', state: noteState(kind, note), questions: noteQuestions() };
}

export interface Suggestion {
  verdict: string;
  confidence: number;
  severity: string;
  categories: { category: string; probability: number }[];
  inputTokens: number;
  usd: number;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Clef object');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error('Invalid Clef number');
  return value;
}
export function parseSuggestion(value: unknown): Suggestion {
  const result = object(value);
  const answers = object(result.answers);
  const verdict = object(answers.verdict);
  if (typeof verdict.choice !== 'string' || !Object.hasOwn(VERDICTS, verdict.choice))
    throw new Error('Invalid Clef verdict');
  const confidence = number(verdict.confidence, 0, 1);
  const level = Math.round(number(object(answers.severity).score, 0, SEVERITY.length - 1));
  const categories = Object.keys(CATEGORIES)
    .map((category) => ({
      category,
      probability: number(object(answers[`has_${category}`]).noul, 0, 1),
    }))
    .filter(({ probability }) => probability >= 0.5);
  const usage = object(result.usage);
  const inputTokens = number(usage.input_tokens ?? usage.prompt_tokens, 0);
  if (!Number.isInteger(inputTokens)) throw new Error('Invalid Clef token count');
  return {
    verdict: verdict.choice,
    confidence,
    severity: SEVERITY[level] ?? '',
    categories,
    inputTokens,
    usd: (inputTokens * PRICE_IN) / 1e6,
  };
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export function renderSuggestion(s: Suggestion): string {
  const categories =
    s.categories.map((c) => `${c.category} ${c.probability.toFixed(2)}`).join(', ') || 'none';
  return `<p class="soft">Suggested by Clef (check it): ${esc(s.verdict)} · ${esc(s.severity)} · categories: ${esc(categories)} · verdict confidence ${esc(s.confidence.toFixed(2))}${s.confidence < 0.5 ? ' · <strong>low confidence</strong>' : ''}</p>`;
}
function cachePath(dir: string, id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid suggestion run id');
  return join(dir, 'suggest', `${id}.json`);
}
export function readSuggestion(dir: string, id: string): Suggestion | null {
  const file = cachePath(dir, id);
  return existsSync(file) ? parseSuggestion(JSON.parse(readFileSync(file, 'utf8'))) : null;
}
export function writeSuggestion(dir: string, id: string, result: unknown): void {
  const file = cachePath(dir, id);
  mkdirSync(join(dir, 'suggest'), { recursive: true });
  // Keep the raw answer even if parsing later fails: never pay again for the same id.
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
}
