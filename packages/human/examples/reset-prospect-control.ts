/**
 * Host recipe for a world rebuilt between episodes. The host owns episode identity and observed
 * progress. The same prospect id means the same undertaking, including its previous high-water
 * mark. A distinct id is valid only for work the host actually treats as a new undertaking.
 * This control does not infer resets, migrate world state, or promise that a task will be finished.
 */

import type { Person } from '../src/index.ts';
import {
  abandonGoal,
  considerProjects,
  createPerson,
  PSYCHOLOGICAL_NEEDS,
  perceive,
  tick,
} from '../src/index.ts';

const BASE = 'workbench';
function ready(p: Person): void {
  p.body.satiety = p.body.hydration = 1;
  p.body.sleepPressure = p.body.sleepDebt = p.body.exertion = p.body.pain = 0;
  for (const need of PSYCHOLOGICAL_NEEDS) p.needs[need] = 1;
}

/** The episode key is stable across saves and replay. Do not derive it from wall time. */
export function prospectId(episode: string): string {
  if (!episode || !/^[a-z0-9-]+$/.test(episode)) throw new Error('Explicit stable episode key required');
  return `${BASE}:${episode}`;
}

export function showObservedWork(p: Person, episode: string, count: number): void {
  if (!Number.isInteger(count) || count < 0 || count > 10) throw new Error('Observed count outside 0..10');
  perceive(p, [
    {
      at: p.now,
      channel: 'saw',
      kind: 'fact',
      salience: 1,
      summary: 'The workbench and its assembled pieces',
      prospect: {
        id: prospectId(episode),
        label: 'Assemble the workbench',
        kind: 'arrange',
        progress: count / 10,
      },
    },
  ]);
}

export function resetProspectControl() {
  const p = createPerson({
    id: 'worker',
    name: 'Worker',
    seed: 19,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1, conscientiousness: 1 },
    // Short fixture memory/cooldowns isolate identity without a day-long recovery or body reset.
    enable: { projects: { forgetMinutes: 1, cooldownMinutes: 1, adoptEveryMinutes: 1 } },
  });
  ready(p);
  showObservedWork(p, 'original', 0);
  considerProjects(p, p.now);
  const held = p.agenda.goals.find(
    (g) => g.status === 'active' && g.project?.prospectId === prospectId('original'),
  );
  if (!held) throw new Error('Expected an adopted project');
  tick(p, p.now + 1);
  showObservedWork(p, 'original', 4);
  const high = held.project?.peak;
  // The physical world is rebuilt. Its count is zero, but Person state is not rewritten.
  tick(p, p.now + 1);
  showObservedWork(p, 'original', 0);
  const atZero = { progress: held.progress, peak: held.project?.peak, advancedAt: held.lastAdvancedAt };
  tick(p, p.now + 1);
  showObservedWork(p, 'original', 4);
  const same = {
    goalId: held.id,
    progress: held.progress,
    peak: held.project?.peak,
    advancedAt: held.lastAdvancedAt,
    high,
  };
  // A separate commission has a distinct, host-assigned identity. Merely showing it creates
  // no second active project while the old pursuit remains active.
  showObservedWork(p, 'new-commission', 0);
  considerProjects(p, p.now);
  return {
    person: p,
    atZero,
    same,
    distinctId: prospectId('new-commission'),
    activeProjectIds: p.agenda.goals
      .filter((g) => g.status === 'active' && g.project)
      .map((g) => g.project?.prospectId),
  };
}

/** Fixture-only transition after abandonment: two real simulated minutes, with authored short memory. */
export function openDistinctEpisodeControl(p: Person, originalGoalId: string): void {
  if (!abandonGoal(p, originalGoalId)) throw new Error('Original goal is not active');
  considerProjects(p, p.now); // Records terminal history; it does not erase it.
  tick(p, p.now + 2); // Expire the one-minute fixture prospect and cooldown; keep body/needs untouched.
  showObservedWork(p, 'new-commission', 0);
  considerProjects(p, p.now);
}

if (import.meta.main) {
  const r = resetProspectControl();
  openDistinctEpisodeControl(r.person, r.same.goalId);
  console.log(
    JSON.stringify(
      {
        atZero: r.atZero,
        caughtUp: r.same,
        history: r.person.projects?.history,
        active: r.person.agenda.goals.filter((g) => g.status === 'active').map((g) => g.project?.prospectId),
      },
      null,
      2,
    ),
  );
}
