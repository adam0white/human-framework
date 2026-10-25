/** Same person with and without reading: identical next decision and state, including RNG. */
import assert from 'node:assert/strict';
import { createPerson, decide } from '../src/person.ts';
import { qalbReading } from '../src/qalb.ts';

export function qalbControl() {
  const read = createPerson({
    id: 'person',
    name: 'Person',
    seed: 71,
    now: 0,
    bornAt: -15768000,
    sex: 'female',
  });
  const unread = structuredClone(read);
  const description = qalbReading(read);
  assert.deepEqual(read, unread);
  const offers = [{ id: 'rest', action: 'rest', label: 'Rest', duration: 10, effort: 0, advertises: {} }];
  assert.deepEqual(decide(read, offers), decide(unread, offers));
  assert.deepEqual(read, unread);
  return { stateAndRngUnchanged: true, continuationIdentical: true, description };
}
if (process.argv[1]?.endsWith('/qalb-control.ts')) console.log(qalbControl());
