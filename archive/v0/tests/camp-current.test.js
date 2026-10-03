import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chooseCommand } from '../src/games/commons-policy.js';
const camp = existsSync(new URL('../src/games/camp-current.js', import.meta.url)) ? await import('../src/games/camp-current.js') : {};
const command = (g, type, args = {}) => camp.applyCommand(g, { type, ...args });
const start = (g, job) => command(g, 'start', { job });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const roundtrip = g => camp.restoreGame(JSON.parse(JSON.stringify(camp.exportGame(g))));
function drive(g, target, approach='build-first') {
  for (let n = 0; n < 1000 && camp.getGameView(g).phase !== target; n++) {
    const view = camp.getGameView(g), c = chooseCommand(view,approach);
    if (c.type === 'request') g = command(g, 'request', { project: c.projectId });
    else if (c.type === 'start' && c.jobId !== 'rest') g = start(g, c.jobId);
    else g = camp.advanceToNextEvent(g);
  }
  assert.equal(camp.getGameView(g).phase, target); return g;
}
let earned;
const introduction = () => earned ??= drive(camp.createGame(), 'introduction');

test('fresh current Camp has a versioned immutable current envelope and ordinary view', () => {
  assert.equal(typeof camp.createGame, 'function');
  const g = camp.createGame();
  assert.equal(g.version, '0.3.0'); assert.equal(g.people.player.version, '0.1.1');
  assert.deepEqual(camp.exportGame(g), { format: 'human-camp-current', version: 1, game: structuredClone(g) });
  assert.deepEqual(roundtrip(g), g); assert.ok(Object.isFrozen(g.people.player.body));
  for (const field of ['world', 'origin', 'record', 'options', 'solo']) assert.equal(Object.hasOwn(g, field), false);
  const view = camp.getGameView(g); view.stock.food = 100;
  assert.equal(g.stock.food, 4); assert.equal(view.phase, 'camp');
  assert.throws(() => camp.createGame({ solo: true }));
});
test('available recovery pays real time while keeping a person free for immediate work', () => {
  const g = camp.advanceGame(camp.createGame(), 6);
  close(g.people.player.body.fatigue, .059); assert.equal(g.paid.player.recovery, 6);
  assert.equal(g.jobs.player, null); assert.equal(g.people.player.pending, null);
  assert.equal(start(g, 'gather-timber').clock.now, 6);
  assert.equal(camp.advanceToNextEvent(g).clock.now, 9);
});
test('gathering and owned meals settle only after paid completion and interruption refunds only reservation', () => {
  let g = camp.advanceGame(start(camp.createGame(), 'gather-timber'), 15);
  assert.equal(g.stock.timber, 4); g = camp.advanceGame(roundtrip(g), 1);
  assert.equal(g.stock.timber, 7); assert.equal(g.paid.player.work, 16);
  g = camp.advanceGame(start(g, 'eat'), 3); const hunger = g.people.player.body.hunger;
  assert.equal(g.stock.food, 3); g = command(g, 'cancel');
  assert.equal(g.stock.food, 4); assert.equal(g.people.player.body.hunger, hunger);
  g = camp.advanceGame(start(g, 'eat'), 8);
  assert.equal(g.stats.consumedFood, 1); assert.equal(g.stock.food, 3); assert.ok(g.people.player.body.hunger < hunger);
});
test('stop and resume retain installed material, physical progress, latched worker basis and practice', () => {
  let g = camp.advanceGame(start(camp.createGame(), 'build-workbench'), 4);
  const work = structuredClone(g.work.workbench), stock = structuredClone(g.stock), player = structuredClone(g.people.player);
  for (let n = 0; n < 8; n++) g = start(command(g, 'cancel'), 'build-workbench');
  assert.deepEqual(g.work.workbench, work); assert.deepEqual(g.stock, stock); assert.deepEqual(g.people.player, player);
  g = camp.advanceGame(roundtrip(g), 18); assert.equal(g.structures.workbench, 1);
  close(g.lastAssemblies.workbench.contributions.player.effort, .2);
  assert.deepEqual(roundtrip(g), g);
});
test('accepted handover preserves paid ownership and independently chooses the remaining project', () => {
  let g = camp.advanceGame(start(camp.createGame(), 'build-workbench'), 2);
  const before = structuredClone(g.people.player.skills);
  g = command(g, 'handover', { from: 'player', to: 'neighbor' });
  assert.equal(g.lastResponse.accepted, true); assert.equal(g.jobs.player, null); assert.equal(g.jobs.neighbor.project, 'workbench');
  g = camp.advanceGame(roundtrip(g), 20);
  assert.deepEqual(g.people.player.skills, before);
  close(g.lastAssemblies.workbench.contributions.player.fraction, 2 / 22);
  close(g.lastAssemblies.workbench.contributions.neighbor.fraction, 1 - 2 / 22);
});
test('recipient can refuse a handover without transferring work or charging time', () => {
  let g = start(camp.createGame(), 'build-workbench');
  g = command(g, 'request', { project: 'shelter' });
  const before = structuredClone(g.work);
  const refused = command(g, 'handover', { from: 'player', to: 'neighbor' });
  assert.equal(refused.lastResponse.accepted, false); assert.deepEqual(refused.work, before);
  assert.equal(refused.clock.now, g.clock.now); assert.deepEqual(refused.people, g.people);
});
test('accepted project independently gathers, recovers and completes without player assignments', () => {
  let g = command(camp.createGame(), 'request', { project: 'workbench' });
  g = camp.advanceGame(g, 200);
  assert.equal(g.structures.workbench, 2); assert.equal(g.commitment.status, 'fulfilled');
  assert.ok(g.paid.neighbor.recovery > 0); assert.ok(g.stats.gathered.timber > 0); assert.ok(g.stats.gathered.salvage > 0);
});
test('advancing is chunk invariant and restored current boundaries continue exactly', () => {
  const g = command(camp.createGame(), 'request', { project: 'shelter' });
  const whole = camp.advanceGame(g, 360); let split = g;
  for (let n = 0; n < 60; n++) split = camp.advanceGame(split, 6);
  assert.deepEqual(split, whole);
  assert.deepEqual(camp.advanceGame(roundtrip(whole), 37), camp.advanceGame(whole, 37));
});
test('the earned supply introduction pauses actual people and starts exact checkpoint deadlines', () => {
  const g = introduction(); assert.equal(g.clock.now, g.milestoneAt);
  assert.equal(g.window.ferryAt, g.clock.now + 90); assert.equal(g.window.rainAt, g.clock.now + 180);
  assert.equal(g.window.carriedCaches, 0); assert.equal(g.caches, 0);
  assert.throws(() => camp.advanceGame(g, 1), /continue/i);
  const continued = command(g, 'continue'); assert.deepEqual(continued.people, g.people);
  assert.equal(camp.getGameView(continued).phase, 'packing'); assert.deepEqual(roundtrip(g), g);
});
test('coarse and minute advances stop identically at ferry and preserve active jobs', () => {
  let g = command(introduction(), 'continue');
  g = command(g, 'request', { project: 'cache' });
  const whole = camp.advanceGame(g, 1440); let minute = g;
  for (let n = 0; n < 90; n++) minute = camp.advanceGame(minute, 1);
  assert.deepEqual(whole, minute); assert.equal(camp.getGameView(whole).phase, 'ferry');
  assert.throws(() => camp.advanceGame(whole, 1), /ferry/i);
  assert.throws(() => start(whole, 'eat'), /ferry/i);
  const dispatched = command(whole, 'dispatch'); assert.deepEqual(dispatched.people, whole.people);
  assert.deepEqual(camp.advanceGame(roundtrip(dispatched), 30), camp.advanceGame(dispatched, 30));
});
test('actual cache choices, dispatched loss and return preserve the same paid people and resources', () => {
  let g = command(introduction(), 'continue');
  g = command(camp.advanceGame(g, 90), 'dispatch');
  assert.throws(() => command(g, 'allocate', { destination: 'households' }), /departed/i);
  g = drive(g, 'rain');
  while (camp.getGameView(g).availableCaches && camp.getGameView(g).campNights < 4) g = command(g, 'allocate', { destination: 'camp' });
  assert.ok(g.window.allocations.length > 0); assert.equal(camp.getGameView(g).unprovidedHouseholds, 2);
  const people = g.people, stock = g.stock, jobs = g.jobs;
  g = command(g, 'finish'); assert.equal(camp.getGameView(g).phase, 'ended');
  g = command(g, 'return'); assert.deepEqual(g.people, people); assert.deepEqual(g.stock, stock); assert.deepEqual(g.jobs, jobs);
  assert.equal(camp.getGameView(g).phase, 'camp-return');
  const later = camp.advanceGame(roundtrip(g), 12); assert.equal(later.clock.now, g.clock.now + 12);
  assert.deepEqual(later.window, g.window); assert.equal(camp.getGameView(later).unprovidedHouseholds, 2);
});
test('current validation rejects wrong ownership, pending clock, unpaid rate and malformed current facts', () => {
  const active = camp.advanceGame(start(camp.createGame(), 'build-workbench'), 3);
  for (const edit of [g => g.stock.food++, g => g.work.workbench.progress += .2, g => g.work.workbench.contributions.player.effort = 0, g => g.people.player.minutes++, g => g.work.workbench.durationByActor.player--, g => g.clock.queue.push({})]) {
    const saved = camp.exportGame(active); edit(saved.game); assert.throws(() => camp.restoreGame(saved));
  }
  const pending = camp.exportGame(camp.advanceGame(start(camp.createGame(), 'eat'), 2));
  pending.game.jobs.player.endsAt++; assert.throws(() => camp.restoreGame(pending));
  const g = introduction();
  for (const edit of [g => g.window.enteredAt++, g => g.window.ferryAt++, g => g.window.carriedCaches++, g => g.returned = true, g => g.window.allocations.push({ at: g.clock.now, cache: 1, destination: 'camp' })]) {
    const saved = camp.exportGame(g); edit(saved.game); assert.throws(() => camp.restoreGame(saved));
  }
});
test('unsupported saves and unsafe JSON fail without running inherited behavior or changing current state', () => {
  assert.throws(() => camp.restoreGame({ format: 'human-camp-story', version: 1, game: {} }), /incompatible|unsupported/i);
  let called = false;
  assert.throws(() => camp.restoreGame({ get format() { called = true; return 'human-camp-current'; } })); assert.equal(called, false);
  const child = {}, shared = { a: child, b: child }; assert.throws(() => camp.restoreGame(shared), /JSON|unshared/i);
  const g = camp.createGame(), before = camp.exportGame(g);
  assert.throws(() => command(g, 'start', { job: 'unknown' })); assert.deepEqual(camp.exportGame(g), before);
});

