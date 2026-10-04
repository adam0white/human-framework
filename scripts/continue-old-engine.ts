/**
 * Regenerate the `continued` digests in packages/human/test/fixtures/engine-*.json from the engine that wrote them.
 *
 *   git archive -o /tmp/old.tar <commit> packages/human/src && mkdir /tmp/old && tar -xf /tmp/old.tar -C /tmp/old
 *   node scripts/continue-old-engine.ts /tmp/old/packages/human/src packages/human/test/fixtures/engine-1.5.0.json
 *
 * Engines before core/libm called the platform's Math.exp/log/cos and `**`, whose last bit differs between machines
 * (docs/findings.md, 2026-10-04). So by default the old source is first rewritten in place to call core/libm, which
 * makes its continuation the same on every machine; pass `--native` to skip that and reproduce the original digest
 * (the fixture's `continuedNativeMathDarwinArm64`, on macOS arm64 only). The steps match `continueRun` in
 * packages/human/test/migrate.test.ts.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const native = args.includes('--native');
const [srcDir, fixturePath] = args.filter((a) => a !== '--native').map((a) => resolve(a));
if (!srcDir || !fixturePath)
  throw new Error('usage: continue-old-engine.ts <old src dir> <fixture.json> [--native]');

// Every platform-transcendental expression the 1.4.0 and 1.5.0 sources contain, rewritten as the current source has it.
const rewrites: [RegExp, string][] = [
  [/Math\.exp\(/g, 'dexp('],
  [/Math\.log\(/g, 'dlog('],
  [/Math\.cos\(/g, 'dcos('],
  [/0\.5 \*\* \(dt \/ halfLife\)/g, 'dpow(0.5, dt / halfLife)'],
  [/10 \*\* places/g, 'dpow(10, places)'],
  [/deficit \*\* steepness/g, 'dpow(deficit, steepness)'],
  [/\(1 - l\) \*\* 2/g, 'dpow(1 - l, 2)'],
  [
    /2 \*\* \(\(a - params\.gompertzRefAge\) \/ params\.gompertzDoublingYears\)/g,
    'dpow(2, (a - params.gompertzRefAge) / params.gompertzDoublingYears)',
  ],
  [/dexp\(-\(\(\(a - 17\) \/ 4\.5\) \*\* 2\)\)/g, 'dexp(-dpow((a - 17) / 4.5, 2))'],
  [
    /2 \*\* \(\(age - condition\.refAge\) \/ condition\.doublingYears\)/g,
    'dpow(2, (age - condition.refAge) / condition.doublingYears)',
  ],
  [
    /clamp01\(\(trust - d\.trustFloor\) \/ \(1 - d\.trustFloor\)\) \*\* d\.trustExponent/g,
    'dpow(clamp01((trust - d.trustFloor) / (1 - d.trustFloor)), d.trustExponent)',
  ],
  [/0\.5 \*\* \(dt \/ WILL_DEFAULTS\.adviceHalfLife\)/g, 'dpow(0.5, dt / WILL_DEFAULTS.adviceHalfLife)'],
  [/d\.decayPerDay \*\* neglected/g, 'dpow(d.decayPerDay, neglected)'],
];
const banned =
  /Math\.(exp|expm1|log|log2|log10|log1p|pow|sin|cos|tan|atan2?|sinh|cosh|tanh|cbrt|hypot)\(|\*\*/;

if (!native) {
  const libm = join(srcDir, 'core/libm.ts');
  copyFileSync(new URL('../packages/human/src/core/libm.ts', import.meta.url), libm);
  for (const rel of readdirSync(srcDir, { recursive: true, encoding: 'utf8' })) {
    if (!rel.endsWith('.ts') || rel === 'core/libm.ts') continue;
    const file = join(srcDir, rel);
    const before = readFileSync(file, 'utf8');
    let src = before;
    for (const [re, to] of rewrites) src = src.replace(re, to);
    if (src !== before) {
      const spec = relative(dirname(file), libm);
      src = `import { dcos, dexp, dlog, dpow } from '${spec.startsWith('.') ? spec : `./${spec}`}';\n${src}`;
      writeFileSync(file, src);
    }
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    if (banned.test(code))
      throw new Error(`${rel}: platform math left after rewriting; add a rewrite for it`);
  }
}

const H = await import(pathToFileURL(join(srcDir, 'index.ts')).href);
const fx = JSON.parse(readFileSync(fixturePath, 'utf8'));
const rt = (x: unknown) => JSON.parse(JSON.stringify(x));
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const strip = (people: unknown[]) =>
  rt(people.map(H.snapshot)).map((j: Record<string, unknown>) => {
    const { engine: _engine, ...rest } = j;
    return rest;
  });
const pray = { halil: { voiceId: 'you', action: 'pray', strength: 0.6 } };
for (const kind of ['village', 'town'] as const) {
  const run = fx[kind];
  if (!run) continue;
  const saved = rt(run.saved);
  const people = saved.people.map((j: unknown) => H.restore(j));
  const world =
    kind === 'village'
      ? H.createVillage(people, { seed: 0, state: saved.state })
      : H.createTown(people, { seed: 0, state: saved.state });
  const c = H.createCommunity(people, saved.c);
  H.stepCommunity(
    c,
    world,
    run.start + run.endAt * H.MINUTES_PER_DAY,
    kind === 'town' ? { suggestions: pray } : {},
  );
  console.log(`${kind}: ${hash({ people: strip(c.people), state: rt(world.state) })}`);
}
