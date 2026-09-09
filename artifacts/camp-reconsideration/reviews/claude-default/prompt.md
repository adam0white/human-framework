Review a private deterministic game-host policy candidate for correctness, lifecycle/ownership, agency, event ordering and test adequacy. You have no tools; all relevant code is supplied below. Identify concrete actionable issues with file/function references; distinguish real defects from explicit design tradeoffs or untested performance hypotheses. Do not claim execution or comparative success. The candidate comparison uses a validated baseline-produced state with only the hostversion retagged at a declared policy boundary; it is not evidence of an always-active candidate history. No human feedback or player saves are supplied. Keep the review focused, with at most five material findings and a scoped verdict.


===== src/games/camp-current.js =====
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


===== src/human/v0.1.1.js =====
import {PARAMETERS,practice,successChance,assessCapacity,clamp,finite} from '../core/model.js';

export const HUMAN_VERSION='0.1.1';
export {PARAMETERS};
const copy=value=>structuredClone(value);
const activities=['active','rest','meal'];

function object(value,name,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  if(Object.keys(value).some(key=>!keys.includes(key)))throw new Error(`Unknown ${name} field`);
}
function identity(value,name) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}
function body(value) {
  object(value,'body',['fatigue','hunger']);
  finite(value.fatigue,'fatigue');finite(value.hunger,'hunger');
}
function skills(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Invalid skills');
  if(Object.keys(value).length>64)throw new Error('Too many skills');
  for(const [key,level] of Object.entries(value)) {identity(key,'skill');finite(level,`skill ${key}`);}
}

function validateCapacity(value,expected) {
  const fields=Object.keys(expected);
  object(value,'pending capacity',fields);
  if(Reflect.ownKeys(value).length!==fields.length||fields.some(key=>{
    const field=Object.getOwnPropertyDescriptor(value,key);
    return !field||!field.enumerable||!Object.hasOwn(field,'value');
  }))throw new Error('Invalid pending capacity fields');
  for(const key of fields) {
    if(key==='causes') {
      const causes=value.causes;
      if(!Array.isArray(causes)||Object.getPrototypeOf(causes)!==Array.prototype||causes.length!==expected.causes.length||
        Reflect.ownKeys(causes).length!==causes.length+1||expected.causes.some((cause,index)=>{
          const field=Object.getOwnPropertyDescriptor(causes,String(index));
          return !field||!field.enumerable||!Object.hasOwn(field,'value')||field.value!==cause;
        }))throw new Error('Inconsistent pending capacity causes');
    } else if(value[key]!==expected[key])throw new Error('Inconsistent pending capacity');
  }
}

/** The caller supplies actual body for execution, perceived body for forecasting. */
export function assessEffort(condition,{durationMinutes,effort=0,exertive=false}) {
  body(condition);finite(durationMinutes,'durationMinutes',0.01,1440);finite(effort,'effort');
  if(typeof exertive!=='boolean'||(!exertive&&effort!==0))throw new Error('Effort requires exertion');
  return assessCapacity(condition,{kind:exertive?'work':'observe',effort},durationMinutes);
}

export function estimateSuccess({skill,body:condition,difficulty,hazard=0,exposure=0}) {
  body(condition);finite(skill,'skill');finite(difficulty,'difficulty');finite(hazard,'hazard');finite(exposure,'exposure');
  return successChance({difficulty,exposure},skill,condition,hazard);
}

function actionSpec(input,knownSkills) {
  object(input,'attempt',['actionId','targetId','durationMinutes','effort','exertive','activity','skill']);
  const action={actionId:input.actionId,targetId:input.targetId??null,durationMinutes:input.durationMinutes,
    effort:input.effort??0,exertive:input.exertive??false,activity:input.activity??'active',skill:input.skill??null};
  identity(action.actionId,'actionId');if(action.targetId!==null)identity(action.targetId,'targetId');
  finite(action.durationMinutes,'durationMinutes',0.01,1440);finite(action.effort,'effort');
  if(typeof action.exertive!=='boolean'||(!action.exertive&&action.effort!==0))throw new Error('Effort requires exertion');
  if(!activities.includes(action.activity))throw new Error('Unknown human activity');
  if(action.activity!=='active'&&(action.exertive||action.effort||action.skill!==null))throw new Error('Recovery cannot claim exertion or practice');
  if(action.skill!==null) {
    identity(action.skill,'practice skill');
    if(!Object.hasOwn(knownSkills,action.skill))throw new Error('Unknown practice skill');
  }
  return action;
}

