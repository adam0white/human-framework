/** Cheap source reading audit. No network/model calls; see docs/lab/plain-english.md. */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';

const args = process.argv.slice(2);
const option = (key: string) => {
  const at = args.indexOf(key);
  return at < 0 ? undefined : args[at + 1];
};
const repo = resolve(option('--repo') ?? '.');
const game = option('--game') ?? 'all';
const baseline = option('--baseline');
const git = (...argv: string[]) =>
  execFileSync('git', ['-C', repo, ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let files = (
  baseline
    ? git('ls-tree', '-r', '--name-only', baseline)
    : git('ls-files', '--cached', '--others', '--exclude-standard')
)
  .split('\n')
  .filter((file) => {
    if (
      !/\.(?:tsx?|jsx?|html)$/.test(file) ||
      /(?:^|\/)(?:tests?|fixtures|archive|dist|scripts)\/|\.(?:test|spec)\./.test(file)
    )
      return false;
    if (!/^(?:src|neighbours\/src|apps\/site\/src|index\.html|neighbours\/index\.html)/.test(file))
      return false;
    if (game === 'all' || !file.startsWith('apps/site/')) return true;
    const folder = game === 'well' ? 'colony' : game;
    return file.startsWith(`apps/site/src/${folder}/`) || file.startsWith('apps/site/src/shared/');
  });
if (game === 'neighbours' && files.some((file) => file.startsWith('neighbours/src/')))
  files = files.filter((file) => file.startsWith('neighbours/'));
if (files.length === 0)
  throw new Error(
    `No source coverage for ${game} in ${repo}. Check --repo and --game; zero is not a reading result.`,
  );
const vocabulary: Record<string, string[]> = {
  voice: ['Mention', 'Urge', 'Insist', 'standing suggestion'],
  watch: ['winter hopes', 'thaw', 'granary', 'lantern', 'relief'],
  well: ['Human', 'Classic', 'shelter', 'forecast'],
  pass: ['meal break', 'shift', 'station'],
  glance: ['gauge', 'keeper', 'reading'],
  murmur: ['prompting', 'reflection', 'urge'],
  repair: ['diagnosis', 'repair', 'estimate'],
  valley: ['season', 'household', 'harvest'],
  stairwell: ['kapıcı', 'resident', 'shift'],
  warren: ['watch', 'raid', 'refuge'],
  hearsay: ['rumour', 'source', 'witness'],
  goodhands: ['appointment', 'care', 'shift'],
  rope: ['belay', 'pitch', 'anchor'],
  neighbours: ['district', 'proposal', 'council'],
  commonstead: ['household', 'field', 'store'],
};
const terms = option('--terms')?.split(',').filter(Boolean) ?? [
  'continuity',
  'checkpoint',
  'seed',
  'persona',
  'admission',
  'provenance',
  ...(game === 'all' ? [...new Set(Object.values(vocabulary).flat())] : (vocabulary[game] ?? [])),
];
const verb =
  /\b(?:am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|should|must|may|might|looks?|seems?|feels?|wants?|needs?|helps?|keeps?|starts?|ends?|gets?|takes?|gives?|makes?|chooses?|decides?|says?|hears?|waits?|goes?|comes?|returns?|opens?|closes?|replaces?|records?|links?|shows?|saves?|moves?|reads?|tells?|stays?|lets?|finds?|knows?|tries?|works?|lives?|died|said|took|gave|made|left|went|came|begins?|agrees?|shares?|sends?)\b/i;
const rows: { file: string; line: number; text: string; flags: string[] }[] = [];
for (const file of files) {
  let source: string;
  try {
    source = baseline ? git('show', `${baseline}:${file}`) : readFileSync(resolve(repo, file), 'utf8');
  } catch {
    continue;
  }
  const add = (offset: number, raw: string) => {
    const text = raw.replace(/\s+/g, ' ').trim();
    // High recall candidates, not a claim that every string appears on screen.
    if (!/[a-z]{2}/i.test(text) || text.split(/\s+/).length < 3 || /^(?:https?:|[.#/])/.test(text)) return;
    const flags: string[] = [];
    const sentences = text.split(/[.!?]+(?:\s|$)/).filter(Boolean);
    if (sentences.some((sentence) => sentence.split(/\s+/).length > 24)) flags.push('long-sentence');
    if (
      sentences.some((sentence) => {
        const words = sentence.trim().split(/\s+/).length;
        const label = /:/.test(sentence) && !/[.!?]/.test(text);
        return !label && words >= (sentences.length > 1 ? 3 : 5) && !verb.test(sentence);
      })
    )
      flags.push('possible-fragment');
    for (const term of terms)
      if (
        new RegExp(`\\b${term}\\b`, 'i').test(text) &&
        !new RegExp(`\\b${term} (?:is|means|lets|keeps|records)\\b`, 'i').test(text)
      )
        flags.push(`check-term:${term}`);
    rows.push({ file, line: source.slice(0, offset).split('\n').length, text, flags });
  };
  if (file.endsWith('.html')) {
    // HTML pages: skip executable/style blocks before reading literal text nodes.
    const clean = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, ' '));
    for (const match of clean.matchAll(/>([^<>]+)</g)) add(match.index, match[1] ?? '');
    continue;
  }
  const tree = parse(source, {
    sourceType: 'unambiguous',
    plugins: ['typescript', ...(/\.[jt]sx$/.test(file) ? ['jsx' as const] : [])],
  });
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    const node = value as Record<string, unknown>;
    const offset = typeof node.start === 'number' ? node.start : 0;
    if (node.type === 'StringLiteral' || node.type === 'JSXText') {
      if (typeof node.value === 'string') add(offset, node.value);
      return;
    }
    if (node.type === 'TemplateLiteral' && Array.isArray(node.quasis)) {
      const text = node.quasis
        .map((part) => {
          const value = (part as { value?: { cooked?: string; raw?: string } }).value;
          return value?.cooked ?? value?.raw ?? '';
        })
        .join(' [value] ');
      add(offset, text);
      // Strings in interpolation expressions can also contain player copy.
      visit(node.expressions);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (
        ![
          'loc',
          'start',
          'end',
          'extra',
          'comments',
          'leadingComments',
          'trailingComments',
          'innerComments',
          'tokens',
        ].includes(key)
      )
        visit(child);
    }
  };
  visit(tree);
}
const flagged = rows.filter((row) => row.flags.length > 0);
const result = {
  repo,
  game,
  baseline: baseline ?? null,
  head: git('rev-parse', 'HEAD').trim(),
  files: files.length,
  candidates: rows.length,
  flagged: flagged.length,
  terms,
  limitations:
    'Syntax-aware source candidates include internal strings and omit runtime concatenations and canvas-built phrases. Templates keep interpolation placeholders. Fragments and term definitions need human review; counts are not reading-grade or rendered-screen measurements. Use the same script/options for baseline and after.',
  strings: args.includes('--all-strings') ? rows : flagged,
};
console.log(
  args.includes('--json')
    ? JSON.stringify(result, null, 2)
    : `${JSON.stringify({ ...result, strings: undefined }, null, 2)}\n${flagged.map((row) => `${row.file}:${row.line} [${row.flags.join(', ')}] ${row.text}`).join('\n')}`,
);
