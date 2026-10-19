/**
 * Reads the lab's feedback documents (docs/lab/*.md) into the curated data the lab Worker serves at
 * /lab/data.json and the dashboard shows. Pure: it takes the documents' text. `scripts/lab-ledger.ts` reads the
 * files, validates, and writes src/lab/curated.json; a test keeps that file in step with the documents.
 *
 * Covers: the ledger table, the lessons list, the testing asks, and route validation (every row triaged once
 * into one or more routes). Does not cover: following links, or checking that a referenced HF request exists.
 */

export type LedgerRow = {
  id: string;
  date: string;
  game: string;
  kind: string;
  who: string;
  words: string;
  verdict: string;
  routes: string[];
  source: string;
};
export type Lesson = { id: string; title: string; text: string; evidence: string[] };
export type Ask = { game: string; ask: string; why: string; source: string };
export type CuratedGame = { id: string; name: string; href: string };
export type Curated = {
  generated: string;
  games: CuratedGame[];
  ledger: LedgerRow[];
  lessons: Lesson[];
  asks: Ask[];
  hfRequests: { ref: string; from: string[]; games: string[] }[];
  routes: Record<'fix' | 'lesson' | 'hf' | 'calibration' | 'none', number>;
};

export const KINDS = ['owner', 'playtester', 'human', 'harness', 'cohort', 'telemetry'] as const;
export const VERDICTS = ['keep', 'quit', 'mixed', '-'] as const;
const ROUTE = /^(fix:[a-z][a-z0-9-]* .+|lesson:L\d+|hf:\S.*|calibration:C\d+|none)$/;

/** Splits one markdown table row into trimmed cells. */
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** The rows of the first table after `heading` (or the first table at all when heading is empty). */
export function tableAfter(md: string, heading: string): string[][] {
  const lines = md.split('\n');
  let i = heading ? lines.findIndex((l) => l.trim() === heading) : 0;
  if (i < 0) return [];
  while (i < lines.length && !lines[i]?.trim().startsWith('|')) i++;
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j]?.trim().startsWith('|'); j++)
    rows.push(cells(lines[j] ?? ''));
  return rows;
}

const unquote = (s: string) => s.replace(/^"(.*)"$/s, '$1');
/** Markdown link text or bare path: `[a](b)` gives b. */
const linkTarget = (s: string) => /\]\(([^)]+)\)/.exec(s)?.[1] ?? s.replace(/`/g, '');

export function parseLedger(md: string): { rows: LedgerRow[]; problems: string[] } {
  const problems: string[] = [];
  const seen = new Set<string>();
  const rows: LedgerRow[] = [];
  for (const c of tableAfter(md, '## Ledger')) {
    const [
      id = '',
      date = '',
      game = '',
      kind = '',
      who = '',
      words = '',
      verdict = '',
      routes = '',
      source = '',
    ] = c;
    if (c.length !== 9) problems.push(`${id || '?'}: ${c.length} columns, expected 9`);
    if (!/^F-\d{3,}$/.test(id)) problems.push(`bad id ${id}`);
    if (seen.has(id)) problems.push(`duplicate id ${id}`);
    seen.add(id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push(`${id}: bad date ${date}`);
    if (!(KINDS as readonly string[]).includes(kind)) problems.push(`${id}: unknown kind ${kind}`);
    if (!(VERDICTS as readonly string[]).includes(verdict))
      problems.push(`${id}: unknown verdict ${verdict}`);
    const list = routes
      .split(';')
      .map((r) => r.trim())
      .filter(Boolean);
    if (list.length === 0) problems.push(`${id}: not triaged (no routes)`);
    for (const r of list) if (!ROUTE.test(r)) problems.push(`${id}: unknown route "${r}"`);
    rows.push({
      id,
      date,
      game,
      kind,
      who,
      words: unquote(words),
      verdict,
      routes: list,
      source: linkTarget(source),
    });
  }
  return { rows, problems };
}

export function parseLessons(md: string): Lesson[] {
  const out: Lesson[] = [];
  const parts = md.split(/^### /m).slice(1);
  for (const part of parts) {
    const [head = '', ...body] = part.split('\n');
    const m = /^(L\d+)\s*[—–-]\s*(.+)$/.exec(head.trim());
    if (!m) continue;
    const text = body.join('\n');
    const evidenceAt = text.search(/^\s*\**Evidence/m);
    const lesson = (evidenceAt >= 0 ? text.slice(0, evidenceAt) : text).replace(/\s+/g, ' ').trim();
    const evidence = evidenceAt >= 0 ? (text.slice(evidenceAt).match(/F-\d{3,}/g) ?? []) : [];
    out.push({ id: m[1] ?? '', title: (m[2] ?? '').trim(), text: lesson, evidence });
  }
  return out;
}

export function parseAsks(md: string): Ask[] {
  return tableAfter(md, '').map(([game = '', ask = '', why = '', source = '']) => ({
    game,
    ask,
    why,
    source: linkTarget(source),
  }));
}

export function buildCurated(input: {
  ledger: string;
  lessons: string;
  asks: string;
  games: CuratedGame[];
}): { curated: Curated; problems: string[] } {
  const { rows, problems } = parseLedger(input.ledger);
  const lessons = parseLessons(input.lessons);
  const asks = parseAsks(input.asks);
  const lessonIds = new Set(lessons.map((l) => l.id));
  const rowIds = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    for (const route of r.routes) {
      const l = /^lesson:(L\d+)$/.exec(route)?.[1];
      if (l && !lessonIds.has(l)) problems.push(`${r.id}: lesson ${l} is not in lessons.md`);
    }
  }
  for (const l of lessons) {
    for (const e of l.evidence)
      if (!rowIds.has(e)) problems.push(`${l.id}: evidence ${e} is not in the ledger`);
  }
  const hf = new Map<string, { ref: string; from: string[]; games: string[] }>();
  const routes: Curated['routes'] = { fix: 0, lesson: 0, hf: 0, calibration: 0, none: 0 };
  for (const r of rows) {
    for (const route of r.routes) {
      const kind = route.split(':')[0] as keyof Curated['routes'];
      if (kind in routes) routes[kind]++;
      if (kind === 'hf') {
        const ref = route.slice(3).trim();
        const entry = hf.get(ref) ?? { ref, from: [], games: [] };
        entry.from.push(r.id);
        if (!entry.games.includes(r.game)) entry.games.push(r.game);
        hf.set(ref, entry);
      }
    }
  }
  const generated = rows.reduce((d, r) => (r.date > d ? r.date : d), '');
  return {
    curated: {
      generated,
      games: input.games,
      ledger: rows,
      lessons,
      asks,
      hfRequests: [...hf.values()].sort(
        (a, b) => b.from.length - a.from.length || a.ref.localeCompare(b.ref),
      ),
      routes,
    },
    problems,
  };
}
