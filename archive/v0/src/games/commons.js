import {createPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,assessEffort} from '../human/index.js';
import {createClock,scheduleEvent,cancelEvent,advanceClock,exportClock,restoreClock} from '../runtime/clock.js';

export const COMMONS_VERSION='0.1.0';
const copy=value=>structuredClone(value),ids=['player','neighbor'],resources=['timber','salvage','food'];
const LIMIT=1e9,INITIAL={timber:4,salvage:2,food:4};
export const PROJECTS=Object.freeze({
  shelter:{label:'Woodshed',benefit:'Keep an extra usable bundle dry: timber trips bring 4 instead of 3.',stages:[{label:'Raise the frame',cost:{timber:4,salvage:1},minutes:24},{label:'Roof and storage',cost:{timber:4,salvage:2},minutes:28}]},
  workbench:{label:'Workbench',benefit:'Every later assembly takes 6 fewer minutes.',stages:[{label:'Build the table',cost:{timber:3,salvage:2},minutes:22},{label:'Fit the tools',cost:{timber:3,salvage:3},minutes:28}]},
  garden:{label:'Garden',benefit:'Food trips bring 3 portions instead of 2.',stages:[{label:'Edge the beds',cost:{timber:5,salvage:1},minutes:20},{label:'Plant and mulch',cost:{timber:3,salvage:1},minutes:26}]},
  cache:{label:'Supply cache',benefit:'A permanent cache for future visitors. Build as many as you like.',stages:[{label:'Pack a supply cache',cost:{timber:6,salvage:3},minutes:26}]}
});
const JOBS={
  'gather-timber':{label:'Gather timber',detail:'Bring wood from the grove.',minutes:16,effort:.13,skill:'gathering',output:{timber:3}},
  'gather-salvage':{label:'Recover salvage',detail:'Bring reusable fittings from the old shed.',minutes:22,effort:.17,skill:'gathering',output:{salvage:3}},
  forage:{label:'Gather food',detail:'Pick food near camp. Light work remains possible when heavy work is blocked.',minutes:14,skill:'gathering',output:{food:2}},
  rest:{label:'Rest in camp',detail:'Recover strength. Time and hunger continue.',minutes:18,activity:'rest'},
  eat:{label:'Eat a portion',detail:'Reserve 1 shared food; hunger relief comes when the meal finishes.',minutes:8,activity:'meal',cost:{food:1}}
};
const keys=(v,allowed,name)=>{if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.keys(v).length!==allowed.length||allowed.some(k=>!Object.hasOwn(v,k)))throw new Error(`Invalid ${name} fields`);};
const integer=(n,min,max,name)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(`Invalid ${name}`);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const add=(to,from,mult=1)=>{for(const [key,value] of Object.entries(from))to[key]+=value*mult;};
const completed=(g,p)=>p==='cache'?false:g.structures[p]===2;
const stage=(g,p)=>p==='cache'?0:g.structures[p];
const built=g=>Object.values(g.structures).every(n=>n===2);
const actorIds=g=>g.solo?['player']:ids;
const personName=id=>id==='player'?'You':'Meryem';
function record(g,actor,message) {g.recent.push({at:g.clock.now,actor,message});if(g.recent.length>16)g.recent.shift();}
function blueprint(g,id,actor) {
  const building=id.startsWith('build-'),project=building?id.slice(6):null;
  if(building&&!Object.hasOwn(PROJECTS,project)||!building&&!Object.hasOwn(JOBS,id))throw new Error('Unknown job');
  if(building&&completed(g,project))throw new Error('This structure is complete');
  const step=building?PROJECTS[project].stages[stage(g,project)]:null;
  const definition=building?{label:`${PROJECTS[project].label}: ${step.label.toLowerCase()}`,detail:PROJECTS[project].benefit,minutes:step.minutes,effort:.20,skill:'construction',cost:step.cost}:JOBS[id];
  const skill=definition.skill??null,skillBefore=skill?g.people[actor].skills[skill]:null;
  const benefits={shelter:g.structures.shelter===2,workbench:g.structures.workbench===2,garden:g.structures.garden===2};
  const duration=Math.max(6,definition.minutes-(building&&benefits.workbench?6:0)-(skill?Math.floor(skillBefore*4):0));
  const output=copy(definition.output??{});
  if(id==='gather-timber'&&benefits.shelter)output.timber++;
  if(id==='forage'&&benefits.garden)output.food++;
  const action={actionId:id,targetId:project,durationMinutes:duration,effort:definition.effort??0,exertive:Boolean(definition.effort),activity:definition.activity??'active',skill};
  return {id,label:definition.label,detail:definition.detail,project,stage:building?stage(g,project):null,cost:copy(definition.cost??{}),output,duration,benefits,skillBefore,action};
}
function unavailable(g,b,actor,condition=g.people[actor].body) {
  if(g.jobs[actor])return 'Already working. Finish or cancel the current job first.';
  if(b.project==='cache'&&!built(g))return 'Finish the woodshed, workbench, and garden before packing caches.';
  if(b.project&&Object.values(g.jobs).some(job=>job?.project===b.project))return 'Someone is already building this stage.';
  for(const [r,n] of Object.entries(b.cost))if(g.stock[r]<n)return `Needs ${n} ${r}; only ${g.stock[r]} is available.`;
  const capacity=assessEffort(condition,b.action);
  if(!capacity.allowed)return `Too much ${capacity.causes.join(' and ')} for this whole job. Choose recovery first.`;
  return null;
}
function begin(g,id,actor,reason=null) {
  const b=blueprint(g,id,actor),why=unavailable(g,b,actor);
  if(why)throw new Error(why);
  const person=beginAttempt(g.people[actor],b.action),endsAt=g.clock.now+b.duration;
  const event=scheduleEvent(g.clock,{at:endsAt,type:'job-complete',actorId:actor,data:{jobId:id,attemptId:person.pending.id}});
  g.clock=event.clock;g.people[actor]=person;add(g.stock,b.cost,-1);
  g.jobs[actor]={...b,startedAt:g.clock.now,endsAt,eventId:event.eventId,attemptId:person.pending.id};
  g.stats.started++;if(actor==='neighbor'&&reason)g.commitment.reason=reason;
  record(g,actor,`${personName(actor)} started ${b.label.toLowerCase()} (${b.duration} min).${reason?' '+reason:''}`);
}
function finish(g,actor) {
  const job=g.jobs[actor],person=g.people[actor];
  g.people[actor]=finishAttempt(person,{attemptId:job.attemptId,status:'completed',mealConsumed:job.id==='eat'});
  add(g.stock,job.output);add(g.stats.gathered,job.output);add(g.stats.spent,job.cost);
  if(job.id==='eat')g.stats.consumedFood++;
  if(job.project==='cache')g.caches++;
  else if(job.project)g.structures[job.project]++;
  if(Object.hasOwn(g.stats.receipts,job.id))g.stats.receipts[job.id]++;
  if(job.id==='gather-timber'&&job.benefits.shelter)g.stats.receipts.coveredTimber++;
  if(job.id==='forage'&&job.benefits.garden)g.stats.receipts.gardenFood++;
  g.stats.completed++;g.jobs[actor]=null;
  const result=Object.entries(job.output).map(([r,n])=>`+${n} ${r}`).join(', ');
  record(g,actor,`${personName(actor)} finished ${job.label.toLowerCase()}.${result?' '+result+'.':''}`);
  if(g.milestoneAt===null&&built(g)){g.milestoneAt=g.clock.now;record(g,'world','The worksite is established. Keep gathering or build supply caches for future visitors.');}
}
function stop(g,actor) {
  const job=g.jobs[actor];if(!job)return;
  g.people[actor]=finishAttempt(g.people[actor],{attemptId:job.attemptId,status:'interrupted'});
  g.clock=cancelEvent(g.clock,job.eventId);add(g.stock,job.cost);g.jobs[actor]=null;g.stats.canceled++;
  record(g,actor,`${personName(actor)} canceled ${job.label.toLowerCase()}. Reserved supplies returned; elapsed work remains paid.`);
}
function desired(g,project,actor) {
  const person=getPersonView(g.people[actor]),body=person.body;
  if(body.hunger>=.65)return {id:g.stock.food?'eat':'forage',reason:g.stock.food?'I need a meal, then I’ll return to the project.':'I need food. I’ll gather some near camp, then return.'};
  if(body.fatigue>=.68)return {id:'rest',reason:'I need to rest, then I’ll return to the project.'};
  if(!project)return null;
  const lock=Object.values(g.jobs).find(job=>job?.project===project);
  const target=PROJECTS[project].stages[(lock&&project!=='cache'?stage(g,project)+1:stage(g,project))];
  if(!target)return null;
  for(const [r,n] of Object.entries(target.cost))if(g.stock[r]<n)return {id:r==='timber'?'gather-timber':'gather-salvage',reason:`I’m collecting ${r} for the ${PROJECTS[project].label.toLowerCase()}.`};
  if(lock)return null;
  const id=`build-${project}`,b=blueprint(g,id,actor),capacity=assessEffort(g.people[actor].body,b.action);
  if(!capacity.allowed)return {id:capacity.causes.includes('hunger')?(g.stock.food?'eat':'forage'):'rest',reason:'I need to recover before the next assembly; the project is still accepted.'};
  return {id,reason:`I’m completing the accepted ${PROJECTS[project].label.toLowerCase()} project.`};
}
function neighbor(g) {
  if(g.solo)return;
  const c=g.commitment;
  if(c.status==='accepted'&&(c.project==='cache'?g.caches>c.startCaches:completed(g,c.project))) {
    c.status='fulfilled';c.finishedAt=g.clock.now;c.reason=`The ${PROJECTS[c.project].label.toLowerCase()} is complete. I’m available for another project.`;
    record(g,'neighbor',c.reason);
  }
  if(g.jobs.neighbor)return;
  const project=c.status==='accepted'?c.project:null;
  const choice=desired(g,project,'neighbor');
  if(choice) {
    const b=blueprint(g,choice.id,'neighbor'),blocked=unavailable(g,b,'neighbor');
    if(!blocked)begin(g,choice.id,'neighbor',choice.reason);
    else if(project){const recovery=blocked.includes('hunger')?(g.stock.food?'eat':'forage'):'rest';begin(g,recovery,'neighbor','I need recovery before continuing the accepted project.');}
  } else if(project)c.reason='You are building this stage. I’m waiting for it to finish; our project is still accepted.';
}

