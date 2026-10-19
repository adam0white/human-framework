import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BASE_PERSONAS,
  compareCohorts,
  DESIGNERS,
  designReview,
  EDGE_PERSONAS,
  PERSONAS,
  type Persona,
  playDays,
  playSession,
  runCohort,
} from '../src/index.ts';
import {
  Cliffhanger,
  EdgyGarden,
  Garden,
  HardNight,
  Idle,
  Lull,
  Nag,
  Slot,
  SlowGarden,
  Ticker,
  Wall,
} from './toys.ts';

const cap = { maxMinutes: 40 };
const edgy = EDGE_PERSONAS.map((id) => PERSONAS[id] as Persona);
const kindsOf = (beats: { choice: string }[]) => {
  const n: Record<string, number> = {};
  for (const b of beats) if (b.choice !== 'wait') n[b.choice] = (n[b.choice] ?? 0) + 1;
  return n;
};

describe('the base personas are pinned', () => {
  it('play the toys exactly as at the 2026-10-19 calibration', () => {
    const h = createHash('sha256');
    for (const G of [Lull, Garden, Wall])
      for (const id of BASE_PERSONAS)
        for (const s of [1, 2, 3]) {
          const tr = playSession(new G(), PERSONAS[id], s, cap);
          const beats = tr.beats.map((b) => ({
            t: b.t,
            clock: b.clock,
            phase: b.phase,
            stance: b.stance,
            choice: b.choice,
            why: b.why,
            engagement: b.engagement,
            boredom: b.boredom,
            frustration: b.frustration,
            joy: b.joy,
            leisure: b.leisure,
            sleepiness: b.sleepiness,
            noticed: b.noticed,
            missed: b.missed,
          }));
          h.update(JSON.stringify({ beats, moments: tr.moments, ended: tr.ended }));
        }
    // Re-pinned deliberately at the 2026-10-19 calibration (neutral events hold little attention; one hard blow is a
    // loss, a stream of them frustrates; docs/findings.md). Before it, the digest of the 2.8.0 playtester (commit
    // e32850e) held through the edge-pushers: c7d264b0126dc6fc4494a7191ec9d722f666c95af94d1b2a6b4b92696cd0fc5c.
    expect(h.digest('hex')).toBe('8ca3afff3509d3b3c66e9c87727252de82a31e857e4c5a1f9c8cf14be5b66a13');
  });
});

describe('boredom, loss and frustration are told apart (2026-10-19 calibration)', () => {
  const base = BASE_PERSONAS.map((id) => PERSONAS[id] as Persona);
  const play = (G: new () => import('../src/index.ts').GameAdapter) =>
    base.flatMap((persona) => [1, 2, 3].map((s) => playSession(new G(), persona, s, cap)));

  it('a busy screen with nothing at stake bores: neutral events do not hold attention', () => {
    const runs = play(Ticker);
    const bored = runs.filter((tr) => tr.ended.why.startsWith('emotion:boredom'));
    expect(bored.length).toBeGreaterThanOrEqual(runs.length / 2);
    for (const tr of runs) expect(tr.moments.some((m) => m.kind === 'frustrated')).toBe(false);
  });

  it('one hard night is a loss, not a reason to quit: felt, marked, and played through', () => {
    for (const tr of play(HardNight)) {
      expect(
        tr.moments.some((m) => m.kind === 'setback'),
        tr.persona,
      ).toBe(true);
      expect(
        tr.moments.some((m) => m.kind === 'frustrated'),
        tr.persona,
      ).toBe(false);
      expect(tr.ended.why, tr.persona).not.toMatch(/distress/);
    }
  });

  it('a stream of refusals still frustrates and drives players off, even mild ones', () => {
    for (const tr of [...play(Wall), ...play(Nag)]) {
      expect(tr.ended.why, tr.persona).toMatch(/distress:rest/);
      expect(tr.moments.some((m) => m.kind === 'frustrated')).toBe(true);
    }
  });
});

