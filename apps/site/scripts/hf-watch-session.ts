/**
 * HF personas play The Night Watch through `hf-watch-adapter.ts`, and the run prints where each got bored,
 * frustrated, rewarded or stopped (a session is capped at 90 real minutes, the playtester's default).
 * Run from the repository root: node apps/site/scripts/hf-watch-session.ts [seeds=2] [json=1]
 * It imports the playtester and the framework from source; no build is needed.
 */
import { WatchAdapter } from './hf-watch-adapter.ts';

const { PERSONAS, playSession, readSession } = await import('../../../packages/playtester/src/index.ts');
type Persona = import('../../../packages/playtester/src/index.ts').Persona;

const seeds = Number(process.argv.find((a) => a.startsWith('seeds='))?.slice(6) ?? 2);
const json = process.argv.includes('json=1');
const rows: string[] = [];
for (const persona of Object.values(PERSONAS) as Persona[])
  for (let seed = 1; seed <= seeds; seed++) {
    const game = new WatchAdapter(seed);
    const trace = playSession(game, persona, seed);
    const r = readSession(trace);
    if (json) {
      console.log(JSON.stringify(r));
      continue;
    }
    const s = game.h.run.state;
    console.log(
      `\n${persona.id} seed ${seed}: ${r.ended.reason} after ${r.minutes} min at ${r.ended.clock} (${r.ended.why})`,
    );
    console.log(
      `  reached year ${s.year}, ${s.phase}; engagement ${r.meanEngagement}; time ${JSON.stringify(r.choices)}`,
    );
    console.log(
      `  longest lull ${r.longestLull.seconds}s from ${r.longestLull.from} (${r.longestLull.phase}); looked away ${r.lookedAway}x`,
    );
    for (const m of trace.moments.filter((x) => x.kind !== 'rewarded').slice(0, 8))
      console.log(
        `  ${Math.floor(m.t / 60)}:${String(m.t % 60).padStart(2, '0')} ${m.clock} ${m.kind}: ${m.text}`,
      );
    console.log(`  rewarded ${r.rewarded.length}x, first: ${r.rewarded.slice(0, 3).join(' | ')}`);
    rows.push(
      `| ${persona.id} | ${seed} | ${r.ended.reason} | ${r.minutes} | ${s.year} ${s.phase} | ${r.meanEngagement} | ${r.longestLull.seconds}s ${r.longestLull.phase} | ${r.lookedAway} |`,
    );
  }
if (!json) {
  console.log('\n| persona | seed | ended | min | reached | engagement | longest lull | looked away |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const row of rows) console.log(row);
}
