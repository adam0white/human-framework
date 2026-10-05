import { readFileSync } from 'node:fs';
import { skillLevel } from '@human/framework';
import { describe, expect, it } from 'vitest';
import { replayTolerant } from '../../../test/watch/tolerant.ts';
import { playYears } from '../../../test/watch/years.ts';
import { ROPE_DAWN_MEND, ROPE_MEND_PER_HOUR } from './config.ts';
import { maybeLimp } from './life.ts';
import { applyInput, presentIds } from './night.ts';
import { isWatcher, personOf } from './people.ts';
import { type LogEntry, WatchRun } from './run.ts';
import type { WatchState } from './state.ts';
import { dawnVoices } from './voices.ts';
import { closeVolume, openVolume, volumeResolved } from './volume.ts';

/**
 * Regressions from the owner's exported run (seed 20261004, years 2 to 4, played on d48d8f6; findings 2026-10-05).
 * His log no longer replays exactly (the fixes below change the run from year 1's fourth day), so it is replayed
 * tolerantly as a real player's inputs and checked against invariants, and each fix has a direct test.
 */
const owner = JSON.parse(
  readFileSync(new URL('../../../test/fixtures/watch-owner-2026-10-05.json', import.meta.url), 'utf8'),
) as { seed: number; endMinute: number; inputs: LogEntry[] };

const BLINK = 'blink till dawn';
const AWAY = ['slept', 'home', 'refused'];

describe("the owner's run, replayed (2026-10-05 export)", () => {
  it('no stale or shared postings, no false "till dawn", and the rope gets only the hands it needs', () => {
    const problems: string[] = [];
    let days = 0;
    const { applied, skipped } = replayTolerant(owner.seed, owner.inputs, owner.endMinute, {
      dawn: (s) => {
        const held = Object.entries(s.posts).filter(([, p]) => p);
        for (const [id, post] of held) {
          const p = personOf(s, id);
          if (!p || !isWatcher(s, p))
            problems.push(`y${s.year} n${s.winterNight}: ${id} not a watcher, holds ${post}`);
          if (held.some(([o, q]) => o !== id && q === post))
            problems.push(`y${s.year} n${s.winterNight}: ${post} held twice`);
        }
        for (const v of s.dawn?.voices ?? [])
          if (v.text.includes(BLINK) && s.notes.some((n) => n.who === v.who && AWAY.includes(n.kind)))
            problems.push(`y${s.year} n${s.winterNight}: ${v.who} left the wall but "${v.text}"`);
      },
      dusk: (s) => {
        days += 1;
        const menders = (s.day?.lines ?? []).filter((l) => l.text.includes('bell rope'));
        const removal = menders.map((l) => {
          const p = personOf(s, l.who);
          return p ? ROPE_MEND_PER_HOUR * 2 * skillLevel(p, 'craft') : 0;
        });
        const wear = Math.max(0, (s.day?.ropeBefore ?? 0) - ROPE_DAWN_MEND);
        // Without the last mender, the others took off no more than the wear there was (craft is read after the
        // day's practice, so it can only overstate what they did; 0.05 allows for that).
        const spare = removal.reduce((a, b) => a + b, 0) - Math.max(0, ...removal);
        if (menders.length > 1 && spare > wear + 0.05)
          problems.push(
            `y${s.year} n${s.winterNight}: ${menders.length} menders for wear ${wear.toFixed(2)}`,
          );
      },
    });
    // The fixed build honours 226 of his 272 inputs (46 fail or fall behind once the run diverges in year 1).
    expect(applied).toBeGreaterThan(200);
    expect(applied + skipped).toBe(owner.inputs.length);
    expect(days).toBeGreaterThan(15);
    expect(problems).toEqual([]);
  }, 300_000);
});

/** A headless run stopped in year 1's autumn, after the fair: Tamar keeps the Gate, the volume asks after her. */
function autumn(): { run: WatchRun; s: WatchState } {
  const run = playYears(1, 1, undefined, (st) => st.phase === 'autumn' && st.fair === null);
  return { run, s: run.state };
}

