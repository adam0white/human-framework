/**
 * `npm run lab:inbox`: the owner's private view of runs sent to the lab notebook. Reads the private run index
 * from the R2 bucket `hf-lab` with Wrangler (your own Cloudflare login; nothing is exposed on the web), downloads
 * runs not yet fetched, and writes `.lab-inbox/` (git-ignored):
 *   runs/<id>.json        the envelope as sent: game, note, who, build, run
 *   replay/<id>.json      the game's own export, to load with the game's "Replay a run file"
 *   index.html            every run with its note, newest first; open it in a browser
 * Options: --days=N (default 30) limits which runs are downloaded. --suggest opts into Clef suggestions.
 * `npm run lab:inbox -- --drain` reads missing linked payloads with eight readers for up to one hour.
 * Readers share request pacing and a five-minute pause when the account API throttles.
 * Runs report phase times and keep the entire cache. Only one invocation may write the cache at a time.
 * `.lab-inbox/.download-lock` holds the writer's PID and a nonce. Any existing lock stops the run and is kept;
 * after a killed writer, delete the file by hand once the owner has stopped. A run removes only its own lock.
 * With --suggest, only the first word of envelope `who` and notes of at least three words go to
 * Cloudflare Workers AI @cf/cloudflare/clef (never the run, build, game or full identity). Answers stay in
 * suggest/<id>.json; invalid caches are moved aside and re-asked once per invocation.
 * Linked v2 manifests also export private per-player/game/session/run groups and complete replay/save
 * chunks. Missing/conflicting chunks are visible and never exported as a complete file. No linked
 * payload goes to AI. Downloaded files are local copies: R2 retention does not delete them.
 * No feedback goes to the ledger or back to R2. Shared AI budget reservations are written to R2.
 * Cost: about 0.0003 USD a note, at 0.24 USD per million input tokens (output free). Stop new calls once
 * response usage reaches 0.05 USD per invocation or usage cannot be read. Shared daily/lifetime reservations also apply. Cached answers cost nothing.
 * The page reports a stop.
 */
import { execFile, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { gunzipSync } from 'node:zlib';
import {
  type LinkedEntry,
  type LinkedRecord,
  legacyPlayer,
  linkedKey,
  linkedRecord,
  linkedUploads,
  playerNames,
  sourceSections,
} from './lab-inbox-linked.ts';
import { personaMeasurements } from './lab-inbox-persona.ts';
import {
  buildNoteRequest,
  canSuggest,
  MODEL,
  parseSuggestion,
  readSuggestion,
  renderSuggestion,
  suggestionUsage,
  writeSuggestion,
} from './lab-inbox-suggest.ts';
import { HEADROOM_STOP, waiRun } from './lab-wai-budget.ts';

const suggest = process.argv.includes('--suggest');
const expectedDay = process.argv
  .find((arg) => arg.startsWith('--expected-day='))
  ?.slice('--expected-day='.length);
let calls = 0;
let cached = 0;
let spent = 0;
let spendStopped = false;
let spendUnknown = false;
let headroomStopped = false;
const preplay = process.argv.includes('--budget-phase=preplay');
const spendStop = () =>
  headroomStopped
    ? 'Clef suggestions stopped at a local budget gate; smaller jobs may still fit.'
    : spendUnknown
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
    if (spendStopped || spendUnknown || !canSuggest(spent)) {
      spendStopped = true;
      return '';
    }
    failure = 'guarded Clef request could not complete';
    calls++;
    spendUnknown = true;
    const { result } = await waiRun(MODEL, request, expectedDay, preplay ? 'preplay' : 'control');
    const json = { result };
    spent += suggestionUsage(json.result).usd;
    spendUnknown = false;
    if (!canSuggest(spent)) spendStopped = true;
    const answer = parseSuggestion(json.result);
    failure = 'could not save validated answer';
    writeSuggestion(dir, id, json.result);
    return renderSuggestion(answer);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === HEADROOM_STOP || error.message === 'STOP: daily neuron cap reached')
    ) {
      headroomStopped = true;
      spendUnknown = false;
      spendStopped = true;
    }
    if (spendUnknown) spendStopped = true;
    return `<p class="soft">Clef suggestion failed: ${failure}</p>`;
  }
}

