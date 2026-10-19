/**
 * The HF personas (packages/playtester) play Twice at the Well; the run prints where each got bored, frustrated,
 * rewarded or stopped, and how the Human village did.
 * Run from the repository root (after `npm run build -w packages/human`):
 *
 *   node apps/site/scripts/hf-colony-session.ts [seeds=2] [json=1] [rules=3]
 *
 * Seed n plays the game seed 20261003 + n - 1 (seed 1 is the shipped run). `rules=3` plays the @3 rules as a
 * baseline. Read-only against packages/playtester.
 */
import { PERSONAS, type Persona, playSession, readSession } from '../../../packages/playtester/src/index.ts';
import { DEFAULT_SEED } from '../src/colony/sim/game.ts';
import { ColonyAdapter } from './hf-colony-adapter.ts';

const seeds = Number(process.argv.find((a) => a.startsWith('seeds='))?.slice(6) ?? 2);
const json = process.argv.includes('json=1');
const rules = process.argv.includes('rules=3') ? 3 : 4;
const rows: string[] = [
  '| persona | seed | ended | play min | at | engagement | orders | Human goals | longest lull | looked away |',
  '|---|---|---|---|---|---|---|---|---|---|',
];
for (const persona of Object.values(PERSONAS) as Persona[])
  for (let seed = 1; seed <= seeds; seed++) {
    const game = new ColonyAdapter(DEFAULT_SEED + seed - 1, rules);
    const trace = playSession(game, persona, seed);
    const r = readSession(trace);
    if (json) {
      console.log(JSON.stringify(r));
      continue;
    }
    const g = game.pb.game;
    const goals = (g?.frame().goals ?? []).map((x) => `${x.id} ${x.human.status}`).join(', ');
    console.log(
      `\n${persona.id} seed ${seed}: ${r.ended.reason} after ${r.minutes} min at ${r.ended.clock} (${r.ended.why})`,
    );
    console.log(`  orders ${game.orders}; Human: ${goals}; engagement ${r.meanEngagement}`);
    console.log(`  time ${JSON.stringify(r.choices)}`);
    console.log(
      `  longest lull ${r.longestLull.seconds}s from ${r.longestLull.from} (${r.longestLull.phase}); looked away ${r.lookedAway}x`,
    );
    for (const m of trace.moments.filter((x) => x.kind !== 'rewarded').slice(0, 8))
      console.log(
        `  ${Math.floor(m.t / 60)}:${String(m.t % 60).padStart(2, '0')} ${m.clock} ${m.kind}: ${m.text}`,
      );
    console.log(`  rewarded ${r.rewarded.length}x, first: ${r.rewarded.slice(0, 3).join(' | ')}`);
    rows.push(
      `| ${persona.id} | ${seed} | ${r.ended.reason} | ${r.minutes} | ${r.ended.clock} | ${r.meanEngagement} | ${game.orders} | ${goals} | ${r.longestLull.seconds}s from ${r.longestLull.from} | ${r.lookedAway} |`,
    );
  }
if (!json) console.log(`\n${rows.join('\n')}`);
