import assert from 'node:assert/strict';
// Fresh recipes adapted from existing API fixtures only; no player files or migrated saves.
// Adaptive generation reads only old baseline views. Comparisons replay its saved commands.
export function recipes(api,chooseCommand,apply,save){
 const traces=[];
 function fresh(id,purpose){let game=api.createGame(),steps=[];const marks=[];
  function act(command,label=null){const input=JSON.stringify(game),next=apply(api,game,command);assert.equal(JSON.stringify(game),input,'Input mutation');game=next;steps.push({command:structuredClone(command),label,snapshot:save(game)});return game;}
  const view=()=>api.getGameView(game),world=()=>game.world;
  function mark(label){marks.push({label,step:steps.length,snapshot:save(game)});}
  function job(id){act({type:'start',job:id});for(let i=0;world().jobs.player&&i<100;i++)act({type:'next'});assert.equal(world().jobs.player,null);}
  function policy(until,approach='build-first'){for(let i=0;!until(view())&&i<600;i++){const v=view(),c=chooseCommand(v,approach);act(c.type==='request'?{type:'request',project:c.projectId}:c.type==='start'&&c.jobId!=='rest'?{type:'start',job:c.jobId}:{type:'next'});}assert.ok(until(view()),`${id} recipe failed to reach target`);}
  function done(){mark('final');traces.push({id,purpose,initial:save(api.createGame()),steps,marks});}
  return {act,view,world,mark,job,policy,done};
 }
 {
  const t=fresh('gather-accepted-project','Gathering pays before output while Meryem independently completes an accepted project.');
  t.act({type:'request',project:'workbench'});assert.equal(t.world().lastResponse.accepted,true);t.act({type:'start',job:'gather-timber'});t.act({type:'advance',minutes:3});t.mark('active-gather');
  t.act({type:'advance',minutes:13});assert.equal(t.world().stats.gathered.timber,3);t.mark('gather-output');t.act({type:'advance',minutes:184});assert.equal(t.world().structures.workbench,2);assert.equal(t.world().commitment.status,'fulfilled');t.done();
 }
 {
  const t=fresh('readiness-owned-meal','Automatic recovery pays real time; first renewed capacity stops Next; interruption returns only the unused owned meal, completion pays hunger relief.');
  for(const id of ['gather-timber','gather-salvage','gather-timber','gather-salvage'])t.job(id);
  t.act({type:'request',project:'workbench'});assert.equal(t.view().nextStop.reason,'player-ready-for-work');t.mark('blocked-before-readiness');t.act({type:'next'});assert.equal(t.view().now,77);t.mark('ready');
  const before=t.world().stock.food;t.act({type:'start',job:'eat'});assert.equal(t.world().stock.food,before-1);t.act({type:'advance',minutes:3});t.mark('owned-partial-meal');const hunger=t.world().people.player.body.hunger;t.act({type:'cancel'});assert.equal(t.world().stock.food,before);assert.equal(t.world().people.player.body.hunger,hunger);
  t.act({type:'start',job:'eat'});t.act({type:'advance',minutes:7});assert.ok(t.world().people.player.body.hunger>0);t.mark('meal-before-relief');t.act({type:'advance',minutes:1});assert.equal(t.world().people.player.body.hunger,0);t.done();
 }
 {
  const t=fresh('retained-work-consent','Refused busy handover, explicit release, accepted transfer, partial contributions and resume without double material or free practice.');
  t.act({type:'request',project:'garden'});t.act({type:'start',job:'build-workbench'});t.act({type:'advance',minutes:2});const before=structuredClone(t.world());t.act({type:'handover',from:'player',to:'neighbor'});assert.equal(t.world().lastResponse.accepted,false);for(const key of ['people','paid','stock','jobs','work'])assert.deepEqual(t.world()[key],before[key]);t.mark('refused');
  t.act({type:'release'});t.act({type:'handover',from:'player',to:'neighbor'});assert.equal(t.world().lastResponse.accepted,true);t.act({type:'advance',minutes:2});t.mark('shared-paid-work');t.act({type:'release'});const stock=structuredClone(t.world().stock),work=structuredClone(t.world().work.workbench);
  t.act({type:'start',job:'build-workbench'});t.act({type:'cancel'});t.act({type:'start',job:'build-workbench'});assert.deepEqual(t.world().stock,stock);assert.deepEqual(t.world().work.workbench,work);t.act({type:'advance',minutes:18});assert.equal(t.world().structures.workbench,1);t.done();
 }
 {
  const t=fresh('ongoing-tool-improvement','A fresh paid prelude reaches garden assembly one minute before tools complete; ongoing work receives the prospective boost.');
  for(const id of ['gather-timber','gather-timber','gather-timber','gather-salvage'])t.job(id);t.act({type:'advance',minutes:18});t.job('gather-salvage');t.job('build-workbench');t.act({type:'advance',minutes:18});t.job('eat');
  t.act({type:'start',job:'build-workbench'});t.act({type:'advance',minutes:t.view().people.player.job.remaining-1});t.act({type:'request',project:'garden'});t.mark('before-tools');assert.equal(t.world().jobs.neighbor.project,'garden');t.act({type:'advance',minutes:1});assert.equal(t.world().work.garden.progress,.05);t.mark('tools-complete');t.act({type:'advance',minutes:14});assert.equal(t.world().lastAssemblies.garden.completedAt,198);assert.equal(t.world().lastAssemblies.garden.contributions.neighbor.minutes,15);t.done();
 }
 for(const success of [true,false]){
  const t=fresh(success?'earned-supply-success':'unmet-deadline-return',success?'A fresh earned window uses four actual caches in competing destinations; ferry dispatch, early close and paid return continue the people and work.':'The same fresh earned opening misses household service, supplies camp later, retains unmet needs and paid current work after return.');
  t.policy(v=>v.phase==='introduction','stock-first');assert.equal(t.view().now,224);t.mark('earned-introduction');t.act({type:'continue'});
  if(success){const destinations=['households','households','camp','camp'];for(let i=0;i<600;i++){let v=t.view();while(v.availableCaches&&destinations.length){t.act({type:'allocate',destination:destinations.shift()});v=t.view();}
    if(v.phase==='ferry'){t.mark('ferry-before-dispatch');t.act({type:'dispatch'});t.mark('ferry-dispatched');continue;}if(v.canFinish)break;
    const c=chooseCommand(v,'build-first');t.act(c.type==='request'?{type:'request',project:c.projectId}:c.type==='start'&&c.jobId!=='rest'?{type:'start',job:c.jobId}:{type:'next'});
   }assert.equal(t.view().householdsEquipped,2);assert.equal(t.view().campNights,4);assert.ok(t.view().now<t.view().rainAt);t.act({type:'finish'});
  }else{t.act({type:'advance',minutes:1440});assert.equal(t.view().phase,'ferry');t.mark('ferry-before-dispatch');t.act({type:'dispatch'});t.policy(v=>v.phase==='rain');while(t.view().availableCaches&&t.view().campNights<4)t.act({type:'allocate',destination:'camp'});assert.equal(t.view().unprovidedHouseholds,2);assert.ok(t.view().campNights>0);t.act({type:'finish'});}
  t.mark('ended');const before=structuredClone(t.world());t.act({type:'return'});assert.deepEqual(t.world(),before);t.act({type:'advance',minutes:6});assert.equal(t.view().phase,'camp-return');t.done();
 }
 return traces;
}
