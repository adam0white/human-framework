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
 * suggest/<id>.json; invalid caches are moved aside and re-asked once per invocation.
 * Linked v2 manifests also export private per-player/game/session/run groups and complete replay/save
 * chunks. Missing/conflicting chunks are visible and never exported as a complete file. No linked
 * payload goes to AI. Downloaded files are local copies: R2 retention does not delete them.
 * Nothing goes to the ledger or back to R2.
 * Cost: about 0.0003 USD a note, at 0.24 USD per million input tokens (output free). Stop new calls once
 * response usage reaches 0.05 USD per invocation or usage cannot be read. Cached answers cost nothing.
 * The page reports a stop.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  type LinkedEntry,
  type LinkedRecord,
  linkedKey,
  linkedRecord,
  linkedUploads,
} from './lab-inbox-linked.ts';

import {
  ACCOUNT,
  buildNoteRequest,
  canSuggest,
  clefAuth,
  MODEL,
  parseSuggestion,
  readSuggestion,
  renderSuggestion,
  suggestionUsage,
  writeSuggestion,
} from './lab-inbox-suggest.ts';

const suggest = process.argv.includes('--suggest');
let calls = 0;
let cached = 0;
let spent = 0;
let spendStopped = false;
let spendUnknown = false;
const spendStop = () =>
  spendUnknown
    ? 'Clef spend stop: response usage unavailable; no more calls this invocation.'
    : 'Clef spend stop: reached 0.05 USD at list price; no more calls this invocation.';

async function suggestionLine(id: string, env: Envelope): Promise<string> {
  const request = buildNoteRequest(env.who, env.note);
  if (!request) return '';
  let failure = 'could not read or repair cached answer';
  try {
    const saved = readSuggestion(dir, id);
    if (saved) {
      cached++;
      return renderSuggestion(saved);
    }
    if (spendUnknown || !canSuggest(spent)) {
      spendStopped = true;
      return '';
    }
    failure = 'could not read Cloudflare authentication';
    const auth = clefAuth();
    // No retries within this invocation. Never include raw errors or response bodies in output.
    failure = 'request could not complete';
    calls++;
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      failure = `HTTP ${res.status}`;
      throw new Error();
    }
    spendUnknown = true;
    failure = 'invalid response JSON';
    const json = (await res.json()) as { success?: boolean; result?: unknown };
    failure = 'invalid Clef answer';
    if (json.success === false) throw new Error();
    spent += suggestionUsage(json.result).usd;
    spendUnknown = false;
    if (!canSuggest(spent)) spendStopped = true;
    const answer = parseSuggestion(json.result);
    failure = 'could not save validated answer';
    writeSuggestion(dir, id, json.result);
    return renderSuggestion(answer);
  } catch {
    if (spendUnknown) spendStopped = true;
    return `<p class="soft">Clef suggestion failed: ${failure}</p>`;
  }
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