test('a prospective workbench improves an already paid garden without resetting either worker basis', () => {
  let g = camp.createGame();
  const actions = [
    ['start','gather-timber'], ['next'], ['next'], ['start','gather-timber'], ['next'], ['start','gather-timber'], ['next'],
    ['start','gather-salvage'], ['next'], ['advance',18], ['start','gather-salvage'], ['next'], ['start','build-workbench'], ['next'],
    ['advance',18], ['start','eat'], ['next'], ['start','build-workbench'], ['advance',27]
  ];
  for (const [type,value] of actions) g = type === 'next' ? camp.advanceToNextEvent(g) : type === 'advance' ? camp.advanceGame(g,value) : start(g,value);
  assert.equal(g.clock.now,183);
  g = command(g,'request',{project:'garden'}); g = camp.advanceGame(g,1);
  assert.equal(g.structures.workbench,2); assert.equal(g.lastAssemblies.workbench.completedAt,184);
  close(g.work.garden.progress,1/20); const basis=g.work.garden.durationByActor.neighbor;
  const restarted=command(g,'handover',{from:'neighbor',to:'player'});
  assert.equal(restarted.lastResponse.accepted,true); assert.equal(restarted.work.garden.durationByActor.neighbor,basis);
  g=camp.advanceGame(roundtrip(g),14);
  assert.equal(g.structures.garden,1); assert.equal(g.lastAssemblies.garden.completedAt,198);
  assert.equal(g.lastAssemblies.garden.contributions.neighbor.minutes,15);
  assert.equal(g.lastAssemblies.garden.exposure.neighbor.toolMinutes,14);
  close(g.lastAssemblies.garden.contributions.neighbor.effort,.2);
});
test('releasing a project retains its installed work and ends the accepted assignment', () => {
  let g=command(camp.createGame(),'request',{project:'workbench'});g=camp.advanceGame(g,3);
  const work=structuredClone(g.work),stock=structuredClone(g.stock),skills=structuredClone(g.people.neighbor.skills);
  g=command(g,'release');assert.equal(g.jobs.neighbor,null);assert.equal(g.commitment.status,'released');
  g=camp.advanceGame(roundtrip(g),12);
  assert.deepEqual(g.work,work);assert.deepEqual(g.stock,stock);assert.deepEqual(g.people.neighbor.skills,skills);
});
test('four actual cache allocations allow early close only after real ferry dispatch', () => {
  let g=command(drive(camp.createGame(),'introduction','stock-first'),'continue'),dispatched=false;
  for(let n=0;n<1000;n++){
    const v=camp.getGameView(g);
    if(v.availableCaches&&(v.householdsEquipped<2&&!v.departed||v.campNights<4)){
      g=command(g,'allocate',{destination:v.householdsEquipped<2&&!v.departed?'households':'camp'});continue;
    }
    if(v.phase==='ferry'){
      assert.throws(()=>command(g,'finish'),/ferry|rain/i);g=command(g,'dispatch');dispatched=true;continue;
    }
    if(v.canFinish){assert.ok(dispatched);assert.ok(v.now<v.rainAt);break;}
    assert.equal(v.phase,'packing');const c=chooseCommand(v);
    g=c.type==='request'?command(g,'request',{project:c.projectId}):c.type==='start'&&c.jobId!=='rest'?start(g,c.jobId):camp.advanceToNextEvent(g);
  }
  const v=camp.getGameView(g);assert.equal(v.householdsEquipped,2);assert.equal(v.campNights,4);assert.equal(v.canFinish,true);
  const before=g.clock.now;g=command(g,'finish');assert.equal(g.clock.now,before);assert.deepEqual(roundtrip(g),g);
});