describe('playtest fixes (2026-10-05 export)', () => {
  it('a lamed watcher loses the posting at once and cannot be posted again; the next winter drops any leftover', () => {
    const { run, s } = autumn();
    const [a, b] = presentIds(s).filter((id) => s.posts[id]);
    expect(a && b).toBeTruthy();
    if (!a || !b) return;
    const pa = personOf(s, a);
    if (!pa) return;
    pa.body.injuries.push({ part: 'leftLeg', severity: 0.9 } as (typeof pa.body.injuries)[number]);
    for (let k = 0; k < 200 && !s.cast[a]?.limp; k++) maybeLimp(s, pa);
    expect(s.cast[a]?.limp).toBe(true);
    expect(s.posts[a]).toBeNull();
    s.phase = 'dusk';
    expect(applyInput(s, { k: 'post', watcher: a, post: 'gate-1' })).toBe(false);
    s.phase = 'autumn';
    // A leftover from an older page: lamed without losing the posting.
    const vb = s.cast[b];
    if (!vb) return;
    vb.limp = true;
    expect(s.posts[b]).not.toBeNull();
    playYears(1, 1, undefined, (st) => st.year === 2, run);
    expect(s.posts[b]).toBeNull();
    expect(s.posts[a]).toBeNull();
  }, 300_000);

  it('a child cannot be given a post', () => {
    const run = new WatchRun(20261004);
    run.input({ k: 'start' });
    const child = run.state.community.people.find((p) => !isWatcher(run.state, p));
    expect(child).toBeDefined();
    if (child) expect(run.input({ k: 'post', watcher: child.id, post: 'gate-1' })).toBe(false);
  });

  it('when the Gate keeper is lamed, the volume names the heir and the next volume asks a new question', () => {
    const { s } = autumn();
    const keeper = s.gateKeeper;
    const heir = presentIds(s).find((id) => id !== keeper);
    expect(keeper && heir).toBeTruthy();
    if (!keeper || !heir) return;
    s.heir = heir;
    const vk = s.cast[keeper];
    if (!vk) return;
    vk.limp = true;
    expect(s.gateKeeper).toBe(keeper);
    expect(volumeResolved(s)).toBe(true);
    expect(s.volume.end).toContain(`${s.cast[heir]?.name} keeps the Gate`);
    const asked = s.volume.question;
    closeVolume(s);
    const said = s.volume.epilogue ?? [];
    const keeperLine = said.find((x) => x.who === keeper)?.text ?? '';
    expect(keeperLine).not.toMatch(/The Gate is mine|The Gate holds|I keep the Gate|The Gate is heavy/);
    // Nobody says a line twice while their kind still has unsaid lines in either mood.
    expect(new Set(said.map((x) => x.text)).size).toBe(said.length);
    openVolume(s);
    expect(s.volume.question).not.toBe(asked);
    expect(s.volume.who).not.toBe(keeper);
  }, 300_000);

  it("dawn words: nobody who went home to sleep says they watched till dawn; last lines are only last dawn's", () => {
    const { s } = autumn();
    const ids = presentIds(s);
    expect(ids.length).toBeGreaterThan(2);
    let stayed = 0;
    for (const id of ids)
      for (let night = 1; night <= 20; night++) {
        s.night = night;
        s.lastVoices = { ghost: '“Old words.”' };
        s.notes = [
          { minute: s.minute, who: id, kind: 'shaken', section: 'west' },
          { minute: s.minute, who: id, kind: 'slept', section: 'west' },
        ];
        const v = dawnVoices(s).voices.find((x) => x.who === id)?.text ?? '';
        expect(v).not.toContain(BLINK);
        if (v.includes('didn’t stay to see it')) stayed += 1;
        expect(s.lastVoices.ghost).toBeUndefined();
      }
    expect(stayed).toBeGreaterThan(0);
  }, 300_000);

  it('an incomer past their first winter no longer speaks as the new one', () => {
    const { s } = autumn();
    const id = presentIds(s)[0];
    const v = id ? s.cast[id] : undefined;
    if (!id || !v) return;
    v.newcomer = true;
    v.comes = { year: s.year - 2, night: 3 };
    for (let night = 1; night <= 40; night++) {
      s.night = night;
      s.notes = [];
      const text = dawnVoices(s).voices.find((x) => x.who === id)?.text ?? '';
      expect(text).not.toMatch(/watch me more than the dark|Nobody spoke to me|which shadows are trees/);
    }
  }, 300_000);
});
