import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createShiftProtocol } from './contingent-protocol.mjs';

const actors = ['a', 'b', 'c'];
const ready = () => createShiftProtocol({ enabled: true, actors });
function propose(protocol, actor = 'a', slot = 'late') {
  const result = protocol.send(actor, { id: 'proposal', kind: 'propose', slot });
  assert.equal(result.status, 'applied');
  const id = protocol.snapshot().live.id;
  for (const person of actors) protocol.noteAttended(person, id);
  return id;
}
test('independently scripted instrument settles one live proposal with three distinct consents', () => {
  const p = ready(),
    id = propose(p);
  assert.equal(p.send('b', { id: 'b-accept', kind: 'accept', parent: id }).status, 'applied');
  assert.equal(p.snapshot().agreements.length, 0);
  assert.equal(p.send('c', { id: 'c-accept', kind: 'accept', parent: id }).status, 'applied');
  assert.deepEqual(p.snapshot().agreements, [
    { id: 'shift-agreement', proposalId: id, slot: 'late', consents: actors },
  ]);
});
test('duplicate proposal and acceptance messages cannot reset or manufacture consent', () => {
  const p = ready(),
    id = propose(p);
  const first = p.snapshot();
  for (let i = 0; i < 100; i++) {
    p.send('a', { id: 'proposal', kind: 'propose', slot: 'late' });
    p.send('a', { id: `duplicate-offer-${i}`, kind: 'propose', slot: 'late' });
  }
  assert.deepEqual(p.snapshot(), first);
  p.send('b', { id: 'b-accept', kind: 'accept', parent: id });
  const second = p.snapshot();
  for (let i = 0; i < 100; i++) {
    p.send('b', { id: 'b-accept', kind: 'accept', parent: id });
    p.send('b', { id: `duplicate-accept-${i}`, kind: 'accept', parent: id });
  }
  assert.deepEqual(p.snapshot(), second);
  assert.equal(second.agreements.length, 0);
  p.send('c', { id: 'c-accept', kind: 'accept', parent: id });
  const final = p.snapshot();
  for (let i = 0; i < 100; i++) p.send('c', { id: `after-${i}`, kind: 'accept', parent: id });
  assert.deepEqual(p.snapshot(), final);
  assert.equal(final.agreements.length, 1);
});
test('counter clears signatures; stale, forged and unattended responses cannot settle', () => {
  const p = ready(),
    old = propose(p, 'a', 'early');
  p.send('b', { id: 'b-accept', kind: 'accept', parent: old });
  p.send('c', { id: 'counter', kind: 'counter', parent: old, slot: 'late' });
  const current = p.snapshot(),
    id = current.live.id;
  assert.deepEqual(current.live.consents, ['c']);
  assert.equal(p.send('b', { id: 'old', kind: 'accept', parent: old }).status, 'stale');
  assert.equal(p.send('forged', { id: 'bad', kind: 'accept', parent: id }).status, 'unknown-actor');
  assert.equal(p.send('a', { id: 'unheard', kind: 'accept', parent: id }).status, 'unattended');
  assert.deepEqual(p.snapshot(), current);
  p.noteAttended('a', id);
  p.send('a', { id: 'real', kind: 'accept', parent: id });
  assert.equal(p.snapshot().agreements.length, 0);
});
test('refusal invalidates the live proposal and its acceptance window', () => {
  const p = ready(),
    id = propose(p);
  assert.equal(p.send('b', { id: 'refusal', kind: 'refuse', parent: id }).status, 'applied');
  assert.equal(p.snapshot().live, null);
  assert.equal(p.send('c', { id: 'late', kind: 'accept', parent: id }).status, 'stale');
  assert.equal(p.snapshot().agreements.length, 0);
});
test('disabled host preserves exact old-call state and RNG against the supplied base over20 seeds', async () => {
  const hf = await import(pathToFileURL(process.env.HF_MODULE).href);
  const base = await import(pathToFileURL(process.env.BASE_HF_MODULE ?? process.env.HF_MODULE).href);
  function continuation(api, p) {
    for (let i = 0; i < 3; i++) {
      const aff = { id: 'rest', action: 'rest', label: 'Rest', duration: 1, effort: 0, advertises: {} };
      const d = api.decide(p, [aff]);
      api.begin(p, aff, d);
      api.finish(p, { affordanceId: 'rest', action: 'rest', status: 'completed', at: p.now + 1 });
      api.tick(p, p.now + 1);
    }
    return JSON.stringify(p);
  }
  for (let seed = 1; seed <= 20; seed++) {
    const p = hf.createPerson({ id: 'old-call', seed, now: 600, bornAt: -30 * 365 * 1440, sex: 'female' });
    const control = base.createPerson({
      id: 'old-call',
      seed,
      now: 600,
      bornAt: -30 * 365 * 1440,
      sex: 'female',
    });
    const before = JSON.stringify(p);
    assert.equal(
      createShiftProtocol({
        enabled: false,
        get actors() {
          throw new Error('Disabled path read actors');
        },
      }),
      null,
    );
    assert.equal(JSON.stringify(p), before);
    const enabled = createShiftProtocol({ enabled: true, actors });
    propose(enabled);
    assert.equal(JSON.stringify(p), before); // Protocol holds no Person references or RNG.
    assert.equal(continuation(hf, p), continuation(base, control));
  }
});