function validatePerson(person,componentVersion=HUMAN_VERSION) {
  object(person,'person',['version','id','body','skills','observationBias','minutes','nextAttempt','pending']);
  if(person.version!==componentVersion)throw new Error('Incompatible human component version');
  identity(person.id,'person id');body(person.body);skills(person.skills);
  finite(person.observationBias,'observationBias',-1,1);finite(person.minutes,'minutes',0,1e12);
  finite(person.nextAttempt,'nextAttempt',1,Number.MAX_SAFE_INTEGER);
  if(!Number.isSafeInteger(person.nextAttempt))throw new Error('Invalid attempt counter');
  if(person.pending!==null) {
    const pending=person.pending;
    object(pending,'pending',['id','action','elapsedMinutes','capacity','bodyBefore','skillBefore','startedAt']);
    if(person.nextAttempt<2||pending.id!==`${person.id}:${person.nextAttempt-1}`)throw new Error('Inconsistent pending attempt ID');
    const action=actionSpec(pending.action,person.skills);
    finite(pending.elapsedMinutes,'elapsedMinutes',0,action.durationMinutes);
    if(pending.elapsedMinutes>person.minutes+1e-9)throw new Error('Pending duration exceeds elapsed person time');
    body(pending.bodyBefore);
    finite(pending.startedAt,'attempt start',0,1e12);
    if(Math.abs(person.minutes-(pending.startedAt+pending.elapsedMinutes))>1e-8)throw new Error('Inconsistent elapsed person time');
    const expected=assessEffort(pending.bodyBefore,action);
    validateCapacity(pending.capacity,expected);
    const duration=pending.elapsedMinutes,allowed=expected.allowed;
    const fatigue=clamp(pending.bodyBefore.fatigue+PARAMETERS.fatiguePerMinute*duration+
      (allowed&&action.activity==='active'?action.effort*duration/action.durationMinutes:0)-
      (allowed&&action.activity==='rest'?PARAMETERS.restPerMinute*duration:0));
    const hunger=clamp(pending.bodyBefore.hunger+PARAMETERS.hungerPerMinute*duration);
    if(Math.abs(person.body.fatigue-fatigue)>1e-10||Math.abs(person.body.hunger-hunger)>1e-10)throw new Error('Inconsistent pending body state');
    if(action.skill!==null) {
      finite(pending.skillBefore,'practice before');
      const expectedSkill=allowed?practice(pending.skillBefore,duration):pending.skillBefore;
      if(Math.abs(person.skills[action.skill]-expectedSkill)>1e-10)throw new Error('Inconsistent pending practice');
    } else if(pending.skillBefore!==null)throw new Error('Unexpected practice baseline');
  }
  return person;
}

export function createPerson(input) {
  object(input,'person setup',['id','body','skills','observationBias']);
  return copy(validatePerson({version:HUMAN_VERSION,id:input.id,body:input.body,skills:input.skills,
    observationBias:input.observationBias??0,minutes:0,nextAttempt:1,pending:null}));
}

/** A detached observation, never the authoritative capacity assessment. */
export function getPersonView(person) {
  validatePerson(person);
  const pending=person.pending;
  return copy({id:person.id,body:{fatigue:clamp(Math.round((person.body.fatigue+person.observationBias)*20)/20),
    hunger:clamp(Math.round(person.body.hunger*20)/20)},skills:person.skills,minutes:person.minutes,
    pending:pending?{id:pending.id,actionId:pending.action.actionId,targetId:pending.action.targetId,
      activity:pending.action.activity,durationMinutes:pending.action.durationMinutes,elapsedMinutes:pending.elapsedMinutes}:null});
}

export function beginAttempt(person,input) {
  validatePerson(person);if(person.pending)throw new Error('An attempt is already pending');
  if(person.nextAttempt===Number.MAX_SAFE_INTEGER)throw new Error('Attempt ID space exhausted');
  const action=actionSpec(input,person.skills),next=copy(person);
  next.pending={id:`${person.id}:${person.nextAttempt}`,action,elapsedMinutes:0,
    capacity:assessEffort(person.body,action),bodyBefore:copy(person.body),
    skillBefore:action.skill===null?null:person.skills[action.skill],startedAt:person.minutes};
  next.nextAttempt++;
  return next;
}

/** Advance only actual elapsed time. The host owns world time and task effects. */
export function advanceAttempt(person,minutes) {
  validatePerson(person);if(!person.pending)throw new Error('No pending attempt');
  finite(minutes,'elapsed advance',0,1440);
  const pending=person.pending,action=pending.action,remaining=action.durationMinutes-pending.elapsedMinutes;
  if(minutes>remaining+1e-10)throw new Error('Advance exceeds remaining attempt duration');
  const elapsed=Math.min(minutes,remaining),next=copy(person);
  let fatigue=person.body.fatigue+PARAMETERS.fatiguePerMinute*elapsed;
  if(pending.capacity.allowed) {
    if(action.activity==='rest')fatigue-=PARAMETERS.restPerMinute*elapsed;
    if(action.activity==='active') {
      fatigue+=action.effort*elapsed/action.durationMinutes;
      if(action.skill!==null)next.skills[action.skill]=practice(person.skills[action.skill],elapsed);
    }
  }
  next.body={fatigue:clamp(fatigue),hunger:clamp(person.body.hunger+PARAMETERS.hungerPerMinute*elapsed)};
  next.pending.elapsedMinutes=Math.min(action.durationMinutes,pending.elapsedMinutes+elapsed);
  next.minutes=pending.startedAt+next.pending.elapsedMinutes;
  finite(next.minutes,'minutes',0,1e12);
  return next;
}

/** A confirmed host result consumes one attempt. It never resolves a host object. */
export function finishAttempt(person,result) {
  validatePerson(person);
  object(result,'outcome',['attemptId','status','mealConsumed']);
  const pending=person.pending;
  if(!pending||pending.id!==result.attemptId)throw new Error('No matching pending attempt');
  if(!['completed','failed','interrupted','blocked'].includes(result.status))throw new Error('Invalid completion status');
  const consumed=result.mealConsumed??false;
  if(typeof consumed!=='boolean')throw new Error('Invalid meal receipt');
  if(consumed&&(pending.action.activity!=='meal'||result.status!=='completed'))throw new Error('Meal receipt requires completed meal');
  if(!pending.capacity.allowed&&result.status!=='blocked')throw new Error('Blocked exertion cannot execute');
  if(pending.capacity.allowed&&result.status==='blocked')throw new Error('Allowed attempt cannot report capacity blockage');
  if(['completed','failed'].includes(result.status)&&pending.elapsedMinutes<pending.action.durationMinutes-1e-10)throw new Error('Attempt interval is incomplete');
  const next=copy(person);
  // Keep the interval's maintenance even if the visible hunger reached its
  // ceiling while the meal was in progress. Receipt and relief occur once.
  if(consumed)next.body.hunger=clamp(pending.bodyBefore.hunger+PARAMETERS.hungerPerMinute*pending.elapsedMinutes-PARAMETERS.mealRelief);
  next.pending=null;
  return next;
}

