import { describe, expect, it } from 'vitest';
import {
  clarityReport,
  formatClarityReport,
  type GameAdapter,
  type Observation,
  PERSONAS,
  type PlayAction,
  playSession,
  runCohort,
  type SessionTrace,
} from '../src/index.ts';

/** A screen-only control: changing clarity never changes its hidden simulation. */
class Screen implements GameAdapter {
  name = 'screen';
  t = 0;
  pending = false;
  constructor(private clear = true) {}
  observe(): Observation {
    const answered = this.pending;
    this.pending = false;
    return {
      clock: this.clear ? 'Tuesday 14 May' : 'Salı 14 Mayıs',
      phase: 'play',
      chapter: 'first',
      events:
        answered && this.clear
          ? [{ kind: 'reply', summary: 'The bed is watered.', valence: 0.5, salience: 1, answers: ['water'] }]
          : [],
      features: {},
      goal: this.clear ? 'Keep the bed watered.' : '',
      next: this.clear ? 'Water the bed.' : '',
      text: [{ level: 'now', text: 'Choose a bed.' }],
      over: this.t >= 90,
    };
  }
  actions(): PlayAction[] {
    return [
      { id: 'water', label: 'Water', kind: 'water', focus: 0, promise: this.clear ? 1 : 0.1 },
      {
        id: 'dig',
        label: 'Dig',
        kind: 'dig',
        promise: 0,
        disabled: this.clear ? { reason: 'The soil is wet.' } : {},
      },
    ];
  }
  apply(id: string): void {
    if (id === 'dig') throw new Error('disabled control was applied');
    this.pending = true;
  }
  advance(seconds: number): void {
    this.t += seconds;
  }
}
const play = (clear = true) =>
  playSession(new Screen(clear), { ...PERSONAS.completionist, temperature: 0 }, 1);
const warnings = (tr: SessionTrace) => clarityReport(tr).filter((f) => f.status === 'warning');

// Removing screen snapshots, including disabled choices, or reading post-action observations as pre-action
// evidence breaks these controls. These exercise the real HF session, not a mocked decision loop.
describe('screen-only clarity controls', () => {
  it('a clear screen passes, records first input timing, and never applies disabled controls', () => {
    const tr = play();
    expect(warnings(tr)).toEqual([]);
    expect(clarityReport(tr)).toContainEqual(
      expect.objectContaining({ dl: 'DL-6', signal: 'first-input', seconds: 0, beats: 0 }),
    );
    expect(tr.beats.every((b) => b.choice !== 'dig')).toBe(true);
  });

  it('an unclear screen reports goal, priority, limit, next, feedback and English dates by DL id', () => {
    const findings = warnings(play(false));
    expect(new Set(findings.map((f) => f.dl))).toEqual(
      new Set(['DL-1', 'DL-3', 'DL-4', 'DL-5', 'DL-13', 'DL-20', 'DL-21']),
    );
    expect(findings.find((f) => f.signal === 'unanswered-input')?.detail).toContain('water');
  });

  it('cohorts keep deterministic findings and print every first-minute item separately', () => {
    const spec = {
      game: 'screen',
      build: 'a',
      make: () => new Screen(false),
      seeds: [1],
      personas: [PERSONAS.completionist],
    };
    const a = runCohort(spec).summary;
    expect(a.clarity).toEqual(clarityReport(runCohort(spec).played.map((p) => p.trace)));
    expect(runCohort(spec).summary).toEqual(a);
    const report = formatClarityReport(a.clarity);
    expect(report).toContain('First minute (DL-1..DL-7)');
    for (let i = 1; i <= 7; i++) expect(report).toContain(`DL-${i}:`);
    expect(report).toContain('Other DL findings');
    expect(report).toContain('DL-21');
  });
});

// Scripted traces isolate boundaries the persona cannot guarantee (waiting, withdrawals and early quits).
const scripted = (): SessionTrace => {
  const tr = play();
  tr.beats = tr.beats.slice(0, 15).map((b, i) => ({ ...b, t: i * 3, choice: i < 11 ? 'wait' : 'water' }));
  tr.ended = { ...tr.ended, t: 45, reason: 'time-limit' };
  return tr;
};

