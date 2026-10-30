import { describe, expect, it } from 'vitest';
import { actorRuntime, saveActors } from './actor.ts';
import { DAY } from './config.ts';
import { publicFixture, requirePerson } from './public-fixture.ts';
import { liveDays } from './season.ts';
import { installActorViews } from './state.ts';

// Two required phases share one actual day. The total budget remains the original
// two cases × 30 seconds; no person, archive or continued input is discarded.
describe('actual village daily clock and fine continuation', { concurrent: false, shuffle: false }, () => {
  let captured: ReturnType<typeof publicFixture> | undefined;
  it('advances a whole routine day with public prayer commitments and complete receipts', () => {
    const s = publicFixture(DAY);
    liveDays(s, DAY * 2);
    expect(actorRuntime(s).snapshot().archive.current.cursor.fidelity.mode).toBe('daily');
    expect(requirePerson(s, 'keeper').body.alive).toBe(true);
    expect(requirePerson(s, 'keeper').agenda.commitments.some((c) => c.id.startsWith('salah:1:'))).toBe(true);
    saveActors(s);
    captured = s;
  }, 30000);

  it('cold-restores the whole day and continues both runs in fine time with the same full hash', () => {
    if (!captured) throw new Error('The required whole-day capture did not complete.');
    const s = captured;
    const cold = installActorViews(JSON.parse(JSON.stringify(s)));
    expect(actorRuntime(cold).snapshot()).toEqual(s.actors.archive);
    liveDays(s, DAY * 2 + 60);
    liveDays(cold, DAY * 2 + 60);
    expect(actorRuntime(cold).snapshot().archive.hashes.full).toBe(
      actorRuntime(s).snapshot().archive.hashes.full,
    );
    expect(actorRuntime(s).snapshot().archive.current.cursor.fidelity.mode).toBe('fine');
    expect(actorRuntime(s).time()).toBe(DAY * 2 * 60_000 + 60 * 60_000);
    expect(requirePerson(s, 'keeper').agenda.commitments.some((c) => c.id.startsWith('salah:2:'))).toBe(true);
    // Cold restore validates the complete daily archive by replay; next hashes match.
  }, 30000);
});