describe('edge-pushers', () => {
  it('are hard to please: a game where nothing happens bores each of them out within minutes', () => {
    for (const persona of edgy)
      for (const seed of [1, 2]) {
        const tr = playSession(new Lull(), persona, seed, cap);
        expect(tr.ended.reason, persona.id).toBe('quit');
        expect(tr.ended.t).toBeLessThanOrEqual(8 * 60);
      }
  });

  it('the mischief-maker provokes, relishes an answer and is bored by silence', () => {
    const wall = playSession(new Wall(), PERSONAS.mischief, 1, cap);
    expect(wall.moments.some((m) => m.kind === 'answered' && /keeper said no/.test(m.text))).toBe(true);
    const garden = playSession(new EdgyGarden(), PERSONAS.mischief, 1, cap);
    expect(kindsOf(garden.beats).stomp ?? 0).toBeGreaterThan(3);
    expect(garden.moments.some((m) => m.kind === 'ignored' && m.text.includes('stomp'))).toBe(true);
    // Ordinary players never see the edge action.
    const plain = playSession(new EdgyGarden(), PERSONAS.completionist, 1, cap);
    expect(kindsOf(plain.beats).stomp).toBeUndefined();
  });

  it('the exploit-hunter finds the lever that always pays and wins with it', () => {
    const tr = playSession(new Slot(), PERSONAS.exploiter, 1, cap);
    const n = kindsOf(tr.beats);
    expect((n.pull ?? 0) / ((n.pull ?? 0) + (n.look ?? 0))).toBeGreaterThan(0.6);
    expect(tr.final.outcome).toBe('win');
    const plain = playSession(new Slot(), PERSONAS.completionist, 1, cap);
    expect(tr.ended.t).toBeLessThan(plain.ended.t);
  });

  it('the rule-lawyer tries every input and presses a new one twice running', () => {
    const tr = playSession(new EdgyGarden(), PERSONAS.rulesLawyer, 1, cap);
    const n = kindsOf(tr.beats);
    expect(n.tend).toBeGreaterThan(0);
    expect(n.stomp).toBeGreaterThan(0);
    const inputs = tr.beats.filter((b) => b.choice !== 'wait');
    const first = inputs.findIndex((b) => b.choice === 'stomp');
    expect(inputs[first + 1]?.choice).toBe('stomp');
  });
});

describe('edge report', () => {
  const edgesOf = (G: new () => import('../src/index.ts').GameAdapter) =>
    runCohort({ game: 'toy', build: 'a', make: () => new G(), seeds: [1, 2], maxMinutes: 40 }).summary.edges;

  it('names ignored and answered mischief, a dominant lever, a game that plays itself and a silent button', () => {
    const garden = edgesOf(EdgyGarden);
    expect(garden.find((e) => e.kind === 'mischief-ignored')).toMatchObject({
      subject: 'stomp',
      label: 'fun to keep',
    });
    expect(edgesOf(Wall).find((e) => e.kind === 'mischief-answered')).toMatchObject({ subject: 'insist' });
    const slot = edgesOf(Slot);
    expect(slot.find((e) => e.kind === 'dominant-strategy')).toMatchObject({
      subject: 'pull',
      label: 'close',
    });
    expect(slot.find((e) => e.kind === 'unexpected-win' && e.subject === 'exploit')?.label).toBe('close');
    expect(slot.find((e) => e.kind === 'unexpected-win' && e.subject === 'mischief')?.label).toBe(
      'fun to keep',
    );
    expect(edgesOf(Idle).find((e) => e.kind === 'unexpected-win')).toMatchObject({
      subject: 'idle',
      label: 'close',
    });
    expect(edgesOf(Lull).map((e) => `${e.kind}:${e.subject}`)).toEqual(['silent-input:press']);
  });

  it("counts the game rising to a provocation as the mischief-maker's reward", () => {
    const wall = runCohort({ game: 'toy', build: 'a', make: () => new Wall(), seeds: [1, 2], maxMinutes: 40 })
      .summary.personas;
    expect(wall.find((p) => p.persona === 'mischief')?.provokedPerSession).toBeGreaterThan(0);
    expect(wall.find((p) => p.persona === 'commuter')?.provokedPerSession).toBeUndefined();
  });

  it('does not call the only button a dominant strategy', () => {
    for (const e of [...edgesOf(Lull), ...edgesOf(Idle)]) expect(e.kind).not.toBe('dominant-strategy');
  });
});

