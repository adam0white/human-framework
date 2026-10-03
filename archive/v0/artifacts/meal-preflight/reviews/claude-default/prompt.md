Independently review this deterministic actor-framework preflight. Only public source excerpts and synthetic case facts are provided. No tools or outside information are needed. Distinguish executed controls, arithmetic possibilities, and human/physiological claims. Do not assume a feature should be added. Limit your review to 700 words.

Question: is retained actor-owned meal progress justified by these cases, what strong current alternatives or causal errors are missing, and what ONE bounded next framework priority is most valuable if it is not? Seek ordinary-use value or correctness, avoiding new state, game count, or retimed deadlines merely to manufacture a need.

Meal: reserve one shared portion, pay8minutes, consume/grant sole hunger relief at completion. Cancel returns reservation, retains paid time but discards completion progress. Waiting automatically recovers. Browser pause/checkpoint/reload preserves the meal; allocation and requests cost zero time. No resume-meal candidate has been implemented or executed. Histories begin at default creation using supported commands. These are selected exploratory cases, not random or withheld human samples.

A: default prefix minute278; player fatigue.557/hunger.226; stock7timber/4salvage/5food. Partner holds first cache until283. Second cache needs20min; ferry314. Finish meal278–286/cache286–306: second household306, both meal/cache306, fatigue.799. Wait/recover278–283/cache283–303/meal303–311: second household303, both311, fatigue.6815. Eat278–283/cancel/cache283–303/restartmeal303–311: second household303, both311, fatigue.8065. Task-first278 rejects exclusivity. All serve2households. Same view-driven build-first continuation closes with all4campnights at403/403/399; cancel arm personally builds extra cache and gathers fewer minutes, so worker allocation differs. Hypothetical retention of5mealmin gives cache303 and remainingmeal3 ending306; this is arithmetic only.

B: default prefix381; player fatigue0/hunger.432; stock7/4/5; partner thirdcache ends383 then needs recovery; rain404. Task-first381 rejects exclusivity. Finishmeal381–389 starts lastcache389, incomplete at404, only2campnights. Cancelmeal381–383/cache383–403 gives4nights403. Wait/recover381–383/samecache383–403 also gives4nights403, samefood and lessfatigue(.230vs.233). Both then complete fullmeal403–411 across rain/finish/return, fatigue.242vs.245. A distinct upstream prefix365 has a complete meal365–373/recovery373–383/cache383–403: same4nights403, fatigue.3695/hunger.060 at403, .1815/.076 at411 vs latewait .242/0. Upstream plan cannot be selected retrospectively at381. No global body-state dominance is claimed.

Two other nominations were inspected without new branches: canceled3-minute meal80 has no competing objective; meal179–187 finishes before partner salvage195. No states, people, deadlines or effects were edited.

Address whether preemption and retained progress are being conflated; preparation versus eating; reserved versus consumed food; recovery/meal differences; strength and limits of atomic controls. Label unexecuted suggestions. Finally suggest one next meaningful framework step rather than expanding this search indefinitely. This assessment is independent static reasoning, not reproduction.


