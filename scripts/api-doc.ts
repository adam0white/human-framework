/**
 * Regenerates docs/api.md from the built declarations of @human/framework (packages/human/dist).
 * Run: `npm run api-doc` (builds the package first).
 *
 * It follows the re-exports of dist/index.d.ts (`export *`, `export { a as b }`, `export type { ... }`) to
 * the declaring file, takes the first sentence of each export's doc comment, and groups exports by the
 * module (directory) that declares them. Full signatures are printed for the composite (person.ts) and the
 * community driver (sim/). The parser relies on the shape tsc emits for .d.ts files (top-level statements
 * start at column 0); it is not a general TypeScript parser.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'packages/human/dist');
const out = join(root, 'docs/api.md');

type Kind = 'function' | 'const' | 'interface' | 'type' | 'class';
interface Entry {
  name: string;
  kind: Kind;
  doc: string;
  signatures: string[];
  file: string;
  renamedFrom?: string;
}
interface Statement {
  doc: string;
  text: string;
}

/** Split an emitted .d.ts into top-level statements with their leading doc comment. */
function statements(src: string): Statement[] {
  const out: Statement[] = [];
  let pendingDoc = '';
  let inDoc = false;
  let docBuf: string[] = [];
  let cur: { doc: string; lines: string[] } | null = null;
  const flush = () => {
    if (cur) out.push({ doc: cur.doc, text: cur.lines.join('\n') });
    cur = null;
  };
  for (const line of src.split('\n')) {
    if (inDoc) {
      docBuf.push(line);
      if (line.includes('*/')) {
        inDoc = false;
        pendingDoc = docBuf.join('\n');
      }
      continue;
    }
    const top = line.length > 0 && !/^[\s})\]]/.test(line);
    if (top && line.startsWith('/**')) {
      flush();
      docBuf = [line];
      if (line.includes('*/')) pendingDoc = line;
      else inDoc = true;
      continue;
    }
    if (top && line.startsWith('//')) continue;
    if (top) {
      flush();
      // A file's SCOPE paragraph is module documentation, not the doc of the statement that follows it.
      const doc = /^\/\*\*\s*\n?\s*\*?\s*SCOPE/.test(pendingDoc) ? '' : pendingDoc;
      cur = { doc, lines: [line] };
      pendingDoc = '';
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  flush();
  return out;
}

function firstSentence(doc: string): string {
  const text = doc
    .replace(/^\s*\/\*\*/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\* ?/, '').trim())
    .filter((l) => !l.startsWith('@'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(text);
  const s = m?.[1] ?? text;
  return s.length > 200 ? `${s.slice(0, 197)}...` : s;
}

const cache = new Map<string, Map<string, Entry>>();

function collect(file: string): Map<string, Entry> {
  const hit = cache.get(file);
  if (hit) return hit;
  const map = new Map<string, Entry>();
  cache.set(file, map);
  const target = (spec: string) => resolve(dirname(file), spec.replace(/\.(ts|js)$/, '.d.ts'));
  for (const st of statements(readFileSync(file, 'utf8'))) {
    const t = st.text;
    let m = /^export \* from '([^']+)';/.exec(t);
    if (m?.[1]) {
      for (const [k, v] of collect(target(m[1]))) if (!map.has(k)) map.set(k, v);
      continue;
    }
    m = /^export (?:type )?\{([^}]*)\} from '([^']+)';/s.exec(t);
    if (m?.[1] && m[2]) {
      const sub = collect(target(m[2]));
      for (const raw of m[1].split(',')) {
        const spec = raw.trim().replace(/^type /, '');
        if (!spec) continue;
        const [from, as] = spec.split(/\s+as\s+/);
        const e = from ? sub.get(from) : undefined;
        if (!e || !from) throw new Error(`api-doc: ${from} not found for ${file}`);
        const name = as ?? from;
        map.set(name, name === from ? e : { ...e, name, renamedFrom: from });
      }
      continue;
    }
    m =
      /^export (?:declare )?(function|const|let|interface|type|class|abstract class|enum) ([A-Za-z0-9_$]+)/.exec(
        t,
      );
    if (m?.[1] && m[2]) {
      const kind: Kind =
        m[1] === 'let'
          ? 'const'
          : m[1] === 'abstract class'
            ? 'class'
            : m[1] === 'enum'
              ? 'type'
              : (m[1] as Kind);
      const prev = map.get(m[2]);
      const sig = t.replace(/^export (declare )?/, '').trim();
      if (prev && prev.kind === 'function' && kind === 'function') {
        prev.signatures.push(sig);
        continue;
      }
      map.set(m[2], { name: m[2], kind, doc: firstSentence(st.doc), signatures: [sig], file });
    }
  }
  return map;
}

