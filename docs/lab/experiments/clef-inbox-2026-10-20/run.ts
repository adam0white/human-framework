/**
 * Clef on real inbox notes (2026-10-20): the trial the triage bake-off asked for before adopting
 * `npm run lab:inbox --suggest`. Two units, both hand-labelled first (labels.json):
 *   statements  36 single-topic sentences cut from the 11 owner notes; one category (choice), severity (score)
 *   notes       the 11 whole notes; verdict (choice), worst severity (score), and one `noul` per category, since a
 *               note usually raises several things
 * Clef sees only "Source kind: owner" and the words. The category, verdict and severity definitions are the
 * bake-off's, copied here unchanged.
 *
 * Run: node docs/lab/experiments/clef-inbox-2026-10-20/run.ts [--pass=1] [--cap=0.05]
 * The Cloudflare token is read in-process from `wrangler auth token --json` and never printed or written.
 * Then: node docs/lab/experiments/clef-inbox-2026-10-20/run.ts --score
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACCOUNT,
  CATEGORIES,
  clefAuth,
  MODEL,
  noteQuestions,
  noteState,
  PRICE_IN,
  SEVERITY,
} from '../../../../scripts/lab-inbox-suggest.ts';

const here = import.meta.dirname;
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const CAP_USD = Number(arg('cap') ?? 0.05);
const PASS = arg('pass') ?? '1';

type Statement = {
  id: string;
  words: string;
  kind: string;
  category: string;
  severity: number;
  doubt: boolean;
};
type Note = {
  id: string;
  words: string;
  kind: string;
  verdict: string;
  severity: number;
  categories: string[];
};
type Labels = { statements: Statement[]; notes: Note[] };
const labels = JSON.parse(readFileSync(join(here, 'labels.json'), 'utf8')) as Labels;

let spent = 0;

async function clef(state: string, questions: Record<string, unknown>) {
  if (spent >= CAP_USD) throw new Error(`spend cap reached (${spent.toFixed(4)} USD)`);
  const t0 = performance.now();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${clefAuth()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'clef', state, questions }),
  });
  const ms = performance.now() - t0;
  const json = (await res.json()) as {
    success?: boolean;
    result?: Record<string, unknown>;
    errors?: { message: string }[];
  };
  if (!res.ok || json.success === false)
    throw new Error(`clef ${res.status}: ${json.errors?.map((e) => e.message).join('; ')}`);
  const result = json.result ?? {};
  const usage = (result.usage ?? {}) as Record<string, number>;
  const inTok = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const usd = (inTok * PRICE_IN) / 1e6;
  spent += usd;
  return { ms, inTok, usd, answers: result.answers as Record<string, Record<string, unknown>> };
}

const state = noteState;

async function collect() {
  const out: { unit: string; id: string; ms: number; inTok: number; usd: number; answers: unknown }[] = [];
  for (const s of labels.statements) {
    const r = await clef(state(s.kind, s.words), {
      category: { type: 'choice', instructions: 'What kind of feedback is this?', criteria: CATEGORIES },
      severity: {
        type: 'score',
        instructions: 'How severe is the problem for the player?',
        criteria: SEVERITY,
      },
    });
    out.push({ unit: 'statement', id: s.id, ...r });
  }
  for (const n of labels.notes) {
    const qs = noteQuestions();
    const r = await clef(state(n.kind, n.words), qs);
    out.push({ unit: 'note', id: n.id, ...r });
  }
  writeFileSync(join(here, `raw.pass${PASS}.json`), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`pass ${PASS}: ${out.length} calls, ${spent.toFixed(5)} USD at list price`);
}

type Raw = { unit: string; id: string; ms: number; inTok: number; usd: number; answers: Record<string, any> };
// As in the bake-off's score.ts: severity is Clef's expected level, rounded; a noul answer is a probability.
const scoreOf = (a: Record<string, any>) => Math.round(Number(a.score));
const prob = (a: Record<string, any>) => Number(a.noul);

function score() {
  const raw1 = JSON.parse(readFileSync(join(here, 'raw.pass1.json'), 'utf8')) as Raw[];
  const raw2 = existsSync(join(here, 'raw.pass2.json'))
    ? (JSON.parse(readFileSync(join(here, 'raw.pass2.json'), 'utf8')) as Raw[])
    : null;
  const st = labels.statements;
  const byId = new Map(raw1.map((r) => [r.id, r]));
  let cat = 0;
  let catClear = 0;
  let clear = 0;
  let sevExact = 0;
  let sevAbs = 0;
  const hi = { n: 0, ok: 0 };
  const lo = { n: 0, ok: 0 };
  const rows: string[] = [];
  for (const s of st) {
    const a = byId.get(s.id)?.answers ?? {};
    const choice = a.category?.choice as string;
    const conf = Number(a.category?.confidence ?? 0);
    const ok = choice === s.category;
    cat += ok ? 1 : 0;
    if (!s.doubt) {
      clear++;
      catClear += ok ? 1 : 0;
    }
    const bucket = conf >= 0.5 ? hi : lo;
    bucket.n++;
    bucket.ok += ok ? 1 : 0;
    const sv = scoreOf(a.severity ?? {});
    sevExact += sv === s.severity ? 1 : 0;
    sevAbs += Math.abs(sv - s.severity);
    if (!ok)
      rows.push(`| ${s.id} | ${s.category}${s.doubt ? ' (doubt)' : ''} | ${choice} | ${conf.toFixed(2)} |`);
  }
  const counts = new Map<string, number>();
  for (const s of st) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  const majority = Math.max(...counts.values());
  const notes = labels.notes;
  let verdict = 0;
  let nsev = 0;
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const n of notes) {
    const a = byId.get(n.id)?.answers ?? {};
    verdict += a.verdict?.choice === n.verdict ? 1 : 0;
    nsev += scoreOf(a.severity ?? {}) === n.severity ? 1 : 0;
    for (const k of Object.keys(CATEGORIES)) {
      const said = prob(a[`has_${k}`] ?? {}) >= 0.5;
      const truth = n.categories.includes(k);
      if (said && truth) tp++;
      else if (said) fp++;
      else if (truth) fn++;
    }
  }
  let same = 0;
  if (raw2) {
    const b = new Map(raw2.map((r) => [r.id, r]));
    for (const s of st)
      same += b.get(s.id)?.answers.category?.choice === byId.get(s.id)?.answers.category?.choice ? 1 : 0;
  }
  const ms = raw1.map((r) => r.ms).sort((x, y) => x - y);
  const usd = raw1.reduce((sum, r) => sum + r.usd, 0) + (raw2?.reduce((sum, r) => sum + r.usd, 0) ?? 0);
  const pct = (x: number, n: number) => `${x}/${n} (${Math.round((100 * x) / n)}%)`;
  console.log(
    `statements: category ${pct(cat, st.length)}, clear ${pct(catClear, clear)}, majority ${pct(majority, st.length)}`,
  );
  console.log(`  confidence >= 0.5: ${pct(hi.ok, hi.n)}; below: ${pct(lo.ok, lo.n)}`);
  console.log(`  severity exact ${pct(sevExact, st.length)}, MAE ${(sevAbs / st.length).toFixed(2)}`);
  if (raw2) console.log(`  same category on rerun ${pct(same, st.length)}`);
  console.log(
    `notes: verdict ${pct(verdict, notes.length)}, worst severity exact ${pct(nsev, notes.length)}`,
  );
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  console.log(
    `  categories present (noul >= 0.5): precision ${precision.toFixed(2)}, recall ${recall.toFixed(2)} (tp ${tp}, fp ${fp}, fn ${fn})`,
  );
  console.log(
    `median ${Math.round(ms[Math.floor(ms.length / 2)] ?? 0)} ms; total ${usd.toFixed(4)} USD at list price`,
  );
  console.log('\n| statement | my label | Clef | confidence |\n|---|---|---|---|');
  for (const r of rows) console.log(r);
}

if (process.argv.includes('--score')) score();
else await collect();
