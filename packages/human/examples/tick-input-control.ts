/**
 * Headless control: real bench village with conflicting host requests, delayed
 * delivery barriers, an unsorted behavioral control and snapshot/restore.
 * Separately pins old no-helper calls against base 14b7d6c, including every RNG.
 * Run: node packages/human/examples/tick-input-control.ts
 */
import { createHash } from 'node:crypto';
import * as hf from '../src/index.ts';
import { canonicalTickInputs, type TickInput } from '../src/tick-input.ts';

const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
function make() {
  const ids = Array.from({ length: 20 }, (_, i) => `p${String(i).padStart(2, '0')}`);
  const p = ids.map((id, i) =>
    hf.createPerson(
      hf.villagerSpec(id, id, 100 + i, {
        devout: i % 2 === 0,
        others: ids,
        now: 420,
      }),
    ),
  );
  return { c: hf.createCommunity(p), w: hf.createVillage(p, { seed: 7, foodStock: 200 }) };
}
function save(h: ReturnType<typeof make>) {
  return { p: h.c.people.map(hf.snapshot), c: hf.communityState(h.c), w: structuredClone(h.w.state) };
}
function load(s: ReturnType<typeof save>) {
  const p = s.p.map(hf.restore);
  return { c: hf.createCommunity(p, s.c), w: hf.createVillage(p, { seed: 0, state: structuredClone(s.w) }) };
}
const digest = (h: ReturnType<typeof make>) => hash(save(h));
type Input = TickInput<hf.Suggestion>;
function options(inputs: readonly Input[]): hf.StepOptions {
  return inputs.length ? { suggestions: { p00: inputs.map((input) => input.payload) } } : {};
}
let a = make(),
  b = make();
const uninterrupted = make(),
  unsorted = make(),
  legacy = make();
let batches = 0,
  withheldSlots = 0,
  selectedRequestDifferences = 0,
  restoreExact = true;
const mismatches: number[] = [];
const behavioralDifferences: {
  tick: number;
  person: string;
  canonical: string | undefined;
  unsorted: string | undefined;
}[] = [];
for (let tick = 1; tick <= 1440; tick++) {
  const t = 420 + tick;
  const inputs: Input[] =
    tick % 120 === 60
      ? [
          {
            tick,
            sender: 'B',
            sequence: 0,
            payload: { voiceId: 'player', affordanceId: 'help:p01', strength: 1, since: t },
          },
          {
            tick,
            sender: 'a',
            sequence: 0,
            payload: { voiceId: 'player', affordanceId: 'rest', strength: 1, since: t },
          },
        ]
      : [];
  const immediate = canonicalTickInputs(tick, inputs, inputs);
  if (!immediate) throw new Error('Immediate barrier incomplete');
  let delayed: Input[] = [];
  const delivered: Input[] = [];
  if (inputs.length) {
    batches++;
    const beforeDelivery = digest(b);
    for (let slot = 0; slot <= 7; slot++) {
      if (slot === 4 && inputs[1]) delivered.push(inputs[1]);
      if (slot === 7 && inputs[0]) delivered.push(inputs[0]);
      const admitted = canonicalTickInputs(tick, delivered, inputs);
      if (slot < 7) {
        if (admitted !== undefined || digest(b) !== beforeDelivery) throw new Error('Barrier advanced early');
        withheldSlots++;
      } else {
        if (!admitted) throw new Error('Complete barrier withheld');
        delayed = admitted;
      }
    }
    if (immediate[0]?.payload.affordanceId !== delivered[0]?.payload.affordanceId)
      selectedRequestDifferences++;
  }
  const canonicalEvents = hf.stepCommunity(a.c, a.w, t, options(immediate));
  hf.stepCommunity(b.c, b.w, t, options(delayed));
  hf.stepCommunity(uninterrupted.c, uninterrupted.w, t, options(immediate));
  const negativeEvents = hf.stepCommunity(unsorted.c, unsorted.w, t, options(delivered));
  // Exact old-call continuation is a separate no-helper, no-input trajectory.
  hf.stepCommunity(legacy.c, legacy.w, t);
  if (digest(a) !== digest(b) || digest(a) !== digest(uninterrupted)) mismatches.push(tick);
  for (const event of canonicalEvents.filter((event) => event.kind === 'decide')) {
    const negative = negativeEvents.find(
      (other) => other.kind === 'decide' && other.at === event.at && other.personId === event.personId,
    );
    if (negative && event.affordanceId !== negative.affordanceId) {
      behavioralDifferences.push({
        tick,
        person: event.personId,
        canonical: event.affordanceId,
        unsorted: negative.affordanceId,
      });
    }
  }
  if (tick === 720) {
    const sa = save(a),
      sb = save(b);
    a = load(JSON.parse(JSON.stringify(sa)));
    b = load(JSON.parse(JSON.stringify(sb)));
    restoreExact = hash(sa) === hash(save(a)) && hash(sb) === hash(save(b));
  }
}
// The HF2.22 baseline used engine2.21; full replay/restore checks above keep current stamps.
const legacyState = save(legacy);
const legacyHash = hash({
  ...legacyState,
  p: legacyState.p.map((p) => ({ ...p, engine: '2.21.0' })),
});
const legacyExact = legacyHash === '8d02c5e917be4584fab1ab0628b161ce08cba62b7dc9f60175d269060da084a2';
const pass =
  !mismatches.length &&
  restoreExact &&
  batches === 12 &&
  withheldSlots === 84 &&
  behavioralDifferences.length > 0 &&
  legacyExact;
console.log(
  JSON.stringify(
    {
      pass,
      ticks: 1440,
      batches,
      withheldSlots,
      selectedRequestDifferences,
      restoreExact,
      mismatches,
      behavioralDifferences,
      final: digest(a),
      legacyHash,
      legacyExact,
    },
    null,
    2,
  ),
);
if (!pass) throw new Error('Tick input control failed registered criterion');
