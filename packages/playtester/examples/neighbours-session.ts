/**
 * HF personas play Neighbours (seed 42, 208 people, three in-game days), and the run prints where each got bored,
 * frustrated, rewarded or stopped, with in-game times. Run from packages/playtester (after
 * `npm run build -w packages/human`):
 *   NEIGHBOURS_DIR=~/code/concordia/neighbours node examples/neighbours-session.ts [seeds=1] [days=3] [persona=id] [json=1] [screen=1]
 * `seeds` is the persona's own session seed (the town stays seed 42); `json=1` prints the full readings; `screen=1`
 * prints the last screen text each persona saw. The adapter imports only the game's `src/core/index.ts` host,
 * which Node runs directly. Nothing in the game is changed.
 */
import { PERSONAS, type Persona, playSession, readSession } from '../src/index.ts';
import { NeighboursAdapter } from './neighbours-adapter.ts';

const arg = (k: string) => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1);
const seeds = Number(arg('seeds') ?? 1);
const days = Number(arg('days') ?? 3);
const only = arg('persona');
const json = process.argv.includes('json=1');
const showScreen = process.argv.includes('screen=1');
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t) % 60).padStart(2, '0')}`;

const totals = {
  sessions: 0,
  quit: 0,
  agenda: 0,
  horizon: 0,
  bored: 0,
  frustrated: 0,
  rewarded: 0,
  refused: 0,
  inputs: 0,
};
for (const persona of Object.values(PERSONAS) as Persona[]) {
  if (only && persona.id !== only) continue;
  for (let seed = 1; seed <= seeds; seed++) {
    const started = Date.now();
    const game = new NeighboursAdapter({ seed: 42, population: 208, days });
    const trace = playSession(game, persona, seed);
    const r = readSession(trace);
    if (json) {
      console.log(
        JSON.stringify({ ...r, final: trace.final, inputs: game.inputs.length, state: game.state }),
      );
      continue;
    }
    const refused = game.inputs.filter((x) => !x.ok);
    const kinds = new Map<string, number>();
    for (const b of trace.beats) if (b.choice !== 'wait') kinds.set(b.kind, (kinds.get(b.kind) ?? 0) + 1);
    const ended =
      trace.ended.reason === 'game-over'
        ? `reached the ${days}-day run horizon (the game has no ending)`
        : `${trace.ended.reason} (${trace.ended.why})`;
    console.log(`\n${persona.id} seed ${seed}: ${ended} after ${r.minutes} real min at ${r.ended.clock}`);
    const s = game.state;
    console.log(
      `  town: hall tally ${s.hallRepairs} of 12${s.hallOpen ? ', hall open' : ''}; goals done: ${s.goalsDone.join(', ') || 'none'}; requests ${s.requests}; promises ${s.pledges.join(', ') || 'none'}`,
    );
    console.log(
      `  inputs ${game.inputs.length} (${refused.length} refused by the game); beats by kind: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`,
    );
    console.log(
      `  engagement ${r.meanEngagement}; time ${JSON.stringify(r.choices)}; longest lull ${r.longestLull.seconds}s from ${r.longestLull.from} (${r.longestLull.phase}); looked away ${r.lookedAway}x`,
    );
    for (const m of trace.moments.filter((x) => x.kind !== 'rewarded').slice(0, 10))
      console.log(`  ${mmss(m.t)} ${m.clock} ${m.kind}: ${m.text}`);
    console.log(
      `  rewarded ${r.rewarded.length}x, first: ${r.rewarded
        .slice(0, 3)
        .map((x) => x.slice(0, 140))
        .join(' | ')}`,
    );
    for (const x of refused.slice(0, 4)) console.log(`  refused ${x.id} at ${x.at}: ${x.message}`);
    if (trace.final.loops.length) console.log(`  left open: ${trace.final.loops.slice(0, 3).join('; ')}`);
    if (showScreen) for (const l of game.screen()) console.log(`  | ${l}`);
    console.log(`  (${((Date.now() - started) / 1000).toFixed(1)} s wall)`);
    totals.sessions++;
    if (trace.ended.reason === 'quit') totals.quit++;
    else if (trace.ended.reason === 'agenda') totals.agenda++;
    else totals.horizon++;
    totals.bored += trace.moments.filter((m) => m.kind === 'bored').length;
    totals.frustrated += trace.moments.filter((m) => m.kind === 'frustrated').length;
    totals.rewarded += r.rewarded.length;
    totals.refused += refused.length;
    totals.inputs += game.inputs.length;
  }
}
if (!json)
  console.log(
    `\ntotals: ${totals.sessions} sessions; stopped by quitting ${totals.quit}, by their own agenda ${totals.agenda}, ran to the horizon ${totals.horizon}; bored moments ${totals.bored}, frustrated ${totals.frustrated}, rewarded ${totals.rewarded}; inputs ${totals.inputs}, refused by the game ${totals.refused}`,
  );
