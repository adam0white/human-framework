/** SCOPE: a public opening without a retained promise tests physical payment timing, not a faith or trust judgment. */
import { expect, test } from 'vitest';
import { personAuthoring } from './hf4-model.ts';
import { VoiceRun } from './hf4-run.ts';
import { voiceSpec } from './hf4-spec.ts';
import { cloneCommunity, createCommunity, mount, stepCommunity } from './hf4-town-run.ts';
import { buildReport, type ReportInput } from './report.ts';
import { createTown, TOWN_IDS, type Town, townCalendar, townPeople } from './town.ts';
import { type Cell, stripFor } from './view.ts';

test('a real late payment is dated by its receipt rather than its before-deadline start', () => {
  const start = 15 * 1440 + 19 * 60 + 59;
  const ppl = townPeople({ now: start }),
    people = TOWN_IDS.map((id) => ppl[id]);
  const opening = people.map(personAuthoring);
  const halil = opening.find((p) => p.id === 'halil')!;
  // Before createPerson only: no retained rent commitment. The town still has its physical debt/deadline.
  halil.state.agenda.commitments = halil.state.agenda.commitments.filter((c) => c.id !== 'rent');
  const town = createTown(people, { seed: 7, now: start });
  town.state.money.halil = 300;
  function restrict(t: Town): Town {
    const offers = t.affordancesFor.bind(t),
      fork = t.fork.bind(t);
    t.affordancesFor = (p) => offers(p).filter((a) => a.id === (p.id === 'halil' ? 'pay-rent' : 'wait'));
    t.fork = () => restrict(fork());
    return t;
  }
  restrict(town);
  const c = createCommunity(people);
  mount(c, town, voiceSpec(7, start, townCalendar), opening);
  const events = stepCommunity(c, town, start + 31);
  const begun = events.find((e) => e.personId === 'halil' && e.kind === 'begin' && e.action === 'pay-rent');
  const finished = events.find(
    (e) =>
      e.personId === 'halil' && e.kind === 'finish' && e.action === 'pay-rent' && e.status === 'completed',
  );
  expect(begun).toBeDefined();
  expect(finished).toBeDefined();
  expect(begun!.at).toBeLessThan(15 * 1440 + 20 * 60);
  expect(finished!.at).toBeGreaterThan(15 * 1440 + 20 * 60);
  expect(town.state.rentPaid).toBe(300);
  const cell: Cell = {
    from: begun!.at,
    to: finished!.at,
    action: 'pay-rent',
    affordanceId: 'pay-rent',
    label: 'pay Osman',
    done: true,
  };
  const input: ReportInput = {
    withYou: [],
    withoutYou: [],
    after: { c, town, ppl, opts: {} },
    endRamadanTrust: {},
    eidStrip: stripFor(31, []),
    eidLines: [],
    rows: [],
    trustStart: 0.5,
    trustEid: 0.5,
    cells: [cell],
    insisted: 0,
    payments: [{ at: finished!.at, amount: 300 }],
  };
  const before = c.runtime!.save();
  const summary = buildReport(input).eid.summary.join(' ');
  expect(summary).toContain('missed Osman’s payment deadline');
  expect(summary).not.toContain('paid Osman 300 lira by the deadline');
  expect(c.runtime!.save()).toEqual(before);
  c.runtime!.verify();
  const cold = cloneCommunity(c);
  cold.runtime = VoiceRun.restore(JSON.parse(JSON.stringify(before)));
  const coldTown = createTown(cold.people, { seed: 7, now: start + 31, state: structuredClone(town.state) });
  restrict(coldTown);
  stepCommunity(c, town, start + 32);
  stepCommunity(cold, coldTown, start + 32);
  expect(cold.runtime.save()).toEqual(c.runtime!.save());
  expect(coldTown.state).toEqual(town.state);
}, 30_000);