test('window inventory completion receipts respect physical cache time and the retained final assembly', () => {
  let g=command(drive(camp.createGame(),'introduction','stock-first'),'continue');g=drive(g,'ferry');
  assert.ok(g.window.production.length>0);
  const saved=camp.exportGame(g);saved.game.window.production[0].at=saved.game.window.enteredAt+1;
  assert.throws(()=>camp.restoreGame(saved),/production|cache|receipt/i);
});
test('current snapshots do not authenticate absent body history or the recent activity text', () => {
  const saved=camp.exportGame(camp.advanceGame(camp.createGame(),6));
  saved.game.people.player.body.fatigue=.4;
  saved.game.recent=[{at:6,actor:'world',message:'An unauthenticated current note.'}];
  const loaded=camp.restoreGame(saved);
  assert.equal(loaded.people.player.body.fatigue,.4);assert.equal(loaded.recent[0].message,'An unauthenticated current note.');
});

test('pending meal minutes cannot be reassigned to recovery before completion', () => {
  const g=camp.advanceGame(start(camp.createGame(),'eat'),3),saved=camp.exportGame(g);
  saved.game.paid.player.meal-=3;saved.game.paid.player.recovery+=3;
  saved.game.stats.mealMinutes-=3;saved.game.stats.restMinutes+=3;
  assert.throws(()=>camp.restoreGame(saved),/meal|paid/i);
  assert.equal(camp.advanceGame(roundtrip(g),5).stats.consumedFood,1);
});
test('completed meals and a current pending meal require separate paid time', () => {
  let g=camp.advanceGame(start(camp.createGame(),'eat'),8);g=camp.advanceGame(start(g,'eat'),3);
  const saved=camp.exportGame(g);saved.game.paid.player.meal-=3;saved.game.paid.player.recovery+=3;
  saved.game.stats.mealMinutes-=3;saved.game.stats.restMinutes+=3;
  assert.throws(()=>camp.restoreGame(saved),/meal|paid/i);
  assert.equal(camp.advanceGame(roundtrip(g),5).stats.consumedFood,2);
});
test('completed timber and salvage receipts require their authored paid effort', () => {
  for(const [job,duration,effort] of [['gather-timber',16,.13],['gather-salvage',22,.17]]){
    const g=camp.advanceGame(start(camp.createGame(),job),duration),saved=camp.exportGame(g);
    close(g.paid.player.effort,effort);saved.game.paid.player.effort=0;
    assert.throws(()=>camp.restoreGame(saved),/effort|paid/i);assert.deepEqual(roundtrip(g),g);
  }
});
test('a pending gathering attempt owns its paid effort even if another person has surplus effort', () => {
  let g=command(camp.createGame(),'request',{project:'workbench'});g=camp.advanceGame(start(g,'gather-timber'),3);
  const saved=camp.exportGame(g),paid=saved.game.paid;
  paid.neighbor.effort+=paid.player.effort;paid.player.effort=0;
  assert.throws(()=>camp.restoreGame(saved),/effort|paid/i);
  assert.deepEqual(camp.advanceGame(roundtrip(g),13),camp.advanceGame(g,13));
});
test('completed gathering and current gathering require disjoint paid effort', () => {
  let g=camp.advanceGame(start(camp.createGame(),'gather-timber'),16);g=camp.advanceGame(start(g,'gather-salvage'),3);
  const saved=camp.exportGame(g);saved.game.paid.player.effort=.13;
  assert.throws(()=>camp.restoreGame(saved),/effort|paid/i);
  assert.deepEqual(camp.advanceGame(roundtrip(g),19),camp.advanceGame(g,19));
});

