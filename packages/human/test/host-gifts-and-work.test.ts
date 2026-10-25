import { expect, test } from 'vitest';
import {
  chooseAndBegin,
  giftHost,
  resident,
  runHostRecipesControl,
  sharedWorkRecipe,
} from '../examples/host-gifts-and-work-control.ts';
import { finish, tick } from '../src/index.ts';

test('chosen completed gift conserves stock, settles once, admits separate evidence; work cleans up', () => {
  expect(runHostRecipesControl()).toEqual({ stock: { donor: 1, recipient: 2 }, goal: 'abandoned' });
});

test.each(['interrupted', 'empty', 'reduced', 'early'] as const)(
  '%s gift revalidates completion and current stock',
  (arm) => {
    const donor = resident('donor');
    const host = giftHost(donor, resident('recipient'));
    host.sightStock();
    const act = chooseAndBegin(donor, host.world.affordancesFor(donor));
    if (arm === 'empty') host.stock.donor = 0; // Another host transaction removed the stock.
    if (arm === 'reduced') host.stock.donor = 1;
    const total = host.stock.donor + host.stock.recipient;
    tick(donor, arm === 'early' || arm === 'interrupted' ? 5 : act.endsAt);
    const out = host.world.resolve(donor, act, arm === 'interrupted' ? 'interrupted' : 'ended');
    expect(out.status).toBe(
      arm === 'reduced' ? 'completed' : arm === 'interrupted' ? 'interrupted' : 'failed',
    );
    finish(donor, out);
    host.world.resolve(donor, act, 'ended');
    expect(host.stock.donor + host.stock.recipient).toBe(total);
    expect(host.stock.recipient).toBe(arm === 'reduced' ? 1 : 0);
    expect(host.world.perceptsFor(resident('recipient', 20), 0, 20)).toHaveLength(arm === 'reduced' ? 1 : 0);
  },
);

test.each(['interrupted', 'failed'] as const)('%s work gives no goal progress', (status) => {
  const worker = resident('worker');
  const care = sharedWorkRecipe(worker);
  care.noticeDamage();
  const act = chooseAndBegin(worker, [
    { id: 'mend', action: 'mend-bench', label: 'mend', duration: 10, effort: 0, advertises: {} },
  ]);
  finish(worker, { at: 5, affordanceId: act.affordanceId, action: act.action, status });
  expect(worker.agenda.goals[0]?.progress).toBe(0);
  care.sound();
  expect(worker.agenda.goals[0]?.status).toBe('abandoned');
});
