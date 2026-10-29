import { exportRun, restoreRun, step } from '@adam0white/human-framework';
import { expect, it } from 'vitest';
import { needDescription } from '../ui/descriptions.ts';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { type archive, need } from './hf4.ts';
import { createFrameworkHumanSide } from './human.ts';
import { fw } from './human-cast.ts';
import type { HostState } from './human-world.ts';
import { colonyState } from './playtest.ts';

it('keeps actual carried injury distinct from general health and person trust distinct from the same-frame mean', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  const saved = g.human.snapshot() as { host: HostState; community: ReturnType<typeof archive> };
  const run = need(restoreRun(saved.community.run));
  const at = saved.community.run.current.at + 1;
  need(
    step(run, {
      until: at,
      inputs: [
        {
          id: 'actual-injury',
          at,
          source: { type: 'host', id: 'well' },
          kind: 'body.received',
          payload: {
            person: 'idris',
            evidenceId: 'reported-leg-injury',
            receipt: {
              type: 'injured',
              injury: { part: 'leg', severity: 0.6, healRatePerDay: 0.1 },
            },
          },
        },
      ],
    }),
  );
  saved.community.run = exportRun(run);
  saved.community.at = at;
  // Host carry premise, separate from the real admitted HF injury. No seeded rescue trajectory is asserted.
  const tile = saved.host.loc.idris;
  if (!tile) throw new Error('Missing authored Idris location');
  saved.host.down.idris = { kind: 'injury', since: fw(0), tile, carriedBy: 'yusuf' };
  g.human.restore(saved);
  const raw = JSON.stringify(colonyState(g)),
    frame = g.frame(),
    idris = frame.human.find((p) => p.id === 'idris');
  if (!idris) throw new Error('Missing actual Idris reading');
  expect(idris.state).toBe('carried');
  expect(idris.carriedBy).toBe('yusuf');
  expect(idris.needs.find((n) => n.id === 'injury')).toMatchObject({
    label: 'Injury',
    value: 0.4,
    urgent: true,
  });
  expect(idris.needs.find((n) => n.id === 'health')?.value).toBeGreaterThan(0.4);
  expect(needDescription('health', 1)).not.toContain('unhurt');
  expect(frame.scoreboard.human.trust).toBe(
    frame.human.reduce((sum, p) => sum + p.trust.value, 0) / frame.human.length,
  );
  expect(idris.trust.value).not.toBe(frame.scoreboard.human.trust);
  expect(JSON.stringify(colonyState(g))).toBe(raw);
});