PUBLIC SOURCE: src/games/camp-current.js
```js
1: /** Current Camp 0.3.0: owned resources, paid people and one current snapshot.
2:  * No historical host, migration, command transcript or private work helper.
3:  */
4: import {practice} from '../core/model.js';
5: import {HUMAN_VERSION,RUNTIME_VERSION,createPerson,restorePerson,exportPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,assessEffort,createClock,restoreClock,exportClock,scheduleEvent,cancelEvent,advanceClock} from '../runtime/index.js';
6: export const CAMP_VERSION='0.3.0';
7: const copy=value=>structuredClone(value),EPS=1e-12,LIMIT=1e9;
8: const resources=['timber','salvage','food'],projects=['shelter','workbench','garden','cache'],ACTORS=['player','neighbor'],INITIAL={timber:4,salvage:2,food:4};
9: const trusted=new WeakSet();
10: function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
11: function seal(game){validate(game);freeze(game);trusted.add(game);return game;}
12: export const PROJECTS=freeze({
13:   shelter:{label:'Woodshed',benefit:'Keep an extra usable bundle dry: timber trips bring 4 instead of 3.',stages:[{label:'Raise the frame',cost:{timber:4,salvage:1},minutes:24},{label:'Roof and storage',cost:{timber:4,salvage:2},minutes:28}]},
14:   workbench:{label:'Workbench',benefit:'Every later assembly takes 6 fewer minutes.',stages:[{label:'Build the table',cost:{timber:3,salvage:2},minutes:22},{label:'Fit the tools',cost:{timber:3,salvage:3},minutes:28}]},
15:   garden:{label:'Garden',benefit:'Food trips bring 3 portions instead of 2.',stages:[{label:'Edge the beds',cost:{timber:5,salvage:1},minutes:20},{label:'Plant and mulch',cost:{timber:3,salvage:1},minutes:26}]},
16:   cache:{label:'Supply cache',benefit:'Pack timber and salvage into one supply cache.',stages:[{label:'Pack a supply cache',cost:{timber:6,salvage:3},minutes:26}]}
17: });
18: const JOBS=freeze({
19:   'gather-timber':{label:'Gather timber',detail:'Bring wood from the grove.',minutes:16,effort:.13,skill:'gathering',output:{timber:3}},
20:   'gather-salvage':{label:'Recover salvage',detail:'Bring reusable fittings from the old shed.',minutes:22,effort:.17,skill:'gathering',output:{salvage:3}},
21:   forage:{label:'Gather food',detail:'Pick food near camp. Light work remains possible when heavy work is blocked.',minutes:14,skill:'gathering',output:{food:2}},
22:   eat:{label:'Eat a portion',detail:'Reserve one shared portion; hunger relief follows eight paid minutes.',minutes:8,activity:'meal',cost:{food:1}}
23: });
24: const fail=message=>{throw Error(message);};
25: const int=(value,min,max,name)=>{if(!Number.isSafeInteger(value)||value<min||value>max||Object.is(value,-0))fail(`Invalid ${name}`);};
26: const number=(value,min,max,name)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min-EPS||value>max+EPS)fail(`Invalid ${name}`);};
27: const fields=(value,names,name)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))fail(`Invalid ${name} fields`);};
28: const same=(a,b)=>canonical(a)===canonical(b);
29: function canonical(value){if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;return JSON.stringify(value);}
30: const actors=()=>ACTORS;
31: const built=g=>['shelter','workbench','garden'].every(p=>g.structures[p]===2);
32: const complete=(g,p)=>p!=='cache'&&g.structures[p]===2;
64: function unavailable(g,b,a){
65:   if(g.jobs[a])return 'Already working. Finish or stop the current job first.';
66:   const future=LIMIT-g.clock.now;
67:   if(g.stats.started>=Number.MAX_SAFE_INTEGER-2*future)return 'Job counter space is reserved for progression and stops.';
68:   if(!b.project&&(g.people[a].nextAttempt>=Number.MAX_SAFE_INTEGER-future||g.clock.nextEvent>=Number.MAX_SAFE_INTEGER-2*future))return 'Attempt and event counter space is reserved for automatic progression.';
69:   if(b.project==='cache'&&!built(g))return 'Finish the woodshed, workbench, and garden before packing caches.';
70:   if(b.project&&Object.values(g.jobs).some(j=>j?.project===b.project))return 'Someone is already building this stage.';
71:   if(g.clock.now+b.duration>LIMIT)return 'Insufficient remaining world time for this whole job.';
72:   for(const [r,n]of Object.entries(b.cost))if(g.stock[r]<n)return `Needs ${n} ${r}; only ${g.stock[r]} is available.`;
73:   const capacity=assessEffort(g.people[a].body,b.action);if(!capacity.allowed)return `Insufficient ${capacity.causes.join(' and ')} capacity for this whole job. Recover first.`;
74:   return null;
75: }
76: function begin(g,id,a,reason=null){
77:   const b=blueprint(g,id,a),why=unavailable(g,b,a);if(why)fail(why);
78:   add(g.stock,b.cost,-1);g.recovering[a]=false;
79:   if(b.project){
80:     g.work[b.project]=b.work;g.jobs[a]={kind:'assembly',id,project:b.project,workId:b.work.id,startedAt:g.clock.now};
81:   }else{
82:     const person=beginAttempt(g.people[a],b.action),endsAt=g.clock.now+b.duration;
83:     const event=scheduleEvent(g.clock,{at:endsAt,type:'job-complete',actorId:a,data:{jobId:id,attemptId:person.pending.id}});
84:     g.clock=event.clock;g.people[a]=person;g.jobs[a]={kind:'fixed',...b,startedAt:g.clock.now,endsAt,eventId:event.eventId,attemptId:person.pending.id};
85:   }
86:   g.stats.started++;if(a==='neighbor'&&reason)g.commitment.reason=reason;
87:   record(g,a,`${name(a)} started ${b.label.toLowerCase()} (${b.duration} min).${reason?' '+reason:''}`);
88: }
89: function stop(g,a){
90:   const job=g.jobs[a];if(!job)fail('No job to stop');
91:   if(job.kind==='fixed'){
92:     g.people[a]=finishAttempt(g.people[a],{attemptId:job.attemptId,status:'interrupted'});
93:     g.clock=cancelEvent(g.clock,job.eventId);add(g.stock,job.cost);
94:   }
95:   g.jobs[a]=null;g.stats.canceled++;
96:   record(g,a,`${name(a)} stopped ${job.id}. ${job.kind==='assembly'?'Installed material and physical work remain.':'No completion output; its unused reservation returns.'} Paid time remains.`);
97: }
98: function settleAssembly(g,a){
99:   const job=g.jobs[a],w=g.work[job.project];w.progress=1;w.completedAt=g.clock.now;
100:   add(g.stats.spent,w.cost);if(w.project==='cache')g.caches++;else g.structures[w.project]++;
101:   g.lastAssemblies[w.project]=copy(w);delete g.work[w.project];g.jobs[a]=null;g.stats.completed++;
102:   record(g,a,`${name(a)} finished ${PROJECTS[w.project].label.toLowerCase()}: ${PROJECTS[w.project].stages[w.stage].label.toLowerCase()}.`);
103: }
104: function settleFixed(g,a){
105:   const j=g.jobs[a];if(!j||j.kind!=='fixed')fail('Unexpected fixed completion');
106:   g.people[a]=finishAttempt(g.people[a],{attemptId:j.attemptId,status:'completed',mealConsumed:j.id==='eat'});
107:   add(g.stock,j.output);add(g.stats.gathered,j.output);add(g.stats.spent,j.cost);
108:   if(j.id==='eat')g.stats.consumedFood++;
109:   g.stats.receipts[j.id]++;if(j.id==='gather-timber'&&j.benefits.shelter)g.stats.receipts.coveredTimber++;
110:   if(j.id==='forage'&&j.benefits.garden)g.stats.receipts.gardenFood++;
111:   g.stats.completed++;g.jobs[a]=null;record(g,a,`${name(a)} finished ${j.label.toLowerCase()}.${Object.entries(j.output).map(([r,n])=>` +${n} ${r}.`).join('')}`);
112: }
113: function desire(g,project){
114:   const a='neighbor',body=g.people[a].body;
115:   if(body.hunger>=.65)return {id:g.stock.food?'eat':'forage',reason:g.stock.food?'I need a meal, then I can continue.':'I need food. I will gather some near camp.'};
116:   if(body.fatigue>=.68||g.recovering[a]&&body.fatigue>.45)return {recovery:true,reason:'I am recovering and remain available for a feasible next task.'};
117:   if(!project)return null;
118:   const lock=Object.values(g.jobs).find(j=>j?.project===project);
119:   const nextStage=lock&&project!=='cache'?stage(g,project)+1:stage(g,project),target=PROJECTS[project].stages[nextStage];
120:   if(!target)return null;
121:   const cost=!lock&&g.work[project]?{}:target.cost;
122:   for(const [r,n]of Object.entries(cost))if(g.stock[r]<n)return {id:r==='timber'?'gather-timber':'gather-salvage',reason:`I am gathering ${r} for our accepted ${PROJECTS[project].label.toLowerCase()}.`};
123:   if(lock)return null;
124:   return {id:`build-${project}`,reason:`I am completing the accepted ${PROJECTS[project].label.toLowerCase()} project.`};
125: }
126: function neighbor(g){
127:   const c=g.commitment;
128:   if(c.status==='accepted'&&(c.project==='cache'?g.caches>c.startCaches:complete(g,c.project))){c.status='fulfilled';c.finishedAt=g.clock.now;c.reason=`The ${PROJECTS[c.project].label.toLowerCase()} is complete. I am available.`;record(g,'neighbor',c.reason);}
129:   if(g.jobs.neighbor||g.clock.now>=LIMIT)return;
130:   const project=c.status==='accepted'?c.project:null,choice=desire(g,project);
131:   if(choice?.recovery){g.recovering.neighbor=true;c.reason=choice.reason;return;}
132:   if(choice?.id){
133:     const b=blueprint(g,choice.id,'neighbor'),blocked=unavailable(g,b,'neighbor');
134:     if(!blocked){begin(g,choice.id,'neighbor',choice.reason);return;}
135:     if(blocked.includes('hunger')){
136:       const id=g.stock.food?'eat':'forage',food=blueprint(g,id,'neighbor');if(!unavailable(g,food,'neighbor')){begin(g,id,'neighbor','I need food before I can continue our accepted work.');return;}
137:     }
138:     g.recovering.neighbor=true;c.reason='I need to recover before continuing; the project remains accepted.';
139:   }else{g.recovering.neighbor=false;if(project)c.reason='You are building this stage. I am available while it finishes; our project remains accepted.';}
140: }
141: function spendMinute(person,action){let p=beginAttempt(person,action);if(!p.pending.capacity.allowed)fail('Insufficient capacity for paid work minute');p=advanceAttempt(p,1);return finishAttempt(p,{attemptId:p.pending.id,status:'completed'});}
142: function advanceRaw(g,minutes){
143:   for(let i=0;i<minutes;i++){
144:     const done=[];
145:     for(const a of actors(g)){
146:       const j=g.jobs[a],p=g.paid[a];
147:       if(j?.kind==='assembly'){
148:         const w=g.work[j.project],fraction=Math.min(1-w.progress,1/duration(g,w,a));
149:         g.people[a]=spendMinute(g.people[a],{actionId:j.id,targetId:j.project,durationMinutes:1,effort:.2*fraction,exertive:true,skill:'construction'});
150:         w.progress+=fraction;const contribution=w.contributions[a];contribution.minutes++;if(g.structures.workbench===2)w.exposure[a].toolMinutes++;contribution.fraction+=fraction;contribution.effort+=.2*fraction;
151:         p.work++;p.constructionMinutes++;p.effort+=.2*fraction;g.stats.workMinutes++;if(w.progress>=1-EPS)done.push(a);
152:       }else if(j){
153:         g.people[a]=advanceAttempt(g.people[a],1);p[j.id==='eat'?'meal':'work']++;g.stats[j.id==='eat'?'mealMinutes':'workMinutes']++;
154:         if(j.action.skill==='gathering')p.gatheringMinutes++;p.effort+=j.action.effort/j.duration;
155:       }else{
156:         const recovering=true;
157:         g.people[a]=spendMinute(g.people[a],{actionId:recovering?'available':'idle',durationMinutes:1,activity:recovering?'rest':'active'});
158:         p[recovering?'recovery':'idle']++;g.stats[recovering?'restMinutes':'idleMinutes']++;
159:       }
160:     }
225: const pauseReason=g=>({introduction:'Read the new supply objective, then Continue.',ferry:'The ferry is waiting. Allocate supplies, then send it.',rain:'The rain checkpoint is here. Allocate remaining camp supplies, then finish.',ended:'This supply window is finished. Return to camp or save and leave.'})[phase(g)]??(g.clock.now>=timeLimit(g)?'The supported camp time limit is reached. Stop active work or save and leave.':null);
226: const runs=g=>['camp','packing','camp-return'].includes(phase(g))&&g.clock.now<timeLimit(g);
227: function requireRunning(g){if(!runs(g))fail(pauseReason(g));}
228: function enter(g){g.window={enteredAt:g.clock.now,ferryAt:g.clock.now+90,rainAt:g.clock.now+180,carriedCaches:0,production:[],allocations:[],acknowledged:false,departedAt:null,finishedAt:null};}
229: export function createGame(input={}){
230:   inspect(input);fields(input,[],'camp setup');
231:   return seal({version:CAMP_VERSION,runtimeVersion:RUNTIME_VERSION,humanVersion:HUMAN_VERSION,clock:createClock(),
232:     people:Object.fromEntries(ACTORS.map(id=>[id,createPerson({id,body:{fatigue:id==='player'?.20:.30,hunger:id==='player'?.22:.28},skills:{gathering:.10,construction:.05}})])),
233:     jobs:{player:null,neighbor:null},stock:copy(INITIAL),structures:{shelter:0,workbench:0,garden:0},caches:0,milestoneAt:null,
234:     commitment:{status:'none',project:null,acceptedAt:null,finishedAt:null,startCaches:0,reason:'Ask me to help with a specific project. I’ll tell you what I can do.'},lastResponse:null,
235:     stats:{started:0,completed:0,canceled:0,gathered:{timber:0,salvage:0,food:0},spent:{timber:0,salvage:0,food:0},consumedFood:0,workMinutes:0,restMinutes:0,mealMinutes:0,idleMinutes:0,receipts:{'gather-timber':0,'gather-salvage':0,forage:0,rest:0,eat:0,coveredTimber:0,gardenFood:0}},
236:     recent:[],work:{},lastAssemblies:{},paid:Object.fromEntries(ACTORS.map(a=>[a,{work:0,recovery:0,idle:0,meal:0,effort:0,constructionMinutes:0,gatheringMinutes:0}])),recovering:{player:false,neighbor:false},window:null,returned:false});
237: }
238: export function applyCommand(game,command){
239:   validate(game);inspect(command);
240:   const schema={start:['type','job'],cancel:['type'],request:['type','project'],release:['type'],handover:['type','from','to'],continue:['type'],allocate:['type','destination'],dispatch:['type'],finish:['type'],return:['type']};
241:   if(!command||!Object.hasOwn(schema,command.type))fail('Unknown camp command');fields(command,schema[command.type],'camp command');
242:   const g=copy(game),w=g.window,current=phase(g),type=command.type;
243:   if(['start','request','handover'].includes(type))requireRunning(g);
244:   if(type==='start'){begin(g,command.job,'player');neighbor(g);}
245:   else if(type==='cancel'){stop(g,'player');neighbor(g);}
246:   else if(type==='request')request(g,command.project);
247:   else if(type==='release')release(g);
248:   else if(type==='handover')handover(g,command.from,command.to);
249:   else if(type==='continue'){if(current!=='introduction')fail('The introduction was already continued or has not begun');w.acknowledged=true;}
250:   else if(type==='allocate'){
251:     if(!w||['introduction','ended','camp-return'].includes(current))fail('Allocation is unavailable before Continue or after the window is finished');
252:     const d=command.destination;if(!['households','camp'].includes(d))fail('Unknown cache destination');
253:     if(d==='households'&&w.departedAt!==null)fail('The ferry has departed. Later caches can still provision camp.');
254:     if(count(g,d)>=2)fail('This destination is fully covered');if(g.caches<=w.allocations.length)fail('Complete a cache before allocating it');
255:     const used=new Set(w.allocations.map(item=>item.cache));let cache=1;while(used.has(cache))cache++;
256:     w.allocations.push({at:g.clock.now,cache,destination:d});
257:   }else if(type==='dispatch'){
258:     if(!w||w.departedAt!==null)fail('The ferry has already departed or no window exists');
259:     if(current!=='ferry')fail('Reach the ferry checkpoint before dispatching');w.departedAt=g.clock.now;
260:   }else if(type==='finish'){
261:     if(!w||w.finishedAt!==null)fail('The window is already finished or has not begun');
262:     if(current!=='rain'&&!(current==='packing'&&w.departedAt!==null&&covered(g)))fail('Reach rain, or dispatch the ferry with all needs covered before finishing');w.finishedAt=g.clock.now;
263:   }else if(type==='return'){if(current!=='ended')fail('Return requires a finished window that has not already returned');g.returned=true;}
264:   return seal(g);
265: }
266: export function advanceGame(game,minutes){
267:   validate(game);requireRunning(game);int(minutes,0,1440,'advance minutes');
268:   const g=copy(game),w=g.window,checkpoint=w&&!g.returned?(w.departedAt===null?w.ferryAt:w.rainAt):timeLimit(g),target=Math.min(checkpoint,g.clock.now+minutes);
269:   while(g.clock.now<target){
270:     const before=g.caches;advanceRaw(g,1);
```

