/** Bounded fine-driver profile. No coarse stepping or claim of simulation equivalence. */
import { createHash } from 'node:crypto';
import { type HeapProfiler, Session } from 'node:inspector';
import { performance } from 'node:perf_hooks';
import { synchronizeCommunity } from '../src/sim/catch-up.ts';
import { createCommunity, stepCommunity } from '../src/sim/sim.ts';
import { controlPerson, controlWorld, eventPolicy } from './event-catch-up-control.ts';

function fixture(count: number) {
  return createCommunity(
    Array.from({ length: count }, (_, i) => controlPerson(`p${i.toString().padStart(4, '0')}`)),
  );
}
function run(c: ReturnType<typeof fixture>, events: boolean) {
  let logged = 0;
  const start = performance.now();
  for (let frame = 1; frame <= 120; frame++) {
    logged += stepCommunity(
      c,
      controlWorld,
      frame / 4,
      events ? eventPolicy : { deathHandling: 'community' },
    ).length;
  }
  if (events) logged += synchronizeCommunity(c, controlWorld, 30, eventPolicy).length;
  const ms = performance.now() - start;
  return {
    ms,
    logged,
    people: c.people.length,
    finalMinute: 30,
  };
}
const session = new Session();
session.connect();
function post(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) =>
    session.post(method, params, (error, result) => (error ? reject(error) : resolve(result))),
  );
}
const results = [];
for (const count of [32, 128]) {
  run(fixture(count), false);
  run(fixture(count), true);
  for (const events of [false, true, true, false]) {
    const c = fixture(count);
    await post('HeapProfiler.startSampling', {
      samplingInterval: 16384,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
    const result = run(c, events);
    const { profile } = (await post('HeapProfiler.stopSampling')) as HeapProfiler.StopSamplingReturnType;
    const allocations = new Map<string, number>();
    const visit = (node: HeapProfiler.SamplingHeapProfileNode) => {
      const f = node.callFrame;
      if (node.selfSize && f.url.includes('/packages/human/')) {
        const key = `${f.functionName || '<anonymous>'}:${f.url.split('/packages/human/')[1]}:${f.lineNumber + 1}`;
        allocations.set(key, (allocations.get(key) ?? 0) + node.selfSize);
      }
      for (const child of node.children) visit(child);
    };
    visit(profile.head);
    results.push({
      count,
      mode: events ? 'events' : 'eager',
      ...result,
      sha256: createHash('sha256').update(JSON.stringify(c)).digest('hex'),
      sampledBytes: [...allocations.values()].reduce((a, b) => a + b, 0),
      topAllocations: [...allocations].sort((a, b) => b[1] - a[1]).slice(0, 8),
    });
  }
}
session.disconnect();
console.log(
  JSON.stringify(
    {
      workload:
        'fine idle people, 120 quarter-minute calls, 30 minutes; empty offers/percepts; final explicit barrier',
      allocationMethod:
        'V8 sampled allocations including collected objects, 16KiB interval; estimates, not exact bytes; fixture creation and result hashing excluded; timings include sampling overhead',
      results,
    },
    null,
    2,
  ),
);
