/**
 * Text harness for Game 2, *The Day You Say Nothing* (/voice/). It drives the game's own sim the way the page's
 * worker does (real-time ticks become sim minutes; every input goes through the same `RecordedGame`), and prints
 * what the page shows: the top bar, the paused beat, the day's log, the composer with its live telegraph, your
 * standing words, Halil's pane, his ends, the voices, Why, the between-days card, the intro cards and the report.
 * It prints nothing the page hides (no needs as numbers, no true body outside the doctor's words and the report).
 * Bars the page draws are drawn here as ten-cell bars.
 *
 * Run (Node ≥ 24, after `npm run build -w packages/human` once):
 *
 *   node apps/site/scripts/play-voice.ts --state run.json new 7      # new run on seed 7 (the shipped seed)
 *   node apps/site/scripts/play-voice.ts --state run.json begin run  # one or more commands per call
 *   node apps/site/scripts/play-voice.ts --state run.json help
 *
 * State: `--state FILE` holds the seed, the input log and the screen's own state (the composer's draft, the card's
 * picks, what of the log you have seen). Each call replays the log from the seed, so a caller can be stateless.
 * Without `--state` the file is `voice-run.json` in the current directory. Commands may also come one per line
 * on stdin with `-` as the only command.
 *
 * Export: `export FILE` writes the game's own playtest file (seed + input log + state), the same file the page's
 * "Download playtest file" gives; `load FILE` replays one (it must be from this scenario version).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ENGINE_VERSION, FRAMEWORK_VERSION } from '@adam0white/human-framework';
import { makePlaytestFile } from '../src/shared/playtest.ts';
import {
  type Appeal,
  type BetweenView,
  type Draft,
  defaultWhisper,
  type EndView,
  type Frame,
  type LogEntry,
  MODEL_NOTES,
  type Pace,
  type ReportView,
  type StandingWhisper,
  type StripRow,
  scenarioOf,
  type Telegraph,
  type Tone,
  type UnaskedItem,
  type VoiceRules,
} from '../src/voice/protocol.ts';
import {
  finishSilentMonth,
  type MonthFacts,
  monthFacts,
  silentMonthView,
  startSilentMonth,
} from '../src/voice/sim/counterfactual.ts';
import { VoiceGame } from '../src/voice/sim/game.ts';
import {
  parseVoicePlaytest,
  RecordedGame,
  replayVoice,
  type VoiceLogEntry,
  validateVoiceLog,
  voiceHash,
  voiceSnapshot,
} from '../src/voice/sim/record.ts';

// ---------------------------------------------------------------------------------------------------------------
// What the page labels things (ui/parts.tsx, ui/Icon.tsx, ui/DayLog.tsx), copied so this file stays plain text.

const APPEALS: { id: Appeal; label: string; key: string; word: string }[] = [
  { id: 'duty', label: 'it’s your duty', key: 'D', word: 'duty' },
  { id: 'safety', label: 'your health', key: 'H', word: 'health' },
  { id: 'benevolence', label: 'for Selin', key: 'S', word: 'selin' },
  { id: 'belonging', label: 'you shouldn’t be alone', key: 'A', word: 'alone' },
  { id: 'meaning', label: 'it matters', key: 'T', word: 'matters' },
];
const INSIST_PRICE =
  'He may do it under protest. He’ll remember. If it goes well, you get no credit; insisting when he is already pressed costs his trust in you.';
const TONE_MARK: Record<Tone, string> = {
  yes: '[yes]',
  notNow: '[not now]',
  willNot: '[no]',
  protest: '[protest]',
  cannot: '[can’t]',
};
const BEAT_LABEL: Record<string, string> = {
  wake: 'awake',
  verdict: 'his answer',
  voice: 'another voice',
  craving: 'a pull',
  'close-call': 'torn',
  'duty-risk': 'running late',
  recall: 'memory',
  'day-end': 'day’s end',
  eid: 'Eid',
};
const VOICE_NAMES: Record<string, string> = {
  you: 'You',
  selin: 'Selin',
  riza: 'Rıza',
  hacer: 'Hacer',
  osman: 'Osman',
  doctor: 'The doctor',
};
const UNASKED_MARK: Record<UnaskedItem['state'], string> = {
  yes: '✓',
  no: '✗ not yet',
  unknown: '– no chance yet',
};
const MAX_WHISPERS = 2;
/** The page's tick is one animation frame; the worker caps a tick at 250 ms. 250 ms keeps the harness quick. */
const TICK_MS = 250;

