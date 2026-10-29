/** SCOPE: pure summaries of already-visible chronicle evidence via the one renderer.
 * Daily rates describe recorded behavior, never religious worth or acceptance.
 */

import { actionForms, displayName } from '../narrate/lexicon.ts';
import { labelLine, renderProjection } from '../narrate/literal.ts';
import { narrate } from '../narrate/narrate.ts';
import type { DayRecord, DeepReadonly, Lexicon, Perspective, RunEvent } from '../run-schema.ts';
export const STORY_DEFAULTS = {
  habitualRate: 0.5,
  rareRate: 0.2,
  trustDelta: 0.05,
  moodDelta: 0.1,
  maxLines: 12,
};
/** Project retained day events, preserving their event-time wording choices. */
export function narrateChronicle(
  events: readonly DeepReadonly<RunEvent>[],
  perspective: DeepReadonly<Perspective>,
  lexicon: DeepReadonly<Lexicon>,
  seed: number,
): readonly string[] {
  return narrate(
    events.filter((event) => event.data.kind === 'day-closed'),
    perspective,
    lexicon,
    seed,
  )
    .slice(0, STORY_DEFAULTS.maxLines)
    .map((line) => line.text);
}
export interface ChronicleChange {
  kind: 'unprompted' | 'still-prompted' | 'started' | 'stopped' | 'trust' | 'mood';
  /** 'prayer:<label>', 'action:<id>', a voice id, or 'mood'. */
  subject: string;
  /** Share of days (or trust / mean mood) in the earlier period. */
  before: number;
  after: number;
}

/**
 * Trust per voice at the end of `records`: the newest record's `state` when it has one; for a slice that ends
 * on an older record (whose snapshot `appendDay` dropped), the latest logged trust change per voice, then the
 * nearest earlier snapshot.
 */
function endTrust(records: readonly DeepReadonly<DayRecord>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (!r) continue;
    for (const t of r.trust) if (!(t.voiceId in out)) out[t.voiceId] = t.to;
    if (r.state) {
      for (const [k, v] of Object.entries(r.state.trust)) if (!(k in out)) out[k] = v;
      break;
    }
  }
  return out;
}

interface ItemStats {
  days: number;
  done: Record<string, number>;
  prompted: Record<string, number>;
  unprompted: Record<string, number>;
}

function itemStats(
  records: readonly DeepReadonly<DayRecord>[],
  voices: readonly string[] | undefined,
): ItemStats {
  const s: ItemStats = { days: records.length, done: {}, prompted: {}, unprompted: {} };
  const counts = (voice: string | undefined) => voice !== undefined && (!voices || voices.includes(voice));
  const add = (rec: Record<string, number>, k: string) => {
    rec[k] = (rec[k] ?? 0) + 1;
  };
  for (const r of records) {
    const done = new Set<string>();
    const prompted = new Set<string>();
    const free = new Set<string>();
    for (const n of r.kept) {
      if (n.kind !== 'worship') continue;
      const k = `prayer:${n.label ?? n.action ?? n.id}`;
      done.add(k);
      if (n.prompted && counts(n.voiceId)) prompted.add(k);
      else free.add(k);
    }
    for (const a of r.actions) {
      const k = `action:${a.action}`;
      if (a.done <= 0) continue;
      done.add(k);
      let byListed = 0;
      for (const [v, c] of Object.entries(a.by)) if (counts(v)) byListed += c;
      if (byListed > 0) prompted.add(k);
      if (a.done - byListed > 0) free.add(k);
    }
    for (const k of done) add(s.done, k);
    for (const k of prompted) add(s.prompted, k);
    for (const k of free) add(s.unprompted, k);
  }
  return s;
}

/** Actions that are carried out through worship commitments (narrated by prayer label instead). */
function worshipActions(records: readonly DeepReadonly<DayRecord>[]): Set<string> {
  const out = new Set<string>();
  for (const r of records)
    for (const n of [...r.kept, ...r.broken]) if (n.kind === 'worship' && n.action) out.add(n.action);
  return out;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function diffChronicle(
  a: readonly DeepReadonly<DayRecord>[],
  b: readonly DeepReadonly<DayRecord>[],
  lexicon: DeepReadonly<Lexicon>,
): { changes: ChronicleChange[]; lines: string[] } {
  const D = STORY_DEFAULTS;
  const sa = itemStats(a, undefined);
  const sb = itemStats(b, undefined);
  const rate = (s: ItemStats, rec: Record<string, number>, k: string): number =>
    s.days > 0 ? (rec[k] ?? 0) / s.days : 0;
  const skip = worshipActions([...a, ...b]);
  const items = [...new Set([...Object.keys(sa.done), ...Object.keys(sb.done)])]
    .filter((k) => !(k.startsWith('action:') && skip.has(k.slice(7))))
    .sort();
  const changes: ChronicleChange[] = [];
  for (const k of items) {
    const promptedBefore = rate(sa, sa.prompted, k);
    const freeAfter = rate(sb, sb.unprompted, k);
    const doneBefore = rate(sa, sa.done, k);
    const doneAfter = rate(sb, sb.done, k);
    if (promptedBefore > 0 && freeAfter >= D.habitualRate)
      changes.push({ kind: 'unprompted', subject: k, before: promptedBefore, after: freeAfter });
    else if (promptedBefore > 0 && rate(sb, sb.prompted, k) > 0)
      changes.push({
        kind: 'still-prompted',
        subject: k,
        before: promptedBefore,
        after: rate(sb, sb.prompted, k),
      });
    else if (doneBefore < D.rareRate && doneAfter >= D.habitualRate)
      changes.push({ kind: 'started', subject: k, before: doneBefore, after: doneAfter });
    else if (doneBefore >= D.habitualRate && doneAfter < D.rareRate)
      changes.push({ kind: 'stopped', subject: k, before: doneBefore, after: doneAfter });
  }
  const ta = endTrust(a);
  const tb = endTrust(b);
  for (const v of [...new Set([...Object.keys(ta), ...Object.keys(tb)])].sort()) {
    const before = ta[v] ?? 0.5;
    const after = tb[v] ?? before;
    if (Math.abs(after - before) >= D.trustDelta) changes.push({ kind: 'trust', subject: v, before, after });
  }
  const ma = mean(a.map((r) => r.mood));
  const mb = mean(b.map((r) => r.mood));
  if (a.length > 0 && b.length > 0 && Math.abs(mb - ma) >= D.moodDelta)
    changes.push({ kind: 'mood', subject: 'mood', before: ma, after: mb });

  const lines = changes.map((c) =>
    renderProjection({
      kind: 'chronicle-change',
      change: c.kind,
      subject:
        c.kind === 'trust'
          ? displayName(c.subject, lexicon)
          : c.subject.startsWith('prayer:')
            ? `praying ${labelLine(c.subject.slice(7))}`
            : c.subject.startsWith('action:')
              ? actionForms(c.subject.slice(7), lexicon).gerund
              : c.subject,
      before: c.before,
      after: c.after,
    }),
  );
  return { changes, lines: lines.slice(0, STORY_DEFAULTS.maxLines) };
}
Object.freeze(STORY_DEFAULTS);