const groupOf = (file: string): string => {
  const rel = relative(dist, file);
  const dir = dirname(rel);
  return dir === '.' ? rel.replace(/\.d\.ts$/, '.ts') : `${dir}/`;
};

const SIGNATURE_GROUPS = new Set(['person.ts', 'sim/']);
const ORDER: Kind[] = ['function', 'class', 'const', 'interface', 'type'];
const HEADINGS: Record<Kind, string> = {
  function: 'Functions',
  class: 'Classes',
  const: 'Constants',
  interface: 'Interfaces',
  type: 'Types',
};

const exportsMap = collect(join(dist, 'index.d.ts'));
// The index's file header sits directly above its first export; describe that export explicitly.
const version = exportsMap.get('FRAMEWORK_VERSION');
if (version) version.doc = 'Framework version string compiled into the build.';
const groups = new Map<string, Entry[]>();
for (const e of exportsMap.values()) {
  const g = groupOf(e.file);
  const list = groups.get(g) ?? [];
  list.push(e);
  groups.set(g, list);
}
const groupNames = [...groups.keys()].sort((a, b) => {
  const rank = (g: string) =>
    g === 'index.ts' ? 0 : g === 'person.ts' ? 1 : g === 'sim/' ? 2 : g === 'types.ts' ? 9 : 5;
  return rank(a) - rank(b) || a.localeCompare(b);
});

const pkg = JSON.parse(readFileSync(join(root, 'packages/human/package.json'), 'utf8')) as {
  version: string;
};
const lines: string[] = [
  '# @human/framework API reference',
  '',
  `Generated by \`scripts/api-doc.ts\` from the built declarations of \`@human/framework\` ${pkg.version}`,
  `(${exportsMap.size} exports). Do not edit by hand; run \`npm run api-doc\`. One line per export, from its doc`,
  'comment; full signatures for the composite (`person.ts`) and the community driver (`sim/`). Architecture and',
  'rules: [framework.md](framework.md). Package overview: [README](../packages/human/README.md).',
  '',
  '## Modules',
  '',
  groupNames.map((g) => `[\`${g}\`](#${g.replace(/[^a-z0-9]/gi, '').toLowerCase()})`).join(' · '),
  '',
];
const code = (s: string) => `\`${s.replace(/`/g, "'")}\``;
const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);
/** For an export without a doc comment: a compact shape read from its declaration. */
function shape(e: Entry): string {
  const sig = (e.signatures[0] ?? '').replace(/\s+/g, ' ');
  if (e.kind === 'function') return code(clip(sig.replace(/^function [A-Za-z0-9_$]+/, '').replace(/;$/, '')));
  if (e.kind === 'type') return code(clip(sig.replace(/^type [^=]+=\s*/, '').replace(/;$/, '')));
  const body = (e.signatures[0] ?? '').replace(/\/\*\*[\s\S]*?\*\//g, '');
  const keys: string[] = [];
  let depth = 0;
  for (const line of body.split('\n')) {
    const m = /^\s*(readonly\s+)?([A-Za-z0-9_$]+)\??\s*[:(]/.exec(line);
    if (m?.[2] && depth === 1) keys.push(m[2]);
    for (const ch of line) depth += ch === '{' ? 1 : ch === '}' ? -1 : 0;
  }
  if (keys.length > 0) return `fields: ${clip(keys.join(', '))}`;
  return e.kind === 'const'
    ? code(clip(sig.replace(/^(const|let) [A-Za-z0-9_$]+:\s*/, '').replace(/;$/, '')))
    : '';
}
for (const g of groupNames) {
  const list = (groups.get(g) ?? []).sort((a, b) => a.name.localeCompare(b.name));
  lines.push(`## ${g}`, '');
  for (const kind of ORDER) {
    const ofKind = list.filter((e) => e.kind === kind);
    if (ofKind.length === 0) continue;
    lines.push(`### ${HEADINGS[kind]}`, '');
    if ((kind === 'function' || kind === 'interface') && SIGNATURE_GROUPS.has(g)) {
      for (const e of ofKind) {
        lines.push(`#### ${e.name}`, '');
        if (e.doc) lines.push(e.doc, '');
        lines.push('```ts', ...e.signatures, '```', '');
      }
      continue;
    }
    for (const e of ofKind) {
      const alias = e.renamedFrom ? ` (re-export of \`${e.renamedFrom}\`)` : '';
      const text = e.doc || shape(e);
      lines.push(`- ${code(e.name)}${alias}${text ? ` — ${text}` : ''}`);
    }
    lines.push('');
  }
}
writeFileSync(out, `${lines.join('\n').trimEnd()}\n`);
console.log(`api-doc: ${exportsMap.size} exports in ${groupNames.length} modules -> ${relative(root, out)}`);
