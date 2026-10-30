import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { DAY } from './config.ts';
import { takeOffer } from './fair.ts';
import { settleLifeCard } from './life.ts';
import { stepPeople } from './night.ts';
import { applyNightAct } from './night-actions.ts';
import { WatchWorld } from './people.ts';
import { publicFixture } from './public-fixture.ts';
import { endWinter, HARVEST_DAY, SPRING_DAY, stepSeason, YEAR_DAYS } from './season.ts';

it('follows actual fair and family choices with facts, separating played Gate work from routine nights', () => {
  // The opening contains a fair and a birth card, not a simulated birth or an invented new family.
  const fair = publicFixture(300 * DAY);
  fair.phase = 'fair';
  fair.fair = {
    max: 4,
    picks: [],
    offers: [
      { id: 'bell', label: 'Bell', text: '', cost: 4 },
      { id: 'heir', label: 'Heir', text: '', cost: 0, target: 'kian' },
    ],
  };
  expect(takeOffer(fair, 'bell')).toBe(true);
  expect(takeOffer(fair, 'heir')).toBe(true);
  settleLifeCard(fair, { kind: 'birth', who: 'samira', other: 'pell' }, 'visit');
  settleLifeCard(fair, { kind: 'birth', who: 'samira', other: 'lena' }, 'grain');

  // Move those actual receipts into an authored final hour of the following winter.
  // This control tests the follow-up, not a year of life or player acceptance.
  const s = publicFixture(YEAR_DAYS * DAY + 1280, (people) => {
    const p = people.find((p) => p.id === 'tamar');
    if (!p) throw new Error('Missing Tamar');
    p.state.body.exertion = 0.9;
    p.state.body.sleepDebtHours = 8;
    p.state.body.sleepPressure = 0.9;
  });
  s.year = 2;
  s.phase = 'night';
  s.nightStart = s.minute;
  s.chronicle = structuredClone(fair.chronicle);
  s.marks = structuredClone(fair.marks);
  s.heir = 'kian';
  s.place.tamar = 'gate-1';
  s.posts.tamar = 'gate-1';
  s.place.kian = 'gate-2';
  s.place.samira = 'gate-2';
  s.lantern = { x: 1, target: 1 };
  expect(applyNightAct(s, { k: 'relieve', who: 'tamar', by: 'kian' })).toBe(true);
  // A short authored world offer lets HF actually complete Gate work in this bounded control.
  const world = new WatchWorld(s);
  const offers = world.affordancesFor.bind(world);
  world.affordancesFor = (p) =>
    offers(p).map((a) => (p.id === 'kian' && a.id === 'post:gate-1' ? { ...a, duration: 2 } : a));
  expect(s.cast.kian?.stood).not.toBe(true);
  let actualStart = false;
  const until = s.minute + 60;
  while (s.minute < until) {
    const events = stepPeople(s, s.minute + 1, world);
    if (events.some((e) => e.kind === 'begin' && e.personId === 'kian' && e.action === 'hold-post')) {
      actualStart = true;
      expect(s.cast.kian?.stood).toBe(true);
    }
    s.minute++;
  }
  expect(actualStart).toBe(true);
  const receipt = s.yearGrain.playedGate?.find((r) => r.who === 'kian');
  expect(receipt?.receipt).toBeTypeOf('string');
  expect(s.cast.kian?.stood).toBe(true);
  expect(s.yearGrain.stints['kian@gate']).toBeUndefined();
  const thaw = publicFixture((YEAR_DAYS + SPRING_DAY) * DAY - 1);
  thaw.year = 2;
  thaw.chronicle = structuredClone(s.chronicle);
  thaw.marks = structuredClone(s.marks);
  thaw.yearGrain.playedGate = structuredClone(s.yearGrain.playedGate);
  endWinter(thaw);
  const text = thaw.chronicle
    .filter((l) => l.year === 2 && l.kind === 'winter')
    .map((l) => l.text)
    .join('\n');
  expect(text).toContain('bigger bell bought at the fair is still hung');
  expect(text).toContain('You chose to visit the family after Pell was born. Pell is living in the village');
  expect(text).toContain('You sent a sack from the granary for Lena. Lena is living in the village');
  expect(text).toContain('no recorded quiet routine nights');
  expect(text).toContain('completed Gate watch recorded on a night you kept');
  expect(text).not.toMatch(/is learning it|never guarded the Gate|felt|grateful/);
  actorRuntime(s).verify();
  actorRuntime(thaw).verify();
}, 30_000);

it('identifies purchased seed when the actual next harvest uses it', () => {
  const s = publicFixture((HARVEST_DAY - 1) * DAY);
  s.phase = 'autumn';
  s.marks.seed = true; // Authored premise: seed was bought at the preceding fair.
  stepSeason(s);
  expect(s.marks.seed).toBe(false);
  const line = s.chronicle.findLast((l) => l.kind === 'harvest');
  expect(line?.text).toContain('This harvest used the seed grain bought at the fair.');
  expect(line?.text).toContain('Weather, the fields sown and the people working also shaped it.');
  actorRuntime(s).verify();
  // One real daily native step plus full archive verification; this is a correctness allowance, not a game latency budget.
}, 60_000);

it('keeps unanswered and unaffordable family choices distinct from a completed gift', () => {
  const s = publicFixture();
  s.grain = 0;
  const before = actorRuntime(s).snapshot();
  settleLifeCard(s, { kind: 'birth', who: 'samira', other: 'pell' }, null);
  settleLifeCard(s, { kind: 'birth', who: 'samira', other: 'lena' }, 'grain');
  expect(s.chronicle.at(-2)?.text).toBe('The birth card for Pell went unanswered.');
  expect(s.chronicle.at(-1)?.text).toBe('No sack could be sent for Lena; the granary had less than a sack.');
  expect(s.grain).toBe(0);
  expect(actorRuntime(s).snapshot()).toEqual(before);
});