PUBLIC SOURCE: src/human/v0.1.1.js
```js
43: 
44: /** The caller supplies actual body for execution, perceived body for forecasting. */
45: export function assessEffort(condition,{durationMinutes,effort=0,exertive=false}) {
46:   body(condition);finite(durationMinutes,'durationMinutes',0.01,1440);finite(effort,'effort');
47:   if(typeof exertive!=='boolean'||(!exertive&&effort!==0))throw new Error('Effort requires exertion');
48:   return assessCapacity(condition,{kind:exertive?'work':'observe',effort},durationMinutes);
49: }
50: 
124:   if(person.nextAttempt===Number.MAX_SAFE_INTEGER)throw new Error('Attempt ID space exhausted');
125:   const action=actionSpec(input,person.skills),next=copy(person);
126:   next.pending={id:`${person.id}:${person.nextAttempt}`,action,elapsedMinutes:0,
127:     capacity:assessEffort(person.body,action),bodyBefore:copy(person.body),
128:     skillBefore:action.skill===null?null:person.skills[action.skill],startedAt:person.minutes};
129:   next.nextAttempt++;
130:   return next;
131: }
132: 
133: /** Advance only actual elapsed time. The host owns world time and task effects. */
134: export function advanceAttempt(person,minutes) {
135:   validatePerson(person);if(!person.pending)throw new Error('No pending attempt');
136:   finite(minutes,'elapsed advance',0,1440);
137:   const pending=person.pending,action=pending.action,remaining=action.durationMinutes-pending.elapsedMinutes;
138:   if(minutes>remaining+1e-10)throw new Error('Advance exceeds remaining attempt duration');
139:   const elapsed=Math.min(minutes,remaining),next=copy(person);
140:   let fatigue=person.body.fatigue+PARAMETERS.fatiguePerMinute*elapsed;
141:   if(pending.capacity.allowed) {
142:     if(action.activity==='rest')fatigue-=PARAMETERS.restPerMinute*elapsed;
143:     if(action.activity==='active') {
144:       fatigue+=action.effort*elapsed/action.durationMinutes;
145:       if(action.skill!==null)next.skills[action.skill]=practice(person.skills[action.skill],elapsed);
146:     }
147:   }
148:   next.body={fatigue:clamp(fatigue),hunger:clamp(person.body.hunger+PARAMETERS.hungerPerMinute*elapsed)};
149:   next.pending.elapsedMinutes=Math.min(action.durationMinutes,pending.elapsedMinutes+elapsed);
150:   next.minutes=pending.startedAt+next.pending.elapsedMinutes;
151:   finite(next.minutes,'minutes',0,1e12);
152:   return next;
153: }
154: 
155: /** A confirmed host result consumes one attempt. It never resolves a host object. */
156: export function finishAttempt(person,result) {
157:   validatePerson(person);
158:   object(result,'outcome',['attemptId','status','mealConsumed']);
159:   const pending=person.pending;
160:   if(!pending||pending.id!==result.attemptId)throw new Error('No matching pending attempt');
161:   if(!['completed','failed','interrupted','blocked'].includes(result.status))throw new Error('Invalid completion status');
162:   const consumed=result.mealConsumed??false;
163:   if(typeof consumed!=='boolean')throw new Error('Invalid meal receipt');
164:   if(consumed&&(pending.action.activity!=='meal'||result.status!=='completed'))throw new Error('Meal receipt requires completed meal');
165:   if(!pending.capacity.allowed&&result.status!=='blocked')throw new Error('Blocked exertion cannot execute');
166:   if(pending.capacity.allowed&&result.status==='blocked')throw new Error('Allowed attempt cannot report capacity blockage');
167:   if(['completed','failed'].includes(result.status)&&pending.elapsedMinutes<pending.action.durationMinutes-1e-10)throw new Error('Attempt interval is incomplete');
168:   const next=copy(person);
169:   // Keep the interval's maintenance even if the visible hunger reached its
170:   // ceiling while the meal was in progress. Receipt and relief occur once.
171:   if(consumed)next.body.hunger=clamp(pending.bodyBefore.hunger+PARAMETERS.hungerPerMinute*pending.elapsedMinutes-PARAMETERS.mealRelief);
172:   next.pending=null;
173:   return next;
174: }
175: 
176: export function exportPerson(person) {
177:   validatePerson(person);
```

