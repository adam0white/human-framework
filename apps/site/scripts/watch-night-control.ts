/**
 * Headless night-act control. Uses the public inputs and Keeper's frame, with no state edits. It asks for help,
 * relief and rest once each, then lets the replies resolve. Run: node apps/site/scripts/watch-night-control.ts
 * Add fixture=<path> to pin the resulting scenario-11 export; the replay test checks that export's rule hash.
 */
import { writeFileSync } from 'node:fs';
import { Harness } from './play-watch.ts';

const { ruleHash, replay } = await import('../src/watch/sim/run.ts');
const { planInputs } = await import('../test/watch/plans.ts');
const wanted = ['help', 'relieve', 'down'] as const;
const h = Harness.fresh(7);
const run = h.run;
const used = new Set<string>();
run.input({ k: 'start' });
let resolved = 0;
for (let guard = 0; guard < 50_000; guard++) {
  const s = run.state;
  if (s.phase === 'dusk') {
    for (const input of planInputs(s, 'matched', true)) run.input(input);
    run.input({ k: 'begin' });
  } else if (s.phase === 'dawn') run.input({ k: 'toDusk' });
  else if (s.phase === 'night') {
    const f = h.frame();
    const kind = wanted.find((k) => !used.has(k));
    const act = f.watchers.flatMap((w) => w.acts).find((a) => a.input.k === kind && a.available);
    if (act && run.input(act.input)) {
      used.add(act.input.k);
      console.log(`${s.minute}: ${act.label} — ${act.read}`);
    }
    // Walk the light across the wall so a watcher out of voice can become reachable. No instant relocation.
    if (s.minute % 24 === 0) {
      const sections = ['west', 'gate', 'mill', 'east'] as const;
      run.input({ k: 'lantern', section: sections[Math.floor(s.minute / 24) % 4] ?? 'gate' });
    }
    run.step();
    if (used.size === wanted.length && ++resolved >= 30) break;
  } else throw new Error(`control ended before every act: ${s.phase}; used ${[...used].join(', ')}`);
}
if (used.size !== wanted.length) throw new Error(`missing acts: ${wanted.filter((k) => !used.has(k))}`);
const exp = run.export();
if (ruleHash(replay(exp)) !== exp.end.ruleHash) throw new Error('control replay diverged');
console.log(
  `scenario ${exp.scenario}; seed ${exp.seed}; minute ${exp.endMinute}; ruleHash ${exp.end.ruleHash}`,
);
for (const a of run.state.alerts.filter((a) => a.kind === 'person').slice(-8)) console.log(a.text);
const fixture = process.argv.find((a) => a.startsWith('fixture='))?.slice(8);
if (fixture) writeFileSync(fixture, `${JSON.stringify(exp, null, 2)}\n`);
