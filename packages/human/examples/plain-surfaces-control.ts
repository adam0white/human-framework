/**
 * SCOPE: headless read-only narration control. The same authored follow-on span is read in legacy and
 * plain English. It verifies that narration changes no forecast data or seeded person state. Run with Node.
 */
import assert from 'node:assert/strict';
import { bodyForecast, createPerson, snapshot } from '../src/index.ts';
import { commitmentLabel, reasonLine } from '../src/presentation.ts';
import type { Affordance } from '../src/types.ts';

export function runPlainSurfacesControl() {
  const p = createPerson({ id: 'p', name: 'Ada', seed: 7, bornAt: -9000000, sex: 'female', now: 600 });
  const aff: Affordance = {
    id: 'walk',
    action: 'walk',
    label: 'walk up the hill',
    duration: 60,
    effort: 0.8,
    advertises: {},
    followedBy: [{ label: 'the return', duration: 60, effort: 0.8 }],
  };
  const before = snapshot(p);
  const legacy = bodyForecast(p, aff);
  assert.deepEqual(snapshot(p), before);
  p.lexicon = { plainEnglish: true };
  const pinned = snapshot(p);
  const plain = bodyForecast(p, aff);
  assert.deepEqual(snapshot(p), pinned);
  assert.deepEqual(plain.spans, legacy.spans);
  assert.notEqual(plain.line, legacy.line);
  assert.equal(commitmentLabel({ kind: 'worship', label: 'Fajr' }, p.lexicon), 'the dawn prayer');
  assert.equal(reasonLine('skill:walking', p.lexicon), 'I do not have enough skill for that.');
  return { legacy: legacy.line, plain: plain.line, unchangedSpans: true, unchangedState: true };
}

if (import.meta.main) console.log(JSON.stringify(runPlainSurfacesControl(), null, 2));