const bar = (v: number) => {
  const n = Math.round(Math.max(0, Math.min(1, v)) * 10);
  return `[${'#'.repeat(n)}${'.'.repeat(10 - n)}]`;
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------------------------------------------
// The harness's own state: the run (seed + log) and what the page holds outside the worker.

interface Ui {
  draft: Draft | null;
  touched: boolean;
  prefillKey: string;
  picked: StandingWhisper[];
  /** Id of the last log entry already printed. */
  seen: string | undefined;
  silent?: { seed: number; facts: MonthFacts };
  /** Real play time the clock has run (ticks × 250 ms), for the tester's own notes. */
  realMs?: number;
}
interface Saved {
  harness: 'play-voice';
  seed: number;
  /** The rules the run plays by (absent: the current rules). */
  rules?: VoiceRules;
  log: VoiceLogEntry[];
  ui: Ui;
}

const freshUi = (): Ui => ({
  draft: null,
  touched: false,
  prefillKey: 'closed',
  picked: [],
  seen: undefined,
});

let statePath = 'voice-run.json';
let rec: RecordedGame;
let ui: Ui = freshUi();
const out: string[] = [];
const say = (s = '') => out.push(s);

function load(): boolean {
  let text: string;
  try {
    text = readFileSync(statePath, 'utf8');
  } catch {
    return false;
  }
  const s = JSON.parse(text) as Saved;
  rec = replayVoice(s.seed, validateVoiceLog(s.log), s.rules ?? 2).rec;
  ui = { ...freshUi(), ...s.ui };
  return true;
}
function save(): void {
  const s: Saved = { harness: 'play-voice', seed: rec.game.seed, rules: rec.game.rules, log: rec.log, ui };
  writeFileSync(statePath, `${JSON.stringify(s)}\n`);
}
function start(seed: number): void {
  rec = new RecordedGame(new VoiceGame(seed));
  ui = freshUi();
}

const g = () => rec.game;
const frame = (): Frame => g().frame();

/** The composer's draft follows the page: a new prefill resets it unless the player is mid-edit on an offered option. */
function syncDraft(f: Frame): void {
  const open = f.composer.open && !f.muted;
  const key = open ? (f.prefill ? `${f.prefill.optionId}|${f.prefill.why}` : 'none') : 'closed';
  const offered = (id: string) => f.options.some((o) => o.id === id);
  if (key !== ui.prefillKey) {
    ui.prefillKey = key;
    if (!(key !== 'closed' && ui.touched && ui.draft && offered(ui.draft.optionId))) {
      ui.touched = false;
      const p = f.prefill;
      ui.draft =
        p && key !== 'closed'
          ? {
              optionId: p.optionId,
              strength: p.strength,
              insist: false,
              ...(p.appeal ? { appeal: p.appeal } : {}),
            }
          : null;
    }
  }
  if (ui.draft && !offered(ui.draft.optionId)) ui.draft = null;
}

// ---------------------------------------------------------------------------------------------------------------
// Printing: one function per thing on the page.

function topBar(f: Frame): void {
  const ff = f.fastForward ? `skipping: ${f.fastForward}` : f.sky.fast ? 'fasting' : '';
  const prayers = f.sky.prayers
    .filter((p) => p.state)
    .map((p) => `${p.name} ${p.state}${p.mosque ? ' at the mosque' : ''}`)
    .join(', ');
  say(
    `== ${f.dayLabel} ${f.clock}  ${f.paused ? 'PAUSED' : 'running'}  pace ${f.pace}  auto-pause ${f.autoPause ? 'on' : 'off'}${ff ? `  (${ff})` : ''}`,
  );
  if (prayers) say(`   sky: ${prayers}`);
}

function logLine(e: LogEntry, to?: string): string {
  const voice = e.who !== 'halil' ? e.who : null;
  const tag =
    voice && e.kind !== 'you' && !e.text.startsWith(VOICE_NAMES[voice] ?? '\u0000')
      ? `${VOICE_NAMES[voice]}: `
      : '';
  const tone = e.kind === 'answer' && e.tone ? `${TONE_MARK[e.tone]} ` : '';
  const span = to ? ` · until ${to}` : e.until && e.kind === 'act' ? ` · until ${e.until}` : '';
  const beat = e.beat ? `  <${BEAT_LABEL[e.beat] ?? e.beat}>` : '';
  const why = e.decisionId ? `  (why ${e.id})` : '';
  const style = e.kind === 'recall' ? '~ ' : e.kind === 'you' ? '> ' : '  ';
  return `${e.clock} ${style}${tone}${tag}${e.text}${span}${beat}${why}`;
}

/** The log as the page collapses it: consecutive identical acts fold into one row with a span. */
function logRows(log: LogEntry[]): { e: LogEntry; to?: string }[] {
  const rows: { e: LogEntry; to?: string; n: number }[] = [];
  for (const e of log) {
    const prev = rows[rows.length - 1];
    if (prev && e.kind === 'act' && prev.e.kind === 'act' && prev.e.text === e.text && !e.beat) {
      prev.to = e.until ?? e.clock;
      prev.n++;
      continue;
    }
    rows.push({ e, n: 1 });
  }
  return rows.map((r) => (r.n > 1 && r.to ? { e: r.e, to: r.to } : { e: r.e }));
}

function newLog(f: Frame, all = false): void {
  const log = f.log;
  let from = 0;
  if (!all && ui.seen) {
    const i = log.findIndex((e) => e.id === ui.seen);
    from = i >= 0 ? i + 1 : 0;
  }
  const fresh = log.slice(from);
  if (fresh.length > 0) {
    say(all ? '-- The day --' : '-- new in the day --');
    for (const r of logRows(fresh)) say(logLine(r.e, r.to));
  } else if (all) say('-- The day --\n   Nothing yet today.');
  ui.seen = log[log.length - 1]?.id ?? ui.seen;
}

function beatBanner(f: Frame): void {
  if (f.pauseBeat && f.paused)
    say(`** ${BEAT_LABEL[f.pauseBeat.kind] ?? f.pauseBeat.kind}: ${f.pauseBeat.text}  [Space]`);
}

function telegraphText(t: Telegraph): string {
  let s = `${TONE_MARK[t.tone]} ${t.text}`;
  if (t.says && !t.text.includes(t.says)) s += ` “${t.says}”`;
  if (t.counter && !t.text.includes(t.counter)) s += ` ${t.counter}`;
  return s;
}

function composer(f: Frame): void {
  if (f.standing && !f.muted) {
    const s = f.standing;
    const a = s.lastAnswer;
    say(
      `Your words: ${s.label} · ${s.since}${a ? ` | He said: “${a.says}”${a.counter ? ` ${a.counter}` : ''} ${TONE_MARK[a.tone]}` : ''} | Still on his mind until ${s.expires}  [withdraw]`,
    );
  }
  if (f.muted) {
    say('Composer: You are silent today. Watch.');
    return;
  }
  if (!(f.composer.open && !f.muted)) {
    const c = f.composer;
    const text =
      c.reason === 'asleep'
        ? `Asleep${c.until ? ` until about ${c.until}` : ''}`
        : c.reason === 'busy'
          ? `${f.halil.doing?.label ? capital(f.halil.doing.label) : 'Busy'}${c.until ? ` until ${c.until}` : ''}`
          : 'He isn’t at a decision right now.';
    say(`Composer: ${text}. You can speak when he is awake and choosing.`);
    return;
  }
  const lean = f.options.find((o) => o.id === f.leaning?.optionId) ?? f.options.find((o) => o.leaning);
  say('Composer (Say something):');
  if (lean) say(`  He’s leaning toward ${lean.label}${f.leaning?.why ? ` — ${f.leaning.why}` : ''}`);
  f.options.slice(0, 6).forEach((o, i) => {
    const on = ui.draft?.optionId === o.id ? '*' : ' ';
    say(`  ${on}${i + 1}. ${o.label}${o.leaning ? '   (his leaning)' : ''}`);
  });
  const p = f.prefill;
  const fromPrefill = p && !ui.touched && ui.draft && ui.draft.optionId === p.optionId;
  if (p)
    say(
      `  ${fromPrefill ? 'Prefilled because' : `Prefilled ${f.options.find((o) => o.id === p.optionId)?.label ?? 'something'} because`} ${p.why}`,
    );
  else say('  Nothing here is prefilled. Pick one, or say nothing.');
  const d = ui.draft;
  say(
    `  How: [${d?.strength === 'mention' ? 'x' : ' '}] Mention (M)  [${d?.strength === 'urge' ? 'x' : ' '}] Urge (U)  [${d?.insist ? 'x' : ' '}] Insist (I)`,
  );
  if (d?.insist) say(`  ${INSIST_PRICE}`);
  say(
    `  Reason: ${APPEALS.map((a) => `[${d?.appeal === a.id ? 'x' : ' '}] ${a.label} (${a.key})`).join('  ')}`,
  );
  const sel = d ? f.options.find((o) => o.id === d.optionId) : undefined;
  if (d && sel) {
    say(`  ${telegraphText(g().predict(d))}`);
    const appeal = d.appeal ? ` · ${APPEALS.find((a) => a.id === d.appeal)?.label}` : '';
    say(
      `  [say] Say it: ${d.insist ? 'insist' : d.strength} · ${sel.label}${appeal}    [nothing] Say nothing`,
    );
  } else say('  Pick something to hear how he’d answer.    [nothing] Say nothing');
}

function halilPane(f: Frame): void {
  const h = f.halil;
  say('-- Halil --');
  if (h.doing)
    say(`  ${h.doing.label}${h.doing.intention ? ` — ${h.doing.intention}` : ''}, until ${h.doing.until}`);
  else say(`  ${h.asleep ? 'asleep' : 'deciding'}`);
  say(
    `  How he feels: ${h.felt.map((x) => `${x.id === 'tired' ? 'tiredness' : x.id} ${bar(x.level)} ${x.word}`).join('; ')}`,
  );
  if (h.feelings.length > 0) say(`  ${h.feelings.map((x) => x.word).join(', ')}`);
  if (h.health && h.health.length > 0) say(`  His health: ${h.health.join(' | ')}`);
  say(
    `  On his mind: ${h.onMind.length === 0 ? 'Nothing pressing.' : h.onMind.map((c) => `${c.label} ${c.due}${c.state === 'open' ? '' : ` (${c.state})`}`).join('; ')}`,
  );
  if (h.weighs && h.weighs.length > 0)
    say(
      `  How things weigh on him: ${h.weighs.map((w) => `${w.label}: ${w.word}${w.trend === 'same' ? '' : w.trend === 'easier' ? ', easier than at the start' : ', heavier than at the start'}`).join('; ')}`,
    );
  say(`  Money: ${h.money} in hand; ${h.owed} owed to Osman`);
}

function unaskedLine(items: UnaskedItem[] | undefined, lead = 'He’d now do unasked:'): void {
  if (!items || items.length === 0) return;
  say(
    `  ${lead} ${items.map((u) => `${u.label} ${UNASKED_MARK[u.state]}${u.day ? ` (${u.day})` : ''}`).join('; ')}`,
  );
}

function endsList(ends: EndView[], compact = false): void {
  for (const e of ends) {
    say(`  “${e.label}” ${e.status}${e.progress !== undefined ? ` ${bar(e.progress)}` : ''}`);
    if (!compact) say(`      ${e.detail}`);
    if (!compact && e.after) say(`      Without you: ${e.after}`);
  }
}

function endsPane(f: Frame): void {
  say('-- His ends -- Help him toward these, so that on Eid he does them without you.');
  unaskedLine(f.unasked);
  endsList(f.ends);
}

function voicesPane(f: Frame): void {
  say('-- Voices he hears --');
  for (const v of f.voices) {
    say(
      `  ${v.name} (${v.relation}): ${v.trustWord}${v.trust !== undefined ? ` ${bar(v.trust)} ${v.trust.toFixed(2)}` : ''}`,
    );
    for (const h of v.history.slice(-3))
      say(`      ${h.delta >= 0 ? '+' : '−'}${Math.abs(h.delta).toFixed(2)} ${h.text}`);
    if (v.lastUrged)
      say(
        `      urged ${v.lastUrged.label} · ${v.lastUrged.when}${v.lastUrged.standing ? ` · still on his mind ${bar(v.lastUrged.weight)}` : ''}`,
      );
    if (v.conflict) say(`      ${v.conflict}`);
  }
}

function strip(row: StripRow): string {
  // 48 half-hour cells: the family most of each half hour (the page's coloured strip).
  const key: Record<string, string> = {
    worship: 'p',
    work: 'W',
    food: 'f',
    social: 'S',
    phone: 't',
    rest: 'r',
    sleep: '.',
    health: 'H',
    money: '$',
    smoke: 'c',
    grave: 'g',
  };
  let s = '';
  for (let i = 0; i < 48; i++) {
    const m = i * 30 + 15;
    const c = row.cells.find((x) => x.from <= m && Math.max(x.from + 6, x.to) > m);
    s += c ? (c.promptedBy ? (key[c.family] ?? '?').toUpperCase() : (key[c.family] ?? '?')) : ' ';
  }
  return `|${s}| ${row.label}`;
}
const STRIP_KEY =
  '  strip: 00..06..12..18..24 by half hour; .=sleep p=prayer W=work f=food S=friends t=phone r=rest H=health $=money c=smoke g=grave; capitals: after a voice spoke';

function between(v: BetweenView): void {
  say(`== ${v.closed}`);
  for (const l of v.lines.slice(0, 6)) say(`  ${l}`);
  if (v.yours && v.yours.length > 0) {
    say('  What your words did:');
    for (const l of v.yours) say(`    ${l}`);
  }
  say(`  ${strip(v.strip)}`);
  say(STRIP_KEY);
  const delta = v.trust.to - v.trust.from;
  say(
    `  His trust in you: ${v.trust.from.toFixed(2)} → ${v.trust.to.toFixed(2)} (${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)})`,
  );
  for (const e of v.trust.events) say(`    ${e}`);
  say('  His ends:');
  unaskedLine(v.unasked);
  endsList(v.ends, true);
  const skip = v.next !== null && v.next.skipped > 0 && v.choices.length > 0;
  say(
    v.next
      ? v.next.skipped > 0
        ? `  ${v.next.skipped} days pass before ${v.next.label}.`
        : `  Next: ${v.next.label}`
      : '  Next: Eid al-Fitr. You will be silent.',
  );
  if (skip) {
    say(
      `  Leave up to two words for him to carry through those days, or none. (${ui.picked.length}/${MAX_WHISPERS})`,
    );
    v.choices.forEach((c, i) => {
      const w = ui.picked.find((x) => x.choiceId === c.id);
      say(`   ${w ? '*' : ' '}${i + 1}. ${c.label}  [${c.id}]${c.hint ? `\n        ${c.hint}` : ''}`);
    });
    for (const w of ui.picked) {
      const c = v.choices.find((x) => x.id === w.choiceId);
      say(
        `   picked: ${c?.label ?? w.choiceId} — ${w.strength === 'urge' ? 'Urge' : 'Mention'}, ${w.appeal ? APPEALS.find((a) => a.id === w.appeal)?.label : 'no reason'}`,
      );
    }
    if (ui.picked.length > 0 && v.choices[0]?.cost) say(`  ${v.choices[0].cost}`);
  }
  say(
    `  [next] ${v.next ? (v.next.skipped > 0 ? 'Let the days pass' : `Go to ${v.next.label}`) : 'Go to Eid'}`,
  );
}

function silentFor(view: ReportView): ReportView {
  const game = g();
  if (view.spoke === false) return { ...view, silent: silentMonthView(game, undefined) };
  if (ui.silent?.seed !== game.seed)
    ui.silent = {
      seed: game.seed,
      facts: monthFacts(finishSilentMonth(startSilentMonth(game.seed, game.rules))),
    };
  return { ...view, silent: silentMonthView(game, ui.silent.facts) };
}

function report(raw: ReportView): void {
  const v = silentFor(raw);
  const lines = (ls: string[], empty: string) => {
    if (ls.length === 0) say(`  ${empty}`);
    for (const l of ls) say(`  ${l}`);
  };
  say('== The week after Eid — Without you');
  lines(v.eid.summary, '');
  say('-- Eid, without you');
  say(`  ${strip(v.eid.strip)}`);
  lines(v.eid.lines, 'A quiet day.');
  if (v.ledger && v.ledger.length > 0) {
    say('-- What you used to say, and what he did on Eid');
    for (const l of v.ledger) say(`  ${l.said} → ${l.eid}`);
  }
  say('-- What he did on his own');
  lines(v.own, 'Nothing new that he did unprompted.');
  if (v.others.length > 0) {
    say('-- What others still had to tell him');
    lines(v.others, '');
  }
  if (v.stopped.length > 0) {
    say('-- What stopped');
    lines(v.stopped, '');
  }
  say('-- Who he listens to (end of Ramadan | a week after Eid)');
  for (const t of v.trust) say(`  ${t.name}: ${t.endRamadan} | ${t.endWeek}`);
  say('-- His ends when Ramadan ended');
  say(
    '  As of Eid morning: what the month you spoke in left him with. Under each, what came of it without you.',
  );
  unaskedLine(v.unasked, 'At Eid morning he would have done unasked:');
  endsList(v.ends);
  say('-- His body a week after Eid, as the doctor would read it (He never feels this directly.)');
  lines(v.body, 'No reading.');
  say('-- Still open a week after Eid');
  lines(v.open, 'Nothing left open.');
  if (v.silent) {
    say('-- The month you never spoke');
    say(`  ${v.silent.intro}`);
    for (const r of v.silent.rows)
      say(`  ${r.topic}: As played ${r.spoke} | Had you said nothing ${r.silent}`);
    if (v.silent.same) say(`  ${v.silent.same}`);
    if (v.silent.smaller) say(`  ${v.silent.smaller}`);
    if (v.silent.rows.length > 0 || v.silent.same) say(`  ${v.silent.caption}`);
  }
  say(`-- ${v.spoke === false ? 'The days you watched, and Eid' : 'The days you spoke, and Eid'}`);
  for (const r of v.rows) say(`  ${strip(r)}`);
  say(STRIP_KEY);
  say(
    '  [keep-listening] Keep listening   [replay] Replay   [new-town] New town   [export FILE] Download playtest file',
  );
}

function intro(f: Frame): void {
  if (!f.intro) return;
  say(`== ${f.intro.label}`);
  for (const l of f.intro.lines) say(`  ${l}`);
  if (f.phase === 'eid') say('  There is no composer today. You can still open Why on any line.');
  say('  [continue] Continue');
}

function premise(): void {
  say('== The Day You Say Nothing');
  say(
    '  Halil is 61. He repairs kettles and bicycles in a rented shop. His wife Nuran died fourteen weeks ago; their daughter Selin lives in the city. Tonight is the first night of Ramadan.',
  );
  say(
    '  You are a voice in his head that is not his own. He hears you. He decides. He may agree, put you off, do something like it, refuse, or give in under protest, and he always says why.',
  );
  say(
    '  You have four days of this month to speak. On Eid you go silent, and you watch what he does on his own.',
  );
  say('  What he’s holding on to: keep the fast; pay Osman, his landlord (600 owed; 300 by Ramadan 15);');
  say(
    '    his daughter Selin wants his blood pressure seen; Selin herself: calling her, not waiting for her to call.',
  );
  say(
    '  Who else he hears: Selin, his daughter, on the phone. Rıza, his friend, at the tea house. Hacer, the neighbour who talks about people. Osman, his landlord. The doctor at the clinic.',
  );
  say('  Your aim: Help him toward his own ends, so that on Eid he does them without you.');
  say('  Time runs slowly and stops when something matters. Space pauses.');
  say('  [begin] Begin    [notes] Model notes');
}

/** Whatever is in front of the player now: an overlay, or the day (log news, beat, composer). */
function screen(full: boolean): void {
  const game = g();
  const f = frame();
  syncDraft(f);
  if (game.phase === 'premise') {
    premise();
    return;
  }
  if (game.phase === 'between' && game.between) {
    newLog(f);
    between(game.between);
    return;
  }
  if (game.phase === 'report' && game.report) {
    report(game.report);
    return;
  }
  topBar(f);
  if (f.intro) {
    newLog(f);
    intro(f);
    return;
  }
  if (full) {
    endsPane(f);
    voicesPane(f);
    halilPane(f);
    newLog(f, true);
  } else newLog(f);
  beatBanner(f);
  composer(f);
}

// ---------------------------------------------------------------------------------------------------------------
// Commands.

const HELP = `The Day You Say Nothing, text harness. You are a voice in Halil's head. Commands (several per call):
  new [SEED]          start a new run (the shipped seed is 7); shows the premise card
  begin               Begin (premise card)        continue   Continue (an intro card)
  look                the whole screen: ends, voices, Halil, the day's log, the composer
  log                 the day's log so far         halil | ends | voices   one panel
  run [SECONDS]       let real time pass until the game pauses itself (default up to 600 s)
  wait SECONDS        let real time pass (stops early if the game pauses itself)
  pause | play        the pause button (Space)     pace slow|normal|fast    autopause on|off
  end-day             End the day (fast-forwards to 23:30 with only your standing word live)
  composer, when it is open:
    pick N            pick option N (1-6)          mention | urge | insist (toggles)
    reason D|H|S|A|T  toggle a reason: D duty, H health, S for Selin, A you shouldn't be alone, T it matters
    say               Say it (Enter)               nothing    Say nothing (Esc): play on
  withdraw            withdraw your standing words
  why ID              Why, for a log line that shows "(why ID)"
  between-days card:
    whisper N|ID [mention|urge] [D|H|S|A|T|none]   pick (or re-set) a word for the skipped days; again to drop it
    next              the card's button (Let the days pass / Go to ...)
  report: keep-listening | replay | new-town
  export FILE         download the playtest file (seed + input log + state)
  load FILE           replay a playtest file as the current run
  notes               model notes                  help       this list
Time: Slow is 8 sim minutes a real second, Normal 20, Fast 60; while he sleeps or is busy it skips at 240.`;

function tickFor(seconds: number): void {
  const game = g();
  const ticks = Math.ceil((seconds * 1000) / TICK_MS);
  for (let i = 0; i < ticks; i++) {
    if (!game.live() || game.paused) break;
    rec.tick(TICK_MS);
    ui.realMs = (ui.realMs ?? 0) + TICK_MS;
  }
}

function appealOf(k: string | undefined): Appeal | undefined | 'none' {
  if (!k) return undefined;
  if (k.toLowerCase() === 'none') return 'none';
  const a = APPEALS.find((x) => x.key === k.toUpperCase() || x.word === k.toLowerCase() || x.id === k);
  if (!a) throw new Error(`no reason "${k}"`);
  return a.id;
}

async function command(words: string[]): Promise<number> {
  const [cmd = '', a, b, c] = words;
  const game = rec?.game;
  const f = game ? frame() : undefined;
  if (f) syncDraft(f);
  const edit = (patch: Partial<Draft>) => {
    if (!f) return;
    ui.touched = true;
    const base: Draft = ui.draft ?? { optionId: f.options[0]?.id ?? '', strength: 'mention', insist: false };
    const next = { ...base, ...patch };
    if ('appeal' in patch && patch.appeal === undefined) delete next.appeal;
    ui.draft = next;
  };
  const composerOpen = () => {
    if (
      !f ||
      !(f.composer.open && !f.muted) ||
      f.intro ||
      game?.phase === 'between' ||
      game?.phase === 'report'
    )
      throw new Error('the composer is not open now');
  };
  switch (cmd) {
    case 'help':
      say(HELP);
      return 0;
    case 'notes':
      for (const n of MODEL_NOTES) say(`  - ${n}`);
      return 0;
    case 'new':
      start(a ? Number(a) : 7);
      screen(false);
      return 0;
    case 'look':
      screen(true);
      return 0;
    case 'log':
      if (f) newLog(f, true);
      return 0;
    case 'halil':
      if (f) halilPane(f);
      return 0;
    case 'ends':
      if (f) endsPane(f);
      return 0;
    case 'voices':
      if (f) voicesPane(f);
      return 0;
    case 'begin':
      rec.apply({ type: 'begin' });
      break;
    case 'continue':
      if (!f?.intro) throw new Error('there is no card to continue');
      rec.apply({ type: 'dismissIntro' });
      break;
    case 'pause':
      rec.apply({ type: 'pause' });
      break;
    case 'play':
      rec.apply({ type: 'resume' });
      break;
    case 'pace':
      if (a !== 'slow' && a !== 'normal' && a !== 'fast') throw new Error('pace slow|normal|fast');
      rec.apply({ type: 'setPace', pace: a as Pace });
      break;
    case 'autopause':
      rec.apply({ type: 'setAutoPause', on: a !== 'off' });
      break;
    case 'end-day':
      rec.apply({ type: 'endDay' });
      break;
    case 'run':
    case 'wait': {
      const s = Number(a ?? (cmd === 'run' ? 600 : 10));
      if (!Number.isFinite(s) || s <= 0) throw new Error(`${cmd} SECONDS`);
      if (game?.phase === 'premise') throw new Error('the premise card is up: begin');
      if (game?.phase === 'between') throw new Error('the between-days card is up: whisper ... / next');
      if (game?.phase === 'report') throw new Error('the report is up: keep-listening / replay / new-town');
      if (f?.intro) throw new Error('a card is up: continue');
      if (game?.paused && game.live()) rec.apply({ type: 'resume' });
      const t0 = g().t;
      tickFor(s);
      say(`(${g().t - t0} sim minutes passed; ${Math.round((ui.realMs ?? 0) / 1000)} s of real play so far)`);
      break;
    }
    case 'pick': {
      composerOpen();
      const o = f?.options[Number(a) - 1];
      if (!o) throw new Error(`no option ${a}`);
      edit({ optionId: o.id });
      break;
    }
    case 'mention':
    case 'urge':
      composerOpen();
      edit({ strength: cmd });
      break;
    case 'insist':
      composerOpen();
      edit({ insist: !(ui.draft?.insist ?? false) });
      break;
    case 'reason': {
      composerOpen();
      const ap = appealOf(a);
      if (!ap || ap === 'none') edit({ appeal: undefined });
      else edit({ appeal: ui.draft?.appeal === ap ? undefined : ap });
      break;
    }
    case 'say': {
      composerOpen();
      const d = ui.draft;
      if (!d?.optionId || !f?.options.some((o) => o.id === d.optionId))
        throw new Error('pick something first');
      rec.apply({ type: 'suggest', draft: d });
      ui.draft = null;
      ui.touched = true;
      break;
    }
    case 'nothing':
      ui.draft = null;
      ui.touched = true;
      rec.apply({ type: 'resume' });
      break;
    case 'withdraw':
      if (!f?.standing) throw new Error('you have no standing words');
      rec.apply({ type: 'withdraw' });
      break;
    case 'why': {
      const e = f?.log.find((x) => x.id === a);
      const w = e?.decisionId ? g().why(e.decisionId) : null;
      if (!w) {
        say('Why: That moment is too far back to read.');
        return 0;
      }
      say(`-- Why (${w.clock}) He chose ${w.chosen}.`);
      if (w.note) say(`  ${w.note}`);
      if (w.voice) say(`  To your words he said “${w.voice.says}” (${w.voice.reason})`);
      if (w.recalled) say(`  ${w.recalled}`);
      for (const o of w.options) {
        say(`  ${o.label}  ${o.total.toFixed(2)}`);
        for (const t of o.terms)
          say(`      ${t.value >= 0 ? '+' : '−'}${Math.abs(t.value).toFixed(2)} ${t.label}`);
      }
      say('  Figures are estimates from his own weighing, not measurements.');
      return 0;
    }
    case 'whisper': {
      const v = game?.between;
      if (game?.phase !== 'between' || !v) throw new Error('there is no between-days card');
      const ch = v.choices[Number(a) - 1] ?? v.choices.find((x) => x.id === a);
      if (!ch) throw new Error(`no word ${a}`);
      const has = ui.picked.find((w) => w.choiceId === ch.id);
      if (has && !b) ui.picked = ui.picked.filter((w) => w.choiceId !== ch.id);
      else {
        const w: StandingWhisper = has ?? defaultWhisper(ch.id);
        if (!has) {
          if (ui.picked.length >= MAX_WHISPERS) throw new Error('two words already; drop one first');
          ui.picked.push(w);
        }
        for (const x of [b, c]) {
          if (!x) continue;
          if (x === 'mention' || x === 'urge') w.strength = x;
          else {
            const ap = appealOf(x);
            if (ap === 'none') delete w.appeal;
            else if (ap) w.appeal = ap;
          }
        }
      }
      break;
    }
    case 'next': {
      const v = game?.between;
      if (game?.phase !== 'between' || !v) throw new Error('there is no between-days card');
      const skip = v.next !== null && v.next.skipped > 0 && v.choices.length > 0;
      rec.apply({ type: 'advance', standing: skip ? ui.picked : [] });
      ui.picked = [];
      break;
    }
    case 'keep-listening':
      rec.apply({ type: 'keepListening' });
      break;
    case 'replay':
    case 'new-town':
      start(cmd === 'replay' ? g().seed : 1 + Math.floor(Math.random() * 1_000_000));
      screen(false);
      return 0;
    case 'export': {
      if (!a) throw new Error('export FILE');
      const file = await makePlaytestFile({
        game: 'voice',
        seed: g().seed,
        scenario: scenarioOf(g().rules),
        minute: g().t,
        log: structuredClone(rec.log),
        hash: voiceHash(g()),
        engine: ENGINE_VERSION,
        snapshot: voiceSnapshot(g()),
      });
      writeFileSync(a, `${JSON.stringify({ ...file, build: 'harness', framework: FRAMEWORK_VERSION })}\n`);
      say(`Wrote the playtest file to ${a} (seed ${g().seed}, ${rec.log.length} log entries).`);
      return 0;
    }
    case 'load': {
      if (!a) throw new Error('load FILE');
      const { file: pf, rules } = parseVoicePlaytest(readFileSync(a, 'utf8'));
      const { rec: r, driftAt } = replayVoice(pf.seed, pf.log, rules);
      const matches = voiceHash(r.game) === pf.hash;
      rec = r;
      ui = freshUi();
      if (r.game.live() && !r.game.paused) rec.apply({ type: 'pause' });
      say(
        `Replayed ${a} (${pf.scenario}): ${matches ? 'same state as recorded' : 'state differs from the file'}${driftAt >= 0 ? ` (inputs drifted at entry ${driftAt})` : ''}.`,
      );
      break;
    }
    default:
      throw new Error(`unknown command "${cmd}" (try help)`);
  }
  screen(false);
  return 0;
}

/** Split argv into commands: a known command word starts a new one. */
const WORDS = new Set(
  'help notes new look log halil ends voices begin continue pause play pace autopause end-day run wait pick mention urge insist reason say nothing withdraw why whisper next keep-listening replay new-town export load'.split(
    ' ',
  ),
);
function split(args: string[]): string[][] {
  const cmds: string[][] = [];
  for (const w of args) {
    const last = cmds[cmds.length - 1];
    // "whisper 9 urge H": the strength words are the whisper's own arguments here.
    const whisperArg = last?.[0] === 'whisper' && last.length < 4 && (w === 'mention' || w === 'urge');
    if ((WORDS.has(w) && !whisperArg) || cmds.length === 0) cmds.push([w]);
    else cmds[cmds.length - 1]?.push(w);
  }
  return cmds;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const si = args.indexOf('--state');
  if (si >= 0) {
    statePath = args[si + 1] ?? statePath;
    args.splice(si, 2);
  }
  let cmds = split(args);
  if (args.length === 1 && args[0] === '-')
    cmds = readFileSync(0, 'utf8')
      .split('\n')
      .map((l) => l.trim().split(/\s+/).filter(Boolean))
      .filter((l) => l.length > 0);
  if (cmds.length === 0) cmds = [['look']];
  const loaded = load();
  const needsRun = !cmds.some(
    (c) => c[0] === 'new' || c[0] === 'help' || c[0] === 'load' || c[0] === 'notes',
  );
  if (!loaded && needsRun) {
    say('No run yet. Start one with: new 7');
    process.stdout.write(`${out.join('\n')}\n`);
    return;
  }
  let code = 0;
  for (const c of cmds) {
    try {
      if (!rec && c[0] !== 'new' && c[0] !== 'help' && c[0] !== 'load' && c[0] !== 'notes')
        throw new Error('no run yet: new 7');
      say(`$ ${c.join(' ')}`);
      await command(c);
    } catch (err) {
      say(`! ${err instanceof Error ? err.message : String(err)}`);
      code = 1;
      break;
    }
  }
  if (rec) save();
  process.stdout.write(`${out.join('\n')}\n`);
  process.exitCode = code;
}

await main();
