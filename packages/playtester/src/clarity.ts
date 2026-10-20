/**
 * SCOPE: deterministic warnings and measurements from recorded adapter-visible screens, menus and events only.
 * These are review signals, not proof that a game passes DL-1..29. Promises are the adapter's reading; boredom
 * and quits are persona responses, not diagnoses. No visual layout, reading comprehension, sub-second feedback,
 * game source or hidden state is inspected. Missing optional evidence is unmeasured, never an automatic pass.
 * All thresholds below are engineering defaults for this rubric, not estimates of human behaviour.
 */
import { answers } from './adapter.ts';
import type { SessionTrace } from './session.ts';

export const CLARITY_DEFAULTS = {
  firstMinuteSeconds: 60,
  firstInputSeconds: 30,
  idleBeats: 5,
  promiseThreshold: 0.4,
  nearEqualPromise: 0.05,
  nearEqualActions: 3,
  quietSeconds: 30,
  /** Coarse session sampling cannot enforce DL-13's prompt acknowledgement. Allow three ordinary 3s beats. */
  answerWindowSeconds: 9,
  unansweredInputs: 3,
  mustReadWords: 60,
  /** Unknown scripts in load-bearing copy: warn only after enough letters, with a majority non-ASCII. */
  nonAsciiMinLetters: 6,
  nonAsciiShare: 0.5,
};

export type ClarityId = `DL-${number}`;
export interface ClarityFinding {
  dl: ClarityId;
  signal: string;
  status: 'warning' | 'measurement' | 'unmeasured';
  game: string;
  persona: string;
  seed: number;
  /** Seconds since the first playable screen; beats is an input count or index where applicable. */
  seconds: number;
  beats?: number;
  /** Evidence in adapter terms, not a claim about intent. */
  detail: string;
}

// Whole words only: setting names in flavour copy are deliberately outside this check. ASCII spellings cover
// adapters that transliterate Turkish. A few common French, German and Spanish calendar words widen coverage.
const CALENDAR_WORDS = new Set(
  `pazartesi salı sali çarşamba carsamba perşembe persembe cuma cumartesi pazar ocak şubat subat mart nisan
   mayıs mayis haziran temmuz ağustos agustos eylül eylul ekim kasım kasim aralık aralik
   lundi mardi mercredi jeudi vendredi samedi dimanche janvier février mars avril mai juin juillet août septembre octobre novembre décembre
   montag dienstag mittwoch donnerstag freitag samstag sonntag januar februar märz juni juli oktober dezember
   lunes martes miércoles jueves viernes sábado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre`
    .split(/\s+/u)
    .filter(Boolean),
);

function nonEnglish(text: string): string | undefined {
  const words =
    text
      .normalize('NFC')
      .toLowerCase()
      .match(/\p{L}+/gu) ?? [];
  const calendar = words.find((w) => CALENDAR_WORDS.has(w));
  if (calendar) return `calendar word "${calendar}"`;
  const letters = [...words.join('')];
  const nonAscii = letters.filter((x) => !/[a-z]/u.test(x)).length;
  const D = CLARITY_DEFAULTS;
  if (letters.length >= D.nonAsciiMinLetters && nonAscii / letters.length > D.nonAsciiShare)
    return `non-ASCII letters ${nonAscii}/${letters.length} (language heuristic)`;
  return undefined;
}

/** Read one trace or several; findings retain persona and seed so cohort evidence stays attributable. */
export function clarityReport(input: SessionTrace | readonly SessionTrace[]): ClarityFinding[] {
  const traces = Array.isArray(input) ? input : [input as SessionTrace];
  return traces.flatMap(reportSession);
}

