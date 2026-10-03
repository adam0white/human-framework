/**
 * SCOPE: narration over consolidated day records (N3 with N6 phrase packs): `narrateChronicle` summarises a
 * period as a short life account in first or third person, and `diffChronicle` compares two periods ("By the end
 * he prayed Fajr without being told"). Both are deterministic, template-driven and read only `DayRecord`s plus an
 * optional person for names and pronouns. The comparison is a descriptive contrast of rates (share of days an
 * action was done, done unprompted, or done only after a voice suggested it), with fixed engineering thresholds;
 * it is not a statistical test, and "without being told" means only that no listed voice had suggested that
 * activity. Lines report behaviour and stated relationships; they never grade devotion, worth or acceptance.
 */

import { actionForms, capitalize, displayName, nameOf, phraseLine } from '../narrate/lexicon.ts';
import type { DayRecord, EntityId, Lexicon, Person, Signed } from '../types.ts';

export interface ChronicleNarrationOptions {
  /** 'third' (default) or 'first'. */
  voice?: 'first' | 'third';
  /** Name used for the first third-person line (default: `person.name`). */
  name?: string;
  /** Third-person pronoun (default from `person.life.sex`, else 'they'). */
  pronoun?: 'he' | 'she' | 'they';
  /** Supplies relationship roles for `nameOf`, plus default name, pronoun and lexicon. */
  person?: Person;
  lexicon?: Lexicon;
  /** Day bounds (inclusive) for `narrateChronicle`. */
  from?: number;
  to?: number;
  /** Voices whose suggestions count as "being told" (default: every voice). */
  voices?: readonly EntityId[];
  /** Cap on lines returned (default 12). */
  maxLines?: number;
}

/** Thresholds for `diffChronicle` (share of days). */
export const STORY_DEFAULTS = {
  /** An item done unprompted on at least this share of days counts as done "without being told". */
  habitualRate: 0.5,
  /** Below this share an item counts as rarely done. */
  rareRate: 0.2,
  /** Smallest trust change between periods worth a line. */
  trustDelta: 0.05,
  /** Smallest mean-mood change worth a line. */
  moodDelta: 0.1,
  maxLines: 12,
};

const PLAYER = new Set(['player', 'you']);

interface Subject {
  vars: (i: number) => Record<string, string>;
  who: (id: EntityId) => string;
  lex: Lexicon | undefined;
}

function subjectFor(opts: ChronicleNarrationOptions): Subject {
  const lex = opts.lexicon ?? opts.person?.lexicon;
  const first = opts.voice === 'first';
  const pronoun = opts.pronoun ?? (opts.person ? (opts.person.life.sex === 'female' ? 'she' : 'he') : 'they');
  const obj = { he: 'him', she: 'her', they: 'them' }[pronoun];
  const poss = { he: 'his', she: 'her', they: 'their' }[pronoun];
  const name = opts.name ?? opts.person?.name;
  const vars = (i: number): Record<string, string> => {
    if (first) return { Subj: 'I', subj: 'I', obj: 'me', poss: 'my', Poss: 'My' };
    const s = i === 0 && name ? name : pronoun;
    return { Subj: capitalize(s), subj: s, obj, poss, Poss: capitalize(poss) };
  };
  const who = (id: EntityId): string => {
    if (lex?.names?.[id] === undefined && PLAYER.has(id)) return 'you';
    if (opts.person) return nameOf(opts.person, id, lex, { possessive: first ? 'my' : poss });
    return displayName(id, lex);
  };
  return { vars, who, lex };
}

/** Per-item day counts over a period: items are prayer labels ('prayer:Fajr') and actions ('action:eat'). */
interface ItemStats {
  days: number;
  done: Record<string, number>;
  prompted: Record<string, number>;
  unprompted: Record<string, number>;
}

