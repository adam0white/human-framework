import { TOWN_EID_DAY, voiceOf } from '@human/framework';
import { describe, expect, test } from 'vitest';
import { type BeatKind, defaultWhisper, type LogEntry, type StandingWhisper } from '../protocol.ts';
import { DAY_END, SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { EID_LINES, eidLines, smokingLines } from './report.ts';

const MIN_DAY = 1440;

const at = (day: number, hh: number, mm = 0) => day * MIN_DAY + hh * 60 + mm;
const dayOfMin = (m: number) => Math.floor(m / MIN_DAY);
const fmt = (m: number) =>
  `d${Math.floor(m / MIN_DAY)} ${String(Math.floor((m % MIN_DAY) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const ALL_BEATS: BeatKind[] = [
  'wake',
  'verdict',
  'voice',
  'craving',
  'close-call',
  'duty-risk',
  'recall',
  'day-end',
  'eid',
];
const WHISPERS: StandingWhisper[] = [
  { choiceId: 'doctor', strength: 'mention', appeal: 'safety' },
  { choiceId: 'selin', strength: 'mention', appeal: 'benevolence' },
];

describe('Game 2 sim on the shipped seed', () => {
  const quiet = new VoiceGame(SHIPPED_SEED);
  play(quiet);
  const spoken = new VoiceGame(SHIPPED_SEED);
  let maxFrame = 0;
  play(spoken, {
    confirm: true,
    whispers: WHISPERS,
    onPause: (f) => {
      maxFrame = Math.max(maxFrame, JSON.stringify(f).length);
    },
  });

  test('the bar: a prefill-only player meets a non-assented answer and a craving by Ramadan 1 12:00', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, { confirm: true, stop: (x) => x.t >= at(1, 12) });
    const answers = g.log.filter((e) => e.kind === 'answer' && e.minute < at(1, 12));
    expect(answers.length).toBeGreaterThan(0);
    expect(answers.some((e) => e.tone !== 'yes')).toBe(true);
    expect(g.beats.history.some((b) => b.kind === 'craving' && b.at < at(1, 12))).toBe(true);
    // The first beat is the suhoor wake, prefilled with eat as the tutorial, and the first answer is a yes.
    const first = g.beats.history[0];
    expect(first?.kind).toBe('wake');
    expect(answers[0]?.tone).toBe('yes');
  });

  test('every planned beat but duty-risk fires (timings logged for the build report)', () => {
    // The prayer/thirst duty-risk does not occur on the shipped seed: he keeps every prayer before its closing
    // stretch and his perceived thirst in the fast peaks at about 0.61 (< 0.7). Its detector is tested below on a
    // provoked case. (The afternoon-shift pause also uses the duty-risk kind; it has its own test.)
    const kinds = new Set(spoken.beats.history.map((b) => b.kind));
    for (const k of ALL_BEATS.filter((x) => x !== 'duty-risk')) expect(kinds, k).toContain(k);
    const quietKinds = new Set(quiet.beats.history.map((b) => b.kind));
    for (const k of ALL_BEATS.filter((x) => x !== 'verdict' && x !== 'duty-risk'))
      expect(quietKinds, `quiet ${k}`).toContain(k);
    const firsts: Record<string, string[]> = {};
    for (const b of spoken.beats.history) {
      const list = firsts[b.kind] ?? [];
      firsts[b.kind] = list;
      if (list.length < 4) list.push(`${fmt(b.at)}${b.paused ? '' : ' (logged)'}`);
    }
    console.log('beat timings (prefill player):', JSON.stringify(firsts));
    const perDay: Record<number, number> = {};
    for (const b of spoken.beats.history)
      if (b.paused) perDay[Math.floor(b.at / MIN_DAY)] = (perDay[Math.floor(b.at / MIN_DAY)] ?? 0) + 1;
    console.log('pauses per day (prefill player):', JSON.stringify(perDay));
  });

  test('a played day ends at 23:30 and close-calls fire at most twice a day', () => {
    const days = spoken.beats.history.filter((b) => b.kind === 'day-end').map((b) => b.at % MIN_DAY);
    expect(days.length).toBe(4);
    for (const m of days) expect(m).toBe(DAY_END);
    const cc: Record<number, number> = {};
    for (const b of spoken.beats.history)
      if (b.kind === 'close-call') cc[Math.floor(b.at / MIN_DAY)] = (cc[Math.floor(b.at / MIN_DAY)] ?? 0) + 1;
    for (const n of Object.values(cc)) expect(n).toBeLessThanOrEqual(2);
  });

  test('no Eid or epilogue decision carries a `you` suggestion', () => {
    for (const g of [quiet, spoken]) {
      expect(g.audit.length).toBeGreaterThan(100);
      expect(g.audit.filter((a) => a.voices.includes('you'))).toEqual([]);
      expect(Math.min(...g.audit.map((a) => a.at))).toBeGreaterThanOrEqual(at(31, 0));
    }
  });

  test('the muted days differ from the spoken ones', () => {
    const r = spoken.report;
    expect(r).toBeDefined();
    const eid = r?.eid.strip.cells.map((c) => c.label).join('|');
    const r30 = r?.rows[3]?.cells.map((c) => c.label).join('|');
    expect(eid).not.toBe(r30);
    expect(r?.rows[4]?.cells.some((c) => c.promptedBy === 'you')).toBe(false);
    expect(r?.rows.slice(0, 4).some((row) => row.cells.some((c) => c.promptedBy === 'you'))).toBe(true);
    // The spoken and the quiet month leave different reports.
    expect(JSON.stringify(spoken.report)).not.toBe(JSON.stringify(quiet.report));
  });

  test('the voice changes the outcome: silent, prefill and insist runs end differently', () => {
    const doctor = (g: VoiceGame) => g.report?.ends.find((e) => e.id === 'doctor')?.status;
    const halilCalls = (g: VoiceGame) =>
      g.cells.filter((c) => c.affordanceId === 'call:selin' && c.from < at(31, 0)).length;
    // Silent: the clinic stays unvisited and he never calls Selin himself in Ramadan.
    expect(doctor(quiet)).toBe('not seen in Ramadan');
    expect(halilCalls(quiet)).toBe(0);
    expect(quiet.report?.eid.summary.some((l) => /never went to the clinic/.test(l))).toBe(true);
    // Silent: morning wages alone miss Osman's date, and the report says so.
    expect(quiet.report?.eid.summary.some((l) => /He missed Osman’s date/.test(l))).toBe(true);
    expect(quiet.cells.some((c) => c.affordanceId === 'work-extra')).toBe(false);
    // Prefill: the doctor is seen, after you spoke, and the report says so.
    expect(doctor(spoken)).toBe('seen once in Ramadan');
    expect(spoken.cells.some((c) => c.affordanceId === 'see-doctor' && c.promptedBy === 'you')).toBe(true);
    expect(spoken.report?.eid.summary).not.toEqual(quiet.report?.eid.summary);
    // Insist: insisting earns nothing, so the month ends no higher than it began and below the prefill month.
    // Since pauses come only on a fresh answer and the afternoon-shift beat spreads them out (2026-10-03 pass), an
    // insist-every-prefill player insists about 10 times, hours apart, and his pressure never reaches the 'pushed'
    // line (0.6): most insists were on things he would have done anyway. The 'pushed' cost and distrust refusals are
    // pinned in will.test.ts for a voice that insists at every turn.
    const pushy = new VoiceGame(SHIPPED_SEED);
    play(pushy, { confirm: true, insist: true });
    const you = voiceOf(pushy.halil, 'you');
    expect(you?.trust ?? 1).toBeLessThanOrEqual(0.5);
    expect(pushy.report?.eid.summary.some((l) => /You insisted/.test(l))).toBe(true);
    // Pressing ends below listening: the insisting month ends with less trust than the prefill month.
    expect(you?.trust ?? 1).toBeLessThan(voiceOf(spoken.halil, 'you')?.trust ?? 0);
  });

  test('seventh pass: counts and "on your word" read acts that happened, not ones he stopped part-way', () => {
    // There are stopped acts in a played month, so the filter matters.
    expect(spoken.cells.some((c) => c.done === false)).toBe(true);
    for (const g of [quiet, spoken]) {
      // The report's clinic line agrees with the town's completed count (the end status reads that).
      const line = g.report?.eid.summary.find((l) => /clinic/.test(l)) ?? '';
      const said = /never went/.test(line)
        ? 0
        : /went to the clinic once/.test(line)
          ? 1
          : /went to the clinic twice/.test(line)
            ? 2
            : Number(/went to the clinic (\d+) times/.exec(line)?.[1] ?? Number.NaN);
      expect(said, line).toBe(g.eidMorning?.run.town.state.completed.halil?.['see-doctor'] ?? 0);
    }
    // The card after Osman's date (Ramadan 15, 23:30) no longer projects to Ramadan 15.
    const g = new VoiceGame(SHIPPED_SEED);
    let hint: string | undefined;
    let lines: readonly string[] = [];
    play(g, {
      stop: (x) => {
        if (x.phase === 'between' && x.day === 15) {
          hint = x.between?.choices.find((c) => c.id === 'extra')?.hint;
          lines = x.between?.lines ?? [];
        }
        return x.day > 15;
      },
    });
    expect(hint ?? '').not.toMatch(/by Ramadan 15/);
    // The missed date costs something visible: the day card leads with it, the log says so at 20:00, and Osman's
    // next knock says he presses harder (his demand's advice strength rises after the date, in town.ts).
    expect(lines[0]).toMatch(/He missed Osman’s date/);
    const day15 = g.log.filter((e) => e.day === 15);
    expect(day15.some((e) => e.clock === '20:00' && /date has gone by/.test(e.text))).toBe(true);
    expect(day15.some((e) => e.who === 'osman' && /presses harder/.test(e.text))).toBe(true);
    // The log is in time order.
    expect(day15.map((e) => e.minute)).toEqual([...day15.map((e) => e.minute)].sort((a, b) => a - b));
  });

  test('seventh pass: each played day has its own moment, and skip digests lead with what is new', () => {
    // Ramadan 30: the night before Eid, with the call to Selin prefilled when it is open.
    const night = spoken.beats.history.find((b) => /^Tomorrow is Eid\. Selin/.test(b.text));
    expect(night && Math.floor(night.at / MIN_DAY)).toBe(30);
    expect(night?.paused).toBe(true);
    // Ramadan 15: the 17:00 beat is Osman's date (pinned in the running-late test). Digests: firsts, then totals.
    const g = new VoiceGame(SHIPPED_SEED);
    const intros: Record<number, string[]> = {};
    play(g, {
      stop: (x) => {
        if (x.intro) intros[x.day] ??= x.intro.lines;
        return false;
      },
    });
    expect(intros[2]?.some((l) => /Selin often calls after iftar/.test(l))).toBe(true);
    expect(intros[15]?.[0]).toMatch(/^Nothing new since Ramadan 2/);
    expect(intros[30]?.[0]).toMatch(/^First time he paid Osman: Ramadan \d+, on his own\./);
  });

  test('every report section is non-empty, with no input and with prefill confirmations', () => {
    for (const g of [quiet, spoken]) {
      const r = g.report;
      expect(r, 'report').toBeDefined();
      if (!r) continue;
      // `others`, `stopped` and `ledger` may be empty (the UI hides them); a silent month has no ledger.
      for (const [k, v] of Object.entries(r)) {
        if (Array.isArray(v) && !['others', 'stopped', 'ledger'].includes(k))
          expect(v.length, k).toBeGreaterThan(0);
      }
      if (g === spoken) expect(r.ledger?.length ?? 0).toBeGreaterThan(0);
      else expect(r.ledger ?? []).toEqual([]);
      expect(r.eid.lines.length).toBeGreaterThan(0);
      expect(r.eid.strip.cells.length).toBeGreaterThan(0);
      expect(r.rows.length).toBe(5);
      expect(r.trust.map((t) => t.id)).toEqual(['you', 'selin', 'riza', 'hacer', 'osman']);
      console.log(
        `report (${g === quiet ? 'quiet' : 'prefill'}):`,
        JSON.stringify({
          own: r.own,
          others: r.others,
          stopped: r.stopped,
          eid: r.eid.lines.slice(0, 4),
          open: r.open,
        }),
      );
    }
    const text = JSON.stringify(spoken.report).toLowerCase();
    for (const w of ['score', 'accepted by', 'reward', 'sin']) expect(text.includes(` ${w} `)).toBe(false);
  });

  test('the between-days card’s defaults (shift and Selin picked, nothing changed) keep Osman’s date that the silent month misses', () => {
    // Exactly what Between.tsx sends when the player toggles the two whispers and touches nothing else.
    const money = new VoiceGame(SHIPPED_SEED);
    let hint: string | undefined;
    play(money, {
      confirm: true,
      whispers: [defaultWhisper('extra'), defaultWhisper('selin')],
      stop: (g) => {
        hint ??= g.between?.choices.find((c) => c.id === 'extra')?.hint;
        return false;
      },
    });
    expect(hint).toMatch(/bare mention won’t move him/);
    const deadline = at(15, 20);
    const firstPay = money.cells.find((c) => c.affordanceId === 'pay-rent');
    expect(firstPay?.from ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(deadline);
    expect(
      money.cells.filter((c) => c.affordanceId === 'work-extra' && c.promptedBy === 'you').length,
    ).toBeGreaterThan(5);
    expect(money.report?.eid.summary.some((l) => /He kept his date with Osman/.test(l))).toBe(true);
    const quietPay = quiet.cells.find((c) => c.affordanceId === 'pay-rent');
    expect(quietPay?.from ?? Number.POSITIVE_INFINITY).toBeGreaterThan(deadline);
  });

  test('a bare mention of the shift (reason cleared) does not move him: the date is missed', () => {
    const bare = new VoiceGame(SHIPPED_SEED);
    play(bare, {
      confirm: true,
      whispers: [
        { choiceId: 'extra', strength: 'mention' },
        { choiceId: 'selin', strength: 'mention' },
      ],
    });
    const firstPay = bare.cells.find((c) => c.affordanceId === 'pay-rent');
    expect(firstPay?.from ?? Number.POSITIVE_INFINITY).toBeGreaterThan(at(15, 20));
    expect(bare.cells.filter((c) => c.affordanceId === 'work-extra').length).toBeLessThan(5);
  });

  test('a running-late beat never fires for a sleeping man hours before the deadline', () => {
    for (const g of [quiet, spoken])
      for (const b of g.beats.history)
        if (/nearly up|date is tonight/.test(b.text) && /asleep/.test(b.text)) {
          const m = b.text.match(/(?:\(|by )(\d\d):(\d\d)/);
          const until = Math.floor(b.at / MIN_DAY) * MIN_DAY + Number(m?.[1]) * 60 + Number(m?.[2]);
          expect(until - b.at).toBeLessThanOrEqual(60);
        }
    const osman = [...quiet.beats.history, ...spoken.beats.history].filter((b) =>
      /Osman’s date is tonight/.test(b.text),
    );
    expect(osman.length).toBeGreaterThan(0);
    for (const b of osman) expect(b.at % MIN_DAY).toBeGreaterThanOrEqual(17 * 60);
  });

  test('the report: a silent month says "watched", and the Eid list keeps Selin’s call under the cap', () => {
    expect(quiet.report?.spoke).toBe(false);
    expect(spoken.report?.spoke).toBe(true);
    const many = Array.from(
      { length: 40 },
      (_, k) =>
        `${String(7 + Math.floor(k / 4)).padStart(2, '0')}:${String((k % 4) * 15).padStart(2, '0')} I rest at home.`,
    );
    many.push('19:59 Selin called him for Eid. He had not called.');
    const lines = eidLines(many);
    expect(lines.length).toBe(EID_LINES);
    expect(lines.some((l) => /Selin called/.test(l))).toBe(true);
    expect(lines.at(-1)).toMatch(/quieter lines left out/);
  });

  test('the afternoon shift gets its own pause on Ramadan 1, prefilled, while mornings alone fall short', () => {
    const b = spoken.beats.history.find((x) => x.kind === 'duty-risk' && /afternoon shift/.test(x.text));
    expect(b).toBeDefined();
    expect(Math.floor((b?.at ?? 0) / MIN_DAY)).toBe(1);
    expect(b?.paused).toBe(true);
    expect(quiet.beats.history.some((x) => /afternoon shift/.test(x.text) && x.paused)).toBe(true);
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, {
      confirm: true,
      stop: (x) => x.paused && x.frame().pauseBeat?.text.includes('afternoon shift') === true,
    });
    expect(g.frame().prefill?.optionId).toBe('work-extra');
  });

  test('one suggestion credits at most one activity on the played days', () => {
    for (const g of [spoken, quiet]) {
      const said = g.log.filter((e) => e.kind === 'you' && e.minute < at(31, 0)).length;
      const played = new Set([1, 2, 15, 30]);
      const credited = g.cells.filter(
        (c) => c.promptedBy === 'you' && played.has(Math.floor(c.from / MIN_DAY)),
      ).length;
      expect(credited).toBeLessThanOrEqual(said);
    }
  });

  test('Eid: at most two cigarettes in the hour after his first meal', () => {
    for (const g of [quiet, spoken]) {
      const eid = g.cells.filter((c) => c.from >= at(31, 0) && c.from < at(32, 0));
      const meal = eid.find((c) => c.action === 'eat');
      expect(meal).toBeDefined();
      const from = meal?.from ?? 0;
      const smokes = eid.filter((c) => c.action === 'smoke' && c.from >= from && c.from < from + 60);
      expect(smokes.length).toBeLessThanOrEqual(2);
    }
  });

  test('the skipped-days digest names his work and money, Osman, and Selin', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    let digest: string[] = [];
    play(g, {
      stop: (x) => {
        if (x.intro && /days passed/.test(x.intro.label) && digest.length === 0) digest = x.intro.lines;
        return digest.length > 0;
      },
    });
    const text = digest.join(' ');
    expect(text).toMatch(/He worked \d+ mornings?/);
    expect(text).toMatch(/he has \d+/);
    expect(text).toMatch(/Osman|paid Osman/);
    expect(text).toMatch(/Selin/);
  });

  test('the report reads his ends at Eid morning and dates the week after apart (playtest: rent at Shawwal 7)', () => {
    const r = spoken.report;
    const eid = spoken.eidMorning;
    expect(r && eid).toBeTruthy();
    if (!r || !eid) return;
    const rent = r.ends.find((e) => e.id === 'rent');
    const owedAtEid = Math.round(eid.run.town.state.rentOwed);
    const pays = spoken.payments.filter((p) => p.at < TOWN_EID_DAY * MIN_DAY);
    expect(pays.reduce((a, p) => a + p.amount, 0)).toBe(Math.round(eid.run.town.state.rentPaid));
    // The status and detail are the month's result, with each payment's date; the week after has its own line.
    expect(rent?.status).toContain('at Eid');
    expect(rent?.detail).toContain(owedAtEid > 0 ? `${owedAtEid} still owed at Eid` : 'nothing owed at Eid');
    for (const p of pays) expect(rent?.detail).toContain(`on Ramadan ${dayOfMin(p.at)}`);
    expect(rent?.detail).toContain(`He had ${Math.round(eid.run.town.state.money.halil ?? 0)}.`);
    expect(rent?.after).toMatch(/week after Eid|A week after Eid/);
    // On the shipped seed this month leaves 300 owed at Eid, paid in the week after: the case the user saw.
    expect(owedAtEid).toBe(300);
    expect(rent?.after).toContain('paid the rest (300)');
    for (const e of r.ends) expect(e.after, e.id).toBeTruthy();
    expect(r.ends.find((e) => e.id === 'fast')?.status).toContain('of Ramadan');
    expect(r.ends.find((e) => e.id === 'doctor')?.status).toMatch(/in Ramadan/);
    // Round 5: the doctor end counts his cigarettes at the start and end of Ramadan, and on Eid.
    expect(r.ends.find((e) => e.id === 'doctor')?.detail).toMatch(
      /Cigarettes: .* on Ramadan 1–2, .* on Ramadan 29–30\./,
    );
    expect(r.ends.find((e) => e.id === 'doctor')?.after).toMatch(/On Eid he smoked/);
  });

  test('smokingLines counts cigarettes per day at the start and end of Ramadan, on Eid, and the walks', () => {
    const cell = (day: number, hour: number, action: string, promptedBy?: 'you') => ({
      from: day * MIN_DAY + hour * 60,
      to: day * MIN_DAY + hour * 60 + 10,
      action,
      affordanceId: action,
      label: action,
      ...(promptedBy ? { promptedBy } : {}),
    });
    const last = TOWN_EID_DAY - 1;
    const cells = [
      cell(1, 20, 'smoke'),
      cell(1, 23, 'smoke'),
      cell(2, 20, 'smoke'),
      cell(2, 21, 'smoke'),
      cell(last - 1, 20, 'walk', 'you'),
      cell(last, 20, 'walk'),
      cell(last, 21, 'smoke'),
      cell(TOWN_EID_DAY, 14, 'smoke'),
    ];
    const s = smokingLines({ cells });
    expect(s.month).toBe(
      `Cigarettes: 2 a day on Ramadan 1–2, 1 in two days on Ramadan ${last - 1}–${last}. He walked by the river twice in Ramadan, once on your word.`,
    );
    expect(s.eid).toBe('On Eid he smoked one cigarette.');
  });

  test('seventh pass: the "he’d now do unasked" strip reads his unasked choices', () => {
    const state = (g: VoiceGame, label: string) => g.report?.unasked?.find((u) => u.label === label)?.state;
    // A silent month leaves the call to Selin where it began; suhoor he keeps on his own.
    expect(state(quiet, 'call Selin')).toBe('no');
    expect(state(quiet, 'eat at suhoor')).toBe('yes');
    // The live frame carries it for the Ends pane.
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, { confirm: true, stop: (x) => x.t >= at(1, 20) });
    expect(g.frame().unasked?.map((u) => u.label)).toContain('call Selin');
  });

  test('frames stay under 100 KB', () => {
    expect(maxFrame).toBeGreaterThan(0);
    expect(maxFrame).toBeLessThan(100_000);
    expect(JSON.stringify(spoken.frame()).length).toBeLessThan(100_000);
  });

  test('keep listening resumes after Eid night with the voice live', () => {
    const g = spoken;
    expect(g.phase).toBe('report');
    g.keepListening();
    expect(g.phase).toBe('free');
    expect(g.day).toBe(32);
    expect(g.frame().muted).toBe(false);
    g.dismissIntro();
    g.resume();
    // Run until the composer opens, then speak.
    for (let i = 0; i < 2000 && !(g.composer().open && !g.paused); i++) {
      if (g.paused) g.resume();
      g.advanceTo(g.t + 10);
    }
    const f = g.frame();
    expect(f.composer.open).toBe(true);
    const option = f.options.find((o) => !o.leaning) ?? f.options[0];
    expect(option).toBeDefined();
    g.suggest({ optionId: option?.id ?? '', strength: 'urge', insist: false });
    const answer = g.log.filter((e) => e.kind === 'answer').at(-1);
    expect(answer && answer.minute >= at(32, 0)).toBe(true);
    // The epilogue ran on a clone: the free run starts again from Eid night, not from day 38.
    expect(g.t).toBeLessThan(at(33, 0));
  });
});

describe('Game 2 sim beats on provoked cases', () => {
  test('duty-risk fires when a held commitment enters its closing stretch unfulfilled', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, { stop: (x) => x.t >= at(1, 8, 30) });
    const h = g.halil;
    // A promise to Osman, due within the hour, that his workshop block does not fulfil.
    h.agenda.commitments.push({
      id: 'test-promise',
      kind: 'promise',
      toId: 'osman',
      actions: ['pay-rent'],
      from: g.t - 600,
      until: g.t + 30,
      importance: 0.8,
      status: 'pending',
      label: 'pay Osman',
    });
    g.resume();
    g.advanceTo(g.t + 5);
    const b = g.beats.history.find((x) => x.kind === 'duty-risk');
    expect(b?.text).toMatch(/time he gives himself for pay Osman is nearly up/i);
    expect(g.pauseBeat?.kind).toBe('duty-risk');
  });

  test('a beat inside the 20-minute cooldown is logged and does not pause; auto-pause off never pauses', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, { stop: (x) => x.t >= at(1, 12) });
    // Every cooldown beat that paused came at least 20 minutes after the previous pause of any kind.
    let lastPause = Number.NEGATIVE_INFINITY;
    for (const b of g.beats.history) {
      if (!b.paused) continue;
      if (b.kind !== 'verdict' && b.kind !== 'day-end' && b.kind !== 'eid')
        expect(b.at - lastPause).toBeGreaterThanOrEqual(20);
      lastPause = b.at;
    }
    // And on the shipped seed at least one beat fell inside a cooldown (the 03:59 recall right after the wake).
    expect(g.beats.history.some((b) => !b.paused)).toBe(true);
    const off = new VoiceGame(SHIPPED_SEED);
    off.setAutoPause(false);
    off.begin();
    off.advanceTo(at(1, 12));
    expect(off.paused).toBe(false);
    expect(off.beats.history.length).toBeGreaterThan(2);
    expect(off.beats.history.every((b) => !b.paused)).toBe(true);
  });
});

describe('Game 2 sim determinism and budget', () => {
  // Its wall-clock budget (under 1.5 s) is in voice.timing.ts, run by `npm run bench`.
  test('a 12-day skip under two standing whispers lands on day 15 with an intro', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, { stop: (x) => x.phase === 'between' && x.day === 2 });
    expect(g.between?.next?.skipped).toBe(12);
    g.advance(WHISPERS);
    expect(g.day).toBe(15);
    expect(g.intro?.lines.length).toBeGreaterThan(1);
  });

  test('the same seed and inputs give byte-identical frames on the same tick schedule', () => {
    const runTicks = () => {
      const g = new VoiceGame(SHIPPED_SEED);
      g.setPace('fast');
      g.begin();
      const frames: string[] = [];
      let lastKey = '';
      for (let i = 0; i < 1500 && g.day <= 2; i++) {
        if (g.phase === 'between') {
          if (g.between?.next?.day !== 2) break;
          g.advance([]);
        }
        if (g.intro) {
          g.dismissIntro();
          g.resume();
        }
        const f = g.frame();
        if (g.paused) {
          const key = `${f.minute}:${f.prefill?.optionId}`;
          if (
            f.composer.open &&
            f.prefill &&
            key !== lastKey &&
            f.prefill.optionId !== g.standing?.draft.optionId
          ) {
            lastKey = key;
            g.suggest({ optionId: f.prefill.optionId, strength: f.prefill.strength, insist: false });
          } else g.resume();
        }
        g.tick(250);
        frames.push(JSON.stringify(g.frame()));
      }
      return frames;
    };
    const a = runTicks();
    const b = runTicks();
    expect(a.length).toBeGreaterThan(50);
    expect(b).toEqual(a);
  });

  test('whole runs repeat exactly: log, beats and report', () => {
    const g1 = new VoiceGame(SHIPPED_SEED);
    const g2 = new VoiceGame(SHIPPED_SEED);
    play(g1, { confirm: true, whispers: WHISPERS });
    // g2 also builds a frame at every turn, as the worker does on every tick: frames must not change the run.
    const frameEveryTurn = (g: VoiceGame): boolean => {
      g.frame();
      return false;
    };
    play(g2, { confirm: true, whispers: WHISPERS, stop: frameEveryTurn });
    expect(JSON.stringify(g2.log)).toBe(JSON.stringify(g1.log));
    expect(JSON.stringify(g2.beats.history)).toBe(JSON.stringify(g1.beats.history));
    expect(JSON.stringify(g2.report)).toBe(JSON.stringify(g1.report));
  });

  test('a new seed is a different town; Replay with the same seed is the same one', () => {
    const run = (seed: number) => {
      const g = new VoiceGame(seed);
      play(g, { stop: (x) => x.phase === 'between' && x.day === 15 });
      return JSON.stringify(g.log);
    };
    const a = run(SHIPPED_SEED);
    expect(run(SHIPPED_SEED)).toBe(a);
    expect(run(SHIPPED_SEED + 1)).not.toBe(a);
  });

  test('End the day keeps the standing suggestion live to 23:30', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, {
      stop: (x) => x.t >= at(1, 19, 8) && x.composer().open && x.offers().some((o) => o.id === 'tea:riza'),
    });
    // Tea with Rıza while he breaks the fast: "after I eat", so it stands into the evening.
    g.suggest({ optionId: 'tea:riza', strength: 'mention', insist: false });
    const since = g.t;
    const before = g.audit.length;
    expect(g.standing).toBeDefined();
    g.endDay();
    expect(g.phase).toBe('between');
    expect(g.t % MIN_DAY).toBe(DAY_END);
    expect(before).toBe(0);
    const later = [...g.records.values()].filter((r) => r.at > since + 1);
    const heard = later.some((r) =>
      (r.suggestions ?? (r.suggestion ? [r.suggestion] : [])).some((x) => x.voiceId === 'you'),
    );
    expect(heard).toBe(true);
  });

  test('the composer is closed while he sleeps and open with a prefill at the suhoor wake', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    expect(g.frame().phase).toBe('premise');
    expect(g.frame().paused).toBe(true);
    g.begin();
    expect(g.composer().open).toBe(false);
    expect(g.composer().reason).toBe('asleep');
    while (!g.paused) g.tick(250);
    const f = g.frame();
    expect(f.pauseBeat?.kind).toBe('wake');
    expect(f.composer.open).toBe(true);
    expect(f.prefill?.source).toBe('tutorial');
    expect(f.prefill?.optionId).toBe('eat');
    const tel = g.predict({ optionId: 'smoke', strength: 'urge', insist: false });
    expect(['willNot', 'cannot', 'yes', 'notNow']).toContain(tel.tone);
  });

  test('every prefill is on the option list, so Say it is never disabled on a prefilled composer', () => {
    // Seen in the browser on Ramadan 15: the afternoon shift and the call to Selin were prefilled while ranked
    // below his top six, so the composer read "Prefilled something" with nothing selected.
    const g = new VoiceGame(SHIPPED_SEED);
    let prefills = 0;
    play(g, {
      confirm: true,
      onPause: (f) => {
        if (!f.composer.open || !f.prefill) return;
        prefills++;
        expect(f.options.map((o) => o.id)).toContain(f.prefill.optionId);
        expect(f.options.length).toBeLessThanOrEqual(6);
      },
    });
    expect(prefills).toBeGreaterThan(3);
  });
});

describe('Game 2 round 3 fixes', () => {
  const digests = (g: VoiceGame): string[][] => {
    const out: string[][] = [];
    let seen = '';
    play(g, {
      confirm: true,
      insist: true,
      whispers: [
        { choiceId: 'doctor', strength: 'urge', appeal: 'safety' },
        { choiceId: 'mosque', strength: 'urge', appeal: 'duty' },
      ],
      stop: (x) => {
        const key = x.intro ? `${x.t}:${x.intro.label}` : '';
        if (x.intro && /days passed/.test(x.intro.label) && key !== seen) {
          seen = key;
          out.push(x.intro.lines);
        }
        return false;
      },
    });
    return out;
  };
  const pushy = new VoiceGame(SHIPPED_SEED);
  const pushyDigests = digests(pushy);
  const prefill = new VoiceGame(SHIPPED_SEED);
  play(prefill, { confirm: true, whispers: WHISPERS });

  test('a standing urge to the mosque is kept once per prayer, not at every decision, on skipped days', () => {
    const played = new Set([1, 2, 15, 30, 31]);
    const byDay = new Map<number, number>();
    for (const c of pushy.cells) {
      const d = Math.floor(c.from / MIN_DAY);
      if (c.affordanceId !== 'pray' || played.has(d) || d > 30) continue;
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    expect(byDay.size).toBeGreaterThan(10);
    expect(Math.max(...byDay.values())).toBeLessThanOrEqual(6);
  });

  test('the skip digest never counts more days done than days passed', () => {
    expect(pushyDigests.length).toBeGreaterThan(0);
    for (const lines of pushyDigests)
      for (const m of lines.join(' ').matchAll(/did it on (\d+) of (\d+) days/g))
        expect(Number(m[1])).toBeLessThanOrEqual(Number(m[2]));
  });

  test('advice is never refused as not on offer: it waits, and the log says why', () => {
    for (const g of [prefill, pushy]) {
      expect(
        g.halil.trace.some((r) => r.suggestion?.voiceId === 'you' && r.suggestion.reason === 'unavailable'),
      ).toBe(false);
      expect(g.log.some((e) => /isn.t on offer/.test(e.text))).toBe(false);
    }
  });

  test('copy: no "to drink" on a meal, and no "once … each time" in the report', () => {
    for (const g of [prefill, pushy]) {
      expect(g.log.some((e) => e.kind === 'act' && /^I eat.*, to drink\./.test(e.text))).toBe(false);
      expect(/once[^.]*each time/.test(JSON.stringify(g.report))).toBe(false);
      expect(/did not pray/.test(JSON.stringify(g.report))).toBe(false);
    }
  });

  test('Eid: the first cigarette after the meal and the Selin call each pause', () => {
    for (const g of [prefill, pushy]) {
      const eid = g.beats.history.filter((b) => b.at >= at(31, 0) && b.at < at(32, 0));
      const smoke = eid.find((b) => b.kind === 'craving' && /the cigarette/.test(b.text));
      expect(smoke?.paused, 'cigarette beat').toBe(true);
      const call = eid.find((b) => /^(Selin called him|He called Selin) for Eid/.test(b.text));
      expect(call, 'eid call beat').toBeDefined();
      expect(call?.paused, call?.text).toBe(true);
    }
  });

  test('the report says whether Selin called on Eid, never that he merely waited', () => {
    for (const g of [prefill, pushy])
      expect(/He waited for her to call/.test(JSON.stringify(g.report))).toBe(false);
  });

  test('provoked illness: the onset, the excused fast and the doctor show in the digest, the pane and the report', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    let digest: string[] = [];
    let health: string[] | undefined;
    let raised = false;
    play(g, {
      stop: (x) => {
        if (!raised && x.t >= at(2, 12)) {
          const hyp = x.halil.body.illnesses.find((i) => i.kind === 'hypertension');
          if (hyp) {
            hyp.severity = 0.45;
            hyp.baseline = 0.45;
          }
          raised = true;
        }
        if (x.intro && /days passed/.test(x.intro.label) && digest.length === 0) digest = x.intro.lines;
        if (digest.length > 0 && !x.intro && x.t >= at(15, 6)) health = x.frame().halil.health;
        return health !== undefined;
      },
    });
    expect(digest.join(' ')).toMatch(/made him unwell on/);
    expect(health?.some((l) => /^Unwell/.test(l))).toBe(true);
    play(g);
    expect(g.report?.body.some((l) => /made him unwell on \d+ days? of Ramadan \(/.test(l))).toBe(true);
  });

  test('round 5: no "can’t … just now" while he is doing it; a reply away from your words names what it answers', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    const all = new Map<string, LogEntry>();
    const grab = () => {
      for (const e of g.log) all.set(e.id, { ...e });
    };
    play(g, {
      confirm: true,
      whispers: [
        { choiceId: 'extra', strength: 'mention', appeal: 'duty' },
        { choiceId: 'selin', strength: 'mention', appeal: 'benevolence' },
      ],
      onPause: grab,
    });
    grab();
    const log = [...all.values()].sort(
      (a, b) => a.minute - b.minute || Number(a.id.slice(1)) - Number(b.id.slice(1)),
    );
    const away = log.filter((e) => /^He can’t take an afternoon shift just now/.test(e.text));
    for (const e of away) {
      const running = g.cells.some(
        (c) => c.affordanceId === 'work-extra' && c.from <= e.minute && c.to > e.minute,
      );
      expect(running, `${e.clock} ${e.text}`).toBe(false);
    }
    // No act begun and dropped in the same minute is left in the log.
    expect(log.some((e) => e.kind === 'act' && e.until === e.clock && /stopped/.test(e.text))).toBe(false);
    const answers = log.filter((e) => e.kind === 'answer');
    expect(answers.length).toBeGreaterThan(0);
    expect(answers.some((e) => /^[A-Z][^“]*\? “/.test(e.text))).toBe(true);
  });

  test('round 4: a torn line is logged before the act it led to, never after', () => {
    for (const g of [prefill, pushy]) {
      for (const [i, e] of g.log.entries()) {
        if (e.beat !== 'close-call' || !e.decisionId) continue;
        expect(g.log.slice(0, i).some((x) => x.kind === 'act' && x.decisionId === e.decisionId)).toBe(false);
      }
    }
  });

  test('round 4: Selin calls first on Eid only after his usual hour has passed (never before 18:00)', () => {
    for (const g of [prefill, pushy])
      if (g.selinEidCallAt !== undefined) expect(g.selinEidCallAt % MIN_DAY).toBeGreaterThanOrEqual(18 * 60);
  });

  test('round 4: the skip digest says how he answered your words, or that he acted on his own', () => {
    for (const lines of pushyDigests)
      expect(/When he heard it|on his own|You left no word/.test(lines.join(' ')), lines.join(' ')).toBe(
        true,
      );
  });

  test('round 4: no "1 of 1" counts in the log or the report', () => {
    for (const g of [prefill, pushy]) {
      expect(/\b1 of 1\b/.test(JSON.stringify(g.report))).toBe(false);
      expect(g.log.some((e) => /\b1 of 1\b/.test(e.text))).toBe(false);
    }
  });

  test('round 4: a played day opens with its open questions, not an empty "begins" card', () => {
    const intros: { label: string; lines: string[] }[] = [];
    const g = new VoiceGame(SHIPPED_SEED);
    play(g, {
      stop: (x) => {
        if (x.intro && !intros.some((i) => i.label === x.intro?.label)) intros.push(x.intro);
        return false;
      },
    });
    const played = intros.filter((i) => !/days passed/.test(i.label) && /^Ramadan (2|15|30)$/.test(i.label));
    expect(played.length).toBeGreaterThan(0);
    for (const i of played)
      expect(
        i.lines.some((l) => /Osman|clinic|Selin|Eid/.test(l)),
        i.lines.join(' | '),
      ).toBe(true);
  });
});