function reportSession(tr: SessionTrace): ClarityFinding[] {
  const D = CLARITY_DEFAULTS;
  const out: ClarityFinding[] = [];
  const seen = new Set<string>();
  const add = (
    dl: ClarityId,
    signal: string,
    seconds: number,
    detail: string,
    status: ClarityFinding['status'] = 'warning',
    beats?: number,
    subject = '',
  ) => {
    const key = `${dl}|${signal}|${subject}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      dl,
      signal,
      status,
      game: tr.game,
      persona: tr.persona,
      seed: tr.seed,
      seconds,
      ...(beats !== undefined ? { beats } : {}),
      detail,
    });
  };
  const beats = tr.beats;
  const first = beats.findIndex((b) => b.choice !== 'wait');
  const elapsed = first < 0 ? tr.ended.t : (beats[first]?.t ?? 0);
  add(
    'DL-6',
    'first-input',
    elapsed,
    first < 0
      ? `No input in ${elapsed}s (${beats.length} beats observed).`
      : `First input "${beats[first]?.choice}" at ${elapsed}s after ${first} beats.`,
    elapsed > D.firstInputSeconds || (first < 0 && elapsed >= D.firstInputSeconds)
      ? 'warning'
      : first < 0
        ? 'unmeasured'
        : 'measurement',
    first < 0 ? beats.length : first,
  );
  const idle = beats
    .slice(0, first < 0 ? beats.length : first)
    .filter((b) => b.choice === 'wait' && b.offered > 0).length;
  add(
    'DL-6',
    'idle-before-input',
    elapsed,
    `${idle} idle beats before first input while enabled actions were available.`,
    idle >= D.idleBeats ? 'warning' : 'measurement',
    idle,
  );

  const available = beats.findIndex((b) => b.offered > 0);
  const availableAt = available < 0 ? tr.ended.t : (beats[available]?.t ?? 0);
  add(
    'DL-6',
    'first-choice-available',
    availableAt,
    available < 0
      ? `No enabled action recorded in ${availableAt}s.`
      : `First enabled action recorded at ${availableAt}s, independently of the first input.`,
    availableAt > D.firstInputSeconds || (available < 0 && availableAt >= D.firstInputSeconds)
      ? 'warning'
      : available < 0
        ? 'unmeasured'
        : 'measurement',
    available < 0 ? beats.length : available,
  );

  const opening = beats.filter((b) => b.t < D.firstMinuteSeconds);
  const goals = opening.filter((b) => b.screen?.goal !== undefined);
  if (goals.length === 0)
    add('DL-1', 'goal-not-exposed', 0, 'Adapter did not expose goal copy in the first minute.', 'unmeasured');
  else if (!goals.some((b) => b.screen?.goal?.trim()))
    add(
      'DL-1',
      'missing-goal',
      goals[0]?.t ?? 0,
      'No explicit goal sentence shown in sampled first-minute screens; check whether the scene conveys a reason to act.',
    );
  if (!opening.some((b) => b.screen?.menu !== undefined))
    add('DL-3', 'menu-not-exposed', 0, 'No raw first-minute menu recorded.', 'unmeasured');
  if (!beats.some((b) => b.screen?.next !== undefined))
    add('DL-5', 'next-not-exposed', 0, 'Adapter did not expose the what-next line.', 'unmeasured');
  if (!beats.some((b) => b.screen?.menu !== undefined))
    add(
      'DL-4',
      'limits-not-exposed',
      0,
      'Visible controls and disabled reasons were not recorded.',
      'unmeasured',
    );

  let quietFrom: number | undefined;
  for (const [i, b] of beats.entries()) {
    const screen = b.screen;
    const menu = screen?.menu;
    const enabled = menu?.filter((a) => !a.disabled) ?? [];
    if (b.t < D.firstMinuteSeconds && enabled.length) {
      const top = Math.max(...enabled.map((a) => a.promise));
      if (top <= D.promiseThreshold)
        add(
          'DL-3',
          'low-promises',
          b.t,
          `No enabled action above promise ${D.promiseThreshold}; highest ${top}.`,
        );
      const near = enabled.filter((a) => top - a.promise <= D.nearEqualPromise);
      if (near.length >= D.nearEqualActions)
        add(
          'DL-3',
          'near-equal-promises',
          b.t,
          `${near.length} enabled actions within ${D.nearEqualPromise} of highest promise ${top}: ${near.map((a) => a.label).join(', ')}.`,
        );
    }
    for (const a of menu ?? [])
      if (a.disabled && !a.disabled.reason?.trim())
        add(
          'DL-4',
          'disabled-without-reason',
          b.t,
          `"${a.label}" (${a.id}) disabled with no shown reason.`,
          'warning',
          i,
          a.id,
        );
    const prev = beats[i - 1];
    if (menu && prev?.screen?.menu && b.shown.length === 0)
      for (const a of prev.screen.menu)
        if (!a.disabled && !menu.some((x) => x.id === a.id && (!x.disabled || x.disabled.reason?.trim())))
          add(
            'DL-4',
            'withdrawn-action',
            b.t,
            `"${a.label}" (${a.id}) was offered at ${prev.t}s, then withdrawn or disabled with no reason or event.`,
            'warning',
            i,
            a.id,
          );
    if (screen?.next !== undefined && !screen.next.trim())
      add(
        'DL-5',
        'missing-next',
        b.t,
        'No explicit what-next line shown; review only if the available responses or ongoing situation are unclear.',
      );

    const noLoop = !(
      screen?.loops?.some((s) => s.trim()) ||
      (screen?.openLoop ?? 0) > 0 ||
      screen?.next?.trim()
    );
    const loopMeasured = screen?.loops !== undefined && screen.openLoop !== undefined;
    if (loopMeasured && screen?.next !== undefined && noLoop && b.shown.length === 0) quietFrom ??= b.t;
    else quietFrom = undefined;
    if (quietFrom !== undefined && b.t - quietFrom >= D.quietSeconds)
      add(
        'DL-5',
        'quiet-without-next',
        quietFrom,
        `At least ${b.t - quietFrom}s with no events, open loop or visible next line.`,
      );

    const now = screen?.text?.filter((x) => x.level === 'now').map((x) => x.text) ?? [];
    const copy: [string, string][] = [
      ...now.map((x): [string, string] => ['now', x]),
      ['goal', screen?.goal ?? ''],
      ['next', screen?.next ?? ''],
      ...(menu ?? []).flatMap((a): [string, string][] => [
        ['control', a.label],
        ['disabled reason', a.disabled?.reason ?? ''],
      ]),
    ];
    const words = [...new Set(copy.map(([, text]) => text))]
      .join(' ')
      .trim()
      .split(/\s+/u)
      .filter(Boolean).length;
    if (words > D.mustReadWords)
      add(
        'DL-11',
        'must-read-length',
        b.t,
        `${words} words of exposed must-read copy; default maximum ${D.mustReadWords}.`,
      );
    for (const [source, text] of [['clock', b.clock], ...copy] as [string, string][]) {
      const why = nonEnglish(text);
      if (why) {
        add('DL-20', 'non-english-load-bearing', b.t, `${source}: "${text}"; ${why}.`);
        if (source === 'clock' || why.startsWith('calendar'))
          add('DL-21', 'non-english-date', b.t, `${source}: "${text}"; ${why}.`);
      }
    }
  }

  const unanswered = new Map<string, number[]>();
  for (const [i, b] of beats.entries()) {
    if (b.choice === 'wait' || tr.ended.t - b.t < D.answerWindowSeconds) continue;
    let answered = false;
    for (let j = i + 1; j < beats.length; j++) {
      const later = beats[j];
      if (!later || later.t > b.t + D.answerWindowSeconds) break;
      if (later.shown.some((e) => answers(e.a, b.choice))) {
        answered = true;
        break;
      }
    }
    const finalInWindow = tr.ended.t > b.t && tr.ended.t <= b.t + D.answerWindowSeconds;
    if (answered || (finalInWindow && tr.closingShown?.some((e) => answers(e.a, b.choice)))) continue;
    const ts = unanswered.get(b.choice) ?? [];
    ts.push(b.t);
    unanswered.set(b.choice, ts);
  }
  for (const [id, ts] of unanswered)
    if (ts.length >= D.unansweredInputs)
      add(
        'DL-13',
        'unanswered-input',
        ts[0] ?? 0,
        `Input "${id}" had no matching answers event within ${D.answerWindowSeconds}s on ${ts.length} attempts with complete windows.`,
        'warning',
        ts.length,
        id,
      );

  const chapter = beats[0]?.chapter;
  const firstChapterEnd = beats.find((b) => b.chapter !== chapter)?.t ?? tr.ended.t;
  const bored = tr.moments.find((m) => m.kind === 'bored' && m.t < firstChapterEnd);
  if (bored) add('DL-7', 'first-chapter-boredom', bored.t, `First chapter "${chapter}": ${bored.text}`);
  if (
    chapter !== undefined &&
    !beats.some((b) => b.chapter !== chapter) &&
    tr.final.chapter === chapter &&
    tr.ended.reason === 'quit'
  )
    add(
      'DL-1',
      'first-chapter-quit',
      tr.ended.t,
      `Voluntary quit in first chapter "${chapter}": ${tr.ended.why}`,
    );
  return out;
}

/** Append to the existing cohort report. No warning means only that these recorded signals found none. */
export function formatClarityReport(findings: readonly ClarityFinding[]): string {
  const row = (f: ClarityFinding) =>
    `  ${f.dl}: ${f.status} ${f.persona} seed ${f.seed} @${f.seconds}s: ${f.detail}`;
  const lines = ['First minute (DL-1..DL-7)'];
  for (let n = 1; n <= 7; n++) {
    const dl: ClarityId = `DL-${n}`;
    const first = findings.filter(
      (f) => f.dl === dl && (f.seconds < CLARITY_DEFAULTS.firstMinuteSeconds || dl === 'DL-6'),
    );
    const measured = first.filter((f) => f.status !== 'unmeasured');
    lines.push(...first.map(row));
    if (!first.length) lines.push(`  ${dl}: no recorded warning; not a rubric pass.`);
    if (n === 2 || n === 7)
      lines.push(`  ${dl}: visual controls / teaching comprehension need a source-unread tester.`);
    else if (!measured.length && !first.length) lines.push(`  ${dl}: unmeasured in this run.`);
  }
  lines.push('Other DL findings');
  const rest = findings.filter(
    (f) => Number(f.dl.slice(3)) > 7 || (f.seconds >= CLARITY_DEFAULTS.firstMinuteSeconds && f.dl !== 'DL-6'),
  );
  lines.push(...rest.map(row));
  if (!rest.length) lines.push('  No other recorded findings.');
  lines.push(
    '  Warnings are screen-contract signals, not full DL passes; feedback is checked at beat resolution.',
  );
  return lines.join('\n');
}