export function createGame({solo=false}={}) {
  if(typeof solo!=='boolean')throw new Error('Invalid solo setup');
  const people=Object.fromEntries((solo?['player']:ids).map(id=>[id,createPerson({id,body:{fatigue:id==='player'?.20:.30,hunger:id==='player'?.22:.28},skills:{gathering:.10,construction:.05}})]));
  return {version:COMMONS_VERSION,solo,clock:createClock(),people,jobs:Object.fromEntries(Object.keys(people).map(id=>[id,null])),stock:copy(INITIAL),structures:{shelter:0,workbench:0,garden:0},caches:0,milestoneAt:null,
    commitment:{status:'none',project:null,acceptedAt:null,finishedAt:null,startCaches:0,reason:solo?'You are working alone.':'Ask me to help with a specific project. I’ll tell you what I can do.'},lastResponse:null,
    stats:{started:0,completed:0,canceled:0,gathered:{timber:0,salvage:0,food:0},spent:{timber:0,salvage:0,food:0},consumedFood:0,workMinutes:0,restMinutes:0,mealMinutes:0,idleMinutes:0,receipts:{'gather-timber':0,'gather-salvage':0,forage:0,rest:0,eat:0,coveredTimber:0,gardenFood:0}},recent:[]};
}
export function startJob(game,id) {validate(game);const next=copy(game);begin(next,id,'player');neighbor(next);return next;}
export function cancelJob(game) {validate(game);if(!game.jobs.player)throw new Error('No player job to cancel');const next=copy(game);stop(next,'player');neighbor(next);return next;}
export function requestProject(game,project) {
  validate(game);if(game.solo)throw new Error('There is no neighbor in the solo worksite');
  if(!Object.hasOwn(PROJECTS,project))throw new Error('Unknown project');
  const next=copy(game),c=next.commitment;
  const reason=c.status==='accepted'?'I already accepted a project. Let’s finish it, or release that commitment first.':completed(next,project)?'That structure is already complete. Choose another project.':project==='cache'&&!built(next)?'We need a woodshed, workbench, and garden before we can pack a supply cache.':null;
  next.lastResponse={at:next.clock.now,project,accepted:!reason,reason:reason??`Yes. I’ll help finish the ${PROJECTS[project].label.toLowerCase()}, gathering its supplies and recovering when needed.`};
  if(reason&&c.status!=='accepted')next.commitment={status:'declined',project,acceptedAt:null,finishedAt:null,startCaches:next.caches,reason};
  if(!reason)next.commitment={status:'accepted',project,acceptedAt:next.clock.now,finishedAt:null,startCaches:next.caches,reason:next.lastResponse.reason};
  record(next,'neighbor',next.lastResponse.reason);neighbor(next);return next;
}
export function releaseProject(game) {
  validate(game);if(game.commitment.status!=='accepted')throw new Error('No accepted project to release');
  const next=copy(game);if(next.jobs.neighbor&&!['eat','rest','forage'].includes(next.jobs.neighbor.id))stop(next,'neighbor');next.commitment.status='released';next.commitment.finishedAt=next.clock.now;next.commitment.reason=next.jobs.neighbor?'You released our project. I’m finishing my recovery; you can request another project.':'You released our project. I’m available for another request.';record(next,'neighbor',next.commitment.reason);return next;
}
/** Every advance uses the same whole-minute integration, independent of caller chunks. */
export function advanceGame(game,minutes) {
  validate(game);integer(minutes,0,1440,'advance minutes');integer(game.clock.now+minutes,0,LIMIT,'world time');
  const next=copy(game),target=next.clock.now+minutes;
  while(next.clock.now<target) {
    for(const actor of actorIds(next)) {
      const job=next.jobs[actor];
      if(job) {
        next.people[actor]=advanceAttempt(next.people[actor],1);
        next.stats[job.id==='rest'?'restMinutes':job.id==='eat'?'mealMinutes':'workMinutes']++;
      } else {
        let person=beginAttempt(next.people[actor],{actionId:'idle',durationMinutes:1});
        person=advanceAttempt(person,1);next.people[actor]=finishAttempt(person,{attemptId:person.pending.id,status:'completed'});next.stats.idleMinutes++;
      }
    }
    const advanced=advanceClock(next.clock,next.clock.now+1);next.clock=advanced.clock;
    for(const event of advanced.events)finish(next,event.actorId);
    neighbor(next);
  }
  return next;
}
export function advanceToNextEvent(game) {validate(game);const event=game.clock.queue[0];if(!event)throw new Error('Choose a job or request a project before advancing');return advanceGame(game,event.at-game.clock.now);}
export function getGameView(game) {
  validate(game);
  const choices=[...Object.keys(JOBS),...Object.keys(PROJECTS).filter(p=>!completed(game,p)).map(p=>`build-${p}`)].map(id=>{
    const b=blueprint(game,id,'player');return {id,label:b.label,detail:b.detail,duration:b.duration,cost:b.cost,output:b.output,project:b.project,unavailable:unavailable(game,b,'player',getPersonView(game.people.player).body)};
  });
  return copy({version:game.version,solo:game.solo,now:game.clock.now,stock:game.stock,structures:game.structures,caches:game.caches,milestoneAt:game.milestoneAt,
    people:Object.fromEntries(actorIds(game).map(id=>[id,{...getPersonView(game.people[id]),job:game.jobs[id]?{id:game.jobs[id].id,label:game.jobs[id].label,startedAt:game.jobs[id].startedAt,endsAt:game.jobs[id].endsAt,duration:game.jobs[id].duration,remaining:game.jobs[id].endsAt-game.clock.now,cost:game.jobs[id].cost}:null}])),
    commitment:game.commitment,lastResponse:game.lastResponse,recent:game.recent,choices,nextEventAt:game.clock.queue[0]?.at??null,stats:game.stats});
}

