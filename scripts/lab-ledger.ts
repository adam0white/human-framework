/**
 * `npm run lab:ledger`: reads docs/lab/feedback-ledger.md, docs/lab/lessons.md and docs/lab/testing-asks.md,
 * checks that every ledger row is triaged into known routes, prints the triage summary, and writes
 * apps/site/src/lab/curated.json (served at /lab/data.json after the next deploy).
 * `npm run lab:ledger -- --check` writes nothing and fails when curated.json is out of date or a row is invalid.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAMES } from '../apps/site/src/games.ts';
import { buildCurated } from '../apps/site/src/lab/ledger.ts';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const out = join(root, 'apps/site/src/lab/curated.json');

export function curatedFromRepo() {
  return buildCurated({
    ledger: read('docs/lab/feedback-ledger.md'),
    lessons: read('docs/lab/lessons.md'),
    asks: read('docs/lab/testing-asks.md'),
    games: GAMES.map(({ id, name, href }) => ({ id, name, href })),
  });
}

if (import.meta.main) {
  const { curated, problems } = curatedFromRepo();
  const text = `${JSON.stringify(curated, null, 1)}\n`;
  for (const p of problems) console.error(`ledger: ${p}`);
  console.log(
    `ledger: ${curated.ledger.length} rows, ${curated.lessons.length} lessons, ${curated.asks.length} asks, routes`,
    curated.routes,
  );
  if (process.argv.includes('--check')) {
    const current = (() => {
      try {
        return readFileSync(out, 'utf8');
      } catch {
        return '';
      }
    })();
    if (problems.length || current !== text) {
      console.error(current !== text ? 'curated.json is out of date: run npm run lab:ledger' : '');
      process.exit(1);
    }
  } else {
    if (problems.length) process.exit(1);
    writeFileSync(out, text);
    console.log('wrote apps/site/src/lab/curated.json');
  }
}