function itemStats(records: readonly DayRecord[], voices: readonly EntityId[] | undefined): ItemStats {
  const s: ItemStats = { days: records.length, done: {}, prompted: {}, unprompted: {} };
  const counts = (voice: EntityId | undefined) => voice !== undefined && (!voices || voices.includes(voice));
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
function worshipActions(records: readonly DayRecord[]): Set<string> {
  const out = new Set<string>();
  for (const r of records)
    for (const n of [...r.kept, ...r.broken]) if (n.kind === 'worship' && n.action) out.add(n.action);
  return out;
}

function formsOf(item: string, lex: Lexicon | undefined): { base: string; past: string; gerund: string } {
  if (item.startsWith('prayer:')) {
    const label = item.slice('prayer:'.length);
    return {
      base: phraseLine('prayer.base', { label }, lex),
      past: phraseLine('prayer.past', { label }, lex),
      gerund: phraseLine('prayer.gerund', { label }, lex),
    };
  }
  return actionForms(item.slice('action:'.length), lex);
}

const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const hourOfKey = (key: string): string | undefined => {
  const m = /@(?:.*,)?h(\d+)/.exec(key);
  return m?.[1] === undefined ? undefined : `${m[1].padStart(2, '0')}:00`;
};

const amount = (x: number): string => String(Math.round(Math.abs(x) * 100) / 100);

/** A short account of a period of the chronicle, one sentence per line. Deterministic. */
export function narrateChronicle(
  chronicle: readonly DayRecord[],
  opts: ChronicleNarrationOptions = {},
): string[] {
  const records = chronicle.filter(
    (r) => r.day >= (opts.from ?? Number.NEGATIVE_INFINITY) && r.day <= (opts.to ?? Number.POSITIVE_INFINITY),
  );
  const subj = subjectFor(opts);
  const lex = subj.lex;
  const raw: { key: string; vars: Record<string, string | number> }[] = [];
  if (records.length === 0) return [phraseLine('chronicle.empty', {}, lex)];
  const days = records.length;
  const stats = itemStats(records, opts.voices);

  // Prayers by label, in first-seen order.
  const labels: string[] = [];
  for (const r of records)
    for (const l of [...r.prayers.kept, ...r.prayers.missed]) if (!labels.includes(l)) labels.push(l);
  for (const label of labels.slice(0, 5)) {
    const n = stats.done[`prayer:${label}`] ?? 0;
    // One day is not "every day" (Game 2 playtest).
    const key =
      n === 0
        ? 'chronicle.prayer.never'
        : n === days
          ? days === 1
            ? 'chronicle.prayer.one'
            : 'chronicle.prayer.all'
          : 'chronicle.prayer';
    raw.push({ key, vars: { label, n, days } });
  }

  // Commitments kept by kind (worship is covered above).
  const kept: Record<string, number> = {};
  const total: Record<string, number> = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(r.keptByKind)) {
      kept[k] = (kept[k] ?? 0) + v;
      total[k] = (total[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(r.brokenByKind)) total[k] = (total[k] ?? 0) + v;
  }
  for (const kind of Object.keys(total).sort()) {
    if (kind === 'worship') continue;
    // One of one reads as "kept the fast", not "kept 1 of 1 abstentions" (game design review 2026-10-03).
    if (total[kind] === 1) {
      const one = phraseLine(`kind:${kind}`, {}, lex, phraseLine('kind:default', {}, lex));
      raw.push({
        key: (kept[kind] ?? 0) === 1 ? 'chronicle.kept.one' : 'chronicle.broke.one',
        vars: { kind: one },
      });
      continue;
    }
    const kinds = phraseLine(`kinds:${kind}`, {}, lex, phraseLine('kinds:default', {}, lex));
    raw.push({ key: 'chronicle.kept', vars: { kept: kept[kind] ?? 0, total: total[kind] ?? 0, kinds } });
  }

  // The most regular actions (not those narrated as prayers).
  const skip = worshipActions(records);
  const actions = Object.entries(stats.done)
    .filter(([k, n]) => k.startsWith('action:') && !skip.has(k.slice(7)) && n >= Math.max(2, days / 2))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 3);
  for (const [k, n] of actions) {
    raw.push({
      key: n === days ? 'chronicle.action.all' : 'chronicle.action',
      vars: { past: formsOf(k, lex).past, n, days },
    });
  }

  // Habits formed or faded across the period (first from vs last to per key).
  const habit = new Map<string, { action: string; from: number; to: number }>();
  for (const r of records)
    for (const h of r.habits) {
      const prev = habit.get(h.key);
      habit.set(h.key, { action: h.action, from: prev ? prev.from : h.from, to: h.to });
    }
  for (const [key, h] of [...habit.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const hour = hourOfKey(key);
    const when = hour ? phraseLine('chronicle.when', { hour }, lex) : '';
    const g = actionForms(h.action, lex).gerund;
    if (h.from < 0.5 && h.to >= 0.5)
      raw.push({ key: 'chronicle.habit.formed', vars: { gerund: g, Gerund: capitalize(g), when } });
    else if (h.from >= 0.5 && h.to < 0.5)
      raw.push({ key: 'chronicle.habit.faded', vars: { gerund: g, Gerund: capitalize(g), when } });
  }

  // Trust per voice, net over the period.
  const trust = new Map<string, { from: number; to: number }>();
  for (const r of records)
    for (const t of r.trust) {
      const prev = trust.get(t.voiceId);
      trust.set(t.voiceId, { from: prev ? prev.from : t.from, to: t.to });
    }
  for (const [voiceId, t] of [...trust.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (Math.abs(t.to - t.from) < STORY_DEFAULTS.trustDelta) continue;
    raw.push({
      key: t.to > t.from ? 'chronicle.trust.up' : 'chronicle.trust.down',
      vars: { who: subj.who(voiceId) },
    });
  }

  // Own standards: breaches and repairs.
  const nBreach = records.reduce((s, r) => s + r.breaches.length, 0);
  // A repair to a wronged person is "made amends"; closing a breach with no victim is the person's own turning
  // back (repentance as their act), never narrated as amends or as forgiveness (review 2026-10-03).
  const nAmends = records.reduce((s, r) => s + r.repairs.filter((x) => x.victimId !== undefined).length, 0);
  const nTurned = records.reduce((s, r) => s + r.repairs.filter((x) => x.victimId === undefined).length, 0);
  if (nBreach > 0)
    raw.push({
      key:
        nAmends > 0 && nTurned > 0
          ? 'chronicle.breaches.both'
          : nAmends > 0
            ? 'chronicle.breaches'
            : nTurned > 0
              ? 'chronicle.breaches.turned'
              : 'chronicle.breaches.none',
      vars: {
        n: nBreach,
        m: nAmends,
        k: nTurned,
        times:
          nBreach === 1 ? phraseLine('word.once', {}, lex) : phraseLine('word.times', { n: nBreach }, lex),
      },
    });

  const material = records.reduce((s, r) => s + r.material, 0);
  if (Math.abs(material) >= 0.005)
    raw.push({
      key: material > 0 ? 'chronicle.material.gain' : 'chronicle.material.loss',
      vars: { amount: amount(material) },
    });

  const onsets = [...new Set(records.flatMap((r) => r.illness.onset))];
  if (onsets.length > 0) raw.push({ key: 'chronicle.illness', vars: { kinds: onsets.join(', ') } });

  if (days >= 3) {
    const third = Math.max(1, Math.floor(days / 3));
    const early = mean(records.slice(0, third).map((r) => r.mood));
    const late = mean(records.slice(-third).map((r) => r.mood));
    if (late - early >= STORY_DEFAULTS.moodDelta) raw.push({ key: 'chronicle.mood.up', vars: {} });
    else if (early - late >= STORY_DEFAULTS.moodDelta) raw.push({ key: 'chronicle.mood.down', vars: {} });
  }

  let top: DayRecord['episodes'][number] | undefined;
  for (const r of records) for (const e of r.episodes) if (!top || e.salience > top.salience) top = e;
  if (top) {
    const s = top.summary.endsWith('.') ? top.summary : `${top.summary}.`;
    raw.push({ key: 'chronicle.episode', vars: { summary: s } });
  }

  const death = records.find((r) => !r.alive);
  if (death) raw.push({ key: 'chronicle.died', vars: { day: death.day } });

  const max = opts.maxLines ?? STORY_DEFAULTS.maxLines;
  return raw.slice(0, max).map((l, i) => phraseLine(l.key, { ...subj.vars(i), ...l.vars }, lex));
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
function endTrust(records: readonly DayRecord[]): Record<string, number> {
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

/**
 * Compare an earlier period `a` with a later period `b`: items now done unprompted that a voice used to prompt,
 * items still done only when told, items started and stopped, trust per voice (end of each period) and mean
 * mood. Returns the structured changes and their narrated lines (third person by default).
 */
export function diffChronicle(
  a: readonly DayRecord[],
  b: readonly DayRecord[],
  opts: ChronicleNarrationOptions = {},
): { changes: ChronicleChange[]; lines: string[] } {
  const D = STORY_DEFAULTS;
  const subj = subjectFor(opts);
  const lex = subj.lex;
  const sa = itemStats(a, opts.voices);
  const sb = itemStats(b, opts.voices);
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
  const ma: Signed = mean(a.map((r) => r.mood));
  const mb: Signed = mean(b.map((r) => r.mood));
  if (a.length > 0 && b.length > 0 && Math.abs(mb - ma) >= D.moodDelta)
    changes.push({ kind: 'mood', subject: 'mood', before: ma, after: mb });

  const lines = changes.map((c, i) => {
    const vars = subj.vars(i);
    switch (c.kind) {
      case 'unprompted':
        return phraseLine('diff.unprompted', { ...vars, ...formsOf(c.subject, lex) }, lex);
      case 'still-prompted':
        return phraseLine('diff.stillPrompted', { ...vars, ...formsOf(c.subject, lex) }, lex);
      case 'started':
        return phraseLine('diff.started', { ...vars, ...formsOf(c.subject, lex) }, lex);
      case 'stopped':
        return phraseLine('diff.stopped', { ...vars, ...formsOf(c.subject, lex) }, lex);
      case 'trust':
        return phraseLine(
          c.after > c.before ? 'diff.trust.up' : 'diff.trust.down',
          { ...vars, who: subj.who(c.subject) },
          lex,
        );
      case 'mood':
        return phraseLine(c.after > c.before ? 'diff.mood.up' : 'diff.mood.down', vars, lex);
      default:
        return '';
    }
  });
  if (lines.length === 0) lines.push(phraseLine('diff.none', {}, lex));
  return { changes, lines: lines.slice(0, opts.maxLines ?? D.maxLines) };
}