test('a default-created Camp meal crosses the hunger ceiling and preserves its complete receipt through restore',()=>{
 const base=camp.advanceGame(camp.createGame(),385),before=base.people.player.body.hunger,food=base.stock.food,consumed=base.stats.consumedFood;
 assert(before>.55&&before<1);
 const begun=start(base,'eat');let split=camp.advanceGame(begun,4);assert(split.people.player.body.hunger<1);
 split=camp.restoreGame(camp.exportGame(split));split=camp.advanceGame(split,2);assert.equal(split.people.player.body.hunger,1);
 split=camp.advanceGame(split,2);const whole=camp.advanceGame(begun,8);
 assert.deepEqual(camp.exportGame(split),camp.exportGame(whole));
 assert(Math.abs(split.people.player.body.hunger-(before+.002*8-.55))<1e-12);
 assert.equal(split.paid.player.meal,8);assert.equal(split.stock.food,food-1);assert.equal(split.stats.consumedFood,consumed+1);
});

test('an interrupted default high-hunger meal refunds once without relief before a full paid restart',()=>{
 const base=camp.advanceGame(camp.createGame(),385),food=base.stock.food,consumed=base.stats.consumedFood;
 let game=camp.advanceGame(start(base,'eat'),4),partialHunger=game.people.player.body.hunger;
 game=command(game,'cancel');assert.equal(game.people.player.body.hunger,partialHunger);assert.equal(game.stock.food,food);assert.equal(game.stats.consumedFood,consumed);assert.equal(game.paid.player.meal,4);
 game=camp.restoreGame(camp.exportGame(game));game=camp.advanceGame(start(game,'eat'),8);
 assert(Math.abs(game.people.player.body.hunger-(partialHunger+.002*8-.55))<1e-12);
 assert.equal(game.paid.player.meal,12);assert.equal(game.stock.food,food-1);assert.equal(game.stats.consumedFood,consumed+1);
 assert.throws(()=>command(game,'cancel'),/No job/);assert.deepEqual(camp.exportGame(camp.restoreGame(camp.exportGame(game))),camp.exportGame(game));
});
