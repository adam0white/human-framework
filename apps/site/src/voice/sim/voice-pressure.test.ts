/** SCOPE: pressure remains simulated while the voice pane avoids a labelled gauge. */
import { expect, test } from 'vitest';
import { voiceSpec } from './hf4-spec.ts';
import { createCommunity, interruptPerson, mount, stepCommunity } from './hf4-town-run.ts';
import { createTown, TOWN_IDS, type Town, townCalendar, townPeople } from './town.ts';
import { voicesView } from './view.ts';

test('insistence still changes pressure without displaying a gauge or mutating reads', () => {
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
  const initial = h.will.voices.find((v) => v.voiceId === 'you')?.pressure ?? 0;
  for (let n = 0; n < 3; n++) {
    interruptPerson(c, h, start + n, 'actual repeated insistence control');
    stepCommunity(c, town, start + n + 1, {
      suggestions: {
        halil: { voiceId: 'you', affordanceId: 'wait', strength: 1, insist: true, since: start + n },
      },
    });
  }
  expect(h.will.voices.find((v) => v.voiceId === 'you')!.pressure).toBeGreaterThan(initial);
  const resolutions = c.runtime!.events.filter(
    (event) => event.person === 'halil' && event.data.kind === 'suggestion-resolved',
  );
  const reply = h.trace
    .flatMap((decision) => decision.suggestions ?? (decision.suggestion ? [decision.suggestion] : []))
    .at(-1);
  expect(reply?.says).toBe(resolutions.at(-1)?.narration[0]?.text);
  expect(reply?.says).toBeTruthy();
  const snapshot = c.runtime!.save(),
    after = voicesView(h, start + 3);
  expect(after.every((voice) => voice.pressure === undefined)).toBe(true);
  expect(c.runtime!.save()).toEqual(snapshot);
  c.runtime!.verify();
});
