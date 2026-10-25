/** Run: node packages/human/examples/h3-starter/control.ts */
import { createHash } from 'node:crypto';
import { replay, Starter } from './starter.ts';
export function control(seed: number) {
  const inputs = [15, 30, 45, 60].map((until) => ({ until, workAvailable: true }));
  const full = replay(seed, inputs).save();
  const first = replay(seed, inputs.slice(0, 1)).save();
  const resumed = new Starter(seed, JSON.parse(JSON.stringify(first)));
  for (const input of inputs.slice(1)) resumed.apply(input);
  const noWork = replay(
    seed,
    inputs.map((i) => ({ ...i, workAvailable: false })),
  ).save();
  const result = {
    seed,
    stateHash: createHash('sha256').update(JSON.stringify(full)).digest('hex'),
    repairs: full.repairs,
    noWorkRepairs: noWork.repairs,
    restoredExact: JSON.stringify(full) === JSON.stringify(resumed.save()),
    replayExact: JSON.stringify(full) === JSON.stringify(replay(seed, full.inputs).save()),
  };
  const legacyHash: Record<number, string> = {
    7: '05cc76932b558e67fb175c3ba5c7e4618eb3336f2171f28b488935da483987bc',
    42: '8fbf4cb72e3ab291f657d97e24d5c87c1796cae38e5735f23da6e5c457f2579b',
  };
  if (result.stateHash !== legacyHash[seed]) throw new Error('Starter state differs from the HF2.22 base');
  if (result.repairs !== 4 || result.noWorkRepairs !== 0 || !result.restoredExact || !result.replayExact)
    throw new Error(JSON.stringify(result));
  return result;
}
if (process.argv[1]?.endsWith('/control.ts')) console.log(JSON.stringify([7, 42].map(control), null, 2));