export function exportPerson(person) {
  validatePerson(person);
  return copy({format:'human-framework-person',version:1,componentVersion:HUMAN_VERSION,person});
}

export function restorePerson(record) {
  object(record,'person snapshot',['format','version','componentVersion','person']);
  if(record.format!=='human-framework-person'||record.version!==1||!['0.1.0',HUMAN_VERSION].includes(record.componentVersion)||
    record.person?.version!==record.componentVersion)throw new Error('Incompatible person snapshot');
  // Validate before detaching so cloning cannot hide invalid wire fields.
  // Explicit import migration then changes only the returned version metadata.
  const person=copy(validatePerson(record.person,record.componentVersion));
  person.version=HUMAN_VERSION;
  return person;
}


===== src/runtime/clock.js =====
/** Pure integer-minute scheduling. Hosts own people, decisions and event effects. */
export const CLOCK_VERSION='0.1.0';
export const CLOCK_LIMITS=Object.freeze({pendingEvents:1024,dataCharacters:16384,dataDepth:24,snapshotCharacters:1048576});

function record(value,name,required,optional=[]) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name} object`);
  for(const key of Reflect.ownKeys(value)) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||![...required,...optional].includes(key))throw new Error(`Unknown or non-JSON ${name} field`);
  }
  for(const key of required)if(!Object.hasOwn(value,key))throw new Error(`Missing ${name} ${key}`);
}

// JSON.stringify alone silently drops undefined, properties and accessors.
// Reject those representations before producing a detached canonical JSON copy.
function jsonText(value,name,characterLimit,depthLimit) {
  const ancestors=new Set();let budget=characterLimit;
  function visit(item,depth) {
    if(depth>depthLimit)throw new Error(`${name} exceeds JSON depth limit`);
    if(--budget<0)throw new Error(`${name} exceeds JSON size limit`);
    if(item===null||typeof item==='boolean')return;
    if(typeof item==='string') {budget-=item.length;if(budget<0)throw new Error(`${name} exceeds JSON size limit`);return;}
    if(typeof item==='number') {if(!Number.isFinite(item)||Object.is(item,-0))throw new Error(`${name} requires finite JSON numbers`);return;}
    if(typeof item!=='object')throw new Error(`${name} requires JSON values`);
    if(ancestors.has(item))throw new Error(`${name} contains a JSON cycle`);
    const array=Array.isArray(item);
    if(array&&Object.getPrototypeOf(item)!==Array.prototype)throw new Error(`${name} requires plain JSON arrays`);
    if(!array&&![Object.prototype,null].includes(Object.getPrototypeOf(item)))throw new Error(`${name} requires plain JSON objects`);
    const keys=Reflect.ownKeys(item);
    if(array&&(keys.length!==item.length+1||item.length>budget))throw new Error(`${name} requires a dense JSON array within size limit`);
    ancestors.add(item);
    for(const key of keys) {
      if(array&&key==='length')continue;
      const descriptor=Object.getOwnPropertyDescriptor(item,key);
      if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`${name} contains a non-JSON property`);
      if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=item.length))throw new Error(`${name} contains a non-JSON array property`);
      budget-=key.length;
      visit(descriptor.value,depth+1);
    }
    ancestors.delete(item);
  }
  visit(value,0);
  const serialized=JSON.stringify(value);
  if(serialized.length>characterLimit)throw new Error(`${name} exceeds JSON size limit`);
  return serialized;
}

function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`${name} must be a nonnegative safe integer minute`);
}
function label(value,name) {
  if(typeof value!=='string'||value.length<1||value.length>120||value.trim()!==value)throw new Error(`Invalid ${name}`);
}
function eventNumber(id) {
  if(typeof id!=='string'||!/^event:[1-9]\d*$/.test(id))throw new Error('Invalid event ID');
  const number=Number(id.slice(6));
  if(!Number.isSafeInteger(number))throw new Error('Invalid event ID');
  return number;
}
function validateEvent(event,now,nextEvent) {
  record(event,'event',['id','at','type','actorId','data']);
  const sequence=eventNumber(event.id);
  if(sequence>=nextEvent)throw new Error('Event ID exceeds clock counter');
  minute(event.at,'Event time');if(event.at<=now)throw new Error('Event time must be after clock time');
  label(event.type,'event type');if(event.actorId!==null)label(event.actorId,'actor ID');
  jsonText(event.data,'Event data',CLOCK_LIMITS.dataCharacters,CLOCK_LIMITS.dataDepth);
  return sequence;
}
function validateClock(clock) {
  record(clock,'clock',['version','now','nextEvent','queue']);
  if(clock.version!==CLOCK_VERSION)throw new Error('Incompatible clock version');
  minute(clock.now,'Clock time');
  if(!Number.isSafeInteger(clock.nextEvent)||clock.nextEvent<1)throw new Error('Invalid next event counter');
  if(!Array.isArray(clock.queue)||clock.queue.length>CLOCK_LIMITS.pendingEvents)throw new Error('Pending event queue exceeds limit');
  // Includes array shape, snapshot size, prototype and accessor checks.
  const serialized=jsonText(clock,'Clock',CLOCK_LIMITS.snapshotCharacters,CLOCK_LIMITS.dataDepth+3);
  let previous=null;const ids=new Set();
  for(const event of clock.queue) {
    const sequence=validateEvent(event,clock.now,clock.nextEvent);
    if(ids.has(sequence))throw new Error('Duplicate event ID');
    ids.add(sequence);
    if(previous&&(event.at<previous.at||(event.at===previous.at&&sequence<=previous.sequence)))throw new Error('Invalid event queue order');
    previous={at:event.at,sequence};
  }
  return serialized;
}
const detach=clock=>JSON.parse(validateClock(clock));

export function createClock(input={}) {
  record(input,'clock setup',[],['now']);
  const now=Object.hasOwn(input,'now')?input.now:0;
  minute(now,'Clock time');
  return {version:CLOCK_VERSION,now,nextEvent:1,queue:[]};
}

export function scheduleEvent(clock,input) {
  const next=detach(clock);
  record(input,'event setup',['at','type'],['actorId','data']);
  if(next.queue.length>=CLOCK_LIMITS.pendingEvents)throw new Error('Pending event queue is full');
  if(next.nextEvent===Number.MAX_SAFE_INTEGER)throw new Error('Event ID space exhausted');
  const eventId=`event:${next.nextEvent++}`;
  const event={id:eventId,at:input.at,type:input.type,
    actorId:Object.hasOwn(input,'actorId')?input.actorId:null,data:Object.hasOwn(input,'data')?input.data:null};
  validateEvent(event,next.now,next.nextEvent);
  // Inserting after equal times preserves the global monotonic ID order.
  const before=next.queue.findIndex(queued=>queued.at>event.at);
  next.queue.splice(before<0?next.queue.length:before,0,event);
  return {clock:detach(next),eventId};
}

/** Canceling an absent valid ID is a no-op; event IDs are never recycled. */
export function cancelEvent(clock,eventId) {
  const next=detach(clock);eventNumber(eventId);
  next.queue=next.queue.filter(event=>event.id!==eventId);
  return next;
}

/** Stop at the earliest due timestamp, allowing the host to settle and schedule. */
export function advanceClock(clock,target) {
  const next=detach(clock);minute(target,'Target time');
  if(target<next.now)throw new Error('Clock cannot advance backward');
  if(!next.queue.length||next.queue[0].at>target) {
    next.now=target;return {clock:next,events:[]};
  }
  next.now=next.queue[0].at;
  const boundary=next.queue.findIndex(event=>event.at!==next.now);
  const events=next.queue.splice(0,boundary<0?next.queue.length:boundary);
  return {clock:next,events};
}

export function exportClock(clock) {
  return {format:'human-framework-clock',version:1,clockVersion:CLOCK_VERSION,clock:detach(clock)};
}

export function restoreClock(snapshot) {
  record(snapshot,'clock snapshot',['format','version','clockVersion','clock']);
  if(snapshot.format!=='human-framework-clock'||snapshot.version!==1||snapshot.clockVersion!==CLOCK_VERSION)throw new Error('Incompatible clock snapshot');
  return detach(snapshot.clock);
}


===== src/core/model.js =====
export const ENGINE_VERSION='0.3.0';
export const MODULES=Object.freeze({body:true,beliefs:true,commitments:true,learning:true,relationships:true});
// Engineering defaults for microgames. None is an empirical estimate or a spiritual metric.
export const PARAMETERS=Object.freeze({
  fatiguePerMinute:0.0015,hungerPerMinute:0.002,restPerMinute:0.025,
  mealRelief:0.55,learningPerMinute:0.008,practiceQuality:0.65,
  assistance:0.18,trustGain:0.025,trustLoss:0.04
});
export const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
export const clone=x=>structuredClone(x);
export const actionEffort=action=>action.kind==='work'?action.effort:action.kind==='help'?(action.effort??0.08):0;
// Compare the completion boundary in relative units. Accumulating 0.1 ten
// times must not miss a goal that succeeds after converting to integer units.
export function remainingGoal(progress,target,consumption=0) {
  const gap=target-progress+consumption;
  return gap/target<=1e-12?0:gap;
}

// A simulation capacity contract, shared by all controllers and module ablations.
// Forecasts may use perceived body; execution must use actual body. These proxy
// ceilings do not assert a clinical threshold for fatigue, hunger or agency.
export function assessCapacity(body,action,roundMinutes) {
  const exertive=['work','help'].includes(action.kind);
  const fatigueCost=PARAMETERS.fatiguePerMinute*roundMinutes+actionEffort(action);
  const hungerCost=PARAMETERS.hungerPerMinute*roundMinutes;
  const projectedFatigue=body.fatigue+fatigueCost,projectedHunger=body.hunger+hungerCost;
  const causes=[];
  if(exertive&&projectedFatigue>1+1e-12)causes.push('fatigue');
  if(exertive&&projectedHunger>1+1e-12)causes.push('hunger');
  return {allowed:causes.length===0,causes,fatigueCost,hungerCost,projectedFatigue,projectedHunger};
}

function assertJSON(value,path='scenario',ancestors=new Set(),depth=0) {
  if(depth>24)throw new Error(`${path} exceeds JSON depth limit`);
  if(value===null||typeof value==='boolean'||typeof value==='string')return;
  if(typeof value==='number') {if(!Number.isFinite(value))throw new Error(`${path} must be finite JSON data`);return;}
  if(typeof value!=='object')throw new Error(`${path} must contain only JSON values`);
  if(ancestors.has(value))throw new Error(`${path} contains a JSON cycle`);
  if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new Error(`${path} must use plain JSON objects`);
  ancestors.add(value);
  for(const [key,item] of Object.entries(value))assertJSON(item,`${path}.${key}`,ancestors,depth+1);
  ancestors.delete(value);
}

export function finite(value,name,min=0,max=1) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} must be finite in [${min}, ${max}]`);
}
function identifier(s,name) {if(typeof s!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(s))throw new Error(`Invalid ${name}`);}
function text(s,name) {if(typeof s!=='string'||s.length>5000)throw new Error(`Invalid ${name}`);}
function unique(items,name) {if(new Set(items).size!==items.length)throw new Error(`Duplicate ${name}`);}
export function validateScenario(s) {
  if(!s||typeof s!=='object')throw new Error('Scenario must be an object');
  assertJSON(s);
  identifier(s.id,'scenario id');
  for(const name of ['title','brief','objective','resourceLabel'])text(s[name],name);
  for(const name of ['hazard','initialSignal','signalConfidence','observationNoise'])finite(s[name],name);
  finite(s.target,'target',0.01,100000);finite(s.initialProgress,'initialProgress',0,s.target);
  finite(s.goalUtility,'goalUtility',0,100000);
  finite(s.food,'food',0,100000);if(!Number.isInteger(s.food))throw new Error('food must be an integer');
  finite(s.consumption,'consumption',0,100000);
  finite(s.roundMinutes,'roundMinutes',0.01,1440);finite(s.horizon,'horizon',1,120);
  if(!Number.isInteger(s.horizon))throw new Error('horizon must be an integer');
  for(const [list,limit] of [['skills',64],['actions',64],['actors',16]])if(!Array.isArray(s[list])||s[list].length<1||s[list].length>limit)throw new Error(`Invalid ${list}`);
  s.skills.forEach(k=>identifier(k,'skill'));unique(s.skills,'skills');
  unique(s.actions.map(a=>a.id),'actions');unique(s.actors.map(a=>a.id),'actors');
  for(const a of s.actions) {
    identifier(a.id,'action id');text(a.label,'action label');text(a.description,'action description');
    if(!['work','rest','eat','observe','help'].includes(a.kind))throw new Error(`Unsupported action kind: ${a.kind}`);
    if(['work','observe'].includes(a.kind)&&!s.skills.includes(a.skill))throw new Error(`Unknown action skill: ${a.skill}`);
    if(a.kind==='work')for(const k of ['difficulty','effort','exposure'])finite(a[k],`action ${k}`);
    if(a.kind==='work')finite(a.output,'action output',0,10000);
    if(a.effort!==undefined)finite(a.effort,'action effort');
  }
  for(const a of s.actors) {
    identifier(a.id,'actor id');text(a.name,'actor name');text(a.role,'actor role');
    if(!a.body||!a.skills||!a.priorities)throw new Error('Actor needs body, skills and priorities');
    for(const k of ['fatigue','hunger'])finite(a.body[k],k);
    for(const k of s.skills)finite(a.skills[k],`skill ${k}`);
    if(Object.keys(a.skills).some(k=>!s.skills.includes(k)))throw new Error('Unknown actor skill');
    for(const k of ['duty','care','caution','mastery'])finite(a.priorities[k],`priority ${k}`);
    if(a.observationBias!==undefined)finite(a.observationBias,'observationBias',-1,1);
    if(a.commitment) {
      if(!s.actions.some(x=>x.id===a.commitment.actionId))throw new Error('Unknown commitment action');
      finite(a.commitment.weight,'commitment weight');finite(a.commitment.dueRound,'commitment dueRound',1,s.horizon);
      if(!Number.isInteger(a.commitment.dueRound))throw new Error('commitment dueRound must be an integer');
    }
  }
  if(s.transfer!==undefined&&!Array.isArray(s.transfer))throw new Error('transfer must be an array');
  const links=new Set();
  for(const t of s.transfer??[]) {
    if(!s.skills.includes(t.from)||!s.skills.includes(t.to)||t.from===t.to)throw new Error('Invalid transfer skills');
    finite(t.rate,'transfer rate',-1,1);text(t.provenance,'transfer provenance');
    const key=`${t.from}/${t.to}`;if(links.has(key))throw new Error('Duplicate transfer link');links.add(key);
  }
  return s;
}
export function normalizeOptions(options={}) {
  const seed=options.seed??1;finite(seed,'seed',0,4294967295);
  if(!Number.isInteger(seed))throw new Error('seed must be an integer');
  const policy=options.policy??'full';if(!['full','baseline','planned-simple'].includes(policy))throw new Error('Unknown policy');
  const modules={...MODULES};
  for(const [k,v] of Object.entries(options.modules??{})) {
    if(!Object.hasOwn(MODULES,k)||typeof v!=='boolean')throw new Error(`Invalid module ${k}`);
    modules[k]=v;
  }
  return {seed,policy,modules};
}
export function practice(skill,duration,quality=PARAMETERS.practiceQuality,rate=PARAMETERS.learningPerMinute) {
  finite(skill,'skill');finite(duration,'duration',0,1e9);finite(quality,'quality');finite(rate,'rate',0,1e6);
  return skill+(1-skill)*(-Math.expm1(-rate*quality*duration));
}
export function retain(skill,duration,rate=0,floor=0) {
  finite(skill,'skill');finite(duration,'duration',0,1e9);finite(rate,'rate',0,1e6);finite(floor,'floor');
  const r=Math.min(floor,skill);return r+(skill-r)*Math.exp(-rate*duration);
}
export function successChance(action,skill,body,hazard,support=0,bodyCoupling=true) {
  const load=bodyCoupling?1.6*body.fatigue+0.8*body.hunger:0;
  const logit=1.25+4*(skill-action.difficulty)-load-2*hazard*action.exposure+support;
  return 1/(1+Math.exp(-logit));
}


