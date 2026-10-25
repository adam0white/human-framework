/**
 * Headless host API control. Run: node packages/human/examples/host-api-control.ts
 * Host magnitudes are premises and exceed the history-folding threshold in this control.
 * Direct legacy writes and helpers must produce identical people for those magnitudes,
 * before and after ticking. Omitted setup and explicit empty setup must continue exactly alike.
 */
import assert from 'node:assert/strict';
import { addTiredness } from '../src/body/index.ts';
import { createPerson, tick } from '../src/person.ts';
import type { PersonSpec } from '../src/types.ts';
import { gestureVoiceTrust, WILL_DEFAULTS } from '../src/will/index.ts';

export const hostApiSpec: PersonSpec = {
  id: 'host-control',
  name: 'Host control',
  seed: 50,
  bornAt: -30 * 365 * 1440,
  sex: 'female',
  voices: [{ voiceId: 'host', trust: 0.5 }],
};

export function runHostApiControl(): void {
  const direct = createPerson(hostApiSpec);
  const helper = createPerson(hostApiSpec);
  for (let i = 0; i < 8; i++) {
    const amount = i % 2 === 0 ? 0.12 : -0.08;
    const v = direct.will.voices[0];
    assert(v);
    const before = v.trust;
    v.trust = Math.max(0, Math.min(1, before + amount));
    v.history.push({ at: direct.now, delta: v.trust - before, reason: 'host-care' });
    if (v.history.length > WILL_DEFAULTS.maxVoiceHistory) v.history.shift();
    direct.body.sleepPressure = Math.min(1, direct.body.sleepPressure + 0.03);
    direct.body.exertion = Math.min(1, direct.body.exertion + 0.04);
    gestureVoiceTrust(helper, 'host', amount, { reason: 'host-care' });
    addTiredness(helper, { sleepPressure: 0.03, exertion: 0.04 });
    assert.deepEqual(helper, direct);
    tick(direct, direct.now + 30);
    tick(helper, helper.now + 30);
    assert.deepEqual(helper, direct);
  }
  const omitted = createPerson(hostApiSpec);
  const empty = createPerson({ ...hostApiSpec, habits: [], expectations: [] });
  for (const now of [0, 60, 360, 1440]) {
    tick(omitted, now);
    tick(empty, now);
    assert.deepEqual(omitted, empty);
  }
}

if (process.argv[1]?.endsWith('/host-api-control.ts')) {
  runHostApiControl();
  console.log('Host API control: direct/helper and omitted/empty continuations match exactly.');
}
