/**
 * `npm run lab:inbox`: the owner's private view of runs sent to the lab notebook. Reads the private run index
 * from the R2 bucket `hf-lab` with Wrangler (your own Cloudflare login; nothing is exposed on the web), downloads
 * runs not yet fetched, and writes `.lab-inbox/` (git-ignored):
 *   runs/<id>.json        the envelope as sent: game, note, who, build, run
 *   replay/<id>.json      the game's own export, to load with the game's "Replay a run file"
 *   index.html            every run with its note, newest first; open it in a browser
 * Options: --days=N (default 30) limits which runs are downloaded. --suggest opts into Clef suggestions.
 * With --suggest, only the first word of envelope `who` and notes of at least three words go to
 * Cloudflare Workers AI @cf/cloudflare/clef (never the run, build, game or full identity). Answers stay in
 * suggest/<id>.json; each id is called once. Nothing goes to the ledger or back to R2.
 * Cost: about 0.0003 USD a note, at 0.24 USD per million input tokens (output free). Stop new calls once
 * response usage reaches 0.05 USD per invocation; cached answers cost nothing. The page reports a stop.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

import {
  ACCOUNT,
  buildNoteRequest,
  canSuggest,
  clefAuth,
  MODEL,
  parseSuggestion,
  readSuggestion,
  renderSuggestion,
  writeSuggestion,
} from './lab-inbox-suggest.ts';

const suggest = process.argv.includes('--suggest');
let calls = 0;
let cached = 0;
let spent = 0;
let spendStopped = false;
const spendStop = 'Clef spend stop: reached 0.05 USD at list price; no more calls this invocation.';

async function suggestionLine(id: string, env: Envelope): Promise<string> {
  const request = buildNoteRequest(env.who, env.note);
  if (!request) return '';
  const saved = readSuggestion(dir, id);
  if (saved) {
    cached++;
    return renderSuggestion(saved);
  }
  if (!canSuggest(spent)) {
    spendStopped = true;
    return '';
  }
  // No retries: one request per uncached run. The token stays in process memory.
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${clefAuth()}`, 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  calls++;
  if (!res.ok) throw new Error(`Clef request failed: HTTP ${res.status}`);
  const json = (await res.json()) as { success?: boolean; result?: unknown };
  if (json.success === false) throw new Error('Clef request failed');
  writeSuggestion(dir, id, json.result);
  const answer = parseSuggestion(json.result);
  spent += answer.usd;
  if (!canSuggest(spent)) spendStopped = true;
  return renderSuggestion(answer);
}

const root = join(import.meta.dirname, '..');
const dir = join(root, '.lab-inbox');
const BUCKET = 'hf-lab';
const days = Number(process.argv.find((a) => a.startsWith('--days='))?.slice(7) ?? 30);

function get(key: string, file: string) {
  execFileSync('npx', ['wrangler', 'r2', 'object', 'get', `${BUCKET}/${key}`, '--remote', '--file', file], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

type Entry = {
  key: string;
  id: string;
  game: string;
  hour: string;
  who?: string;
  note?: string;
  bytes?: string;
};
type Envelope = { game: string; note?: string; who?: string; build?: Record<string, string>; run: unknown };

mkdirSync(join(dir, 'runs'), { recursive: true });
mkdirSync(join(dir, 'replay'), { recursive: true });
mkdirSync(join(dir, 'gz'), { recursive: true });
get('private/index.json', join(dir, 'index.json'));
const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { runs: Entry[] };
const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const entries = index.runs
  .filter((r) => r.key.slice(5, 15) >= since)
  .sort((a, b) => b.key.localeCompare(a.key));

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const rows: string[] = [];
let fetched = 0;
for (const e of entries) {
  const envFile = join(dir, 'runs', `${e.id}.json`);
  if (!existsSync(envFile)) {
    const gz = join(dir, 'gz', `${e.id}.json.gz`);
    get(e.key, gz);
    const text = gunzipSync(readFileSync(gz)).toString('utf8');
    writeFileSync(envFile, text);
    writeFileSync(join(dir, 'replay', `${e.id}.json`), JSON.stringify((JSON.parse(text) as Envelope).run));
    fetched++;
  }
  const env = JSON.parse(readFileSync(envFile, 'utf8')) as Envelope;
  const suggestion = suggest ? await suggestionLine(e.id, env) : '';
  rows.push(`<article>
  <h2>${esc(e.game)} <small>${esc(e.hour.replace('T', ' '))}:00 UTC · ${esc(e.id)}${env.who ? ` · ${esc(env.who)}` : ''}</small></h2>
  ${env.note ? `<blockquote>${esc(env.note).replace(/\n/g, '<br>')}</blockquote>` : '<p class="soft">No note.</p>'}${suggestion ? `\n  ${suggestion}` : ''}
  <p class="soft">build ${esc(env.build?.c ?? '?')} · HF ${esc(env.build?.hf ?? '?')} · game ${esc(env.build?.a ?? '?')} ·
  <a href="replay/${esc(e.id)}.json" download>replay file</a> (load it in <a href="https://${esc(e.game)}.adamwhite.work">the game</a> with “Replay a run file”) ·
  <a href="runs/${esc(e.id)}.json">everything sent</a></p>
</article>`);
}

writeFileSync(
  join(dir, 'index.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lab inbox (private)</title>
<style>body{font:17px/1.5 Literata,Georgia,serif;background:#F3ECDD;color:#23201B;max-width:44rem;margin:0 auto;padding:16px}
h2{font-size:1.1rem;margin:1.4rem 0 .2rem}small,.soft{color:#6E665A;font-weight:400}blockquote{margin:.3rem 0;padding-left:.8rem;border-left:2px solid #C2412D}
@media (prefers-color-scheme:dark){body{background:#1E1B16;color:#E8DFCC}small,.soft{color:#9A9080}}</style>
<h1>Lab inbox</h1><p class="soft">Private, on this machine only. ${entries.length} runs in the last ${days} days. Made ${new Date().toISOString().slice(0, 16)} by npm run lab:inbox.</p>
${spendStopped ? `<p><strong>${esc(spendStop)}</strong></p>\n` : ''}${rows.join('\n') || '<p>No runs yet.</p>'}
</html>
`,
);
console.log(`lab inbox: ${entries.length} runs (${fetched} new). Open ${join(dir, 'index.html')}`);

if (suggest) {
  console.log(`Clef suggestions: ${calls} calls, ${cached} cached; ${spent.toFixed(8)} USD at list price.`);
  if (spendStopped) console.log(spendStop);
}