const root = join(import.meta.dirname, '..');
const dir = join(root, '.lab-inbox');
const BUCKET = 'hf-lab';
const days = Number(process.argv.find((a) => a.startsWith('--days='))?.slice(7) ?? 30);

// Hourly runs leave time to render within a 90-second heartbeat. An explicit
// drain gets one hour and eight payload readers; receipts still refresh first.
const drain = process.argv.includes('--drain');
const started = Date.now();
const deadline = started + (drain ? 3_600_000 : 65_000);
let phaseStarted = started;
function phase(name: string) {
  const now = Date.now();
  console.log(`Inbox phase ${name}: ${((now - phaseStarted) / 1000).toFixed(1)} s`);
  phaseStarted = now;
}
function download(key: string, file: string) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Inbox download budget exhausted');
  return {
    temporary: `${file}.partial`,
    args: [
      join(root, 'node_modules/wrangler/wrangler-dist/cli.js'),
      'r2',
      'object',
      'get',
      `${BUCKET}/${key}`,
      '--remote',
      '--file',
      `${file}.partial`,
    ],
    options: {
      cwd: root,
      timeout: Math.min(10_000, remaining),
      killSignal: 'SIGKILL' as const,
    },
  };
}
function acceptDownload(key: string, temporary: string, file: string) {
  // Validate before replacing any cached receipt or compressed payload.
  if (key.startsWith('linked/')) gunzipSync(readFileSync(temporary), { maxOutputLength: 4 * 1024 * 1024 });
  else if (key.endsWith('.json')) {
    const value = JSON.parse(readFileSync(temporary, 'utf8'));
    const field =
      key === 'private/index.json' ? 'runs' : key === 'private/linked-index.json' ? 'days' : 'records';
    if (!value || !Array.isArray(value[field])) throw new Error('Invalid inbox receipt');
  }
  renameSync(temporary, file);
}
function get(key: string, file: string) {
  const { temporary, args, options } = download(key, file);
  try {
    execFileSync(process.execPath, args, { ...options, stdio: ['ignore', 'ignore', 'pipe'] });
    acceptDownload(key, temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}
// Keep below the Cloudflare account API request limit, including other readers.
// A 429 pauses every reader, rather than making the remaining queue fail at once.
// Match the HTTP status when Wrangler exposes one, then a few known message forms. An unmatched throttle is
// an ordinary failure: the record stays pending and is retried on the next run.
function throttled(error: unknown, text: string) {
  const status =
    (error as { status?: unknown; statusCode?: unknown }).status ??
    (error as { statusCode?: unknown }).statusCode;
  return status === 429 || /\b429\b|rate.?limit|too many requests|\[code: 971\]/i.test(text);
}
let nextPayloadAt = 0;
let payloadCooldownUntil = 0;
async function getPayload(key: string, file: string) {
  if (!drain) return get(key, file);
  for (let attempt = 0; attempt < 3; attempt++) {
    for (;;) {
      const now = Date.now();
      const ready = Math.max(nextPayloadAt, payloadCooldownUntil);
      if (now >= deadline) throw new Error('Inbox download budget exhausted');
      if (now >= ready) {
        nextPayloadAt = now + 350;
        break;
      }
      await sleep(Math.min(ready - now, deadline - now));
    }
    const { temporary, args, options } = download(key, file);
    let limited = false;
    try {
      // Read only the throttle signal; never print CLI output or credentials.
      await new Promise<void>((resolve, reject) => {
        execFile(process.execPath, args, options, (error, stdout, stderr) => {
          limited = !!error && throttled(error, `${stdout} ${stderr}`);
          if (error) reject(error);
          else resolve();
        });
      });
      acceptDownload(key, temporary, file);
      return;
    } catch (error) {
      if (!limited) throw error;
      if (Date.now() >= payloadCooldownUntil)
        console.warn('Inbox API throttled; pausing payload readers for five minutes.');
      payloadCooldownUntil = Math.max(payloadCooldownUntil, Date.now() + 300_000);
      if (attempt === 2) throw new Error('Inbox API remains throttled; record retained for retry');
    } finally {
      rmSync(temporary, { force: true });
    }
  }
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
type Envelope = {
  game: string;
  note?: string;
  who?: string;
  name?: string;
  build?: Record<string, string>;
  run: unknown;
};

mkdirSync(dir, { recursive: true });
// A drain can overlap the hourly caller. One writer owns the cache until exit.
// Any existing lock stops the run and is left alone, whether its writer is live, dead or unknown.
// Only the operator removes a lock, and only after the owner has stopped.
const lock = join(dir, '.download-lock');
const lockBody = JSON.stringify({ pid: process.pid, nonce: randomBytes(16).toString('hex') });
let lockFd: number;
try {
  lockFd = openSync(lock, 'wx');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'EEXIST')
    throw new Error(
      `Inbox cache is locked (${lock}); the lock was left in place. If its writer has stopped, delete the file by hand and run again.`,
    );
  throw error;
}
const lockFile = fstatSync(lockFd);
// The exit handler removes only the file this process created, found by its body and identity.
function releaseLock() {
  try {
    const now = statSync(lock);
    if (now.dev === lockFile.dev && now.ino === lockFile.ino && readFileSync(lock, 'utf8') === lockBody)
      unlinkSync(lock);
  } catch {
    // The lock is already gone or replaced; it is not ours to touch.
  }
}
try {
  writeSync(lockFd, lockBody);
} catch (error) {
  // Keep the original write error. Any lock stays for explicit operator recovery.
  try {
    closeSync(lockFd);
  } catch {
    // A close failure must not mask the write error.
  }
  throw error;
}
closeSync(lockFd);
process.once('exit', releaseLock);
mkdirSync(join(dir, 'runs'), { recursive: true });
mkdirSync(join(dir, 'replay'), { recursive: true });
mkdirSync(join(dir, 'gz'), { recursive: true });
try {
  get('private/index.json', join(dir, 'index.json'));
} catch {
  console.warn('Legacy index refresh unavailable; cached receipts are retained.');
}
const index = (
  existsSync(join(dir, 'index.json'))
    ? JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'))
    : { runs: [] }
) as {
  runs: Entry[];
};
const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const entries = index.runs
  .filter((r) => r.key.slice(5, 15) >= since)
  .sort((a, b) => b.key.localeCompare(a.key));

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const rows: string[] = [];
let fetched = 0;
const legacyRuns: { entry: Entry; env: Envelope; suggestion: string }[] = [];
// Missing linked indexes are normal before the first linked upload. Other failures stay visible.
const sections: string[] = [];
const linkedRecords: LinkedRecord[] = [];
mkdirSync(join(dir, 'linked'), { recursive: true });
mkdirSync(join(dir, 'linked-replay'), { recursive: true });
mkdirSync(join(dir, 'linked-save'), { recursive: true });
let linkedWarning = '';
let pending = 0;
const receiptEntries = new Map<string, LinkedEntry>();
phase('legacy index and cache setup');
const rootIndex = join(dir, 'linked-index.json');
try {
  get('private/linked-index.json', rootIndex);
} catch {
  linkedWarning = 'Linked receipt refresh unavailable; cached files are retained.';
}
phase('linked manifest');
const manifest = existsSync(rootIndex)
  ? (JSON.parse(readFileSync(rootIndex, 'utf8')) as { days: string[] })
  : { days: [] };
// Refresh newest receipts first, before ANY payload. Cached days remain a durable
// queue even if a later remote manifest no longer includes them. Never prune locally.
const receiptDays = [
  ...new Set([
    ...manifest.days,
    ...readdirSync(dir).flatMap(
      (file) => /^linked-index-(\d{4}-\d{2}-\d{2})\.json$/.exec(file)?.slice(1) ?? [],
    ),
  ]),
]
  .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= since)
  .sort()
  .reverse();
for (const day of receiptDays) {
  const dayFile = join(dir, `linked-index-${day}.json`);
  const previous = existsSync(dayFile)
    ? (JSON.parse(readFileSync(dayFile, 'utf8')) as { records: LinkedEntry[] }).records
    : [];
  try {
    get(`private/linked-index/${day}.json`, `${dayFile}.download`);
  } catch {
    linkedWarning = 'Some linked receipt days were unavailable; cached files are retained.';
  }
  const received = existsSync(`${dayFile}.download`)
    ? (JSON.parse(readFileSync(`${dayFile}.download`, 'utf8')) as { records: LinkedEntry[] }).records
    : [];
  const retained = new Map([...previous, ...received].map((entry) => [entry.key, entry]));
  if (existsSync(dayFile) || existsSync(`${dayFile}.download`)) {
    writeFileSync(`${dayFile}.partial`, JSON.stringify({ records: [...retained.values()] }));
    renameSync(`${dayFile}.partial`, dayFile);
    rmSync(`${dayFile}.download`, { force: true });
  }
  for (const entry of retained.values()) {
    if (
      !/^[a-f0-9]{32}$/.test(entry.id) ||
      !/^[a-f0-9]{32}$/.test(entry.player) ||
      entry.key !== `linked/${entry.player}/${entry.id}.json.gz`
    )
      continue;
    receiptEntries.set(entry.key, entry);
  }
}
phase('linked receipt days');
// Notes first so owner feedback does not wait behind replay chunks. Within each
// class the oldest missing receipt wins; a failed object does not block the rest.
const queue = [...receiptEntries.values()].sort(
  (a, b) =>
    Number(b.kind === 'note') - Number(a.kind === 'note') || a.at - b.at || a.key.localeCompare(b.key),
);
async function receive(entry: LinkedEntry): Promise<LinkedRecord | undefined> {
  const file = join(dir, 'linked', `${entry.player}-${entry.id}.json`);
  try {
    if (existsSync(file)) {
      try {
        const record: unknown = JSON.parse(readFileSync(file, 'utf8'));
        if (!matches(record, entry)) throw new Error('Linked cache mismatch');
        return record;
      } catch {
        // Repair atomically below; retain the original until a valid replacement exists.
      }
    }
    const gz = join(dir, 'gz', `${entry.player}-${entry.id}.json.gz`);
    let received: ReturnType<typeof decodeLinked>;
    try {
      // Reuse complete compressed files left by an interrupted invocation.
      received = decodeLinked(gz, entry);
    } catch {
      await getPayload(entry.key, gz);
      received = decodeLinked(gz, entry);
    }
    writeFileSync(`${file}.partial`, received.text);
    renameSync(`${file}.partial`, file);
    return received.record;
  } catch {
    pending++;
    return undefined;
  }
}
// Each worker claims one distinct key. Preserve queue order in the rendered data.
const received = new Array<LinkedRecord | undefined>(queue.length);
let next = 0;
let completed = 0;
let progressAt = Date.now();
await Promise.all(
  Array.from({ length: drain ? 8 : 1 }, async () => {
    while (next < queue.length) {
      const index = next++;
      const entry = queue[index];
      if (!entry) continue;
      received[index] = await receive(entry);
      completed++;
      if (drain && Date.now() - progressAt >= 30_000) {
        console.log(`Inbox drain: ${completed}/${queue.length} checked; ${pending} pending so far.`);
        progressAt = Date.now();
      }
    }
  }),
);
for (const record of received) if (record) linkedRecords.push(record);
phase('linked payloads and cache validation');
function decodeLinked(file: string, entry: LinkedEntry) {
  const text = gunzipSync(readFileSync(file), { maxOutputLength: 4 * 1024 * 1024 }).toString('utf8');
  const record: unknown = JSON.parse(text);
  if (!matches(record, entry)) throw new Error('Linked index mismatch');
  return { text, record };
}
function matches(record: unknown, entry: LinkedEntry): record is LinkedRecord {
  return (
    linkedRecord(record) &&
    record.id === entry.id &&
    record.player === entry.player &&
    record.session === entry.session &&
    record.runId === entry.runId &&
    record.game === entry.game &&
    record.kind === entry.kind
  );
}
if (pending)
  linkedWarning += ` ${pending} linked records pending; retry lab:inbox to resume. Cached files are retained.`;
for (const e of entries) {
  const envFile = join(dir, 'runs', `${e.id}.json`);
  if (!existsSync(envFile)) {
    const gz = join(dir, 'gz', `${e.id}.json.gz`);
    try {
      get(e.key, gz);
    } catch {
      console.warn('Legacy run pending; retry lab:inbox to resume.');
      continue;
    }
    const text = gunzipSync(readFileSync(gz)).toString('utf8');
    writeFileSync(envFile, text);
    writeFileSync(join(dir, 'replay', `${e.id}.json`), JSON.stringify((JSON.parse(text) as Envelope).run));
    fetched++;
  }
  const env = JSON.parse(readFileSync(envFile, 'utf8')) as Envelope;
  const suggestion = suggest ? await suggestionLine(e.id, env) : '';
  legacyRuns.push({ entry: e, env, suggestion });
}

phase('legacy payloads');
const names = playerNames(linkedRecords);
const playerLabel = (player: string) =>
  names.get(player) ? `${names.get(player)} · player ${player}` : `Player ${player}`;
for (const { entry: e, env, suggestion } of legacyRuns) {
  const player = legacyPlayer(env, names);
  rows.push(`<article>
  <h2>${esc(e.game)} <small class="badge">unattributed</small> <small>${esc(e.hour.replace('T', ' '))}:00 UTC · ${esc(e.id)}${env.name || env.who ? ` · ${esc(env.name || env.who || '')}` : ''}${player ? ` · possible label match: ${esc(playerLabel(player))}` : ''}</small></h2>
  ${env.note ? `<blockquote>${esc(env.note).replace(/\n/g, '<br>')}</blockquote>` : '<p class="soft">No note.</p>'}${suggestion ? `\n  ${suggestion}` : ''}
  <p class="soft">build ${esc(env.build?.c ?? '?')} · HF ${esc(env.build?.hf ?? '?')} · game ${esc(env.build?.a ?? '?')} ·
  <a href="replay/${esc(e.id)}.json" download>replay file</a> (load it in <a href="https://${esc(e.game)}.adamwhite.work">the game</a> with “Replay a run file”) ·
  <a href="runs/${esc(e.id)}.json">everything sent</a></p>
</article>`);
}
const playerCount = new Set(linkedRecords.map((r) => r.player)).size;
for (const source of sourceSections(linkedRecords)) {
  const linkedRows: string[] = [];
  const badge = `<small class="badge">${source.label}</small>`;
  const players = new Map<string, LinkedRecord[]>();
  for (const record of source.records) {
    const records = players.get(record.player) ?? [];
    records.push(record);
    players.set(record.player, records);
  }
  const timelines = [...players]
    .map(([player, records]) => {
      records.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
      return `<section><h2>${esc(playerLabel(player))} ${badge}${source.mixedPlayers.has(player) ? ' <small>mixed attribution; records separated</small>' : ''}</h2><p>${new Set(records.map((r) => r.game)).size} games · ${new Set(records.map((r) => r.session)).size} sessions</p><ol>${records.map((r) => `<li>${esc(new Date(r.at).toISOString())} · ${esc(r.game)} · ${r.kind} · ${badge} · run ${esc(r.runId)} · session ${esc(r.session)}<details><summary>Record ${esc(r.id)} · ${badge}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.kind === 'run' || r.kind === 'save' ? 'Snapshot data is in the linked exports below.' : JSON.stringify(r.data, null, 2))}</pre></details></li>`).join('')}</ol>${legacyRuns
        .filter(({ env }) => source.label === 'unattributed' && legacyPlayer(env, names) === player)
        .map(
          ({ entry: e, env }) =>
            `<p>Legacy run · possible label match · ${esc(e.game)} · ${esc(e.hour)} · ${esc(env.note ?? '')} · <a href="replay/${esc(e.id)}.json" download>replay file</a></p>`,
        )
        .join('')}</section>`;
    })
    .join('');
  const groups = new Map<string, LinkedRecord[]>();
  for (const record of source.records) {
    const key = linkedKey(record);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  for (const [key, records] of groups) {
    records.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    writeFileSync(join(dir, 'linked', `${key}-${source.label}.json`), JSON.stringify(records));
    const first = records[0];
    if (!first) continue;
    const exports: string[] = [];
    for (const upload of linkedUploads(records)) {
      if (upload.status === 'complete') {
        const folder = upload.kind === 'run' ? 'linked-replay' : 'linked-save';
        writeFileSync(join(dir, folder, `${upload.name}-${source.label}.json`), JSON.stringify(upload.value));
        exports.push(
          `<a href="${folder}/${upload.name}-${source.label}.json" download>${upload.kind === 'run' ? 'replay' : 'save'} file</a>`,
        );
      } else exports.push(`${upload.kind}: ${esc(upload.status)}`);
    }
    linkedRows.push(`<article><h2>${esc(first.game)} ${badge} · linked run <small>${esc(first.runId)}</small></h2>
<p class="soft">${esc(playerLabel(first.player))} · session ${esc(first.session)} · ${records.length} records · ${esc(new Date(first.at).toISOString())}</p>
<p>${exports.join(' · ') || 'No complete replay or save yet.'} · <a href="linked/${key}-${source.label}.json">all linked records</a></p>
${records
  .filter((r) => r.kind === 'note' || r.kind === 'logs')
  .map(
    (r) =>
      `<details><summary>${r.kind} · ${esc(new Date(r.at).toISOString())} · ${badge}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.kind === 'run' || r.kind === 'save' ? 'Snapshot data is in the linked exports below.' : JSON.stringify(r.data, null, 2))}</pre></details>`,
  )
  .join('')}
</article>`);
  }

  sections.push(
    `<h2>${source.title}</h2>${timelines}${linkedRows.join('\n') || '<p>No records fetched.</p>'}`,
  );
}

