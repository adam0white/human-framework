/**
 * Four HF personas play The Day You Say Nothing; the run prints where each got bored, frustrated, rewarded or
 * stopped. Run from the repository root (after `npm run build -w packages/human`):
 *   node apps/site/scripts/hf-voice-session.ts [seeds=2] [json=1]
 * Game seeds are 7 (the shipped town), then 1001, 1002, ...
 */
import { PERSONAS, type Persona, playSession, readSession } from '../../../packages/playtester/src/index.ts';
import { VoiceAdapter } from './hf-voice-adapter.ts';

const seeds = Number(process.argv.find((a) => a.startsWith('seeds='))?.slice(6) ?? 2);
const json = process.argv.includes('json=1');
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
for (const persona of Object.values(PERSONAS) as Persona[])
  for (let seed = 1; seed <= seeds; seed++) {
    const town = seed === 1 ? 7 : 1000 + seed;
    const game = new VoiceAdapter(town);
    const trace = playSession(game, persona, seed);
    const r = readSession(trace);
    if (json) {
      console.log(JSON.stringify(r));
      continue;
    }
    const said = game.rec.log.filter((e) => !Array.isArray(e) && e.type === 'suggest').length;
    console.log(
      `\n${persona.id} town ${town}: ${r.ended.reason} after ${r.minutes} min at ${r.ended.clock} (${r.ended.why})`,
    );
    console.log(
      `  reached ${game.game.phase} ${game.game.frame().dayLabel}; words said ${said}; engagement ${r.meanEngagement}; time ${JSON.stringify(r.choices)}`,
    );
    console.log(
      `  longest lull ${r.longestLull.seconds}s from ${r.longestLull.from} (${r.longestLull.phase}); looked away ${r.lookedAway}x`,
    );
    for (const m of trace.moments.filter((x) => x.kind !== 'rewarded').slice(0, 8))
      console.log(`  ${mmss(m.t)} ${m.clock} ${m.kind}: ${m.text}`);
    console.log(`  rewarded ${r.rewarded.length}x, first: ${r.rewarded.slice(0, 3).join(' | ')}`);
  }