===== docs/camp-reconsideration-candidate.md =====
# Private Camp released-work reconsideration candidate

Candidate version **0.3.1-reconsideration.0** implements one direct host policy under [the reconsideration preflight](camp-reconsideration-preflight.md). Public Camp 0.3.0, app 0.14.1 and the current Human/runtime/model files remain unchanged. This document fixes the rule before implementation and before root freezes or executes the final comparison arms. It is not a promotion decision.

## Trigger and decision

Only a successful **player cancellation of an active assembly** can trigger the candidate. The canceled assembly must belong to Meryem's current accepted project and leave unfinished physical work. Meryem must currently own a fixed `gather-timber` or `gather-salvage` job. Food gathering, an owned meal, another person's job, a different commitment, a generic time tick and a player cancellation of a fixed job cannot trigger it.

Meryem keeps her current trip when hunger is at least .65, fatigue is at least .68, or the existing recovery mode still needs fatigue above .45. Otherwise the candidate checks whether the released assembly is actually admissible for her after stopping only her own trip. It uses the unchanged host `blueprint` and `unavailable` checks, including remaining material, stage occupancy, whole-job capacity, time and counter bounds. A copied state can evaluate that hypothetical own-task stop; refusal discards the copy and leaves the real trip intact.

If admissible, Meryem stops her own gathering job using the unchanged `stop` primitive, then begins the released stage using unchanged `begin`. Existing interruption behavior retains elapsed practice, body state, effort and paid time, cancels the old completion event and gives no gathering output. The installed assembly reservation and contributions remain owned by the physical work. The existing per-worker duration basis is reused where already latched. Ordinary `neighbor` policy continues after this event.