const personas = personaMeasurements(linkedRecords);
writeFileSync(join(dir, 'one-cast.json'), JSON.stringify(personas, null, 2));
const castRows = personas.rows
  .map(
    (r) =>
      `<tr>${[r.game, r.probe, r.arm, r.scope, r.stage, r.outcome].map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`,
  )
  .join('');
writeFileSync(
  join(dir, 'index.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lab inbox (private)</title>
<style>body{font:17px/1.5 Literata,Georgia,serif;background:#F3ECDD;color:#23201B;max-width:44rem;margin:0 auto;padding:16px}
.badge{border:1px solid currentColor;border-radius:.25rem;padding:0 .3rem}h2{font-size:1.1rem;margin:1.4rem 0 .2rem}small,.soft{color:#6E665A;font-weight:400}blockquote{margin:.3rem 0;padding-left:.8rem;border-left:2px solid #C2412D}
@media (prefers-color-scheme:dark){body{background:#1E1B16;color:#E8DFCC}small,.soft{color:#9A9080}}</style>
<h1>Lab inbox</h1><p class="soft">Private, on this machine only. ${entries.length} runs in the last ${days} days. Made ${new Date().toISOString().slice(0, 16)} by npm run lab:inbox.</p>
${spendStopped ? `<p><strong>${esc(spendStop())}</strong></p>\n` : ''}${rows.join('\n') || '<p>No legacy runs yet.</p>'}
<h2>One cast</h2><p>${personas.milestones} received run milestones (${personas.rows.length} revision records) · ${personas.joins} shared-only linked cross-game branches · ${personas.fileJoins} file-origin linked cross-game branches · ${personas.incomplete} incomplete replay uploads excluded. <a href="one-cast.json">Private continuity measurements</a></p>
<p class="soft">Counts include agent and unattributed records. Counts use complete received exports, deduplicated by player, game, run, probe, cast and stage. File/local imports are separate. Missing, recording-off and privacy-suppressed plays are outside these counts. Recognition and attachment require the player's words.</p>
<table><thead><tr><th>Game</th><th>Probe</th><th>Arm</th><th>Scope</th><th>Stage</th><th>Outcome</th></tr></thead><tbody>${castRows}</tbody></table>
<h2>Linked play records</h2><p class="soft">Random player ids link visits. An optional feedback name labels the entire player timeline. Source labels are self-declared, not authentication. Missing labels are unattributed. Legacy records are unattributed. Legacy matches use an exact current name or player id; names are unverified and ambiguous matches are omitted. These exports do not grant consent to character analysis.</p>
${linkedWarning ? `<p>${esc(linkedWarning)}</p>` : ''}${sections.join('\n')}
</html>
`,
);
phase('render and exports');
console.log(
  `One cast: ${personas.milestones} received milestones, ${personas.joins} shared-only linked branches, ${personas.fileJoins} file-origin linked branches, ${personas.incomplete} incomplete uploads excluded.`,
);
if (linkedWarning) console.warn(linkedWarning);
console.log(
  `lab inbox: ${entries.length} legacy runs (${fetched} new), ${playerCount} linked players, ${linkedRecords.length} linked records (${pending} pending; ${((Date.now() - started) / 1000).toFixed(1)} s). Open ${join(dir, 'index.html')}`,
);

if (suggest) {
  console.log(`Clef suggestions: ${calls} calls, ${cached} cached; ${spent.toFixed(8)} USD at list price.`);
  if (spendStopped) console.log(spendStop());
  // A scheduled caller must not continue after a guarded request with unknown outcome.
  if (expectedDay && spendUnknown) process.exitCode = 1;
  else if (expectedDay && headroomStopped) process.exitCode = 2;
}
