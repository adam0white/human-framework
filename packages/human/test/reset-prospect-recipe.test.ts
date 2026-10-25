import { expect, test } from 'vitest';
import {
  openDistinctEpisodeControl,
  prospectId,
  resetProspectControl,
  showObservedWork,
} from '../examples/reset-prospect-control.ts';
import { restore, snapshot, tick } from '../src/index.ts';

test('a reset with the same identity retains the peak and does not mint progress from zero', () => {
  const { person, atZero, same, activeProjectIds } = resetProspectControl();
  expect(atZero).toEqual({ progress: 0, peak: 0.4, advancedAt: 601 });
  expect(same).toMatchObject({ progress: 0.4, peak: 0.4, high: 0.4 });
  expect(same.advancedAt).toBe(601);
  expect(activeProjectIds).toEqual([prospectId('original')]);
  expect(person.projects?.prospects.map((x) => x.id)).toContain(prospectId('new-commission'));
  expect(person.projects?.history).toEqual([]);
});

test('new observed work must exceed the retained high; JSON replay gives the same result', () => {
  const { person } = resetProspectControl();
  const replay = restore(JSON.parse(JSON.stringify(snapshot(person))));
  for (const p of [person, replay]) {
    tick(p, p.now + 1);
    showObservedWork(p, 'original', 5);
  }
  expect(snapshot(replay)).toEqual(snapshot(person));
  const goal = person.agenda.goals.find((g) => g.project?.prospectId === prospectId('original'));
  expect(goal?.project?.peak).toBe(0.5);
  expect(goal?.lastAdvancedAt).toBe(person.now);
});

test('an explicitly distinct episode can start new work without deleting old history', () => {
  const { person, same } = resetProspectControl();
  const before = { now: person.now, hydration: person.body.hydration };
  openDistinctEpisodeControl(person, same.goalId);
  expect(person.now).toBe(before.now + 2);
  expect(person.body.hydration).toBeLessThan(before.hydration);
  const old = person.agenda.goals.find((g) => g.id === same.goalId);
  const fresh = person.agenda.goals.find(
    (g) => g.status === 'active' && g.project?.prospectId === prospectId('new-commission'),
  );
  expect(old?.status).toBe('abandoned');
  expect(old?.project?.peak).toBe(0.4);
  expect(person.projects?.history).toContainEqual(
    expect.objectContaining({ goalId: same.goalId, outcome: 'abandoned' }),
  );
  expect(fresh?.progress).toBe(0);
  expect(fresh?.project?.peak).toBe(0);
});

test('identity alone does not prevent ordinary stale abandonment during a long rebuild', () => {
  const { person, same } = resetProspectControl();
  tick(person, person.now + 181);
  const old = person.agenda.goals.find((g) => g.id === same.goalId);
  expect(old?.status).toBe('abandoned');
  expect(old?.project?.peak).toBe(0.4);
  expect(person.projects?.history).toContainEqual(
    expect.objectContaining({ goalId: same.goalId, outcome: 'abandoned' }),
  );
});