There is deliberately **no elapsed-time cutoff**: a nearly completed supply trip can be canceled and its useful output lost. That cost is part of this single candidate's test, not a reason to tune a cutoff after observing the final controls. Earlier frame completion can accompany worse roof timing or more work. The release/re-request player control and unchanged finish-current policy remain serious comparators.

No shared planner, new state field, automatic player command, new learning variable, added output or ration consumption is introduced. The policy responds once to the specified cancellation event; it does not repeatedly cancel/restart at a fixed timestamp.

## Source and initialization boundary

The private [host](../src/experiments/camp-reconsideration/host.js) is a direct copy of current [Camp](../src/games/camp-current.js), with only relative imports, the explicit host version, this one policy helper/cancellation hook, and `fromBaseline(snapshot)` added. Public source and all physical calculations stay attributable to the baseline. The normal API exports are retained; `createGame()` creates a fresh candidate-version game.

`fromBaseline(snapshot)` first validates the complete envelope through baseline `restoreGame`, exports that validated state, changes **only** `game.version`, and validates it through the candidate restore path. The comparison must record this explicit policy intervention point and preserve both baseline and candidate initialization snapshots. It cannot relabel a baseline-paid prefix as an always-active candidate history: a fresh candidate could already have reconsidered an earlier cancellation in that prefix. A separately identified full candidate rollout would be required for that different claim.

