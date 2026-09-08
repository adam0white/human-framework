/** Private one-rule host rival. All physical/lifecycle source bytes are retained. */
import {readFile} from 'node:fs/promises';
const anchor=" if(s.clock.now>=42&&s.clock.now<=45&&!refusal(s,'partner','cart'))";
export const INSERTION=" if(s.jobs.keeper?.task==='pump'&&s.work.pump>=6&&supply(s)&&s.jobs.keeper.endsAt<=57)return {task:null,reason:'I can see the keeper finishing the final pump section; I will check again when that work ends.',at:s.jobs.keeper.endsAt};\n";
export function transformVisiblePump(source){
 if(source.includes(INSERTION))throw Error('Visible-pump rule is already inserted.');
 if(source.split(anchor).length!==2)throw Error('Expected exactly one unchanged fallback anchor.');
 return source.replace(anchor,INSERTION+anchor);
}
export async function loadVisiblePump(){
 const source=await readFile(new URL('../../games/service-plan.js',import.meta.url),'utf8');
 const moduleSource=transformVisiblePump(source).replace("'../runtime/index.js'",JSON.stringify(new URL('../../runtime/index.js',import.meta.url).href));
 return import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
}
