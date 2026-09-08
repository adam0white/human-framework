/** Camp 0.2: durable physical work, prospective tools and available-time recovery.
 * Snapshot continuation is validated, not authenticated historical replay.
 */
import * as legacy from './commons.js';
import {practice} from '../core/model.js';
import {HUMAN_VERSION,RUNTIME_VERSION,restorePerson,exportPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,assessEffort,createClock,restoreClock,exportClock,scheduleEvent,cancelEvent,advanceClock} from '../runtime/index.js';

export const CAMP_VERSION='0.2.0';
export const COMMONS_VERSION=CAMP_VERSION;
export const CAMP_LIMITS=Object.freeze({worldMinutes:1e9,advanceMinutes:1440,jsonCharacters:262144,jsonDepth:32});
const copy=value=>structuredClone(value),EPS=1e-12,LIMIT=CAMP_LIMITS.worldMinutes;
const resources=['timber','salvage','food'],projects=['shelter','workbench','garden','cache'],INITIAL={timber:4,salvage:2,food:4};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const PROJECTS=freeze(copy(legacy.PROJECTS));
const JOBS=freeze({
  'gather-timber':{label:'Gather timber',detail:'Bring wood from the grove.',minutes:16,effort:.13,skill:'gathering',output:{timber:3}},
  'gather-salvage':{label:'Recover salvage',detail:'Bring reusable fittings from the old shed.',minutes:22,effort:.17,skill:'gathering',output:{salvage:3}},
  forage:{label:'Gather food',detail:'Pick food near camp. Light work remains possible when heavy work is blocked.',minutes:14,skill:'gathering',output:{food:2}},
  eat:{label:'Eat a portion',detail:'Reserve one shared portion; hunger relief follows eight paid minutes.',minutes:8,activity:'meal',cost:{food:1}}
});
const fail=message=>{throw Error(message);};
const int=(value,min,max,name)=>{if(!Number.isSafeInteger(value)||value<min||value>max||Object.is(value,-0))fail(`Invalid ${name}`);};
const number=(value,min,max,name)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min-EPS||value>max+EPS)fail(`Invalid ${name}`);};
const fields=(value,names,name)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))fail(`Invalid ${name} fields`);};
const same=(a,b)=>canonical(a)===canonical(b);
function canonical(value){if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;return JSON.stringify(value);}
const actors=g=>g.solo?['player']:['player','neighbor'];
const built=g=>['shelter','workbench','garden'].every(p=>g.structures[p]===2);
const complete=(g,p)=>p!=='cache'&&g.structures[p]===2;
const stage=(g,p)=>p==='cache'?0:g.structures[p];
const add=(to,from,mult=1)=>{for(const [r,n]of Object.entries(from))to[r]+=n*mult;};
const name=a=>a==='player'?'You':'Meryem';
const workId=(g,p)=>`${p}-${p==='cache'?g.caches:stage(g,p)}`;
function record(g,actor,message){g.recent.push({at:g.clock.now,actor,message});if(g.recent.length>16)g.recent.shift();}
function config(input={}){
  json(input);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['improvement','recovery'].includes(k)))fail('Invalid camp options');
  const result={improvement:input.improvement??'prospective',recovery:input.recovery??'automatic'};
  if(!['snapshot','prospective'].includes(result.improvement)||!['automatic','active-idle'].includes(result.recovery))fail('Invalid camp options');return result;
}
function duration(g,w,a){const tool=g.options.improvement==='prospective'?g.structures.workbench===2:w.workbenchAtStart;return Math.max(6,w.durationByActor[a]-(tool?6:0));}
function remaining(g,w,a){return Math.max(1,Math.ceil((1-w.progress)*duration(g,w,a)-EPS));}
function seedWork(g,p){return {id:workId(g,p),project:p,stage:stage(g,p),cost:copy(PROJECTS[p].stages[stage(g,p)].cost),progress:0,workbenchAtStart:g.structures.workbench===2,durationByActor:{},contributions:{},completedAt:null};}
function prepare(g,w,a){
  w.durationByActor[a]??=PROJECTS[w.project].stages[w.stage].minutes-Math.floor(g.people[a].skills.construction*4);
  w.contributions[a]??={priorMinutes:0,minutes:0,fraction:0,effort:0};
}
function blueprint(g,id,a){
  if(typeof id!=='string')fail('Unknown job');
  const building=id.startsWith('build-'),p=building?id.slice(6):null;
  if(building&&!projects.includes(p)||!building&&!Object.hasOwn(JOBS,id))fail('Unknown job');
  if(building&&complete(g,p))fail('This structure is complete');
  if(building){
    const w=copy(g.work[p]??seedWork(g,p));prepare(g,w,a);const step=PROJECTS[p].stages[w.stage];
    return {id,label:`${PROJECTS[p].label}: ${step.label.toLowerCase()}`,detail:PROJECTS[p].benefit,project:p,stage:w.stage,
      cost:g.work[p]?{}:copy(step.cost),output:{},duration:remaining(g,w,a),work:w,
      action:{actionId:id,targetId:p,durationMinutes:remaining(g,w,a),effort:.2*(1-w.progress),exertive:true,activity:'active',skill:'construction'}};
  }
  const d=JOBS[id],skill=d.skill??null,skillBefore=skill?g.people[a].skills[skill]:null;
  const benefits={shelter:g.structures.shelter===2,workbench:g.structures.workbench===2,garden:g.structures.garden===2};
  const minutes=Math.max(6,d.minutes-(skill?Math.floor(skillBefore*4):0)),output=copy(d.output??{});
  if(id==='gather-timber'&&benefits.shelter)output.timber++;if(id==='forage'&&benefits.garden)output.food++;
  return {id,label:d.label,detail:d.detail,project:null,stage:null,cost:copy(d.cost??{}),output,duration:minutes,benefits,skillBefore,
    action:{actionId:id,targetId:null,durationMinutes:minutes,effort:d.effort??0,exertive:Boolean(d.effort),activity:d.activity??'active',skill}};
}
function unavailable(g,b,a){
  if(g.jobs[a])return 'Already working. Finish or stop the current job first.';
  const future=LIMIT-g.clock.now;
  if(g.stats.started>=Number.MAX_SAFE_INTEGER-2*future)return 'Job counter space is reserved for progression and stops.';
  if(!b.project&&(g.people[a].nextAttempt>=Number.MAX_SAFE_INTEGER-future||g.clock.nextEvent>=Number.MAX_SAFE_INTEGER-2*future))return 'Attempt and event counter space is reserved for automatic progression.';
  if(b.project==='cache'&&!built(g))return 'Finish the woodshed, workbench, and garden before packing caches.';
  if(b.project&&Object.values(g.jobs).some(j=>j?.project===b.project))return 'Someone is already building this stage.';
  if(g.clock.now+b.duration>LIMIT)return 'Insufficient remaining world time for this whole job.';
  for(const [r,n]of Object.entries(b.cost))if(g.stock[r]<n)return `Needs ${n} ${r}; only ${g.stock[r]} is available.`;
  const capacity=assessEffort(g.people[a].body,b.action);if(!capacity.allowed)return `Insufficient ${capacity.causes.join(' and ')} capacity for this whole job. Recover first.`;
  return null;
}
function begin(g,id,a,reason=null){
  const b=blueprint(g,id,a),why=unavailable(g,b,a);if(why)fail(why);
  add(g.stock,b.cost,-1);g.recovering[a]=false;
  if(b.project){
    g.work[b.project]=b.work;g.jobs[a]={kind:'assembly',id,project:b.project,workId:b.work.id,startedAt:g.clock.now};
  }else{
    const person=beginAttempt(g.people[a],b.action),endsAt=g.clock.now+b.duration;
    const event=scheduleEvent(g.clock,{at:endsAt,type:'job-complete',actorId:a,data:{jobId:id,attemptId:person.pending.id}});
    g.clock=event.clock;g.people[a]=person;g.jobs[a]={kind:'fixed',legacy:false,...b,startedAt:g.clock.now,endsAt,eventId:event.eventId,attemptId:person.pending.id};
  }
  g.stats.started++;if(a==='neighbor'&&reason)g.commitment.reason=reason;
  record(g,a,`${name(a)} started ${b.label.toLowerCase()} (${b.duration} min).${reason?' '+reason:''}`);
}
function stop(g,a){
  const job=g.jobs[a];if(!job)fail('No job to stop');
  if(job.kind==='fixed'){
    g.people[a]=finishAttempt(g.people[a],{attemptId:job.attemptId,status:'interrupted'});
    g.clock=cancelEvent(g.clock,job.eventId);add(g.stock,job.cost);
  }
  g.jobs[a]=null;g.stats.canceled++;
  record(g,a,`${name(a)} stopped ${job.id}. ${job.kind==='assembly'?'Installed material and physical work remain.':'No completion output; its unused reservation returns.'} Paid time remains.`);
}
function settleAssembly(g,a){
  const job=g.jobs[a],w=g.work[job.project];w.progress=1;w.completedAt=g.clock.now;
  add(g.stats.spent,w.cost);if(w.project==='cache')g.caches++;else g.structures[w.project]++;
  g.lastAssemblies[w.project]=copy(w);delete g.work[w.project];g.jobs[a]=null;g.stats.completed++;
  record(g,a,`${name(a)} finished ${PROJECTS[w.project].label.toLowerCase()}: ${PROJECTS[w.project].stages[w.stage].label.toLowerCase()}.`);
}
function settleFixed(g,a){
  const j=g.jobs[a];if(!j||j.kind!=='fixed')fail('Unexpected fixed completion');
  g.people[a]=finishAttempt(g.people[a],{attemptId:j.attemptId,status:'completed',mealConsumed:j.id==='eat'});
  add(g.stock,j.output);add(g.stats.gathered,j.output);add(g.stats.spent,j.cost);
  if(j.id==='eat')g.stats.consumedFood++;
  g.stats.receipts[j.id]++;if(j.id==='gather-timber'&&j.benefits.shelter)g.stats.receipts.coveredTimber++;
  if(j.id==='forage'&&j.benefits.garden)g.stats.receipts.gardenFood++;
  g.stats.completed++;g.jobs[a]=null;record(g,a,`${name(a)} finished ${j.label.toLowerCase()}.${Object.entries(j.output).map(([r,n])=>` +${n} ${r}.`).join('')}`);
}
function desire(g,project){
  const a='neighbor',body=g.people[a].body;
  if(body.hunger>=.65)return {id:g.stock.food?'eat':'forage',reason:g.stock.food?'I need a meal, then I can continue.':'I need food. I will gather some near camp.'};
  if(body.fatigue>=.68||g.recovering[a]&&body.fatigue>.45)return {recovery:true,reason:'I am recovering and remain available for a feasible next task.'};
  if(!project)return null;
  const lock=Object.values(g.jobs).find(j=>j?.project===project);
  const nextStage=lock&&project!=='cache'?stage(g,project)+1:stage(g,project),target=PROJECTS[project].stages[nextStage];
  if(!target)return null;
  const cost=!lock&&g.work[project]?{}:target.cost;
  for(const [r,n]of Object.entries(cost))if(g.stock[r]<n)return {id:r==='timber'?'gather-timber':'gather-salvage',reason:`I am gathering ${r} for our accepted ${PROJECTS[project].label.toLowerCase()}.`};
  if(lock)return null;
  return {id:`build-${project}`,reason:`I am completing the accepted ${PROJECTS[project].label.toLowerCase()} project.`};
}
function neighbor(g){
  if(g.solo)return;const c=g.commitment;
  if(c.status==='accepted'&&(c.project==='cache'?g.caches>c.startCaches:complete(g,c.project))){c.status='fulfilled';c.finishedAt=g.clock.now;c.reason=`The ${PROJECTS[c.project].label.toLowerCase()} is complete. I am available.`;record(g,'neighbor',c.reason);}
  if(g.jobs.neighbor||g.clock.now>=LIMIT)return;
  const project=c.status==='accepted'?c.project:null,choice=desire(g,project);
  if(choice?.recovery){g.recovering.neighbor=true;c.reason=choice.reason;return;}
  if(choice?.id){
    const b=blueprint(g,choice.id,'neighbor'),blocked=unavailable(g,b,'neighbor');
    if(!blocked){begin(g,choice.id,'neighbor',choice.reason);return;}
    if(blocked.includes('hunger')){
      const id=g.stock.food?'eat':'forage',food=blueprint(g,id,'neighbor');if(!unavailable(g,food,'neighbor')){begin(g,id,'neighbor','I need food before I can continue our accepted work.');return;}
    }
    g.recovering.neighbor=true;c.reason='I need to recover before continuing; the project remains accepted.';
  }else{g.recovering.neighbor=false;if(project)c.reason='You are building this stage. I am available while it finishes; our project remains accepted.';}
}
function spendMinute(person,action){let p=beginAttempt(person,action);if(!p.pending.capacity.allowed)fail('Insufficient capacity for paid work minute');p=advanceAttempt(p,1);return finishAttempt(p,{attemptId:p.pending.id,status:'completed'});}
function advanceRaw(g,minutes){
  for(let i=0;i<minutes;i++){
    const done=[];
    for(const a of actors(g)){
      const j=g.jobs[a],p=g.paid[a];
      if(j?.kind==='assembly'){
        const w=g.work[j.project],fraction=Math.min(1-w.progress,1/duration(g,w,a));
        g.people[a]=spendMinute(g.people[a],{actionId:j.id,targetId:j.project,durationMinutes:1,effort:.2*fraction,exertive:true,skill:'construction'});
        w.progress+=fraction;const contribution=w.contributions[a];contribution.minutes++;contribution.fraction+=fraction;contribution.effort+=.2*fraction;
        p.work++;p.constructionMinutes++;p.effort+=.2*fraction;g.stats.workMinutes++;if(w.progress>=1-EPS)done.push(a);
      }else if(j){
        g.people[a]=advanceAttempt(g.people[a],1);p[j.id==='eat'?'meal':'work']++;g.stats[j.id==='eat'?'mealMinutes':'workMinutes']++;
        if(j.action.skill==='gathering')p.gatheringMinutes++;p.effort+=j.action.effort/j.duration;
      }else{
        const recovering=g.options.recovery==='automatic'||g.recovering[a];
        g.people[a]=spendMinute(g.people[a],{actionId:recovering?'available':'idle',durationMinutes:1,activity:recovering?'rest':'active'});
        p[recovering?'recovery':'idle']++;g.stats[recovering?'restMinutes':'idleMinutes']++;
      }
    }
    const advanced=advanceClock(g.clock,g.clock.now+1);g.clock=advanced.clock;
    // Everyone paid this minute using the same beginning-of-minute world.
    for(const a of done)settleAssembly(g,a);
    for(const event of advanced.events)settleFixed(g,event.actorId);
    if(g.milestoneAt===null&&built(g)){g.milestoneAt=g.clock.now;record(g,'world','The worksite is established. Supplies and unfinished work continue with you.');}
    neighbor(g);
  }return g;
}
function initial(old,options,origin){
  const g={version:CAMP_VERSION,runtimeVersion:RUNTIME_VERSION,humanVersion:HUMAN_VERSION,solo:old.solo,options:config(options),origin:origin?copy(origin):null,
    clock:copy(old.clock),people:{},jobs:{},stock:copy(old.stock),structures:copy(old.structures),caches:old.caches,milestoneAt:old.milestoneAt,
    commitment:copy(old.commitment),lastResponse:copy(old.lastResponse),stats:copy(old.stats),recent:copy(old.recent),work:{},lastAssemblies:{},paid:{},recovering:{}};
  for(const a of actors(g)){
    const original=old.people[a],j=old.jobs[a];
    let person=restorePerson({format:'human-framework-person',version:1,componentVersion:original.version,person:copy(original)});
    g.jobs[a]=null;g.paid[a]={work:0,recovery:0,idle:0,meal:0,effort:0,constructionMinutes:0,gatheringMinutes:0};g.recovering[a]=false;
    if(j?.project){
      const fraction=original.pending.elapsedMinutes/j.duration,w=seedWork(g,j.project);
      w.progress=fraction;w.workbenchAtStart=j.benefits.workbench;w.durationByActor[a]=j.duration+(j.benefits.workbench?6:0);
      w.contributions[a]={priorMinutes:original.pending.elapsedMinutes,minutes:0,fraction,effort:.2*fraction};
      g.work[j.project]=w;g.jobs[a]={kind:'assembly',id:j.id,project:j.project,workId:w.id,startedAt:j.startedAt};
      person=finishAttempt(person,{attemptId:person.pending.id,status:'interrupted'});g.clock=cancelEvent(g.clock,j.eventId);
    }else if(j?.id==='rest'){
      person=finishAttempt(person,{attemptId:person.pending.id,status:'interrupted'});g.clock=cancelEvent(g.clock,j.eventId);g.stats.canceled++;g.recovering[a]=true;
    }else if(j)g.jobs[a]={kind:'fixed',legacy:true,...copy(j)};
    g.people[a]=person;
  }
  return g;
}
export function createGame(input={}){
  json(input);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['solo','improvement','recovery'].includes(k)))fail('Invalid camp setup');
  const {solo=false,...options}=input;if(typeof solo!=='boolean')fail('Invalid solo setup');
  return initial(legacy.createGame({solo}),options,null);
}
export function migrateLegacyGame(snapshot,options={}){json(snapshot);const old=legacy.restoreGame(snapshot);return validate(initial(old,options,snapshot));}
function change(game,apply){validate(game);const next=copy(game);apply(next);return validate(next);}
export function startJob(game,id){return change(game,g=>{
  if(id==='rest'){if(g.jobs.player)fail('Stop the current job before selecting recovery');g.recovering.player=true;record(g,'player','You are available and recovering; another job can start immediately.');}
  else begin(g,id,'player');neighbor(g);
});}
export function cancelJob(game){return change(game,g=>{stop(g,'player');neighbor(g);});}
export function requestProject(game,project){return change(game,g=>{
  if(g.solo)fail('There is no neighbor in the solo worksite');if(typeof project!=='string'||!projects.includes(project))fail('Unknown project');
  const c=g.commitment,reason=c.status==='accepted'?'I already accepted a project. Finish it or release that commitment first.':complete(g,project)?'That structure is already complete.':project==='cache'&&!built(g)?'We need the woodshed, workbench, and garden before packing a cache.':null;
  g.lastResponse={at:g.clock.now,project,accepted:!reason,reason:reason??`Yes. I will help finish the ${PROJECTS[project].label.toLowerCase()}, gather its supplies and recover when needed.`};
  if(!reason||c.status!=='accepted')g.commitment={status:reason?'declined':'accepted',project,acceptedAt:reason?null:g.clock.now,finishedAt:null,startCaches:g.caches,reason:g.lastResponse.reason};
  record(g,'neighbor',g.lastResponse.reason);neighbor(g);
});}
export function releaseProject(game){return change(game,g=>{
  if(g.commitment.status!=='accepted')fail('No accepted project to release');
  if(g.jobs.neighbor&&!['eat','forage'].includes(g.jobs.neighbor.id))stop(g,'neighbor');
  const c=g.commitment;c.status='released';c.finishedAt=g.clock.now;c.reason='Our project is released. Its installed work remains; I choose my own recovery.';record(g,'neighbor',c.reason);
});}
export function requestHandover(game,from='player',to='neighbor'){return change(game,g=>{
  if(typeof from!=='string'||typeof to!=='string'||!actors(g).includes(from)||!actors(g).includes(to)||from===to)fail('Invalid handover actors');
  const j=g.jobs[from];if(j?.kind!=='assembly')fail('No active physical assembly to hand over');
  const w=copy(g.work[j.project]);prepare(g,w,to);
  let reason=g.jobs[to]?'I already have a job.':null;
  if(!reason&&from==='neighbor'&&(g.commitment.status!=='accepted'||g.commitment.project!==j.project))reason='I have not agreed to transfer this work.';
  if(!reason&&to==='neighbor')reason=g.commitment.status==='accepted'&&g.commitment.project!==j.project?'I have a different accepted project.':g.people.neighbor.body.hunger>=.65?'I need a meal first.':g.people.neighbor.body.fatigue>=.68||g.recovering.neighbor&&g.people.neighbor.body.fatigue>.45?'I need to recover first.':null;
  if(!reason){const capacity=assessEffort(g.people[to].body,{durationMinutes:remaining(g,w,to),effort:.2*(1-w.progress),exertive:true});if(!capacity.allowed)reason=`I lack ${capacity.causes.join(' and ')} capacity for the remaining work.`;}
  if(!reason&&g.clock.now+remaining(g,w,to)>LIMIT)reason='There is insufficient remaining world time.';
  g.lastResponse={at:g.clock.now,project:j.project,accepted:!reason,reason:reason??(from==='neighbor'?`Meryem accepted your offer to finish the remaining ${PROJECTS[j.project].label.toLowerCase()} work.`:`Meryem accepted the remaining ${PROJECTS[j.project].label.toLowerCase()} work.`),kind:'handover',from,to};
  if(!reason){
    g.work[j.project]=w;g.jobs[from]=null;g.jobs[to]={...j,startedAt:g.clock.now};g.recovering[to]=false;
    if(to==='neighbor'&&g.commitment.status!=='accepted')g.commitment={status:'accepted',project:j.project,acceptedAt:g.clock.now,finishedAt:null,startCaches:g.caches,reason:g.lastResponse.reason};
  }
  record(g,to,g.lastResponse.reason);
});}
export function advanceGame(game,minutes){validate(game);int(minutes,0,1440,'advance minutes');int(game.clock.now+minutes,0,LIMIT,'world time');return validate(advanceRaw(copy(game),minutes));}
function nextStop(g){
  const scheduled=actors(g).filter(a=>g.jobs[a]).map(a=>g.jobs[a].kind==='fixed'?g.jobs[a].endsAt-g.clock.now:remaining(g,g.work[g.jobs[a].project],a));
  const probe=copy(g),horizon=Math.min(scheduled.length?Math.min(...scheduled):6,LIMIT-g.clock.now),start=g.stats.completed;
  for(let n=1;n<=horizon;n++){
    const before=Object.fromEntries(actors(g).map(a=>[a,{fatigue:probe.people[a].body.fatigue,job:probe.jobs[a]?.id??null}]));
    advanceRaw(probe,1);
    if(probe.stats.completed>start)return {at:probe.clock.now,reason:'job-complete'};
    if(actors(g).some(a=>!before[a].job&&probe.jobs[a]))return {at:probe.clock.now,reason:'ready-for-work'};
    if(actors(g).some(a=>before[a].fatigue>0&&probe.people[a].body.fatigue===0))return {at:probe.clock.now,reason:'recovery-floor'};
  }return {at:g.clock.now+horizon,reason:horizon?'review-interval':'world-limit'};
}
export function advanceToNextEvent(game){validate(game);return advanceGame(game,nextStop(game).at-game.clock.now);}
function jobView(g,a){
  const j=g.jobs[a];if(!j)return null;
  if(j.kind==='fixed')return {id:j.id,label:j.label,project:null,startedAt:j.startedAt,endsAt:j.endsAt,duration:j.duration,remaining:j.endsAt-g.clock.now,cost:copy(j.cost),workId:null,progress:g.people[a].pending.elapsedMinutes/j.duration};
  const w=g.work[j.project],left=remaining(g,w,a);return {id:j.id,label:`${PROJECTS[j.project].label}: ${PROJECTS[j.project].stages[w.stage].label.toLowerCase()}`,project:j.project,startedAt:j.startedAt,endsAt:g.clock.now+left,duration:g.clock.now-j.startedAt+left,remaining:left,cost:copy(w.cost),workId:w.id,progress:w.progress};
}
export function getGameView(game){
  validate(game);const choices=[...Object.keys(JOBS),...projects.filter(p=>!complete(game,p)).map(p=>`build-${p}`)].map(id=>{const b=blueprint(game,id,'player');return {id,label:b.label,detail:b.detail,duration:b.duration,cost:b.cost,output:b.output,project:b.project,unavailable:unavailable(game,b,'player')};});
  if(game.options.recovery==='active-idle')choices.unshift({id:'rest',label:'Recover while available',detail:'Recover with no fixed interval; start another job when ready.',duration:0,cost:{},output:{},project:null,unavailable:game.jobs.player?'Stop the current job first.':null});
  const stop=nextStop(game);
  return copy({version:game.version,solo:game.solo,now:game.clock.now,stock:game.stock,structures:game.structures,caches:game.caches,milestoneAt:game.milestoneAt,
    people:Object.fromEntries(actors(game).map(a=>[a,{...getPersonView(game.people[a]),job:jobView(game,a),availableActivity:game.options.recovery==='automatic'||game.recovering[a]?'recovery':'active-idle'}])),
    commitment:game.commitment,lastResponse:game.lastResponse,recent:game.recent,choices,nextEventAt:stop.at,stats:game.stats,options:game.options,work:game.work,lastAssemblies:game.lastAssemblies,paid:game.paid,
    migration:game.origin?{sourceFormat:game.origin.format,sourceVersion:game.origin.game.version,at:game.origin.game.clock.now,restConversion:'Available recovery; all prior paid time and body retained.',historicalCacheTimestamps:false}:null,nextStop:stop});
}

