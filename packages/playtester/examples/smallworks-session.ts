/**
 * HF personas run the Small Works repair workshop, and the run prints where each got bored, frustrated, rewarded
 * or stopped. Run from the repository root (after `npm run build -w packages/human`):
 *   SMALLWORKS_DIR=~/code/repair-game node packages/playtester/examples/smallworks-session.ts [seeds=2] [json=1]
 * `json=1` prints the full readings. Small Works' TypeScript imports its own modules without extensions, so this
 * script first registers an in-thread resolve hook (`module.registerHooks`) that retries such a relative specifier with `.ts` (Node 24+ strips the
 * types), then imports the adapter. Nothing in the game is changed.
 */
import { registerHooks } from 'node:module';
import { PERSONAS, type Persona, playSession, readSession } from '../src/index.ts';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier))
        return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const { SmallWorksAdapter } = await import('./smallworks-adapter.ts');

const seeds = Number(process.argv.find((a) => a.startsWith('seeds='))?.slice(6) ?? 2);
const json = process.argv.includes('json=1');
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
for (const persona of Object.values(PERSONAS) as Persona[])
  for (let seed = 1; seed <= seeds; seed++) {
    const game = new SmallWorksAdapter(416 + seed);
    const trace = playSession(game, persona, seed);
    const r = readSession(trace);
    if (json) {
      console.log(JSON.stringify({ ...r, final: trace.final }));
      continue;
    }
    const k = game.tally();
    const refused = game.inputs.filter((x) => !x.ok).length;
    console.log(
      `\n${persona.id} seed ${seed}: ${r.ended.reason} after ${r.minutes} min at ${r.ended.clock} (${r.ended.why})`,
    );
    console.log(
      `  reached day ${game.s.day}${game.s.weekReviewed ? ' (week account seen)' : ''}; returns ${k.paid} (${k.late} late), unfinished ${k.unfinished}, unchecked ${k.unchecked}, still open ${k.open}; cash £${game.s.cash}; inputs ${game.inputs.length} (${refused} refused)`,
    );
    console.log(
      `  engagement ${r.meanEngagement}; time ${JSON.stringify(r.choices)}; longest lull ${r.longestLull.seconds}s from ${r.longestLull.from} (${r.longestLull.phase}); looked away ${r.lookedAway}x`,
    );
    for (const m of trace.moments.filter((x) => x.kind !== 'rewarded').slice(0, 8))
      console.log(`  ${mmss(m.t)} ${m.clock} ${m.kind}: ${m.text}`);
    console.log(`  rewarded ${r.rewarded.length}x, first: ${r.rewarded.slice(0, 3).join(' | ')}`);
    if (trace.final.loops.length) console.log(`  left open: ${trace.final.loops.slice(0, 3).join('; ')}`);
  }