function validate(game) {
  keys(game,['version','solo','clock','people','jobs','stock','structures','caches','milestoneAt','commitment','lastResponse','stats','recent'],'worksite');
  if(game.version!==COMMONS_VERSION||typeof game.solo!=='boolean')throw new Error('Incompatible worksite');
  restoreClock(exportClock(game.clock));integer(game.clock.now,0,LIMIT,'world time');
  const actors=actorIds(game);keys(game.people,actors,'people');keys(game.jobs,actors,'jobs');keys(game.stock,resources,'stock');keys(game.structures,['shelter','workbench','garden'],'structures');
  for(const r of resources)integer(game.stock[r],0,LIMIT,'stock');
  for(const n of Object.values(game.structures))integer(n,0,2,'structure stage');integer(game.caches,0,LIMIT,'caches');
  if(game.milestoneAt!==null)integer(game.milestoneAt,0,game.clock.now,'milestone');
  if(built(game)!==(game.milestoneAt!==null)||game.caches>0&&!built(game))throw new Error('Inconsistent milestone');
  keys(game.stats,['started','completed','canceled','gathered','spent','consumedFood','workMinutes','restMinutes','mealMinutes','idleMinutes','receipts'],'stats');
  for(const [k,v] of Object.entries(game.stats))if(!['gathered','spent','receipts'].includes(k))integer(v,0,Number.MAX_SAFE_INTEGER,`stat ${k}`);
  for(const k of ['gathered','spent']){keys(game.stats[k],resources,k);for(const n of Object.values(game.stats[k]))integer(n,0,LIMIT,k);}
  keys(game.stats.receipts,['gather-timber','gather-salvage','forage','rest','eat','coveredTimber','gardenFood'],'receipts');
  for(const n of Object.values(game.stats.receipts))integer(n,0,LIMIT,'receipt count');
  const reserved={timber:0,salvage:0,food:0},events=[];
  for(const actor of actors) {
    const p=restorePerson(exportPerson(game.people[actor])),job=game.jobs[actor];
    keys(p.skills,['gathering','construction'],'worksite skills');
    if(p.id!==actor||p.minutes!==game.clock.now||p.observationBias!==0)throw new Error('Inconsistent person identity or clock');
    if(Boolean(job)!==Boolean(p.pending))throw new Error('Inconsistent pending job');
    if(!job)continue;
    keys(job,['id','label','detail','project','stage','cost','output','duration','benefits','skillBefore','action','startedAt','endsAt','eventId','attemptId'],'job');
    integer(job.startedAt,0,game.clock.now,'job start');integer(job.endsAt,game.clock.now+1,LIMIT,'job end');
    if(job.endsAt!==job.startedAt+job.duration||p.pending.startedAt!==job.startedAt||p.pending.elapsedMinutes!==game.clock.now-job.startedAt||!p.pending.capacity.allowed||job.attemptId!==p.pending.id)throw new Error('Inconsistent job timing or capacity');
    keys(job.benefits,['shelter','workbench','garden'],'job benefits');
    const old=copy(game);old.jobs[actor]=null;old.people[actor]=copy(p);old.people[actor].pending=null;
    for(const name of ['shelter','workbench','garden']){if(typeof job.benefits[name]!=='boolean'||job.benefits[name]&&game.structures[name]!==2)throw new Error('Invalid job benefit');old.structures[name]=job.benefits[name]?2:Math.min(game.structures[name],1);}
    if(job.project&&job.project!=='cache'){if(job.stage!==game.structures[job.project])throw new Error('Inconsistent reserved stage');old.structures[job.project]=job.stage;}
    if(p.pending.action.skill)old.people[actor].skills[p.pending.action.skill]=p.pending.skillBefore;
    const expected=blueprint(old,job.id,actor);
    for(const k of Object.keys(expected))if(!same(job[k],expected[k]))throw new Error(`Inconsistent job ${k}`);
    if(!same(job.action,p.pending.action))throw new Error('Inconsistent human action');
    add(reserved,job.cost);events.push({id:job.eventId,at:job.endsAt,type:'job-complete',actorId:actor,data:{jobId:job.id,attemptId:job.attemptId}});
  }
  if(game.clock.queue.length!==events.length||events.some(e=>!game.clock.queue.some(actual=>same(actual,e))))throw new Error('Inconsistent pending events');
  const projects=Object.values(game.jobs).filter(Boolean).map(j=>j.project).filter(Boolean);if(new Set(projects).size!==projects.length)throw new Error('Duplicate reserved project');
  for(const r of resources)if(game.stock[r]+reserved[r]+game.stats.spent[r]!==INITIAL[r]+game.stats.gathered[r])throw new Error('Resource conservation mismatch');
  const material={timber:0,salvage:0};
  for(const p of ['shelter','workbench','garden'])for(let n=0;n<game.structures[p];n++)add(material,PROJECTS[p].stages[n].cost);
  add(material,PROJECTS.cache.stages[0].cost,game.caches);
  if(material.timber!==game.stats.spent.timber||material.salvage!==game.stats.spent.salvage||game.stats.spent.food!==game.stats.consumedFood||game.stats.started!==game.stats.completed+game.stats.canceled+events.length)throw new Error('Inconsistent completion receipts');
  const counts=game.stats.receipts,assemblies=Object.values(game.structures).reduce((a,b)=>a+b,0)+game.caches;
  if(counts.coveredTimber>counts['gather-timber']||counts.gardenFood>counts.forage||counts.coveredTimber>0&&game.structures.shelter!==2||counts.gardenFood>0&&game.structures.garden!==2||game.stats.gathered.timber!==3*counts['gather-timber']+counts.coveredTimber||game.stats.gathered.salvage!==3*counts['gather-salvage']||game.stats.gathered.food!==2*counts.forage+counts.gardenFood||counts.eat!==game.stats.consumedFood||game.stats.completed!==assemblies+counts['gather-timber']+counts['gather-salvage']+counts.forage+counts.rest+counts.eat)throw new Error('Inconsistent production receipts');
  let minimumBuild=game.caches*16;for(const project of ['shelter','workbench','garden'])for(let i=0;i<game.structures[project];i++)minimumBuild+=PROJECTS[project].stages[i].minutes-10;
  if(game.stats.workMinutes<counts['gather-timber']*12+counts['gather-salvage']*18+counts.forage*10+minimumBuild||game.stats.restMinutes<counts.rest*18||game.stats.mealMinutes<counts.eat*8)throw new Error('Unpaid completion receipts');
  if(game.stats.workMinutes+game.stats.restMinutes+game.stats.mealMinutes+game.stats.idleMinutes!==game.clock.now*actors.length)throw new Error('Inconsistent elapsed receipts');
  const c=game.commitment;keys(c,['status','project','acceptedAt','finishedAt','startCaches','reason'],'commitment');
  if(!['none','accepted','declined','released','fulfilled'].includes(c.status)||typeof c.reason!=='string'||c.reason.length>400)throw new Error('Invalid commitment');
  if(c.project!==null&&!Object.hasOwn(PROJECTS,c.project)||c.status==='none'&&c.project!==null||c.status!=='none'&&c.project===null||game.solo&&c.status!=='none')throw new Error('Invalid project identity');
  integer(c.startCaches,0,game.caches,'commitment cache baseline');
  for(const k of ['acceptedAt','finishedAt'])if(c[k]!==null)integer(c[k],0,game.clock.now,k);
  if(['accepted','released','fulfilled'].includes(c.status)!==(c.acceptedAt!==null)||['released','fulfilled'].includes(c.status)!==(c.finishedAt!==null)||c.finishedAt!==null&&c.finishedAt<c.acceptedAt)throw new Error('Inconsistent commitment times');
  if(c.status==='fulfilled'&&!(c.project==='cache'?game.caches>c.startCaches:completed(game,c.project)))throw new Error('Unfulfilled project receipt');
  if(game.lastResponse!==null){const r=game.lastResponse;keys(r,['at','project','accepted','reason'],'response');integer(r.at,0,game.clock.now,'response time');if(!Object.hasOwn(PROJECTS,r.project)||typeof r.accepted!=='boolean'||typeof r.reason!=='string'||r.reason.length>400)throw new Error('Invalid project response');}
  if(!Array.isArray(game.recent)||game.recent.length>16)throw new Error('Invalid recent messages');
  let previous=0;for(const e of game.recent){keys(e,['at','actor','message'],'message');integer(e.at,previous,game.clock.now,'message time');previous=e.at;if(![...actors,'world'].includes(e.actor)||typeof e.message!=='string'||e.message.length>600)throw new Error('Invalid message');}
  return game;
}
export function exportGame(game) {validate(game);return copy({format:'human-common-ground',version:1,game});}
export function restoreGame(snapshot) {keys(snapshot,['format','version','game'],'snapshot');if(snapshot.format!=='human-common-ground'||snapshot.version!==1)throw new Error('Incompatible worksite save');return copy(validate(snapshot.game));}
