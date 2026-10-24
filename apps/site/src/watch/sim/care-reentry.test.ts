import { canonicalPersona, type PersonaEnvelope, preparePersonaLife } from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { makeCastChapter } from '../../shared/cast-chapter.ts';
import actualDanyal from '../../shared/fixtures/valley-danyal-native.json';
import actualMeryem from '../../shared/fixtures/valley-meryem-native.json';
import actualHead from '../../shared/fixtures/watch-kian-care-native.json';
import { clockRuns, stepMinute } from './night.ts';
import { endState, replay, WatchRun } from './run.ts';

// Actual published Watch source, captured at a natural idle boundary after ordinary care.
// The fixture is its bounded shelf passport; the raw source stays in the source archive.
function chapter(head = actualHead) {
  const parent = head as unknown as PersonaEnvelope;
  const clock = (parent.transfer.life as { clock: { watermark: number } }).clock.watermark * 3600000;
  return makeCastChapter([preparePersonaLife(parent, clock)]);
}
describe('finite own-Watch care re-entry', () => {
  it('retains actual Kian and Ada state, keeps the meal and permits an explicit stay without completed travel', () => {
    const c = makeCastChapter(
      [actualHead, actualDanyal, actualMeryem].map((head) => {
        const parent = head as unknown as PersonaEnvelope;
        const clock = (parent.transfer.life as { clock: { watermark: number } }).clock.watermark * 3600000;
        return preparePersonaLife(parent, clock);
      }),
    );
    const run = new WatchRun(1, undefined, c);
    const s = run.state;
    const k = s.community.people.find((p) => p.id === 'kian')!;
    const ada = s.community.people.find((p) => p.id === 'ada')!;
    const source = actualHead.transfer.watchCare;
    const offset = k.now - actualHead.transfer.person.person.source.now;
    expect(canonicalPersona(k.rng)).toBe(canonicalPersona(actualHead.transfer.person.person.rng));
    expect(k.body.fitness).toBe(actualHead.transfer.person.person.health.fitness);
    expect(s.refugeVisit?.returnBy).toBe(source.agreement.returnBy + offset);
    expect(s.refugeVisit?.careCompletedAt).toBe(source.care.completedAt + offset);
    expect(ada.now).toBe(source.dependent.sourceMinute + offset);
    expect(ada.now - ada.life.bornAt).toBe(source.dependent.ageMinutes);
    expect([ada.body.satiety, ada.body.hydration, ada.body.sleepPressure]).toEqual([
      source.dependent.satiety,
      source.dependent.hydration,
      source.dependent.sleepPressure,
    ]);
    expect(ada.social.relationships.some((r) => r.otherId === 'kian' && r.roles.includes('guardian'))).toBe(
      true,
    );
    const meal = k.agenda.commitments.find((v) => v.id === source.agreement.commitmentId)!;
    const returning = k.agenda.commitments.find((v) => v.id === source.agreement.returnCommitmentId)!;
    expect(meal.status).toBe('kept');
    expect(returning.status).toBe('pending');
    expect(returning.toId).toBe('ada');
    expect(returning.until - k.now).toBe(
      source.agreement.returnBy - actualHead.transfer.person.person.source.now,
    );
    run.input({ k: 'start' });
    expect(run.input({ k: 'begin' })).toBe(false);
    const heldAt = s.minute;
    expect(clockRuns(s)).toBe(false);
    for (let i = 0; i < 100; i++) {
      run.step();
      stepMinute(s);
    }
    expect(s.minute).toBe(heldAt);
    expect(s.phase).toBe('dusk');
    expect(run.input({ k: 'refugeVisit', choice: 'stay' })).toBe(true);
    expect(meal.status).toBe('kept');
    expect(returning.status).toBe('released');
    expect(s.refugeVisit?.status).toBe('staying');
    expect(ada.body.satiety).toBe(source.dependent.satiety);
    expect(ada.body.alive).toBe(true);
    expect(clockRuns(s)).toBe(true);
    run.step();
    expect(s.minute).toBe(heldAt + 1);
    expect(endState(replay(run.export()))).toEqual(run.export().end);
  });
  it('refuses an altered guardian or an unrelated home duty before an actor is pinned', () => {
    const wrongGuardian = structuredClone(actualHead);
    wrongGuardian.transfer.watchCare.dependent.guardian = 'tamar';
    expect(() => new WatchRun(1, undefined, chapter(wrongGuardian))).toThrow(/care|Ada|guardian/i);
    const future = structuredClone(actualHead);
    future.transfer.watchCare.dependent.sourceMinute = actualHead.transfer.person.person.source.now + 1;
    expect(() => new WatchRun(1, undefined, chapter(future))).toThrow(/Ada|reservoir/i);
    const home = structuredClone(actualHead);
    home.transfer.person.calendar.commitments.push({
      ...home.transfer.person.calendar.commitments[0]!,
      id: 'unrelated-home-duty',
      kind: 'duty',
      actions: ['go-home'],
      toId: 'ada',
      targetId: 'ada',
    });
    expect(() => new WatchRun(1, undefined, chapter(home))).toThrow(/care|duty|action/i);
  });
});