The initializer is for private comparisons, not public save migration. Host-version incompatibility is intentional; save envelope, runtime, Human and clock versions are otherwise unchanged.

## Focused implementation checks and final evaluation

Focused tests may exercise the known C1 development state and a short paid-trip variation to establish interruption lifecycle, event removal, paid conservation, state immutability, refusal boundaries and absence of zero-time repetition. These are implementation checks, not the frozen evaluation sample or service-output evidence. Any synthetic structural guard fixture must remain labeled as such and must not be presented as a default-origin opportunity.

Initial implementation verification: all seven focused tests in [camp-reconsideration.test.js](../tests/camp-reconsideration.test.js) pass on Node 26.8.1 and minimum Node 22.0.0. The positive-paid lifecycle fixture adds exactly three baseline minutes to the known C1 development state and checks interruption plus one following paid construction minute; it does not score project completion. Hungry/recovering and owned-meal/forage guards use explicitly labeled structural fixtures. The baseline-versus-candidate source diff is restricted to the header/import/version changes, the single helper/cancellation hook and the initializer above. All five baseline physical-source SHA-256 identities still match the completed C1 records.

Root separately freezes source, exact prefixes, objective, stopping rules and all final controls before evaluating them. The known zero-elapsed C1 case is development evidence. Positive-paid and substantive useful-trip negative controls are required; a no-feasible-work guard alone is insufficient. Preserve initial outputs and counterexamples. Candidate admission requires an independently reviewed, source-specific benefit; a lower command count does not by itself prove better service or justify a general planner.


===== tests/camp-reconsideration.test.js =====
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as baseline from '../src/games/camp-current.js';
import {assessEffort} from '../src/runtime/index.js';

const candidate=existsSync(new URL('../src/experiments/camp-reconsideration/host.js',import.meta.url))
  ?await import('../src/experiments/camp-reconsideration/host.js'):{};
