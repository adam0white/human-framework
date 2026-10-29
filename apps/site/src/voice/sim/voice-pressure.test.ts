/** SCOPE: expose existing native voice pressure in words; never estimate blood pressure or trust causality. */
import { expect, test } from 'vitest';
import { voiceSpec } from './hf4-spec.ts';
import { createCommunity, interruptPerson, mount, stepCommunity } from './hf4-town-run.ts';
import { createTown, TOWN_IDS, type Town, townCalendar, townPeople } from './town.ts';
import { voicesView } from './view.ts';

test('actual insisted advice changes only its own displayed pressure reading without read mutation', () => {
  const start = 12 * 60,
    ppl = townPeople({ now: start }),
    people = TOWN_IDS.map((id) => ppl[id]);
  function restrict(t: Town): Town {
    const offers = t.affordancesFor.bind(t),
      fork = t.fork.bind(t);
    t.affordancesFor = (p) =>
      offers(p).filter((a) => (p.id === 'halil' ? ['wait', 'rest'].includes(a.id) : a.id === 'wait'));
    t.fork = () => restrict(fork());
    return t;
  }
  const town = restrict(createTown(people, { seed: 7, now: start })),
    c = createCommunity(people);
  mount(c, town, voiceSpec(7, start, townCalendar));
  const h = c.people.find((p) => p.id === 'halil')!;
  const before = voicesView(h, start),
    initial = h.will.voices.find((v) => v.voiceId === 'you')?.pressure ?? 0;
  for (let n = 0; n < 3; n++) {
    interruptPerson(c, h, start + n, 'actual repeated insistence control');
    stepCommunity(c, town, start + n + 1, {
      suggestions: {
        halil: { voiceId: 'you', affordanceId: 'wait', strength: 1, insist: true, since: start + n },
      },
    });
  }
  expect(h.will.voices.find((v) => v.voiceId === 'you')!.pressure).toBeGreaterThan(initial);
  const snapshot = c.runtime!.save(),
    after = voicesView(h, start + 3);
  expect(after.find((v) => v.id === 'you')?.pressure).not.toBe(before.find((v) => v.id === 'you')?.pressure);
  expect(after.find((v) => v.id === 'selin')?.pressure).toBe(before.find((v) => v.id === 'selin')?.pressure);
  expect(after.map((v) => v.pressure).join(' ')).not.toMatch(/\d|blood/);
  expect(c.runtime!.save()).toEqual(snapshot);
  c.runtime!.verify();
});