// Bound before cloning/stringifying. Parsed JSON is an unshared data tree.
function json(value){
  let budget=CAMP_LIMITS.jsonCharacters;const seen=new Set();
  const debit=n=>{budget-=n;if(budget<0)fail('JSON size exceeds camp save limit');};
  const string=s=>{if(s.length+2>budget)fail('JSON size exceeds camp save limit');debit(JSON.stringify(s).length);};
  function visit(v,depth){
    if(depth>CAMP_LIMITS.jsonDepth)fail('JSON nesting exceeds camp limit');
    if(v===null){debit(4);return;}if(typeof v==='string'){string(v);return;}if(typeof v==='boolean'){debit(v?4:5);return;}
    if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('JSON numbers must be finite');debit(JSON.stringify(v).length);return;}
    if(!v||typeof v!=='object'||seen.has(v))fail('JSON requires an acyclic unshared data tree');
    const array=Array.isArray(v),proto=Object.getPrototypeOf(v),names=Reflect.ownKeys(v);
    if(array?proto!==Array.prototype:![Object.prototype,null].includes(proto))fail('JSON requires plain data');
    if(array&&(v.length>10000||names.length!==v.length+1))fail('JSON arrays must be dense and bounded');
    debit(2+Math.max(0,names.length-(array?1:0)-1));seen.add(v);
    for(const key of names){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(v,key);
      if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))fail('JSON requires data-only properties');
      if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=v.length))fail('JSON requires indexed arrays');
      if(!array){string(key);debit(1);}visit(d.value,depth+1);
    }
  }visit(value,0);
}
function validateWork(g,w,p,finished=false){
  fields(w,['id','project','stage','cost','progress','workbenchAtStart','durationByActor','contributions','completedAt'],'physical work');
  if(w.project!==p||!projects.includes(p))fail('Invalid physical project');int(w.stage,0,p==='cache'?0:1,'physical stage');
  if(w.id!==`${p}-${p==='cache'?(finished?Number(w.id.slice(6)):g.caches):w.stage}`||p==='cache'&&!/^cache-(0|[1-9]\d*)$/.test(w.id))fail('Invalid work identity');
  if(p==='cache'){const cacheNumber=Number(w.id.slice(6));int(cacheNumber,0,finished?g.caches-1:g.caches,'cache work identity');if(finished&&cacheNumber!==g.caches-1)fail('Invalid last cache receipt');}
  if(!same(w.cost,PROJECTS[p].stages[w.stage].cost))fail('Invalid physical material reservation');
  if(typeof w.workbenchAtStart!=='boolean'||w.workbenchAtStart&&g.structures.workbench!==2)fail('Invalid workbench basis');
  number(w.progress,0,1,'physical progress');
  if(finished){if(w.progress!==1)fail('Incomplete assembly receipt');int(w.completedAt,0,g.clock.now,'assembly completion');if(p!=='cache'&&w.stage!==g.structures[p]-1)fail('Invalid last assembly stage');}
  else if(w.completedAt!==null||w.progress>=1-EPS||w.stage!==stage(g,p))fail('Invalid unfinished stage');
  const workers=Object.keys(w.durationByActor);if(workers.length<1||workers.length>actors(g).length||workers.some(a=>!actors(g).includes(a)))fail('Invalid physical workers');
  fields(w.contributions,workers,'work contributions');let fraction=0;
  for(const a of workers){
    const base=PROJECTS[p].stages[w.stage].minutes;int(w.durationByActor[a],base-4,base,'worker duration basis');
    const c=w.contributions[a];fields(c,['priorMinutes','minutes','fraction','effort'],'worker contribution');int(c.priorMinutes,0,LIMIT,'prior construction minutes');int(c.minutes,0,LIMIT,'construction minutes');number(c.fraction,0,1,'contribution fraction');number(c.effort,0,.2,'contribution effort');
    if(Math.abs(c.effort-.2*c.fraction)>1e-10)fail('Inconsistent contribution effort');
    const durationMin=Math.max(6,w.durationByActor[a]-6),durationMax=w.durationByActor[a],paid=c.priorMinutes+c.minutes;
    if(c.fraction>paid/durationMin+EPS||paid>0&&c.fraction<(paid-1)/durationMax-EPS||c.fraction>0&&paid===0)fail('Unpaid physical fraction');
    if(c.priorMinutes){const old=g.origin?.game.jobs[a];if(old?.project!==p||w.id!==`${p}-${p==='cache'?g.origin.game.caches:old.stage}`||c.priorMinutes!==g.origin.game.people[a].pending.elapsedMinutes)fail('Invalid migration exposure');}
    fraction+=c.fraction;
  }
  if(Math.abs(fraction-w.progress)>1e-10)fail('Inconsistent physical contribution total');
}
function validate(game){
  json(game);
  fields(game,['version','runtimeVersion','humanVersion','solo','options','origin','clock','people','jobs','stock','structures','caches','milestoneAt','commitment','lastResponse','stats','recent','work','lastAssemblies','paid','recovering'],'camp');
  const g=game;if(g.version!==CAMP_VERSION||g.runtimeVersion!==RUNTIME_VERSION||g.humanVersion!==HUMAN_VERSION||typeof g.solo!=='boolean')fail('Incompatible camp');
  if(!same(config(g.options),g.options))fail('Invalid camp options');
  const old=g.origin?legacy.restoreGame(g.origin):legacy.createGame({solo:g.solo});
  if(old.solo!==g.solo)fail('Inconsistent migration actors');
  restoreClock(exportClock(g.clock));int(g.clock.now,old.clock.now,LIMIT,'world time');if(g.clock.nextEvent<old.clock.nextEvent)fail('Clock identity regressed');
  if(g.clock.nextEvent>Number.MAX_SAFE_INTEGER-2*(LIMIT-g.clock.now))fail('Event counter reserve would block progression');
  const as=actors(g);fields(g.people,as,'people');fields(g.jobs,as,'jobs');fields(g.paid,as,'paid');fields(g.recovering,as,'recovery modes');fields(g.stock,resources,'stock');fields(g.structures,['shelter','workbench','garden'],'structures');
  for(const r of resources)int(g.stock[r],0,LIMIT,'stock');
  for(const p of ['shelter','workbench','garden'])int(g.structures[p],old.structures[p],2,'structure stage');int(g.caches,old.caches,LIMIT,'caches');
  if(g.milestoneAt!==null)int(g.milestoneAt,0,g.clock.now,'milestone');if(built(g)!==(g.milestoneAt!==null)||g.caches>0&&!built(g)||old.milestoneAt!==null&&g.milestoneAt!==old.milestoneAt)fail('Inconsistent milestone');
  fields(g.stats,['started','completed','canceled','gathered','spent','consumedFood','workMinutes','restMinutes','mealMinutes','idleMinutes','receipts'],'stats');
  for(const [k,v]of Object.entries(g.stats))if(!['gathered','spent','receipts'].includes(k))int(v,old.stats[k],Number.MAX_SAFE_INTEGER,`stat ${k}`);
  for(const k of ['gathered','spent']){fields(g.stats[k],resources,k);for(const r of resources)int(g.stats[k][r],old.stats[k][r],LIMIT,k);}
  fields(g.stats.receipts,['gather-timber','gather-salvage','forage','rest','eat','coveredTimber','gardenFood'],'production receipts');for(const [r,n]of Object.entries(g.stats.receipts))int(n,old.stats.receipts[r],LIMIT,'receipt count');
  for(const key of ['work','lastAssemblies'])if(!g[key]||typeof g[key]!=='object'||Array.isArray(g[key])||Object.keys(g[key]).some(p=>!projects.includes(p)))fail('Invalid physical work collection');
  for(const [p,w]of Object.entries(g.work))validateWork(g,w,p);for(const [p,w]of Object.entries(g.lastAssemblies))validateWork(g,w,p,true);
  const reserved={timber:0,salvage:0,food:0};for(const w of Object.values(g.work))add(reserved,w.cost);
  const events=[],assigned=[],paidTotals={work:0,recovery:0,meal:0,idle:0};
  for(const a of as){
    const person=restorePerson(exportPerson(g.people[a])),j=g.jobs[a],paid=g.paid[a];
    if(person.version!==HUMAN_VERSION||person.id!==a||person.minutes!==g.clock.now||person.observationBias!==0||person.nextAttempt<old.people[a].nextAttempt)fail('Inconsistent person identity or clock');
    if(person.nextAttempt>Number.MAX_SAFE_INTEGER-(LIMIT-g.clock.now))fail('Attempt counter reserve would block progression');
    fields(person.skills,['gathering','construction'],'camp skills');for(const s of ['gathering','construction'])if(person.skills[s]<old.people[a].skills[s]-EPS)fail('Regressed paid skill');
    if(typeof g.recovering[a]!=='boolean')fail('Invalid recovery selection');
    fields(paid,['work','recovery','idle','meal','effort','constructionMinutes','gatheringMinutes'],'paid work');
    for(const [k,n]of Object.entries(paid))if(k==='effort')number(n,0,LIMIT,'paid effort');else int(n,0,LIMIT,'paid minutes');
    if(paid.work+paid.recovery+paid.idle+paid.meal!==g.clock.now-old.clock.now||paid.constructionMinutes+paid.gatheringMinutes!==paid.work)fail('Inconsistent actor paid minutes');
    for(const skill of ['construction','gathering'])if(Math.abs(person.skills[skill]-practice(old.people[a].skills[skill],paid[`${skill}Minutes`]))>1e-10)fail('Inconsistent paid practice');
    let recordedEffort=0,recordedMinutes=0;
    for(const w of [...Object.values(g.work),...Object.values(g.lastAssemblies)]){const contribution=w.contributions[a];if(!contribution)continue;
      const priorEffort=contribution.priorMinutes ? .2*contribution.priorMinutes/g.origin.game.jobs[a].duration : 0;recordedEffort+=contribution.effort-priorEffort;recordedMinutes+=contribution.minutes;}
    if(paid.effort+1e-10<recordedEffort||paid.constructionMinutes<recordedMinutes||paid.effort>paid.constructionMinutes*.2/6+paid.gatheringMinutes*.13/12+1e-10)fail('Inconsistent paid effort or construction minutes');
    for(const k of Object.keys(paidTotals))paidTotals[k]+=paid[k];
    if(!j){if(person.pending)fail('Unassigned pending attempt');continue;}
    if(j.kind==='assembly'){
      fields(j,['kind','id','project','workId','startedAt'],'assembly assignment');
      const w=g.work[j.project];if(!w||w.id!==j.workId||j.id!==`build-${j.project}`||!Object.hasOwn(w.contributions,a)||person.pending)fail('Inconsistent assembly assignment');
      int(j.startedAt,0,g.clock.now,'assembly assignment start');assigned.push(j.project);
      const capacity=assessEffort(person.body,{durationMinutes:remaining(g,w,a),effort:.2*(1-w.progress),exertive:true});
      if(!capacity.allowed)fail('Assigned assembly lacks remaining capacity');
    }else if(j.kind==='fixed'){
      fields(j,['kind','legacy','id','label','detail','project','stage','cost','output','duration','benefits','skillBefore','action','startedAt','endsAt','eventId','attemptId'],'fixed job');
      if(typeof j.legacy!=='boolean'||!Object.hasOwn(JOBS,j.id)||!person.pending)fail('Invalid fixed job');
      int(j.startedAt,0,g.clock.now,'fixed job start');int(j.endsAt,g.clock.now+1,LIMIT,'fixed job end');
      if(j.endsAt!==j.startedAt+j.duration||person.pending.startedAt!==j.startedAt||person.pending.elapsedMinutes!==g.clock.now-j.startedAt||j.attemptId!==person.pending.id||!person.pending.capacity.allowed||!same(j.action,person.pending.action))fail('Inconsistent fixed action timing');
      fields(j.benefits,['shelter','workbench','garden'],'fixed benefits');for(const p of ['shelter','workbench','garden'])if(typeof j.benefits[p]!=='boolean'||j.benefits[p]&&g.structures[p]!==2)fail('Invalid fixed benefit');
      if(j.legacy){
        const original=g.origin?.game.jobs[a];if(!original||original.project||original.id==='rest')fail('Invalid retained legacy job');
        for(const k of Object.keys(original))if(!same(j[k],original[k]))fail(`Changed legacy fixed ${k}`);
      }else{
        const ghost={...g,structures:{...g.structures},people:{...g.people,[a]:{...person,skills:{...person.skills}}}};
        for(const p of ['shelter','workbench','garden'])ghost.structures[p]=j.benefits[p]?2:Math.min(g.structures[p],1);
        if(j.action.skill)ghost.people[a].skills[j.action.skill]=person.pending.skillBefore;
        const expected=blueprint(ghost,j.id,a);for(const k of Object.keys(expected))if(!same(j[k],expected[k]))fail(`Inconsistent fixed ${k}`);
      }
      add(reserved,j.cost);events.push({id:j.eventId,at:j.endsAt,type:'job-complete',actorId:a,data:{jobId:j.id,attemptId:j.attemptId}});
    }else fail('Unknown job kind');
  }
  if(new Set(assigned).size!==assigned.length)fail('Duplicate physical worker assignment');
  if(g.clock.queue.length!==events.length||events.some(e=>!g.clock.queue.some(actual=>same(actual,e))))fail('Inconsistent pending events');
  for(const r of resources)if(g.stock[r]+reserved[r]+g.stats.spent[r]!==INITIAL[r]+g.stats.gathered[r])fail('Resource conservation mismatch');
  const material={timber:0,salvage:0};for(const p of ['shelter','workbench','garden'])for(let n=0;n<g.structures[p];n++)add(material,PROJECTS[p].stages[n].cost);add(material,PROJECTS.cache.stages[0].cost,g.caches);
  const active=Object.values(g.jobs).filter(Boolean).length;
  if(g.stats.started>Number.MAX_SAFE_INTEGER-2*(LIMIT-g.clock.now))fail('Job counter reserve would block progression');
  if(material.timber!==g.stats.spent.timber||material.salvage!==g.stats.spent.salvage||g.stats.spent.food!==g.stats.consumedFood||g.stats.started!==g.stats.completed+g.stats.canceled+active)fail('Inconsistent material or completion receipts');
  const c=g.stats.receipts,assemblies=Object.values(g.structures).reduce((a,b)=>a+b,0)+g.caches;
  if(c.coveredTimber>c['gather-timber']||c.gardenFood>c.forage||c.coveredTimber>0&&g.structures.shelter!==2||c.gardenFood>0&&g.structures.garden!==2||g.stats.gathered.timber!==3*c['gather-timber']+c.coveredTimber||g.stats.gathered.salvage!==3*c['gather-salvage']||g.stats.gathered.food!==2*c.forage+c.gardenFood||c.eat!==g.stats.consumedFood||g.stats.completed!==assemblies+c['gather-timber']+c['gather-salvage']+c.forage+c.rest+c.eat)fail('Inconsistent production receipts');
  let minimumBuild=g.caches*16;for(const p of ['shelter','workbench','garden'])for(let n=0;n<g.structures[p];n++)minimumBuild+=PROJECTS[p].stages[n].minutes-10;
  if(g.stats.workMinutes<c['gather-timber']*12+c['gather-salvage']*18+c.forage*10+minimumBuild||g.stats.restMinutes<c.rest*18||g.stats.mealMinutes<c.eat*8||c.rest!==old.stats.receipts.rest)fail('Unpaid completion receipts');
  if(g.stats.workMinutes-old.stats.workMinutes!==paidTotals.work||g.stats.restMinutes-old.stats.restMinutes!==paidTotals.recovery||g.stats.mealMinutes-old.stats.mealMinutes!==paidTotals.meal||g.stats.idleMinutes-old.stats.idleMinutes!==paidTotals.idle)fail('Inconsistent paid totals');
  if(g.stats.workMinutes+g.stats.restMinutes+g.stats.mealMinutes+g.stats.idleMinutes!==g.clock.now*as.length)fail('Inconsistent elapsed receipts');
  const commitment=g.commitment;fields(commitment,['status','project','acceptedAt','finishedAt','startCaches','reason'],'commitment');
  if(!['none','accepted','declined','released','fulfilled'].includes(commitment.status)||typeof commitment.reason!=='string'||commitment.reason.length>400)fail('Invalid commitment');
  if(commitment.project!==null&&!projects.includes(commitment.project)||commitment.status==='none'&&commitment.project!==null||commitment.status!=='none'&&commitment.project===null||g.solo&&commitment.status!=='none')fail('Invalid commitment project');
  int(commitment.startCaches,0,g.caches,'commitment cache baseline');for(const k of ['acceptedAt','finishedAt'])if(commitment[k]!==null)int(commitment[k],0,g.clock.now,k);
  if(['accepted','released','fulfilled'].includes(commitment.status)!==(commitment.acceptedAt!==null)||['released','fulfilled'].includes(commitment.status)!==(commitment.finishedAt!==null)||commitment.finishedAt!==null&&commitment.finishedAt<commitment.acceptedAt)fail('Inconsistent commitment times');
  if(commitment.status==='fulfilled'&&!(commitment.project==='cache'?g.caches>commitment.startCaches:complete(g,commitment.project)))fail('Unfulfilled project receipt');
  if(g.lastResponse!==null){const r=g.lastResponse;fields(r,Object.hasOwn(r,'kind')?['at','project','accepted','reason','kind','from','to']:['at','project','accepted','reason'],'response');int(r.at,0,g.clock.now,'response time');if(!projects.includes(r.project)||typeof r.accepted!=='boolean'||typeof r.reason!=='string'||r.reason.length>400)fail('Invalid response');if(Object.hasOwn(r,'kind')&&(r.kind!=='handover'||!as.includes(r.from)||!as.includes(r.to)||r.from===r.to))fail('Invalid handover response');}
  if(!Array.isArray(g.recent)||g.recent.length>16)fail('Invalid recent messages');let previous=0;for(const e of g.recent){fields(e,['at','actor','message'],'message');int(e.at,previous,g.clock.now,'message time');previous=e.at;if(![...as,'world'].includes(e.actor)||typeof e.message!=='string'||e.message.length>600)fail('Invalid message');}
  return g;
}
export function exportGame(game){validate(game);return copy({format:'human-camp',version:2,game});}
export function restoreGame(snapshot){json(snapshot);fields(snapshot,['format','version','game'],'camp snapshot');if(snapshot.format!=='human-camp'||snapshot.version!==2)fail('Incompatible camp save');return copy(validate(snapshot.game));}
