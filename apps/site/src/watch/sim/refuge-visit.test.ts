import { snapshot } from '@adam0white/human-framework';
import { describe, expect, it } from 'vitest';
import { siteCastCheckpoint } from '../../shared/cast-chapter.ts';
import { WATCH_NORMS } from './people.ts';
import { agreeRefugeVisit, refugeVisitPassport } from './refuge-visit.ts';
import { endState, replay, WatchRun } from './run.ts';

function dawn() {
  const run = new WatchRun(1);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  while (run.state.phase === 'night') run.step();
  return run;
}
describe('actual Watch refuge agreement', () => {
  it('records a bounded new agreement after an ordinary night without replacing care or active work', async () => {
    const run = dawn(),
      s = run.state;
    expect(s.phase).toBe('dawn');
    const k = s.community.people.find((p) => p.id === 'kian')!;
    const before = snapshot(k);
    const result = agreeRefugeVisit(s);
    expect(result).toContain('Ada');
    expect(s.refugeVisit?.kianAssented).toBe(true);
    expect(s.refugeVisit?.adaAssented).toBe(true);
    expect(s.refugeVisit!.returnBy).toBe(s.minute + 1440);
    expect(k.activity).toEqual(before.activity);
    const care = k.agenda.commitments.find((c) => c.id === s.refugeVisit!.commitmentId)!;
    expect(care.toId).toBe('ada');
    expect(care.actions).toEqual(['care-ada']);
    expect(refugeVisitPassport(s)).toBeUndefined();
    const grainBefore = s.grain;
    expect(run.input({ k: 'refugeVisit', choice: 'prepare' })).toBe(true);
    expect(s.grain).toBeCloseTo(grainBefore - 0.1);
    expect(s.refugeDeparture).toBeDefined();
    const departure = s.refugeDeparture!;
    const transfer = await siteCastCheckpoint('watch', departure.person, WATCH_NORMS, departure.watchCare);
    expect(transfer.watchCare).toEqual(departure.watchCare);
    expect(transfer.sourceSnapshot).toEqual(snapshot(departure.person));
    expect(
      departure.person.agenda.commitments.find((c) => c.id === s.refugeVisit!.commitmentId)?.status,
    ).toBe('kept');
    expect(
      departure.person.agenda.commitments.find((c) => c.id === s.refugeVisit!.returnCommitmentId)?.status,
    ).toBe('pending');
    expect(departure.person.activity).toBeNull();
    expect(departure.person.now).toBeGreaterThan(s.refugeVisit!.sourceMinute);
    expect(run.input({ k: 'refugeVisit', choice: 'stay' })).toBe(true);
    expect(s.refugeDeparture).toBeUndefined();
    expect(k.agenda.commitments.find((c) => c.id === s.refugeVisit!.commitmentId)?.status).toBe('kept');
    expect(k.agenda.commitments.find((c) => c.id === s.refugeVisit!.returnCommitmentId)?.status).toBe(
      'released',
    );
  });
  it('refuses a real retained home-threat promise and preserves the exact Person', () => {
    const run = dawn(),
      s = run.state,
      k = s.community.people.find((p) => p.id === 'kian')!;
    k.agenda.commitments.push({
      id: 'actual-home-threat-control',
      kind: 'duty',
      status: 'pending',
      actions: ['go-home'],
      toId: 'home:west',
      from: s.minute,
      until: s.minute + 90,
      importance: 0.8,
    });
    const before = snapshot(k);
    expect(agreeRefugeVisit(s)).toContain('duty');
    expect(snapshot(k)).toEqual(before);
    expect(refugeVisitPassport(s)).toBeUndefined();
  });
  it('pins the chosen agreement in ordinary input replay and leaves an explicit stay choice', () => {
    const run = dawn();
    expect(run.input({ k: 'refugeVisit', choice: 'ask' })).toBe(true);
    expect(endState(replay(run.export()))).toEqual(run.export().end);
    expect(run.input({ k: 'refugeVisit', choice: 'prepare' })).toBe(true);
    expect(run.state.refugeDeparture).toBeDefined();
    expect(endState(replay(run.export()))).toEqual(run.export().end);
    expect(run.input({ k: 'toDusk' })).toBe(false);
    expect(run.input({ k: 'refugeVisit', choice: 'stay' })).toBe(true);
    expect(run.state.refugeVisit?.status).toBe('staying');
    expect(run.input({ k: 'toDusk' })).toBe(true);
  });
});
