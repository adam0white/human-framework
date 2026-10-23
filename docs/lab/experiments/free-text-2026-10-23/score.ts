import { readFileSync, writeFileSync } from 'node:fs';
import { candidate } from '../../../../apps/site/src/free-text/core.ts';

const here = import.meta.dirname;
type Row = {
  id: number;
  arm: string;
  text: string;
  expected: string | null;
  kind: string;
  predicted: string | null;
  usd: number;
  neurons: number;
  ms: number;
  raw: Record<string, unknown>;
};
const raw = JSON.parse(readFileSync(`${here}/raw.json`, 'utf8')) as Row[];
const acts = [
  { id: 'work-repair', label: 'repair in the workshop' },
  { id: 'rest', label: 'rest at home' },
  { id: 'see-doctor', label: 'see the doctor at the clinic' },
  { id: 'pray-home', label: 'pray at home' },
  { id: 'smoke', label: 'smoke a cigarette' },
];
function llmResult(row: Row): string | null {
  const choices = row.raw.choices as { message?: { content?: string; reasoning?: string } }[] | undefined;
  try {
    const parsed = JSON.parse(
      String(row.raw.response ?? choices?.[0]?.message?.content ?? choices?.[0]?.message?.reasoning ?? ''),
    );
    return acts.some((a) => a.id === parsed.optionId) ? parsed.optionId : null;
  } catch {
    return null;
  }
}
const scored = raw.map((row) => ({ ...row, predicted: row.arm === 'llm' ? llmResult(row) : row.predicted }));
const combined = scored
  .filter((r) => r.arm === 'clairic')
  .map((row) => {
    const first = scored.find((r) => r.id === row.id && r.arm === 'clef');
    return {
      ...row,
      ms: row.ms + (first?.ms ?? 0),
      usd: row.usd + (first?.usd ?? 0),
      neurons: row.neurons + (first?.neurons ?? 0),
    };
  });
const validated = combined
  .filter((r) => r.arm === 'clairic')
  .map((row) => ({
    ...row,
    predicted:
      candidate(row.text, acts, raw.find((r) => r.id === row.id && r.arm === 'clef')?.raw, row.raw)
        ?.optionId ?? null,
  }));
function score(rows: Row[]) {
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  return {
    rows: rows.length,
    exact: rows.filter((r) => r.predicted === r.expected).length,
    abstentions: rows.filter((r) => r.predicted === null).length,
    falseCandidates: rows.filter((r) => r.predicted !== null && r.predicted !== r.expected).length,
    missedRequests: rows.filter((r) => r.predicted === null && r.expected !== null).length,
    correctionClicksProxy: rows.reduce(
      (n, r) => n + (r.expected !== r.predicted ? (r.predicted === null || r.expected === null ? 1 : 2) : 0),
      0,
    ),
    p50ms: ms[Math.floor(ms.length * 0.5)],
    p95ms: ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.95))],
    usd: rows.reduce((n, r) => n + r.usd, 0),
    neurons: rows.reduce((n, r) => n + r.neurons, 0),
  };
}
const summary = {
  menuReference: {
    rows: 40,
    exact: 40,
    note: 'Hand-labelled menu selection or abstention reference; not a human UI study.',
  },
  clef: score(scored.filter((r) => r.arm === 'clef')),
  clefAndClairic: score(combined),
  qwen: score(scored.filter((r) => r.arm === 'llm')),
  afterSampleHostGuard: score(validated),
  totalUSD: scored.reduce((n, r) => n + r.usd, 0),
  totalNeurons: scored.reduce((n, r) => n + r.neurons, 0),
  errors: scored
    .filter((r) => r.expected !== r.predicted)
    .map(({ id, arm, text, expected, predicted }) => ({ id, arm, text, expected, predicted })),
};
writeFileSync(`${here}/results.json`, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(
  `${here}/scored.json`,
  `${JSON.stringify(
    scored.map(({ raw: _raw, ...r }) => r),
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify(summary, null, 2));
