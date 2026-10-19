/**
 * Four HF personas play The Pass, and the run prints where each got bored, frustrated, rewarded or stopped.
 * Run (after `npm run build -w packages/human`): PASS_DIR=~/code/pass node packages/playtester/examples/pass-session.ts [seeds=2]
 * Add `json=1` to print the full readings.
 */
import { PERSONAS, type Persona, playSession, readSession } from '../src/index.ts';
import { PassAdapter } from './pass-adapter.ts';

const seeds = Number(process.argv.find((a) => a.startsWith('seeds='))?.slice(6) ?? 2);
const json = process.argv.includes('json=1');
for (const persona of Object.values(PERSONAS) as Persona[])
  for (let seed = 1; seed <= seeds; seed++) {
    const game = new PassAdapter(1000 + seed);
    const trace = playSession(game, persona, seed);
    const r = readSession(trace);
    if (json) {
      console.log(JSON.stringify(r));
      continue;
    }
    const nights = game.s.reports.map((x) => `${x.served}/${x.served + x.walked}`).join(' ');
    console.log(
      `\n${persona.id} seed ${seed}: ${r.ended.reason} after ${r.minutes} min at ${r.ended.clock} (${r.ended.why})`,
    );
    console.log(
      `  nights ${nights || '-'}, till ${game.s.till}; engagement ${r.meanEngagement}; time ${JSON.stringify(r.choices)}`,
    );
    console.log(
      `  longest lull ${r.longestLull.seconds}s from ${r.longestLull.from} (${r.longestLull.phase}); looked away ${r.lookedAway}x`,
    );
    for (const m of trace.moments.filter((x) => x.kind !== 'rewarded').slice(0, 8))
      console.log(
        `  ${Math.floor(m.t / 60)}:${String(m.t % 60).padStart(2, '0')} ${m.clock} ${m.kind}: ${m.text}`,
      );
    console.log(`  rewarded ${r.rewarded.length}x, first: ${r.rewarded.slice(0, 3).join(' | ')}`);
  }
