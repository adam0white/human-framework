/** Post-outcome admission audit. Analytic bounds, not additional policy samples. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PARAMETERS} from '../../src/human/v0.1.1.js';
import {newShift} from '../../web/across-session.js';
import {exportGame} from '../../src/games/across-cut-player.js';
const source='2ebdb8841215a26f69da1c394ab438b7a1f4d15d';
const paths=['web/across-session.js','src/games/across-cut-player.js','src/games/across-cut.js','src/games/across-cut-receiver.js','src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js'];
const identities=paths.map(path=>{const bytes=readFileSync(path);assert.deepEqual(bytes,execFileSync('git',['show',`${source}:${path}`]));return {path,sha256:createHash('sha256').update(bytes).digest('hex')};});
const text=readFileSync('src/games/across-cut.js','utf8'),literal=text.match(/const RATES=\{([^}]+)\};/)[1];
const rates=Object.fromEntries(literal.split(',').map(field=>{const [name,value]=field.split(':');assert.match(value,/^(?:\d+)?(?:\.\d+)?$/);return [name,Number(value)];}));
const setups=[0,1,2,3].map(draw=>exportGame(newShift(()=>draw)).setup);
for(const setup of setups){assert.deepEqual(setup.bodies.keeper,{fatigue:.15,hunger:.15});assert.equal(setup.valveMinutes,6);}
const horizon=30,maximumEffortPerMinute=Math.max(...Object.values(rates));
const fatigue=.15+horizon*(PARAMETERS.fatiguePerMinute+maximumEffortPerMinute),hunger=.15+horizon*PARAMETERS.hungerPerMinute;
const upper=x=>Math.min(1,Math.round(x*20)/20+.025),upperFatigue=upper(fatigue),upperHunger=upper(hunger);
const costs={inspect:{minutes:1,effort:rates.inspect},repair:{minutes:6,effort:rates.repair*6},release:{minutes:2,effort:rates.release*2},travel:{minutes:6,effort:rates.travel*6},transmit:{minutes:1,effort:rates.transmit},meal:{minutes:2,effort:0}};
const intervalBounds=Object.fromEntries(Object.entries(costs).map(([task,{minutes,effort}])=>[task,{minutes,fatigue:upperFatigue+minutes*PARAMETERS.fatiguePerMinute+effort,hunger:upperHunger+minutes*PARAMETERS.hungerPerMinute}]));
for(const bound of Object.values(intervalBounds))assert(bound.fatigue<=1&&bound.hunger<=1);
const result={scope:'Post-outcome source-derived admission audit. These are loose analytic bounds over ordinary fresh setups, not newly executed policy histories or a human physiological claim.',source,identities,setups,rates,horizon,maximumEffortPerMinute,maximumActual:{fatigue,hunger},maximumUpperEstimate:{fatigue:upperFatigue,hunger:upperHunger},intervalBounds,assumptions:['At most30 paid minutes; refusals and other zero-time controls change no body.','Use greatest authored effort every minute, even though that loose schedule need not be feasible. Recovery and meals can only reduce these bounds.','Keeper ordinary work is at most six repair/walking minutes, two release/meal minutes or one inspection/report minute. It has no cart role or action that lengthens its initial six-minute valve repair.','Supported high-body custom/imported setups are outside the ordinary browser constructor bound.'],conclusion:'No ordinary fresh-shift work or report offer can fail the conservative capacity check. The private candidate solves supported edge-state offer delays but has no current normal-play activation.'};
const out=process.argv[2];assert(out,'Explicit fresh output path required.');writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log('Ordinary fresh-shift conservative capacity always fits the source-derived bounds.');