describe('returner', () => {
  it('stays away from a dull game and comes back to an open loop', () => {
    let dull = 0;
    let loop = 0;
    for (const seed of [1, 2, 3, 4]) {
      dull += playDays(new Lull(), PERSONAS.returner, seed).decisions.filter((d) => d.returned).length;
      const c = playDays(new Cliffhanger(), PERSONAS.returner, seed);
      loop += c.decisions.filter((d) => d.returned).length;
      const first = c.decisions[0];
      const back = first?.options.find((o) => o.id === 'play-on');
      expect(first?.loopGoal).toBeDefined();
      expect(back?.terms.some((t) => t.startsWith(`goal:${first?.loopGoal}`))).toBe(true);
      // A loop brings the player back; it does not hold them past bedtime.
      for (const s of c.sessions) expect(s.ended.reason).toBe('agenda');
    }
    expect(dull).toBe(0);
    expect(loop).toBe(12);
  });

  it('lives the day between: the second session starts the next evening on the same game', () => {
    // A loop on screen, so the return does not hang on a near tie: since the 2026-10-19 calibration a plain garden
    // with nothing left open is about even for the returner (play-on 0.064 against elsewhere 0.066, seed 1).
    const d = playDays(new Cliffhanger(), PERSONAS.returner, 1);
    const [a, b] = d.sessions;
    expect(b).toBeDefined();
    expect((b?.startedAt ?? 0) - (a?.startedAt ?? 0)).toBe(24 * 60);
    expect(b?.beats[0]?.clock).not.toBe(a?.beats[0]?.clock);
  });
});

describe('cohort, comparison and designer', () => {
  const run = (G: new () => import('../src/index.ts').GameAdapter, build: string) =>
    runCohort({ game: 'garden', build, make: () => new G(), seeds: [1, 2], maxMinutes: 40 }).summary;

  it('is deterministic plain JSON, one summary per build', () => {
    const a = run(EdgyGarden, 'a');
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    expect(JSON.stringify(run(EdgyGarden, 'a'))).toBe(JSON.stringify(a));
    expect(a.personas.map((p) => p.persona)).toEqual(Object.keys(PERSONAS));
    expect(a.personas.find((p) => p.persona === 'returner')?.returned?.possible).toBeGreaterThan(0);
  });

  it('reports a duller build as worse', () => {
    const cmp = compareCohorts(run(EdgyGarden, 'fast'), run(SlowGarden, 'slow'));
    expect(cmp.lines.some((l) => l.startsWith('worse:') && /engagement|bored/.test(l))).toBe(true);
    const back = compareCohorts(run(SlowGarden, 'slow'), run(EdgyGarden, 'fast'));
    expect(back.lines.some((l) => l.startsWith('better:'))).toBe(true);
  });

  it('two designers with different agendas rank the same evidence differently', () => {
    const s = run(Slot as never, 'a');
    const keeper = designReview(s, DESIGNERS.keeper);
    const tight = designReview(s, DESIGNERS.tightener);
    expect(keeper.ranked.length).toBeGreaterThan(1);
    expect(keeper.ranked.map((r) => r.proposal.id)).not.toEqual(tight.ranked.map((r) => r.proposal.id));
    expect(tight.ranked[0]?.proposal.kind).toMatch(/close-edge|soften-frustration/);
    expect(designReview(s, DESIGNERS.keeper).text).toBe(keeper.text);
  });
});