const command=(api,game,type,args={})=>api.applyCommand(game,{type,...args});
// Known C1 development state only. These tests do not compare completion objectives.
const records=JSON.parse(readFileSync(new URL('../artifacts/practice-incentive/construction/comparison-initial.json',import.meta.url)));
const known=records.trajectories.find(t=>t.id==='one-minute-construction-then-garden');
const beforeCancel=()=>baseline.restoreGame(structuredClone(known.states[17]));
const imported=game=>{assert.equal(typeof candidate.fromBaseline,'function');return candidate.fromBaseline(baseline.exportGame(game));};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('candidate initialization validates baseline and changes only host version',()=>{
  const before=baseline.exportGame(beforeCancel()),saved=structuredClone(before),game=candidate.fromBaseline(before);
  assert.equal(game.version,'0.3.1-reconsideration.0');
  const expected=structuredClone(before);expected.game.version=game.version;
  assert.deepEqual(candidate.exportGame(game),expected);assert.deepEqual(before,saved);
  const invalid=structuredClone(before);invalid.game.paid.neighbor.gatheringMinutes++;
  assert.throws(()=>candidate.fromBaseline(invalid));
  assert.throws(()=>baseline.restoreGame(candidate.exportGame(game)));
  assert.throws(()=>candidate.restoreGame(before));
});

test('owned zero-elapsed supply trip changes to released assembly without output or elapsed time',()=>{
  const game=imported(beforeCancel()),before=candidate.exportGame(game),oldEvent=game.jobs.neighbor.eventId;
  assert.equal(game.people.neighbor.pending.elapsedMinutes,0);
  const next=command(candidate,game,'cancel');
  assert.equal(next.clock.now,85);assert.equal(next.jobs.player,null);assert.equal(next.jobs.neighbor.kind,'assembly');
  assert.equal(next.jobs.neighbor.project,'shelter');assert.equal(next.people.neighbor.pending,null);
  assert.deepEqual(next.stock,game.stock);assert.deepEqual(next.paid,game.paid);
  assert.deepEqual(next.people.neighbor.body,game.people.neighbor.body);
  assert.deepEqual(next.people.neighbor.skills,game.people.neighbor.skills);
  assert.equal(next.stats.canceled,game.stats.canceled+2);assert.equal(next.stats.started,game.stats.started+1);
  assert.ok(!next.clock.queue.some(e=>e.id===oldEvent));
  close(next.work.shelter.progress,game.work.shelter.progress);
  assert.equal(next.work.shelter.durationByActor.neighbor,24);
  assert.deepEqual(candidate.exportGame(game),before);
});

test('positive paid supply interruption preserves sunk practice body effort and reservation',()=>{
  const game=imported(baseline.advanceGame(beforeCancel(),3));
  assert.equal(game.people.neighbor.pending.elapsedMinutes,3);
  const next=command(candidate,game,'cancel');
  assert.equal(next.jobs.neighbor.project,'shelter');
  assert.deepEqual(next.paid,game.paid);assert.deepEqual(next.stock,game.stock);
  assert.deepEqual(next.people.neighbor.body,game.people.neighbor.body);
  assert.deepEqual(next.people.neighbor.skills,game.people.neighbor.skills);
  assert.deepEqual(next.work.shelter.cost,game.work.shelter.cost);
  assert.deepEqual(next.stats.gathered,game.stats.gathered);
  const restored=candidate.restoreGame(JSON.parse(JSON.stringify(candidate.exportGame(next))));
  assert.deepEqual(restored,next);
  const paid=candidate.advanceGame(restored,1);
  assert.equal(paid.paid.neighbor.constructionMinutes,next.paid.neighbor.constructionMinutes+1);
  assert.equal(paid.paid.neighbor.gatheringMinutes,next.paid.neighbor.gatheringMinutes);
  assert.ok(paid.work.shelter.progress>next.work.shelter.progress);
});

test('a consumed cancellation event cannot repeat at the same timestamp',()=>{
  const next=command(candidate,imported(beforeCancel()),'cancel'),saved=candidate.exportGame(next);
  assert.throws(()=>command(candidate,next,'cancel'),/No job to stop/);
  for(let i=0;i<4;i++)assert.deepEqual(candidate.advanceGame(next,0),next);
  assert.deepEqual(candidate.exportGame(next),saved);
});

test('fixed player cancellation and a different released project do not preempt owned supply',()=>{
  const free=command(baseline,beforeCancel(),'cancel');
  for(const job of ['forage','build-garden']){
    const game=imported(command(baseline,free,'start',{job})),next=command(candidate,game,'cancel');
    assert.deepEqual(next.jobs.neighbor,game.jobs.neighbor);
    assert.deepEqual(next.people.neighbor,game.people.neighbor);
    assert.deepEqual(next.paid,game.paid);assert.equal(next.stats.canceled,game.stats.canceled+1);
  }
});

test('synthetic need and recovery guards preserve the ongoing trip',()=>{
  // Intentionally altered structural fixtures, not default-origin evaluation cases.
  for(const guard of ['hunger','fatigue','recovering']){
    const snapshot=baseline.exportGame(beforeCancel()),g=snapshot.game,p=g.people.neighbor;
    if(guard==='recovering')g.recovering.neighbor=true;
    else{p.body[guard]=guard==='hunger'?.65:.68;p.pending.bodyBefore=structuredClone(p.body);p.pending.capacity=assessEffort(p.body,p.pending.action);}
    const game=imported(baseline.restoreGame(snapshot)),next=command(candidate,game,'cancel');
    assert.deepEqual(next.jobs.neighbor,game.jobs.neighbor);assert.deepEqual(next.people.neighbor,game.people.neighbor);
    assert.deepEqual(next.paid,game.paid);assert.equal(next.stats.canceled,game.stats.canceled+1);
  }
});

