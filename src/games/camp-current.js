/** Current Camp 0.3.0: owned resources, paid people and one current snapshot.
 * No historical host, migration, command transcript or private work helper.
 */
import {practice} from '../core/model.js';
import {HUMAN_VERSION,RUNTIME_VERSION,createPerson,restorePerson,exportPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,assessEffort,createClock,restoreClock,exportClock,scheduleEvent,cancelEvent,advanceClock} from '../runtime/index.js';
export const CAMP_VERSION='0.3.0';
const copy=value=>structuredClone(value),EPS=1e-12,LIMIT=1e9;
const resources=['timber','salvage','food'],projects=['shelter','workbench','garden','cache'],ACTORS=['player','neighbor'],INITIAL={timber:4,salvage:2,food:4};
const trusted=new WeakSet();
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function seal(game){validate(game);freeze(game);trusted.add(game);return game;}
export const PROJECTS=freeze({
  shelter:{label:'Woodshed',benefit:'Keep an extra usable bundle dry: timber trips bring 4 instead of 3.',stages:[{label:'Raise the frame',cost:{timber:4,salvage:1},minutes:24},{label:'Roof and storage',cost:{timber:4,salvage:2},minutes:28}]},
  workbench:{label:'Workbench',benefit:'Every later assembly takes 6 fewer minutes.',stages:[{label:'Build the table',cost:{timber:3,salvage:2},minutes:22},{label:'Fit the tools',cost:{timber:3,salvage:3},minutes:28}]},
  garden:{label:'Garden',benefit:'Food trips bring 3 portions instead of 2.',stages:[{label:'Edge the beds',cost:{timber:5,salvage:1},minutes:20},{label:'Plant and mulch',cost:{timber:3,salvage:1},minutes:26}]},
  cache:{label:'Supply cache',benefit:'Pack timber and salvage into one supply cache.',stages:[{label:'Pack a supply cache',cost:{timber:6,salvage:3},minutes:26}]}
});
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
const actors=()=>ACTORS;
const built=g=>['shelter','workbench','garden'].every(p=>g.structures[p]===2);
const complete=(g,p)=>p!=='cache'&&g.structures[p]===2;
const stage=(g,p)=>p==='cache'?0:g.structures[p];
const add=(to,from,mult=1)=>{for(const [r,n]of Object.entries(from))to[r]+=n*mult;};
const name=a=>a==='player'?'You':'Meryem';
const workId=(g,p)=>`${p}-${p==='cache'?g.caches:stage(g,p)}`;
function record(g,actor,message){g.recent.push({at:g.clock.now,actor,message});if(g.recent.length>16)g.recent.shift();}
function duration(g,w,a){const tool=g.structures.workbench===2;return Math.max(6,w.durationByActor[a]-(tool?6:0));}
function remaining(g,w,a){return Math.max(1,Math.ceil((1-w.progress)*duration(g,w,a)-EPS));}
function seedWork(g,p){return {id:workId(g,p),project:p,stage:stage(g,p),cost:copy(PROJECTS[p].stages[stage(g,p)].cost),progress:0,workbenchAtStart:g.structures.workbench===2,durationByActor:{},contributions:{},exposure:{},startedAt:g.clock.now,completedAt:null};}
function prepare(g,w,a){
  w.durationByActor[a]??=PROJECTS[w.project].stages[w.stage].minutes-Math.floor(g.people[a].skills.construction*4);
  w.contributions[a]??={priorMinutes:0,minutes:0,fraction:0,effort:0};
  w.exposure[a]??={at:g.clock.now,paidBefore:g.paid[a].constructionMinutes,toolMinutes:0};
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
    g.clock=event.clock;g.people[a]=person;g.jobs[a]={kind:'fixed',...b,startedAt:g.clock.now,endsAt,eventId:event.eventId,attemptId:person.pending.id};
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
  const c=g.commitment;
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
        w.progress+=fraction;const contribution=w.contributions[a];contribution.minutes++;if(g.structures.workbench===2)w.exposure[a].toolMinutes++;contribution.fraction+=fraction;contribution.effort+=.2*fraction;
        p.work++;p.constructionMinutes++;p.effort+=.2*fraction;g.stats.workMinutes++;if(w.progress>=1-EPS)done.push(a);
      }else if(j){
        g.people[a]=advanceAttempt(g.people[a],1);p[j.id==='eat'?'meal':'work']++;g.stats[j.id==='eat'?'mealMinutes':'workMinutes']++;
        if(j.action.skill==='gathering')p.gatheringMinutes++;p.effort+=j.action.effort/j.duration;
      }else{
        const recovering=true;
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
function request(g,project){
  if(typeof project!=='string'||!projects.includes(project))fail('Unknown project');
  const c=g.commitment,reason=c.status==='accepted'?'I already accepted a project. Finish it or release that commitment first.':complete(g,project)?'That structure is already complete.':project==='cache'&&!built(g)?'We need the woodshed, workbench, and garden before packing a cache.':null;
  g.lastResponse={at:g.clock.now,project,accepted:!reason,reason:reason??`Yes. I will help finish the ${PROJECTS[project].label.toLowerCase()}, gather its supplies and recover when needed.`};
  if(!reason||c.status!=='accepted')g.commitment={status:reason?'declined':'accepted',project,acceptedAt:reason?null:g.clock.now,finishedAt:null,startCaches:g.caches,reason:g.lastResponse.reason};
  record(g,'neighbor',g.lastResponse.reason);neighbor(g);
}
function release(g){
  if(g.commitment.status!=='accepted')fail('No accepted project to release');
  if(g.jobs.neighbor&&!['eat','forage'].includes(g.jobs.neighbor.id))stop(g,'neighbor');
  const c=g.commitment;c.status='released';c.finishedAt=g.clock.now;c.reason='Our project is released. Its installed work remains; I choose my own recovery.';record(g,'neighbor',c.reason);
}
function handover(g,from,to){
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
}
function nextStop(g){
  const scheduled=actors(g).filter(a=>g.jobs[a]).map(a=>g.jobs[a].kind==='fixed'?g.jobs[a].endsAt-g.clock.now:remaining(g,g.work[g.jobs[a].project],a));
  const probe=copy(g),horizon=Math.min(scheduled.length?Math.min(...scheduled):6,LIMIT-g.clock.now),start=g.stats.completed;
  const blocked=!g.jobs.player
    ?[...Object.keys(JOBS),...projects.filter(p=>!complete(g,p)).map(p=>`build-${p}`)].filter(id=>unavailable(g,blueprint(g,id,'player'),'player')):[];
  for(let n=1;n<=horizon;n++){
    const before=Object.fromEntries(actors(g).map(a=>[a,{fatigue:probe.people[a].body.fatigue,job:probe.jobs[a]?.id??null}]));
    advanceRaw(probe,1);
    if(probe.stats.completed>start)return {at:probe.clock.now,reason:'job-complete'};
    if(actors(g).some(a=>!before[a].job&&probe.jobs[a]))return {at:probe.clock.now,reason:'ready-for-work'};
    if(!probe.jobs.player&&blocked.some(id=>!unavailable(probe,blueprint(probe,id,'player'),'player')))return {at:probe.clock.now,reason:'player-ready-for-work'};
    if(actors(g).some(a=>before[a].fatigue>0&&probe.people[a].body.fatigue===0))return {at:probe.clock.now,reason:'recovery-floor'};
  }return {at:g.clock.now+horizon,reason:horizon?'review-interval':'world-limit'};
}
function jobView(g,a){
  const j=g.jobs[a];if(!j)return null;
  if(j.kind==='fixed')return {id:j.id,label:j.label,project:null,startedAt:j.startedAt,endsAt:j.endsAt,duration:j.duration,remaining:j.endsAt-g.clock.now,cost:copy(j.cost),workId:null,progress:g.people[a].pending.elapsedMinutes/j.duration};
  const w=g.work[j.project],left=remaining(g,w,a);return {id:j.id,label:`${PROJECTS[j.project].label}: ${PROJECTS[j.project].stages[w.stage].label.toLowerCase()}`,project:j.project,startedAt:j.startedAt,endsAt:g.clock.now+left,duration:g.clock.now-j.startedAt+left,remaining:left,cost:copy(w.cost),workId:w.id,progress:w.progress};
}

const count=(g,destination)=>g.window?.allocations.filter(item=>item.destination===destination).length??0;
const covered=g=>count(g,'households')===2&&count(g,'camp')===2;
function phase(g){
  const w=g.window;if(!w)return 'camp';if(g.returned)return 'camp-return';
  if(w.finishedAt!==null)return 'ended';if(!w.acknowledged)return 'introduction';
  if(g.clock.now===w.rainAt)return 'rain';if(w.departedAt===null&&g.clock.now===w.ferryAt)return 'ferry';return 'packing';
}
const timeLimit=g=>g.window?LIMIT:LIMIT-180;
const pauseReason=g=>({introduction:'Read the new supply objective, then Continue.',ferry:'The ferry is waiting. Allocate supplies, then send it.',rain:'The rain checkpoint is here. Allocate remaining camp supplies, then finish.',ended:'This supply window is finished. Return to camp or save and leave.'})[phase(g)]??(g.clock.now>=timeLimit(g)?'The supported camp time limit is reached. Stop active work or save and leave.':null);
const runs=g=>['camp','packing','camp-return'].includes(phase(g))&&g.clock.now<timeLimit(g);
function requireRunning(g){if(!runs(g))fail(pauseReason(g));}
function enter(g){g.window={enteredAt:g.clock.now,ferryAt:g.clock.now+90,rainAt:g.clock.now+180,carriedCaches:0,production:[],allocations:[],acknowledged:false,departedAt:null,finishedAt:null};}
export function createGame(input={}){
  inspect(input);fields(input,[],'camp setup');
  return seal({version:CAMP_VERSION,runtimeVersion:RUNTIME_VERSION,humanVersion:HUMAN_VERSION,clock:createClock(),
    people:Object.fromEntries(ACTORS.map(id=>[id,createPerson({id,body:{fatigue:id==='player'?.20:.30,hunger:id==='player'?.22:.28},skills:{gathering:.10,construction:.05}})])),
    jobs:{player:null,neighbor:null},stock:copy(INITIAL),structures:{shelter:0,workbench:0,garden:0},caches:0,milestoneAt:null,
    commitment:{status:'none',project:null,acceptedAt:null,finishedAt:null,startCaches:0,reason:'Ask me to help with a specific project. I’ll tell you what I can do.'},lastResponse:null,
    stats:{started:0,completed:0,canceled:0,gathered:{timber:0,salvage:0,food:0},spent:{timber:0,salvage:0,food:0},consumedFood:0,workMinutes:0,restMinutes:0,mealMinutes:0,idleMinutes:0,receipts:{'gather-timber':0,'gather-salvage':0,forage:0,rest:0,eat:0,coveredTimber:0,gardenFood:0}},
    recent:[],work:{},lastAssemblies:{},paid:Object.fromEntries(ACTORS.map(a=>[a,{work:0,recovery:0,idle:0,meal:0,effort:0,constructionMinutes:0,gatheringMinutes:0}])),recovering:{player:false,neighbor:false},window:null,returned:false});
}
export function applyCommand(game,command){
  validate(game);inspect(command);
  const schema={start:['type','job'],cancel:['type'],request:['type','project'],release:['type'],handover:['type','from','to'],continue:['type'],allocate:['type','destination'],dispatch:['type'],finish:['type'],return:['type']};
  if(!command||!Object.hasOwn(schema,command.type))fail('Unknown camp command');fields(command,schema[command.type],'camp command');
  const g=copy(game),w=g.window,current=phase(g),type=command.type;
  if(['start','request','handover'].includes(type))requireRunning(g);
  if(type==='start'){begin(g,command.job,'player');neighbor(g);}
  else if(type==='cancel'){stop(g,'player');neighbor(g);}
  else if(type==='request')request(g,command.project);
  else if(type==='release')release(g);
  else if(type==='handover')handover(g,command.from,command.to);
  else if(type==='continue'){if(current!=='introduction')fail('The introduction was already continued or has not begun');w.acknowledged=true;}
  else if(type==='allocate'){
    if(!w||['introduction','ended','camp-return'].includes(current))fail('Allocation is unavailable before Continue or after the window is finished');
    const d=command.destination;if(!['households','camp'].includes(d))fail('Unknown cache destination');
    if(d==='households'&&w.departedAt!==null)fail('The ferry has departed. Later caches can still provision camp.');
    if(count(g,d)>=2)fail('This destination is fully covered');if(g.caches<=w.allocations.length)fail('Complete a cache before allocating it');
    const used=new Set(w.allocations.map(item=>item.cache));let cache=1;while(used.has(cache))cache++;
    w.allocations.push({at:g.clock.now,cache,destination:d});
  }else if(type==='dispatch'){
    if(!w||w.departedAt!==null)fail('The ferry has already departed or no window exists');
    if(current!=='ferry')fail('Reach the ferry checkpoint before dispatching');w.departedAt=g.clock.now;
  }else if(type==='finish'){
    if(!w||w.finishedAt!==null)fail('The window is already finished or has not begun');
    if(current!=='rain'&&!(current==='packing'&&w.departedAt!==null&&covered(g)))fail('Reach rain, or dispatch the ferry with all needs covered before finishing');w.finishedAt=g.clock.now;
  }else if(type==='return'){if(current!=='ended')fail('Return requires a finished window that has not already returned');g.returned=true;}
  return seal(g);
}
export function advanceGame(game,minutes){
  validate(game);requireRunning(game);int(minutes,0,1440,'advance minutes');
  const g=copy(game),w=g.window,checkpoint=w&&!g.returned?(w.departedAt===null?w.ferryAt:w.rainAt):timeLimit(g),target=Math.min(checkpoint,g.clock.now+minutes);
  while(g.clock.now<target){
    const before=g.caches;advanceRaw(g,1);
    if(w&&!g.returned)for(let cache=before+1;cache<=g.caches;cache++)w.production.push({cache,at:g.clock.now});
    if(!w&&g.milestoneAt!==null){enter(g);break;}
  }
  return seal(g);
}
export function advanceToNextEvent(game){validate(game);requireRunning(game);return advanceGame(game,Math.max(1,nextStop(game).at-game.clock.now));}
export function getGameView(game){
  validate(game);const g=game,w=g.window,current=phase(g),now=g.clock.now,canAdvance=runs(g),households=count(g,'households'),campCount=count(g,'camp');
  const stop=canAdvance?nextStop(g):null,checkpoint=w&&!g.returned?(w.departedAt===null?w.ferryAt:w.rainAt):timeLimit(g),openWindow=Boolean(w)&&!g.returned&&w.finishedAt===null;
  const choices=[...Object.keys(JOBS),...projects.filter(p=>!complete(g,p)).map(p=>`build-${p}`)].map(id=>{
    const b=blueprint(g,id,'player');return {id,label:b.label,detail:b.detail,duration:b.duration,cost:b.cost,output:b.output,project:b.project,stage:b.stage,
      unavailable:canAdvance?unavailable(g,b,'player'):pauseReason(g),finishesBeforeFerry:openWindow&&w.departedAt===null&&now+b.duration<=w.ferryAt,finishesBeforeRain:openWindow&&now+b.duration<=w.rainAt};
  });
  return copy({version:CAMP_VERSION,now,phase:current,stock:g.stock,structures:g.structures,caches:g.caches,milestoneAt:g.milestoneAt,
    people:Object.fromEntries(ACTORS.map(a=>[a,{...getPersonView(g.people[a]),job:jobView(g,a),availableActivity:'recovery'}])),
    commitment:g.commitment,lastResponse:g.lastResponse,recent:g.recent,stats:g.stats,work:g.work,lastAssemblies:g.lastAssemblies,paid:g.paid,choices,
    nextStop:stop,nextEventAt:canAdvance?Math.min(stop.at,checkpoint):null,window:w,enteredAt:w?.enteredAt??null,ferryAt:w?.ferryAt??null,rainAt:w?.rainAt??null,
    elapsed:w?now-w.enteredAt:null,remaining:w?Math.max(0,w.rainAt-now):null,ferryRemaining:w?Math.max(0,w.ferryAt-now):null,availableCaches:g.caches-(w?.allocations.length??0),carriedCaches:w?.carriedCaches??0,
    householdsEquipped:households,campNights:campCount*2,unprovidedHouseholds:2-households,unprovidedNights:4-campCount*2,departed:Boolean(w)&&w.departedAt!==null,
    canFinish:current==='rain'||current==='packing'&&w.departedAt!==null&&covered(g),canAdvance,canAssign:canAdvance,pauseReason:pauseReason(g)});
}

// Bound untrusted data before any cloning, accessor invocation or serialization.
function inspect(value){
  const seen=new WeakSet();let budget=262144;
  const debit=n=>{if((budget-=n)<0)fail('Camp JSON size limit');};
  function visit(v,depth){
    if(depth>32)fail('Camp JSON depth limit');
    if(v===null||typeof v==='boolean'){debit(5);return;}
    if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('Invalid JSON number');debit(String(v).length);return;}
    if(typeof v==='string'){if(v.length>10000)fail('Camp JSON string limit');debit(JSON.stringify(v).length);return;}
    if(typeof v!=='object'||seen.has(v))fail('Camp requires an unshared JSON tree');seen.add(v);
    const array=Array.isArray(v),keys=Reflect.ownKeys(v),proto=Object.getPrototypeOf(v);
    if(array?proto!==Array.prototype||keys.length!==v.length+1:![Object.prototype,null].includes(proto))fail('Invalid JSON object');
    debit(2);for(const key of keys){
      if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(v,key);
      if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))fail('Invalid JSON accessor/key');
      if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=v.length))fail('Invalid JSON array index');
      debit(key.length+3);visit(d.value,depth+1);
    }
  }visit(value,0);
}
function validateWork(g,w,p,finished){
  fields(w,['id','project','stage','cost','progress','workbenchAtStart','durationByActor','contributions','exposure','startedAt','completedAt'],'physical work');
  if(w.project!==p||!projects.includes(p))fail('Invalid physical project');int(w.stage,0,p==='cache'?0:1,'physical stage');
  const index=p==='cache'?g.caches-(finished?1:0):w.stage;
  if(w.id!==`${p}-${index}`||!same(w.cost,PROJECTS[p].stages[w.stage].cost))fail('Invalid work identity or material');
  int(w.startedAt,0,g.clock.now,'work start');number(w.progress,0,1,'work progress');
  const end=finished?w.completedAt:g.clock.now,toolAt=g.structures.workbench===2?g.lastAssemblies.workbench.completedAt:null;
  if(typeof w.workbenchAtStart!=='boolean'||w.workbenchAtStart!==(toolAt!==null&&toolAt<=w.startedAt))fail('Invalid workbench start benefit');
  if(finished){int(w.completedAt,w.startedAt+1,g.clock.now,'work completion');if(w.progress!==1||p!=='cache'&&w.stage!==g.structures[p]-1)fail('Invalid completed work');}
  else if(w.completedAt!==null||w.progress>=1-EPS||w.stage!==stage(g,p))fail('Invalid unfinished work');
  const workers=Object.keys(w.durationByActor);if(!workers.length||workers.some(a=>!ACTORS.includes(a)))fail('Invalid workers');
  fields(w.contributions,workers,'contributions');fields(w.exposure,workers,'work exposure');
  let sum=0,minutes=0,earlyTotal=0,lateTotal=0;const rates=[];
  for(const a of workers){
    const c=w.contributions[a],e=w.exposure[a],base=PROJECTS[p].stages[w.stage].minutes;
    fields(c,['priorMinutes','minutes','fraction','effort'],'contribution');fields(e,['at','paidBefore','toolMinutes'],'exposure');
    if(c.priorMinutes!==0)fail('Historical construction is unsupported');int(c.minutes,0,end-w.startedAt,'work minutes');int(e.at,w.startedAt,end,'worker join');
    int(e.paidBefore,0,g.paid[a].constructionMinutes,'basis paid');int(e.toolMinutes,0,c.minutes,'tool minutes');
    if(e.paidBefore>e.at||e.paidBefore+c.minutes>g.paid[a].constructionMinutes||w.durationByActor[a]!==base-Math.floor(practice(.05,e.paidBefore)*4))fail('Changed worker basis or paid ownership');
    number(c.fraction,0,1,'fraction');number(c.effort,0,.2,'work effort');if(Math.abs(c.effort-.2*c.fraction)>1e-10)fail('Inconsistent work effort');
    const early=c.minutes-e.toolMinutes,earlyEnd=toolAt===null?end:Math.min(end,toolAt),lateStart=toolAt===null?end:Math.max(e.at,toolAt);
    if(early>Math.max(0,earlyEnd-e.at)||e.toolMinutes>Math.max(0,end-lateStart))fail('Work exceeds available rate interval');
    const slow=1/w.durationByActor[a],fast=1/Math.max(6,w.durationByActor[a]-6),full=early*slow+e.toolMinutes*fast,last=e.toolMinutes?fast:slow;
    rates.push({c,full,last});sum+=c.fraction;minutes+=c.minutes;earlyTotal+=early;lateTotal+=e.toolMinutes;
  }
  if(Math.abs(sum-w.progress)>1e-10||minutes>end-w.startedAt)fail('Inconsistent physical progress or paid duration');
  if(earlyTotal>Math.max(0,(toolAt===null?end:Math.min(end,toolAt))-w.startedAt)||lateTotal>Math.max(0,end-(toolAt===null?end:Math.max(w.startedAt,toolAt))))fail('One work item cannot have concurrent rate exposure');
  const exactRate=({c,full})=>Math.abs(c.fraction-full)<=EPS;
  if(!finished){if(!rates.every(exactRate))fail('Unpaid work fraction');}
  else if(!rates.some((candidate,i)=>candidate.c.minutes>0&&candidate.c.fraction-(candidate.full-candidate.last)>EPS&&candidate.c.fraction<=candidate.full+EPS&&rates.every((r,j)=>i===j||exactRate(r))))fail('Completed work lacks a positive terminal paid minute');
}
function validateWindow(g){
  const w=g.window,now=g.clock.now;
  if(w===null){if(g.returned||g.milestoneAt!==null||now>LIMIT-180)fail('Invalid pre-window camp');return;}
  fields(w,['enteredAt','ferryAt','rainAt','carriedCaches','production','allocations','acknowledged','departedAt','finishedAt'],'supply window');
  int(w.enteredAt,1,LIMIT-180,'window entry');if(w.enteredAt!==g.milestoneAt||w.ferryAt!==w.enteredAt+90||w.rainAt!==w.enteredAt+180||w.carriedCaches!==0||typeof w.acknowledged!=='boolean')fail('Invalid earned window');
  if(w.departedAt!==null&&w.departedAt!==w.ferryAt)fail('Invalid ferry departure');
  if(!w.acknowledged&&(now!==w.enteredAt||w.departedAt!==null||w.finishedAt!==null||w.allocations.length))fail('Invalid introduction');
  if(w.finishedAt!==null){int(w.finishedAt,w.ferryAt,Math.min(now,w.rainAt),'window finish');if(w.departedAt===null||!w.acknowledged)fail('Finish requires actual dispatch');if(w.finishedAt<w.rainAt&&!covered(g))fail('Early finish requires all allocations');}
  if(g.returned&&w.finishedAt===null||!g.returned&&w.finishedAt!==null&&now!==w.finishedAt)fail('Invalid return or finished time');
  if(now<w.enteredAt||!g.returned&&now>(w.departedAt===null?w.ferryAt:w.rainAt)||w.departedAt!==null&&now<w.ferryAt)fail('Clock crossed a supply checkpoint');
  const end=w.finishedAt??now;
  if(!Array.isArray(w.production)||w.production.length>11||!Array.isArray(w.allocations)||w.allocations.length>4)fail('Invalid window receipts');
  if(!g.returned&&w.production.length!==g.caches||g.returned&&w.production.length>g.caches)fail('Inconsistent window cache count');
  let prior=w.enteredAt;const produced=new Map();
  for(const [i,item]of w.production.entries()){fields(item,['cache','at'],'production');int(item.at,prior+16,end,'production time');if(item.cache!==i+1)fail('Invalid cache production identity');prior=item.at;produced.set(item.cache,item.at);}
  if(w.production.length&&g.caches===w.production.length&&g.lastAssemblies.cache.completedAt!==w.production.at(-1).at)fail('Window receipt disagrees with latest cache completion');
  if(g.returned&&g.caches>w.production.length&&g.lastAssemblies.cache.completedAt<=w.finishedAt)fail('Returned cache completion predates continued work');
  const used=new Set();prior=w.enteredAt;
  for(const item of w.allocations){fields(item,['at','cache','destination'],'allocation');int(item.at,prior,end,'allocation time');prior=item.at;
    if(!['households','camp'].includes(item.destination)||!produced.has(item.cache)||used.has(item.cache)||item.at<produced.get(item.cache)||item.destination==='households'&&item.at>w.ferryAt)fail('Invalid owned allocation');used.add(item.cache);
  }
  if(count(g,'households')>2||count(g,'camp')>2)fail('Destination overprovided');
}
function validate(game){
  if(trusted.has(game))return game;inspect(game);
  fields(game,['version','runtimeVersion','humanVersion','clock','people','jobs','stock','structures','caches','milestoneAt','commitment','lastResponse','stats','recent','work','lastAssemblies','paid','recovering','window','returned'],'camp');
  const g=game,now=g.clock.now;
  if(g.version!==CAMP_VERSION||g.runtimeVersion!==RUNTIME_VERSION||g.humanVersion!==HUMAN_VERSION||typeof g.returned!=='boolean')fail('Incompatible current Camp version');
  restoreClock(exportClock(g.clock));int(now,0,LIMIT,'world time');int(g.clock.nextEvent,1,Number.MAX_SAFE_INTEGER-2*(LIMIT-now),'event counter');
  for(const key of ['people','jobs','paid','recovering'])fields(g[key],ACTORS,key);
  fields(g.stock,resources,'stock');fields(g.structures,['shelter','workbench','garden'],'structures');
  for(const r of resources)int(g.stock[r],0,LIMIT,'stock');for(const value of Object.values(g.structures))int(value,0,2,'structure stage');int(g.caches,0,LIMIT,'caches');
  if(g.milestoneAt!==null)int(g.milestoneAt,1,now,'milestone');if(built(g)!==(g.milestoneAt!==null)||g.caches>0&&!built(g))fail('Invalid camp milestone');
  for(const key of ['work','lastAssemblies'])if(!g[key]||typeof g[key]!=='object'||Array.isArray(g[key])||Object.keys(g[key]).some(p=>!projects.includes(p)))fail('Invalid physical work collection');
  for(const p of projects)if(Boolean(g.lastAssemblies[p])!==(p==='cache'?g.caches>0:g.structures[p]>0))fail('Missing current completion receipt');
  for(const [p,w]of Object.entries(g.lastAssemblies))validateWork(g,w,p,true);for(const [p,w]of Object.entries(g.work))validateWork(g,w,p,false);
  if(built(g)&&g.milestoneAt!==Math.max(...['shelter','workbench','garden'].map(p=>g.lastAssemblies[p].completedAt)))fail('Milestone does not match established structures');
  fields(g.stats,['started','completed','canceled','gathered','spent','consumedFood','workMinutes','restMinutes','mealMinutes','idleMinutes','receipts'],'stats');
  const s=g.stats,r=s.receipts;
  for(const [key,value]of Object.entries(s))if(!['gathered','spent','receipts'].includes(key))int(value,0,Number.MAX_SAFE_INTEGER,'stat');
  for(const key of ['gathered','spent']){fields(s[key],resources,key);for(const value of Object.values(s[key]))int(value,0,LIMIT,key);}
  fields(r,['gather-timber','gather-salvage','forage','rest','eat','coveredTimber','gardenFood'],'receipts');for(const value of Object.values(r))int(value,0,LIMIT,'receipt');
  if(r.rest!==0||s.idleMinutes!==0||r.coveredTimber>r['gather-timber']||r.gardenFood>r.forage||r.coveredTimber>0&&g.structures.shelter!==2||r.gardenFood>0&&g.structures.garden!==2)fail('Invalid completion benefit');
  if(s.gathered.timber!==3*r['gather-timber']+r.coveredTimber||s.gathered.salvage!==3*r['gather-salvage']||s.gathered.food!==2*r.forage+r.gardenFood||s.consumedFood!==r.eat)fail('Invalid production counts');
  const spent={timber:6*g.caches,salvage:3*g.caches,food:r.eat},reserved={timber:0,salvage:0,food:0};
  for(const p of ['shelter','workbench','garden'])for(let n=0;n<g.structures[p];n++)add(spent,PROJECTS[p].stages[n].cost);
  for(const w of Object.values(g.work))add(reserved,w.cost);
  const totals={work:0,recovery:0,meal:0,construction:0,gathering:0,effort:0},pending={meal:0,gathering:0,effort:0},events=[],assigned=[];
  for(const a of ACTORS){
    const person=restorePerson(exportPerson(g.people[a])),paid=g.paid[a],j=g.jobs[a];
    if(person.version!==HUMAN_VERSION||person.id!==a||person.minutes!==now||person.observationBias!==0)fail('Invalid person identity or clock');
    int(person.nextAttempt,1,Number.MAX_SAFE_INTEGER-(LIMIT-now),'attempt counter');fields(person.skills,['gathering','construction'],'skills');
    fields(paid,['work','recovery','idle','meal','effort','constructionMinutes','gatheringMinutes'],'paid');
    for(const [key,value]of Object.entries(paid))key==='effort'?number(value,0,LIMIT,'paid effort'):int(value,0,now,'paid minutes');
    if(paid.idle!==0||paid.work+paid.recovery+paid.meal!==now||paid.constructionMinutes+paid.gatheringMinutes!==paid.work)fail('Invalid paid time ownership');
    for(const skill of ['construction','gathering'])if(Math.abs(person.skills[skill]-practice(skill==='construction'?.05:.1,paid[`${skill}Minutes`]))>1e-10)fail('Practice does not match paid ownership');
    let recordedMinutes=0,recordedEffort=0;for(const w of [...Object.values(g.work),...Object.values(g.lastAssemblies)]){const c=w.contributions[a];if(c){recordedMinutes+=c.minutes;recordedEffort+=c.effort;}}
    if(recordedMinutes>paid.constructionMinutes||recordedEffort>paid.effort+1e-10||paid.effort>paid.constructionMinutes*.2/6+paid.gatheringMinutes*.13/12+1e-10)fail('Invalid paid construction totals');
    totals.work+=paid.work;totals.recovery+=paid.recovery;totals.meal+=paid.meal;totals.construction+=paid.constructionMinutes;totals.gathering+=paid.gatheringMinutes;totals.effort+=paid.effort;
    if(typeof g.recovering[a]!=='boolean'||a==='player'&&g.recovering[a])fail('Invalid recovery flag');
    if(!j){if(person.pending)fail('Unassigned pending attempt');continue;}
    if(j.kind==='assembly'){
      fields(j,['kind','id','project','workId','startedAt'],'assembly assignment');const w=g.work[j.project];
      if(!w||w.id!==j.workId||j.id!==`build-${j.project}`||!Object.hasOwn(w.contributions,a)||person.pending)fail('Invalid assembly assignment');
      int(j.startedAt,w.exposure[a].at,now,'assignment start');assigned.push(j.project);
      if(now+remaining(g,w,a)>LIMIT||!assessEffort(person.body,{durationMinutes:remaining(g,w,a),effort:.2*(1-w.progress),exertive:true}).allowed)fail('Assigned assembly lacks remaining capacity or time');
      if(a==='neighbor'&&(g.commitment.status!=='accepted'||g.commitment.project!==j.project))fail('Assembly lacks accepted project consent');
    }else if(j.kind==='fixed'){
      fields(j,['kind','id','label','detail','project','stage','cost','output','duration','benefits','skillBefore','action','startedAt','endsAt','eventId','attemptId'],'fixed job');
      if(!Object.hasOwn(JOBS,j.id)||!person.pending)fail('Invalid fixed job');int(j.startedAt,0,now,'fixed start');int(j.endsAt,now+1,LIMIT,'fixed end');
      const d=JOBS[j.id],skill=d.skill??null,elapsed=now-j.startedAt;
      if(j.id==='eat'){if(paid.meal<elapsed)fail('Pending meal lacks owned paid time');pending.meal+=elapsed;}
      fields(j.benefits,['shelter','workbench','garden'],'fixed benefits');
      for(const p of ['shelter','workbench','garden'])if(j.benefits[p]!==(g.structures[p]===2&&g.lastAssemblies[p].completedAt<=j.startedAt))fail('Invalid fixed benefit timing');
      const output=copy(d.output??{});if(j.id==='gather-timber'&&j.benefits.shelter)output.timber++;if(j.id==='forage'&&j.benefits.garden)output.food++;
      const duration=Math.max(6,d.minutes-(skill?Math.floor(j.skillBefore*4):0)),action={actionId:j.id,targetId:null,durationMinutes:duration,effort:d.effort??0,exertive:Boolean(d.effort),activity:d.activity??'active',skill};
      if(j.label!==d.label||j.detail!==d.detail||j.project!==null||j.stage!==null||j.duration!==duration||!same(j.cost,d.cost??{})||!same(j.output,output)||!same(j.action,action)||!same(j.action,person.pending.action))fail('Changed fixed job definition');
      if(skill?(j.skillBefore!==person.pending.skillBefore||Math.abs(j.skillBefore-practice(.1,paid.gatheringMinutes-elapsed))>1e-10):j.skillBefore!==null)fail('Invalid fixed practice basis');
      if(j.endsAt!==j.startedAt+j.duration||person.pending.startedAt!==j.startedAt||person.pending.elapsedMinutes!==elapsed||j.attemptId!==person.pending.id||!person.pending.capacity.allowed)fail('Invalid fixed pending time');
      if(skill){
        const effort=j.action.effort*elapsed/j.duration;
        if(paid.gatheringMinutes<elapsed||paid.effort+1e-10<recordedEffort+effort)fail('Pending gathering lacks owned paid time or effort');
        pending.gathering+=elapsed;pending.effort+=effort;
      }
      add(reserved,j.cost);events.push({id:j.eventId,at:j.endsAt,type:'job-complete',actorId:a,data:{jobId:j.id,attemptId:j.attemptId}});
    }else fail('Unknown assignment kind');
  }
  events.sort((a,b)=>a.at-b.at||Number(a.id.slice(6))-Number(b.id.slice(6)));
  if(!same(events,g.clock.queue)||new Set(assigned).size!==assigned.length)fail('Inconsistent pending events or exclusive work');
  const assemblies=Object.values(g.structures).reduce((a,b)=>a+b,0)+g.caches;
  if(s.completed!==assemblies+r['gather-timber']+r['gather-salvage']+r.forage+r.eat||s.started-s.completed-s.canceled!==Object.values(g.jobs).filter(Boolean).length||s.started>Number.MAX_SAFE_INTEGER-2*(LIMIT-now))fail('Inconsistent completion and assignment counts');
  if(totals.work!==s.workMinutes||totals.recovery!==s.restMinutes||totals.meal!==s.mealMinutes||totals.meal<8*r.eat+pending.meal||totals.construction<6*assemblies||totals.effort+1e-10<.2*(assemblies+Object.values(g.work).reduce((sum,w)=>sum+w.progress,0))+.13*r['gather-timber']+.17*r['gather-salvage']+pending.effort||totals.gathering<12*r['gather-timber']+18*r['gather-salvage']+10*r.forage+pending.gathering)fail('Inconsistent total paid time or effort');
  for(const resource of resources)if(s.spent[resource]!==spent[resource]||g.stock[resource]+reserved[resource]+spent[resource]!==INITIAL[resource]+s.gathered[resource])fail('Material ownership does not balance');
  const c=g.commitment;fields(c,['status','project','acceptedAt','finishedAt','startCaches','reason'],'commitment');
  if(!['none','declined','accepted','fulfilled','released'].includes(c.status)||typeof c.reason!=='string'||c.reason.length>600)fail('Invalid commitment');int(c.startCaches,0,g.caches,'commitment cache start');
  if(c.status==='none'){if(c.project!==null||c.acceptedAt!==null||c.finishedAt!==null)fail('Invalid absent commitment');}
  else{if(!projects.includes(c.project))fail('Invalid committed project');
    if(c.status==='declined'){if(c.acceptedAt!==null||c.finishedAt!==null)fail('Invalid declined commitment');}
    else{int(c.acceptedAt,0,now,'acceptance');if(c.status==='accepted'&&c.finishedAt!==null)fail('Accepted project has finish');if(c.status!=='accepted')int(c.finishedAt,c.acceptedAt,now,'commitment finish');
      if(c.status==='fulfilled'&&!(c.project==='cache'?g.caches>c.startCaches:complete(g,c.project))||c.status==='accepted'&&(c.project==='cache'?g.caches>c.startCaches:complete(g,c.project)))fail('Commitment completion mismatch');
    }
  }
  if(g.lastResponse!==null){const r=g.lastResponse;fields(r,Object.hasOwn(r,'kind')?['at','project','accepted','reason','kind','from','to']:['at','project','accepted','reason'],'response');int(r.at,0,now,'response time');
    if(!projects.includes(r.project)||typeof r.accepted!=='boolean'||typeof r.reason!=='string'||r.reason.length>600)fail('Invalid response');if(Object.hasOwn(r,'kind')&&(r.kind!=='handover'||!ACTORS.includes(r.from)||!ACTORS.includes(r.to)||r.from===r.to))fail('Invalid handover response');
  }
  if(!Array.isArray(g.recent)||g.recent.length>16)fail('Invalid recent messages');let at=0;for(const e of g.recent){fields(e,['at','actor','message'],'message');int(e.at,at,now,'message time');at=e.at;if(![...ACTORS,'world'].includes(e.actor)||typeof e.message!=='string'||e.message.length>600)fail('Invalid message');}
  validateWindow(g);return g;
}
export function exportGame(game){validate(game);return copy({format:'human-camp-current',version:1,game});}
export function restoreGame(snapshot){
  inspect(snapshot);fields(snapshot,['format','version','game'],'Camp snapshot');
  if(snapshot.format!=='human-camp-current'||snapshot.version!==1)fail('Incompatible save. This page supports current Camp 0.3 saves only.');return seal(copy(validate(snapshot.game)));
}
