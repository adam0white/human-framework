/**
 * Scores raw/*.json from bakeoff.ts against labels.json and prints a Markdown table and results.json.
 * Run: node docs/lab/experiments/clairic-triage-2026-10-20/score.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
type Label = {
  id: string;
  game: string;
  verdict: string;
  routeKinds: string[];
  category: string;
  severity: number;
  doubt: boolean;
};
type Pred = {
  category?: string;
  game?: string;
  verdict?: string;
  severity?: number;
  fix?: boolean;
  conf?: number;
};
type Row = {
  id: string;
  ms?: number;
  inTok?: number;
  outTok?: number;
  usd?: number;
  raw?: Record<string, unknown>;
  error?: string;
};

const labels = JSON.parse(readFileSync(join(here, 'labels.json'), 'utf8')) as Label[];
const truth = (l: Label) => ({
  category: l.category,
  game: l.game,
  verdict: l.verdict === '-' ? 'none' : l.verdict,
  severity: l.severity,
  fix: l.routeKinds.includes('fix'),
});

const low = (v: unknown) =>
  typeof v === 'string'
    ? v
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '')
    : undefined;
const bool = (v: unknown) =>
  typeof v === 'boolean' ? v : typeof v === 'string' ? v.toLowerCase() === 'true' : undefined;
const num = (v: unknown) => (v === null || v === undefined || v === '' ? undefined : Number(v));

function parse(arm: string, raw: Record<string, unknown> | undefined): Pred | undefined {
  if (!raw) return undefined;
  if (arm.startsWith('clef')) {
    const a = raw.answers as Record<string, Record<string, unknown>>;
    return {
      category: a.category?.choice as string,
      game: a.game?.choice as string,
      verdict: a.verdict?.choice as string,
      severity: Math.round(Number(a.severity?.score)),
      fix: Number(a.fix?.noul) >= 0.5,
      conf: Number(a.category?.confidence),
    };
  }
  if (arm.startsWith('clairic')) {
    const a = raw.answers as Record<string, Record<string, unknown>>;
    return {
      category: low(a.category?.value),
      game: low(a.game?.value),
      verdict: low(a.verdict?.value),
      severity: num(a.severity?.median),
      conf: Number(a.category?.confidence),
    };
  }
  const msg = ((raw.choices as { message: Record<string, unknown> }[] | undefined)?.[0]?.message ??
    {}) as Record<string, unknown>;
  const text = String(msg.content ?? msg.reasoning ?? raw.response ?? '');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    const j = JSON.parse(m[0]) as Record<string, unknown>;
    return {
      category: low(j.category),
      game: low(j.game),
      verdict: low(j.verdict),
      severity: num(j.severity),
      fix: bool(j.fix),
    };
  } catch {
    return {};
  }
}

function kappa(pairs: [string, string][]) {
  const n = pairs.length;
  const po = pairs.filter(([a, b]) => a === b).length / n;
  const keys = new Set(pairs.flat());
  let pe = 0;
  for (const k of keys)
    pe += (pairs.filter(([a]) => a === k).length / n) * (pairs.filter(([, b]) => b === k).length / n);
  return (po - pe) / (1 - pe);
}
const pct = (x: number) => `${Math.round(x * 100)}%`;
const quant = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0;
};

const files = readdirSync(join(here, 'raw')).filter((f) => f.endsWith('.pass1.json'));
const results: Record<string, unknown>[] = [];
const fields = ['category', 'game', 'verdict', 'severity', 'fix'] as const;

// Majority baseline per field
const base: Record<string, number> = {};
for (const f of fields) {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(String(truth(l)[f]), (counts.get(String(truth(l)[f])) ?? 0) + 1);
  base[f] = Math.max(...counts.values()) / labels.length;
}

for (const file of files) {
  const arm = file.replace('.pass1.json', '');
  const p1 = JSON.parse(readFileSync(join(here, 'raw', file), 'utf8')) as Row[];
  let p2: Row[] = [];
  try {
    p2 = JSON.parse(readFileSync(join(here, 'raw', `${arm}.pass2.json`), 'utf8')) as Row[];
  } catch {}
  const r: Record<string, unknown> = { arm, rows: p1.length, errors: p1.filter((x) => x.error).length };
  const preds = new Map(p1.map((x) => [x.id, parse(arm, x.raw)]));
  for (const f of fields) {
    let ok = 0;
    let okClear = 0;
    let nClear = 0;
    let missing = 0;
    const pairs: [string, string][] = [];
    for (const l of labels) {
      const t = truth(l)[f];
      const p = preds.get(l.id)?.[f];
      if (p === undefined || p === null || Number.isNaN(p)) missing++;
      const hit = p === t;
      if (hit) ok++;
      if (!l.doubt) {
        nClear++;
        if (hit) okClear++;
      }
      pairs.push([String(t), String(p)]);
    }
    r[f] = ok / labels.length;
    r[`${f}Missing`] = missing;
    if (f === 'category') {
      r.categoryClear = okClear / nClear;
      r.categoryKappa = kappa(pairs);
    }
    if (f === 'severity') {
      const errs = labels.map((l) => Math.abs((preds.get(l.id)?.severity ?? 1.5) - l.severity));
      r.severityMAE = errs.reduce((a, b) => a + b, 0) / errs.length;
    }
  }
  if (p2.length) {
    const q2 = new Map(p2.map((x) => [x.id, parse(arm, x.raw)]));
    let same = 0;
    for (const l of labels)
      if (JSON.stringify({ ...preds.get(l.id), conf: 0 }) === JSON.stringify({ ...q2.get(l.id), conf: 0 }))
        same++;
    r.repeatSame = same / labels.length;
  }
  const ok = p1.filter((x) => !x.error);
  const all = [...p1, ...p2].filter((x) => !x.error);
  r.msMedian = Math.round(
    quant(
      ok.map((x) => x.ms ?? 0),
      0.5,
    ),
  );
  r.msP90 = Math.round(
    quant(
      ok.map((x) => x.ms ?? 0),
      0.9,
    ),
  );
  r.inTokPerRow = Math.round(ok.reduce((a, x) => a + (x.inTok ?? 0), 0) / ok.length);
  r.outTokPerRow = Math.round(ok.reduce((a, x) => a + (x.outTok ?? 0), 0) / ok.length);
  r.usdPer50 = ok.reduce((a, x) => a + (x.usd ?? 0), 0);
  r.usdBothPasses = all.reduce((a, x) => a + (x.usd ?? 0), 0);
  results.push(r);
}

writeFileSync(join(here, 'results.json'), `${JSON.stringify({ baseline: base, results }, null, 1)}\n`);
console.log(
  '| arm | category (clear 43) | kappa | game | verdict | severity exact / MAE | fix | same on rerun | median / p90 ms | in+out tokens per row | USD per 50 rows |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
console.log(
  `| majority baseline | ${pct(base.category ?? 0)} | 0 | ${pct(base.game ?? 0)} | ${pct(base.verdict ?? 0)} | ${pct(base.severity ?? 0)} | ${pct(base.fix ?? 0)} | | | | |`,
);
for (const r of results)
  console.log(
    `| ${r.arm} | ${pct(r.category as number)} (${pct(r.categoryClear as number)}) | ${(r.categoryKappa as number).toFixed(2)} | ${pct(r.game as number)} | ${pct(r.verdict as number)} | ${pct(r.severity as number)} / ${(r.severityMAE as number).toFixed(2)} | ${r.arm.startsWith('clairic') ? 'n/a' : pct(r.fix as number)} | ${r.repeatSame === undefined ? '' : pct(r.repeatSame as number)} | ${r.msMedian} / ${r.msP90} | ${r.inTokPerRow}+${r.outTokPerRow} | $${(r.usdPer50 as number).toFixed(4)} |`,
  );
