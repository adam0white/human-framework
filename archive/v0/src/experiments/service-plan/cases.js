/** Preregistered prescribed commands. Selectors receive only a detached public view. */
const step=(at,command)=>({at,command});
const ask=(at,actor,task)=>step(at,{type:'request',actor,task});
const stop=(at,actor='keeper')=>step(at,{type:'interrupt',actor});
const terms=(pumpStartAt,readyBy,waitUntil,fallback)=>({pumpStartAt,readyBy,waitUntil,fallback});
const S=terms(39,45,45,'cart'),R=terms(47,53,53,'none');
const propose=(at,value)=>step(at,{type:'propose',terms:value});
const finish=step(64,{type:'advance',to:64});
const E=[ask(0,'keeper','gate'),ask(6,'keeper','gate'),ask(12,'keeper','salvage'),ask(20,'keeper','meal'),ask(24,'keeper','rest')];
const G=[ask(0,'keeper','meal'),ask(4,'keeper','gate'),ask(10,'keeper','gate'),ask(24,'keeper','pump'),ask(30,'keeper','rest'),stop(33),ask(33,'keeper','salvage')];
const lateKeeper=[ask(41,'keeper','rest'),ask(47,'keeper','pump')];
const lateTimed=[ask(41,'keeper','rest'),ask(41,'partner','rest'),stop(46,'partner'),ask(46,'partner','rest'),ask(47,'keeper','pump'),stop(51,'partner'),ask(51,'partner','rest'),stop(53,'partner'),ask(53,'partner','deliver')];
const revisedKeeper=[ask(39,'keeper','rest'),ask(47,'keeper','pump')];
const arms=['original-fixed','original-timed','direct-fixed','direct-timed','visible-pump','agreement'];
const cases=[];
function add(family,arm,steps,variant='',partition='development'){
 cases.push({id:`${family}-${arm}${variant?`-${variant}`:''}`,family,arm,variant,partition,steps:[...steps,finish]});
}
for(const arm of arms){
 add('D1',arm,[...G,...(arm==='agreement'?[propose(41,R),ask(43,'keeper','rest'),stop(47),ask(47,'keeper','pump')]:arm.endsWith('timed')?lateTimed:lateKeeper)]);
 add('D2',arm,[...E,...(arm==='agreement'?[propose(37,S)]:arm.endsWith('timed')?[ask(39,'partner','rest')]:[]),ask(39,'keeper','pump')]);
}
for(const arm of ['direct-fixed','direct-timed','visible-pump'])add('D3',arm,[...E,...(arm==='direct-timed'?[ask(39,'partner','rest')]:[])]);
add('D3','agreement',[...E,propose(37,S)],'missed');
add('D3','agreement',[...E,propose(37,S),step(40,{type:'withdraw'})],'withdrawn');
for(const arm of ['direct-fixed','direct-timed','visible-pump','agreement'])add('D4',arm,[...E,...(arm==='agreement'?[propose(30,terms(32,38,38,'cart')),ask(32,'keeper','pump')]:[ask(30,'keeper','pump')])],'overhead');
add('D4','agreement',[...G,propose(41,R)],'risky-miss');
add('D5','agreement',[...E,propose(35,S),propose(37,R),...revisedKeeper],'revised');
add('D5','agreement',[...E,propose(35,S),...revisedKeeper],'unrevised');
add('D6','agreement',[...E,propose(35,S),propose(37,terms(47,48,53,'none')),ask(39,'keeper','pump')],'refused');
add('R1','agreement',[...E,propose(35,S),propose(37,R),step(38,{type:'interrupt-discussion',actor:'keeper'}),ask(39,'keeper','pump')],'interrupted','reserved');
add('R2','agreement',[...G,propose(41,R),ask(47,'keeper','pump')],'capacity','reserved');
add('R3','agreement',[...E,propose(35,S),propose(37,R),step(39,{type:'response',receipt:'first',expectError:true}),...revisedKeeper],'stale','reserved');
add('R4','agreement',[...E,propose(35,S),propose(43,R),propose(46,R)],'tie','reserved');
export const CASES=Object.freeze(cases.map(c=>Object.freeze(c)));
export function selectCases(partition='development',{unseal=false}={}){
 if(!['development','reserved'].includes(partition))throw Error('Unknown comparison partition.');
 if(partition==='reserved'&&!unseal)throw Error('Reserved cases are sealed until committed source freeze verification.');
 return structuredClone(CASES.filter(c=>c.partition===partition));
}
export function chooseCommand(view,steps,index){
 if(index>=steps.length)return null;
 const next=steps[index];
 if(view.now<next.at)return {command:{type:'advance',to:next.at},nextIndex:index};
 if(view.now>next.at)throw Error(`Prescribed action missed minute ${next.at}.`);
 return {command:structuredClone(next.command),nextIndex:index+1};
}