test('owned meal and food collection survive same-project player cancellation',()=>{
  for(const foodAvailable of [true,false]){
    let game=baseline.createGame();
    if(!foodAvailable)for(let n=0;n<4;n++)game=baseline.advanceGame(command(baseline,game,'start',{job:'eat'}),8);
    // Intentionally hungry structural fixture; all prior paid commands remain valid.
    const snapshot=baseline.exportGame(game);snapshot.game.people.neighbor.body.hunger=.65;
    game=baseline.restoreGame(snapshot);
    game=command(baseline,game,'start',{job:'build-workbench'});
    game=command(baseline,game,'request',{project:'workbench'});
    game=imported(game);
    assert.equal(game.jobs.neighbor.id,foodAvailable?'eat':'forage');
    const next=command(candidate,game,'cancel');
    assert.deepEqual(next.jobs.neighbor,game.jobs.neighbor);assert.deepEqual(next.people.neighbor,game.people.neighbor);
    assert.deepEqual(next.stock,game.stock);assert.deepEqual(next.paid,game.paid);
    assert.equal(next.stats.consumedFood,game.stats.consumedFood);
  }
});


===== Complete candidate diff against supplied baseline =====
diff --git a/src/games/camp-current.js b/src/experiments/camp-reconsideration/host.js
index f6e9356..ed41ad0 100644
--- a/src/games/camp-current.js
+++ b/src/experiments/camp-reconsideration/host.js
@@ -1,9 +1,10 @@
-/** Current Camp 0.3.0: owned resources, paid people and one current snapshot.
+/** Private Camp 0.3.1-reconsideration.0, cloned from current Camp 0.3.0.
  * No historical host, migration, command transcript or private work helper.
  */
-import {practice} from '../core/model.js';
-import {HUMAN_VERSION,RUNTIME_VERSION,createPerson,restorePerson,exportPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,assessEffort,createClock,restoreClock,exportClock,scheduleEvent,cancelEvent,advanceClock} from '../runtime/index.js';
-export const CAMP_VERSION='0.3.0';
+import {practice} from '../../core/model.js';
+import {HUMAN_VERSION,RUNTIME_VERSION,createPerson,restorePerson,exportPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,assessEffort,createClock,restoreClock,exportClock,scheduleEvent,cancelEvent,advanceClock} from '../../runtime/index.js';
+import {restoreGame as restoreBaselineGame,exportGame as exportBaselineGame} from '../../games/camp-current.js';
+export const CAMP_VERSION='0.3.1-reconsideration.0';
 const copy=value=>structuredClone(value),EPS=1e-12,LIMIT=1e9;
 const resources=['timber','salvage','food'],projects=['shelter','workbench','garden','cache'],ACTORS=['player','neighbor'],INITIAL={timber:4,salvage:2,food:4};
 const trusted=new WeakSet();
@@ -138,6 +139,18 @@ function neighbor(g){
     g.recovering.neighbor=true;c.reason='I need to recover before continuing; the project remains accepted.';
   }else{g.recovering.neighbor=false;if(project)c.reason='You are building this stage. I am available while it finishes; our project remains accepted.';}
 }
+// Private event-triggered candidate; unchanged stop/begin own every physical effect.
+function reconsiderReleasedWork(g,project){
+  const c=g.commitment,j=g.jobs.neighbor,w=g.work[project],body=g.people.neighbor.body;
+  if(!project||c.status!=='accepted'||c.project!==project||!w||w.progress>=1-EPS)return;
+  if(j?.kind!=='fixed'||!['gather-timber','gather-salvage'].includes(j.id))return;
+  if(body.hunger>=.65||body.fatigue>=.68||g.recovering.neighbor&&body.fatigue>.45)return;
+  const probe=copy(g);stop(probe,'neighbor');
+  const id=`build-${project}`,b=blueprint(probe,id,'neighbor');
+  if(unavailable(probe,b,'neighbor'))return;
+  stop(g,'neighbor');
+  begin(g,id,'neighbor','The released stage is feasible. I am stopping my own supply trip to finish it; paid work remains.');
+}
 function spendMinute(person,action){let p=beginAttempt(person,action);if(!p.pending.capacity.allowed)fail('Insufficient capacity for paid work minute');p=advanceAttempt(p,1);return finishAttempt(p,{attemptId:p.pending.id,status:'completed'});}
 function advanceRaw(g,minutes){
   for(let i=0;i<minutes;i++){
@@ -242,7 +255,7 @@ export function applyCommand(game,command){
   const g=copy(game),w=g.window,current=phase(g),type=command.type;
   if(['start','request','handover'].includes(type))requireRunning(g);
   if(type==='start'){begin(g,command.job,'player');neighbor(g);}
-  else if(type==='cancel'){stop(g,'player');neighbor(g);}
+  else if(type==='cancel'){const released=g.jobs.player?.kind==='assembly'?g.jobs.player.project:null;stop(g,'player');if(released)reconsiderReleasedWork(g,released);neighbor(g);}
   else if(type==='request')request(g,command.project);
   else if(type==='release')release(g);
   else if(type==='handover')handover(g,command.from,command.to);
@@ -454,3 +467,9 @@ export function restoreGame(snapshot){
   inspect(snapshot);fields(snapshot,['format','version','game'],'Camp snapshot');
   if(snapshot.format!=='human-camp-current'||snapshot.version!==1)fail('Incompatible save. This page supports current Camp 0.3 saves only.');return seal(copy(validate(snapshot.game)));
 }
+
+// Explicit policy intervention on an already validated baseline-paid state.
+export function fromBaseline(snapshot){
+  const saved=exportBaselineGame(restoreBaselineGame(snapshot));
+  saved.game.version=CAMP_VERSION;return restoreGame(saved);
+}