PUBLIC SOURCE: src/core/model.js
```js
1: export const ENGINE_VERSION='0.3.0';
2: export const MODULES=Object.freeze({body:true,beliefs:true,commitments:true,learning:true,relationships:true});
3: // Engineering defaults for microgames. None is an empirical estimate or a spiritual metric.
4: export const PARAMETERS=Object.freeze({
5:   fatiguePerMinute:0.0015,hungerPerMinute:0.002,restPerMinute:0.025,
6:   mealRelief:0.55,learningPerMinute:0.008,practiceQuality:0.65,
7:   assistance:0.18,trustGain:0.025,trustLoss:0.04
8: });
9: export const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
10: export const clone=x=>structuredClone(x);
11: export const actionEffort=action=>action.kind==='work'?action.effort:action.kind==='help'?(action.effort??0.08):0;
12: // Compare the completion boundary in relative units. Accumulating 0.1 ten
13: // times must not miss a goal that succeeds after converting to integer units.
14: export function remainingGoal(progress,target,consumption=0) {
15:   const gap=target-progress+consumption;
16:   return gap/target<=1e-12?0:gap;
17: }
18: 
19: // A simulation capacity contract, shared by all controllers and module ablations.
20: // Forecasts may use perceived body; execution must use actual body. These proxy
21: // ceilings do not assert a clinical threshold for fatigue, hunger or agency.
22: export function assessCapacity(body,action,roundMinutes) {
23:   const exertive=['work','help'].includes(action.kind);
24:   const fatigueCost=PARAMETERS.fatiguePerMinute*roundMinutes+actionEffort(action);
25:   const hungerCost=PARAMETERS.hungerPerMinute*roundMinutes;
26:   const projectedFatigue=body.fatigue+fatigueCost,projectedHunger=body.hunger+hungerCost;
27:   const causes=[];
28:   if(exertive&&projectedFatigue>1+1e-12)causes.push('fatigue');
29:   if(exertive&&projectedHunger>1+1e-12)causes.push('hunger');
30:   return {allowed:causes.length===0,causes,fatigueCost,hungerCost,projectedFatigue,projectedHunger};
31: }
32: 
```