// Missing linked indexes are normal before the first linked upload. Other failures stay visible.
const linkedRows: string[] = [];
const linkedRecords: LinkedRecord[] = [];
mkdirSync(join(dir, 'linked'), { recursive: true });
mkdirSync(join(dir, 'linked-replay'), { recursive: true });
mkdirSync(join(dir, 'linked-save'), { recursive: true });
let linkedWarning = '';
try {
  const rootIndex = join(dir, 'linked-index.json');
  get('private/linked-index.json', rootIndex);
  if (existsSync(rootIndex)) {
    const manifest = JSON.parse(readFileSync(rootIndex, 'utf8')) as { days: string[] };
    for (const day of manifest.days.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= since)) {
      const dayFile = join(dir, `linked-index-${day}.json`);
      try {
        get(`private/linked-index/${day}.json`, dayFile);
      } catch {
        linkedWarning = 'Some linked receipt days were unavailable; later days are still shown.';
        continue;
      }
      const dayIndex = JSON.parse(readFileSync(dayFile, 'utf8')) as { records: LinkedEntry[] };
      for (const entry of dayIndex.records) {
        if (
          !/^[a-f0-9]{32}$/.test(entry.id) ||
          !/^linked\/[a-f0-9]{32}\/[a-f0-9]{32}\.json\.gz$/.test(entry.key)
        )
          continue;
        const file = join(dir, 'linked', `${entry.player}-${entry.id}.json`);
        if (!existsSync(file)) {
          const gz = join(dir, 'gz', `${entry.player}-${entry.id}.json.gz`);
          get(entry.key, gz);
          const text = gunzipSync(readFileSync(gz), { maxOutputLength: 4 * 1024 * 1024 }).toString('utf8');
          const record: unknown = JSON.parse(text);
          if (
            !linkedRecord(record) ||
            record.id !== entry.id ||
            record.player !== entry.player ||
            record.session !== entry.session ||
            record.runId !== entry.runId ||
            record.game !== entry.game ||
            record.kind !== entry.kind
          )
            throw new Error('Linked index mismatch');
          writeFileSync(file, text);
        }
        const record: unknown = JSON.parse(readFileSync(file, 'utf8'));
        if (
          linkedRecord(record) &&
          record.id === entry.id &&
          record.player === entry.player &&
          record.session === entry.session &&
          record.runId === entry.runId &&
          record.game === entry.game &&
          record.kind === entry.kind
        )
          linkedRecords.push(record);
        else throw new Error('Linked cache mismatch');
      }
    }
  }
} catch {
  linkedWarning =
    'Linked inbox download incomplete or unavailable. Retry lab:inbox; cached files are retained.';
}
const players = new Map<string, LinkedRecord[]>();
for (const record of linkedRecords) {
  const records = players.get(record.player) ?? [];
  records.push(record);
  players.set(record.player, records);
}
const timelines = [...players]
  .map(([player, records]) => {
    records.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    return `<section><h2>Player ${esc(player)}</h2><p>${new Set(records.map((r) => r.game)).size} games · ${new Set(records.map((r) => r.session)).size} sessions</p><ol>${records.map((r) => `<li>${esc(new Date(r.at).toISOString())} · ${esc(r.game)} · ${r.kind} · run ${esc(r.runId)} · session ${esc(r.session)}<details><summary>Record ${esc(r.id)}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.kind === 'run' || r.kind === 'save' ? 'Snapshot data is in the linked exports below.' : JSON.stringify(r.data, null, 2))}</pre></details></li>`).join('')}</ol></section>`;
  })
  .join('');
const groups = new Map<string, LinkedRecord[]>();
for (const record of linkedRecords) {
  const key = linkedKey(record);
  const group = groups.get(key) ?? [];
  group.push(record);
  groups.set(key, group);
}
for (const [key, records] of groups) {
  records.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  writeFileSync(join(dir, 'linked', `${key}.json`), JSON.stringify(records));
  const first = records[0];
  if (!first) continue;
  const exports: string[] = [];
  for (const upload of linkedUploads(records)) {
    if (upload.status === 'complete') {
      const folder = upload.kind === 'run' ? 'linked-replay' : 'linked-save';
      writeFileSync(join(dir, folder, `${upload.name}.json`), JSON.stringify(upload.value));
      exports.push(
        `<a href="${folder}/${upload.name}.json" download>${upload.kind === 'run' ? 'replay' : 'save'} file</a>`,
      );
    } else exports.push(`${upload.kind}: ${esc(upload.status)}`);
  }
  linkedRows.push(`<article><h2>${esc(first.game)} · linked run <small>${esc(first.runId)}</small></h2>
<p class="soft">player ${esc(first.player)} · session ${esc(first.session)} · ${records.length} records · ${esc(new Date(first.at).toISOString())}</p>
<p>${exports.join(' · ') || 'No complete replay or save yet.'} · <a href="linked/${key}.json">all linked records</a></p>
${records
  .filter((r) => r.kind === 'note' || r.kind === 'logs')
  .map(
    (r) =>
      `<details><summary>${r.kind} · ${esc(new Date(r.at).toISOString())}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.kind === 'run' || r.kind === 'save' ? 'Snapshot data is in the linked exports below.' : JSON.stringify(r.data, null, 2))}</pre></details>`,
  )
  .join('')}
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
${spendStopped ? `<p><strong>${esc(spendStop())}</strong></p>\n` : ''}${rows.join('\n') || '<p>No legacy runs yet.</p>'}
<h2>Linked play records</h2><p class="soft">Random player ids link visits; they do not identify a person. These exports do not grant consent to character analysis.</p>
${linkedWarning ? `<p>${esc(linkedWarning)}</p>` : ''}${timelines}${linkedRows.join('\n') || '<p>No linked records fetched.</p>'}
</html>
`,
);
if (linkedWarning) console.warn(linkedWarning);
console.log(
  `lab inbox: ${entries.length} legacy runs (${fetched} new), ${players.size} linked players, ${linkedRecords.length} linked records. Open ${join(dir, 'index.html')}`,
);

if (suggest) {
  console.log(`Clef suggestions: ${calls} calls, ${cached} cached; ${spent.toFixed(8)} USD at list price.`);
  if (spendStopped) console.log(spendStop());
}
