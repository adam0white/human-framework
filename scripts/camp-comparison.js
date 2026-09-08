import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), mode = args.shift();
const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const head = git(['rev-parse', 'HEAD']);
const read = path => readFileSync(resolve(root, path));
const parse = path => JSON.parse(path.endsWith('.gz') ? gunzipSync(read(path)) : read(path));
function graph(entry) {
  const seen = new Set();
  function visit(path) {
    if (seen.has(path)) return;
    seen.add(path);
    const source = read(path).toString();
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) visit(relative(root, resolve(root, dirname(path), match[1])));
  }
  visit(entry);
  return [...seen].sort();
}
function metrics(paths) {
  const files = paths.map(path => ({ path, bytes: read(path).byteLength, nonblankLines: read(path).toString().split('\n').filter(s => s.trim()).length }));
  return { files, bytes: files.reduce((n, f) => n + f.bytes, 0), nonblankLines: files.reduce((n, f) => n + f.nonblankLines, 0) };
}
function sources() {
  const files = new Set([...graph('src/games/camp-story.js'), ...graph('src/experiments/camp-story/comparison.js'),
    'scripts/camp-comparison.js', 'scripts/runtime-release-lock.json', 'docs/camp-comparison-protocol.md',
    'docs/camp-comparison-reserved.md', 'artifacts/user-runs/2026-09-07/common-ground-minute-1312.json',
    ...readdirSync(resolve(root, 'tests')).filter(p => p.startsWith('camp-comparison') && p.endsWith('.test.js')).map(p => `tests/${p}`)]);
  return Object.fromEntries([...files].sort().map(path => {
    const committed = execFileSync('git', ['show', `${head}:${path}`], { cwd: root });
    assert.equal(sha(read(path)), sha(committed), `Commit relevant source first: ${path}`);
    return [path, sha(committed)];
  }));
}
function loadFreeze(path) {
  const freeze = JSON.parse(read(path));
  assert.equal(freeze.format, 'camp-comparison-freeze-1');
  for (const [file, hash] of Object.entries(freeze.sources)) assert.equal(sha(read(file)), hash, `Frozen source changed: ${file}`);
  execFileSync('git', ['cat-file', '-e', `${head}:${relative(root, resolve(root, path))}`], { cwd: root });
  return freeze;
}
function save(path, value, compress = false) {
  mkdirSync(dirname(path), { recursive: true });
  const raw = Buffer.from(JSON.stringify(value, null, 2) + '\n'), destination = compress ? path + '.gz' : path;
  const stored = compress ? gzipSync(raw, { level: 9 }) : raw;
  if (compress) assert.deepEqual(gunzipSync(stored), raw, 'Compression changed payload bytes');
  writeFileSync(destination, stored, { flag: 'wx' });
  return { file: relative(dirname(path), destination), sha256: sha(raw), bytes: raw.length };
}
if (mode === 'freeze') {
  const out = resolve(root, option('--out'));
  save(out, { format: 'camp-comparison-freeze-1', sourceCommit: head, registrationCommit: '10a623f', validationStage: option('--stage') ?? 'post-review', artifactEncoding: args.includes('--gzip') ? 'gzip-json' : 'plain-json', sources: sources(),
    sourceCosts: { kernel: metrics(['src/games/camp.js']), wrapper: metrics(['src/games/camp-story.js']),
      inclusiveCamp: metrics(graph('src/games/camp.js')), inclusiveStory: metrics(graph('src/games/camp-story.js')) } });
  console.log(JSON.stringify({ freeze: out, sourceCommit: head }));
} else if (mode === 'run' || mode === 'replay') {
  const freeze = loadFreeze(option('--freeze'));
  const partition = mode === 'replay' ? parse(option('--input')).partition : option('--partition');
  const compressed = freeze.artifactEncoding === 'gzip-json', payloads = {};
  assert.ok(['development', 'reserved'].includes(partition));
  const out = resolve(root, option('--out'));
  assert.equal(existsSync(out), false, 'Evidence output already exists');
  mkdirSync(out, { recursive: true });
  const { casesFor } = await import('../src/experiments/camp-story/comparison.js');
  const records = [];
  for (const [name, execute] of casesFor(partition)) {
    let record;
    try { record = { name, status: 'passed', evidence: await execute() }; }
    catch (error) { record = { name, status: 'failed', error: { name: error.name, message: error.message, stack: error.stack } }; }
    records.push(record);
    payloads[`${name}.json`] = save(resolve(out, `${name}.json`), record, compressed);
    console.log(JSON.stringify({ name, status: record.status }));
  }
  const report = { format: 'camp-comparison-1', sourceCommit: freeze.sourceCommit, sources: freeze.sources, partition, validationStage: freeze.validationStage ?? 'initial',
    environment: { node: process.version, platform: process.platform, architecture: process.arch }, sourceCosts: freeze.sourceCosts,
    records, summary: { cases: records.length, passed: records.filter(r => r.status === 'passed').length, failed: records.filter(r => r.status === 'failed').length } };
  payloads['report.json'] = save(resolve(out, 'report.json'), report, compressed);
  save(resolve(out, 'manifest.json'), { sourceCommit: freeze.sourceCommit, validationStage: report.validationStage, encoding: compressed ? 'gzip-json' : 'plain-json', payloads, files: Object.fromEntries(readdirSync(out).map(p => [p, sha(readFileSync(resolve(out, p)))])) });
  if (mode === 'replay') {
    const original = parse(option('--input'));
    assert.deepEqual(report.records, original.records, 'Current source replay differs from retained records');
    save(resolve(out, 'replay.json'), { exactRecords: true, original: option('--input'), node: process.version });
  }
  if (report.summary.failed) process.exitCode = 1;
} else throw new Error('Use freeze --out FILE, run --freeze FILE --partition development|reserved --out NEWDIR, or replay --freeze FILE --input REPORT --out NEWDIR');
