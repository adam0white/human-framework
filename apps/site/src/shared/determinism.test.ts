/**
 * Playtest files must replay to the same hash on any machine and in any browser. The platform's transcendental
 * functions (`Math.exp`, `Math.log`, `Math.cos`, non-integer `**`, …) differ in the last bit between engines and
 * CPUs, so game-sim code (everything that feeds sim state) uses the framework's `dexp`/`dlog`/`dcos`/`dpow`
 * instead. UI-only rendering code may stay native. The framework's own source is scanned by
 * packages/human/test/libm.test.ts.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const SIM_DIRS = ['../colony/sim/', '../voice/sim/'];
const BANNED =
  /Math\.(exp|expm1|log|log2|log10|log1p|pow|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|cbrt|hypot)\(|\*\*/;

test('game sims call no platform transcendental', () => {
  const offenders: string[] = [];
  for (const dir of SIM_DIRS) {
    const root = new URL(dir, import.meta.url);
    for (const rel of readdirSync(root, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(rel) || /\.test\.tsx?$/.test(rel)) continue;
      readFileSync(new URL(rel, root), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
        .split('\n')
        .forEach((line, i) => {
          if (BANNED.test(line.replace(/\/\/.*$/, '')))
            offenders.push(`${dir}${rel}:${i + 1}: ${line.trim()}`);
        });
    }
  }
  expect(offenders).toEqual([]);
});