describe('clarity boundaries', () => {
  it('measures slow first inputs and idle beats with available controls', () => {
    const f = clarityReport(scripted());
    expect(f).toContainEqual(
      expect.objectContaining({ signal: 'first-input', status: 'warning', seconds: 33, beats: 11 }),
    );
    expect(f).toContainEqual(expect.objectContaining({ signal: 'idle-before-input', beats: 11 }));
  });

  it('separates a late available choice from a player who waits before choosing', () => {
    const tr = scripted();
    expect(clarityReport(tr)).toContainEqual(
      expect.objectContaining({ signal: 'first-choice-available', status: 'measurement', seconds: 0 }),
    );
    for (const [i, b] of tr.beats.entries()) b.offered = i < 11 ? 0 : 1;
    expect(clarityReport(tr)).toContainEqual(
      expect.objectContaining({ signal: 'first-choice-available', status: 'warning', seconds: 33 }),
    );
  });

  it('detects ambiguous menus, unexplained withdrawals, long text and quiet stretches', () => {
    const tr = scripted();
    for (const [i, b] of tr.beats.entries()) {
      b.shown = [];
      b.screen = {
        goal: 'Tend the bed.',
        next: '',
        loops: [],
        openLoop: 0,
        text: [{ level: 'now', text: Array(61).fill('word').join(' ') }],
        menu: ['water', 'look', ...(i === 0 ? ['dig'] : ['rest'])].map((id) => ({
          id,
          label: id,
          promise: 0.8,
        })),
      };
    }
    const f = clarityReport(tr);
    expect(f).toContainEqual(expect.objectContaining({ dl: 'DL-3', signal: 'near-equal-promises' }));
    expect(f).toContainEqual(expect.objectContaining({ dl: 'DL-4', signal: 'withdrawn-action' }));
    expect(f).toContainEqual(expect.objectContaining({ dl: 'DL-5', signal: 'quiet-without-next' }));
    expect(f).toContainEqual(expect.objectContaining({ dl: 'DL-11', signal: 'must-read-length' }));
  });

  it('does not call explained withdrawals or answered repeated inputs silent', () => {
    const tr = play();
    for (const [i, b] of tr.beats.entries()) if (i > 0 && b.screen) b.screen.menu = [];
    expect(
      warnings(tr).filter((f) => f.signal === 'withdrawn-action' || f.signal === 'unanswered-input'),
    ).toEqual([]);
  });

  it('reports first-chapter boredom and voluntary quits, but excludes agenda stops', () => {
    const tr = scripted();
    tr.ended.reason = 'quit';
    tr.moments = [{ t: 30, clock: '', kind: 'bored', text: 'I have nothing to do.' }];
    expect(warnings(tr)).toContainEqual(
      expect.objectContaining({ dl: 'DL-1', signal: 'first-chapter-quit' }),
    );
    expect(warnings(tr)).toContainEqual(
      expect.objectContaining({ dl: 'DL-7', signal: 'first-chapter-boredom' }),
    );
    tr.ended.reason = 'agenda';
    expect(warnings(tr).some((f) => f.signal === 'first-chapter-quit')).toBe(false);
  });

  it('keeps quiet screens with omitted copy unmeasured, even when menus are recorded', () => {
    const tr = scripted();
    for (const b of tr.beats) {
      b.shown = [];
      b.screen = { menu: [{ id: 'water', label: 'Water', promise: 1 }] };
    }
    expect(clarityReport(tr)).toContainEqual(expect.objectContaining({ dl: 'DL-5', status: 'unmeasured' }));
    expect(warnings(tr).some((f) => f.signal === 'quiet-without-next')).toBe(false);
  });

  it('credits final-screen answers and ignores incomplete answer windows', () => {
    const tr = scripted();
    tr.beats = tr.beats.slice(0, 5).map((b) => ({ ...b, choice: 'water', shown: [] }));
    tr.ended.t = 15;
    tr.closingShown = [{ k: 'reply', v: 0, a: ['water'] }];
    expect(warnings(tr).some((f) => f.signal === 'unanswered-input')).toBe(false);
    tr.closingShown = [];
    expect(warnings(tr)).toContainEqual(expect.objectContaining({ signal: 'unanswered-input', beats: 3 }));
    tr.ended.t = 8;
    tr.beats = tr.beats.slice(0, 3);
    expect(warnings(tr).some((f) => f.signal === 'unanswered-input')).toBe(false);
  });

  it('flags calendar names and unfamiliar scripts in exposed load-bearing copy only', () => {
    const tr = scripted();
    tr.beats = tr.beats.slice(0, 1);
    const b = tr.beats[0];
    if (!b?.screen) throw new Error('control must record a screen');
    const names =
      'Pazartesi Salı Çarşamba Perşembe Cuma Cumartesi Pazar Ocak Şubat Mart Nisan Mayıs Haziran Temmuz Ağustos Eylül Ekim Kasım Aralık'.split(
        ' ',
      );
    for (const name of names) {
      b.clock = `${name} 14`;
      expect(warnings(tr), name).toContainEqual(expect.objectContaining({ dl: 'DL-21' }));
    }
    b.clock = 'Tuesday 14 May';
    b.screen.goal = 'احتفظ بالماء';
    expect(warnings(tr)).toContainEqual(expect.objectContaining({ dl: 'DL-20' }));
    expect(warnings(tr).some((f) => f.dl === 'DL-21')).toBe(false);
    b.screen.goal = 'Keep water.';
    b.screen.next = 'احتفظ بالماء';
    expect(warnings(tr)).toContainEqual(expect.objectContaining({ dl: 'DL-20' }));
    b.screen.next = 'Water now.';
    b.screen.menu = [{ id: 'water', label: 'احتفظ بالماء', promise: 1 }];
    expect(warnings(tr)).toContainEqual(expect.objectContaining({ dl: 'DL-20' }));
  });

  it('marks old traces unmeasured and never mistakes flavour names for a calendar', () => {
    const tr = play();
    for (const b of tr.beats) delete b.screen;
    expect(clarityReport(tr)).toContainEqual(expect.objectContaining({ dl: 'DL-1', status: 'unmeasured' }));
    expect(warnings(tr).filter((f) => ['DL-1', 'DL-3', 'DL-4', 'DL-5'].includes(f.dl))).toEqual([]);
    const clean = play();
    for (const b of clean.beats)
      if (b.screen) b.screen.text = [{ level: 'flavour', text: 'Pazartesi in İstanbul' }];
    expect(warnings(clean).filter((f) => f.dl === 'DL-20' || f.dl === 'DL-21')).toEqual([]);
  });
});
