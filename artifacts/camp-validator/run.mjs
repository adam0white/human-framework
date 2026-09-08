import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { dirname, resolve, relative } from 'node:path';
import * as story from '../../src/games/camp-story.js';
import * as camp from '../../src/games/camp.js';
import { restoreLocal } from '../../src/experiments/camp-validator/local.js';
import { fixtures } from '../../src/experiments/camp-validator/fixtures.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const graph = entry => { const seen = new Set(); function visit(path) { if (seen.has(path)) return; seen.add(path); for (const match of readFileSync(path, 'utf8').matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) visit(relative(process.cwd(), resolve(dirname(path), match[1]))); } visit(entry); return [...seen].sort(); };
const paths = [...new Set([...graph('src/experiments/camp-validator/fixtures.js'), ...graph('src/experiments/camp-validator/local.js'), 'artifacts/camp-validator/run.mjs', 'docs/camp-validator.md', 'tests/camp-validator.test.js'])].sort();
const sources = Object.fromEntries(paths.map(path => { const data = readFileSync(path); assert.equal(sha(data), sha(execFileSync('git', ['show', `${sourceCommit}:${path}`])), `Commit source first: ${path}`); return [path, sha(data)]; }));
const costs = entry => { const direct = readFileSync(entry, 'utf8'), files = graph(entry); return { directBytes: Buffer.byteLength(direct), directNonblankLines: direct.split('\n').filter(l => l.trim()).length, inclusiveBytes: files.reduce((n, p) => n + readFileSync(p).length, 0), files }; };
const output = process.argv[2]; if (!output) throw new Error('New output directory required'); mkdirSync(output);
const results = [];
for (const fixture of fixtures()) {
  const raw = JSON.stringify(fixture.snapshot), result = { name: fixture.name, kind: fixture.kind, purpose: fixture.purpose ?? null, bytes: Buffer.byteLength(raw), journalCommands: fixture.snapshot.game.record?.commands.length ?? 0, inputSha256: sha(raw) };
  try { camp.restoreGame({ format: 'human-camp', version: 2, game: fixture.snapshot.game.world }); result.kernelAccepted = true; } catch (error) { result.kernelAccepted = false; result.kernelError = error.message; }
  for (const [label, restore] of [['replay', story.restoreGame], ['local', restoreLocal]]) {
    const trials = []; let outcome;
    for (let n = 0; n < 3; n++) {
      const start = performance.now();
      try { const game = restore(JSON.parse(raw)); outcome = { accepted: true, physicalSha256: sha(JSON.stringify(game.world)) }; }
      catch (error) { outcome = { accepted: false, error: error.message }; }
      trials.push(performance.now() - start);
    }
    result[label] = { ...outcome, milliseconds: trials, medianMs: trials.slice().sort((a, b) => a - b)[1] };
  }
  const withoutJournal = structuredClone(fixture.snapshot); if (withoutJournal.game.record) delete withoutJournal.game.record.commands;
  result.commandOmittedProjectionBytes = Buffer.byteLength(JSON.stringify(withoutJournal)); // Size only: not an implemented save format.
  writeFileSync(resolve(output, `${fixture.name}.json`), raw + '\n', { flag: 'wx' });
  results.push(result); console.log(JSON.stringify({ name: result.name, kernel: result.kernelAccepted, replay: result.replay.accepted, local: result.local.accepted }));
}
writeFileSync(resolve(output, 'report.json'), JSON.stringify({ sourceCommit, sources, node: process.version, protocol: '0d0cdd0', sourceCosts: { replayHost: costs('src/games/camp-story.js'), localValidator: costs('src/experiments/camp-validator/local.js') }, results }, null, 2) + '\n', { flag: 'wx' });
