import {createPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,assessEffort,estimateSuccess} from '../human/index.js';
import {keyedRandom} from '../core/random.js';

export const COURTYARD_VERSION='0.1.0';
export const TURNS=18,TURN_MINUTES=10,CARRY_LIMIT=6,TARGET=14;
export const PROFILES=Object.freeze({standard:28,scarce:22,plentiful:36});
export const POLICIES=Object.freeze(['self-sufficient','reciprocal','generous']);
const actors=['player','neighbor'];
const copy=value=>structuredClone(value);
const definitions=Object.freeze({
  'draw-quick':{label:'Lift three',detail:'Take up to 3 from the cistern. You may spill 1. More tiring.',effort:0.18,skill:'collection'},
  'draw-careful':{label:'Carry two carefully',detail:'Take up to 2 from the cistern, without spilling.',effort:0.10,skill:'collection'},
  pour:{label:'Fill your barrel',detail:'Move up to 3 carried buckets into your household barrel.',effort:0.06},
  rest:{label:'Sit in the shade',detail:'Recover some strength. Meryem continues her own work.',activity:'rest'},
  eat:{label:'Eat your meal',detail:'Use your one packed meal to ease hunger.',activity:'meal'},
  offer:{label:'Offer two buckets',detail:'Offer a gift from your carried water. Meryem may refuse.'},
  ask:{label:'Ask for two buckets',detail:'Ask Meryem for a gift. She may need to keep her water.'},
  borrow:{label:'Borrow two buckets',detail:'Ask for 2, with a promise to return 2 within three moves.'},
  repay:{label:'Return two buckets',detail:'Settle your water loan. Late returns remain recorded.'},
  accept:{label:'Accept',detail:'Complete the proposed two-bucket transfer.'},
  refuse:{label:'Refuse',detail:'Decline this proposal. Neither person transfers water.'},
  request:{label:'Ask you for water',detail:'Meryem asks for two buckets.'},
  propose:{label:'Offer you water',detail:'Meryem offers two buckets.'},
  respond:{label:'Discuss the water',detail:'Meryem decides whether to accept your proposal.'}
});
const playerIds=['draw-quick','draw-careful','pour','rest','eat','offer','ask','borrow','repay','accept','refuse'];
const requireKeys=(value,keys,name)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))throw new Error(`Invalid ${name} fields`);
};
const integer=(value,min,max,name)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Invalid ${name}`);};
const validSeed=seed=>integer(seed,0,4294967295,'seed');
const gap=(view,id)=>Math.max(0,TARGET-view.homes[id]);
const spec=id=>({actionId:id,durationMinutes:TURN_MINUTES,effort:definitions[id].effort??0,
  exertive:Boolean(definitions[id].effort),activity:definitions[id].activity??'active',skill:definitions[id].skill??null});

export function createGame({seed=1,profile='standard',socialMemory=true}={}) {
  validSeed(seed);if(!Object.hasOwn(PROFILES,profile))throw new Error('Unknown courtyard profile');
  if(typeof socialMemory!=='boolean')throw new Error('Invalid socialMemory switch');
  return {version:COURTYARD_VERSION,seed,profile,socialMemory,round:0,clock:0,status:'playing',source:PROFILES[profile],spilled:0,
    carried:{player:2,neighbor:4},homes:{player:0,neighbor:0},meals:{player:1,neighbor:1},
    people:Object.fromEntries(actors.map(id=>[id,createPerson({id,body:{fatigue:id==='player'?0.30:0.52,hunger:id==='player'?0.42:0.28},skills:{collection:id==='player'?0.52:0.62}})])),
    draws:{player:0,neighbor:0},social:{given:{player:0,neighbor:0},loan:null,returnedOnTime:0,returnedLate:0,lateLoans:0,
      refusedByPlayer:0,refusedByNeighbor:0,ignored:0,proposal:null,nextProposalRound:0},lastTurn:null};
}

function actionAvailability(game,id) {
  if(game.status!=='playing')return 'The tap has closed.';
  if(id.startsWith('draw-')&&game.source===0)return 'The cistern is empty.';
  if(id.startsWith('draw-')&&game.carried.player===CARRY_LIMIT)return 'Your cans are full.';
  if(id==='pour'&&game.carried.player===0)return 'You have no carried water.';
  if(id==='pour'&&game.homes.player===TARGET)return 'Your barrel is full.';
  if(id==='eat'&&game.meals.player===0)return 'Your packed meal is gone.';
  if(id==='offer'&&game.carried.player<2)return 'You need two carried buckets to offer.';
  if(id==='repay'&&!game.social.loan)return 'You have no water loan.';
  if(id==='repay'&&game.carried.player<2)return 'You need two carried buckets to return.';
  if(id==='repay'&&game.carried.neighbor>CARRY_LIMIT-2)return 'Meryem needs space in her cans before you return it.';
  if(['accept','refuse'].includes(id)&&!game.social.proposal)return 'There is no proposal to answer.';
  if(id==='accept'&&game.social.proposal?.kind==='request'&&game.carried.player<2)return 'You no longer have two buckets to give.';
  if(id==='accept'&&game.social.proposal?.kind==='offer'&&game.carried.player>CARRY_LIMIT-2)return 'Make room in your cans first.';
  return null;
}

export function getGameView(game) {
  const player=getPersonView(game.people.player),neighbor=getPersonView(game.people.neighbor);
  return copy({version:game.version,profile:game.profile,socialMemory:game.socialMemory,round:game.round,clock:game.clock,
    remainingTurns:TURNS-game.round,status:game.status,source:game.source,spilled:game.spilled,carried:game.carried,homes:game.homes,
    meals:game.meals,social:game.social,lastTurn:game.lastTurn,player,neighbor,
    actions:game.status!=='playing'?[]:playerIds.map(id=>({id,...definitions[id],minutes:TURN_MINUTES,
      unavailable:actionAvailability(game,id),capacity:assessEffort(player.body,spec(id)),
      estimatedCleanLift:id==='draw-quick'?estimateSuccess({skill:player.skills.collection,body:player.body,difficulty:0.12}):null}))});
}

/** Recipient chooses from a detached observation, never authoritative world state. */
export function chooseResponse(view,proposal) {
  if(!['offer','ask','borrow'].includes(proposal))throw new Error('Unknown proposal');
  const own=view.carried.neighbor,other=view.carried.player,need=gap(view,'neighbor');
  const answer=(accepted,reason)=>({accepted,reason});
  if(proposal==='offer') {
    if(own>CARRY_LIMIT-2)return answer(false,'My cans are full. Keep those two for now.');
    if(need<=own)return answer(false,'I already have enough for my barrel. Keep it for yours.');
    return answer(true,'Yes, thank you. Those two will go toward my household.');
  }
  if(own<2)return answer(false,'I do not have two buckets in my cans.');
  if(other>CARRY_LIMIT-2)return answer(false,'Your cans do not have room for two.');
  if(gap(view,'player')<=other)return answer(false,'You already carry enough to finish your barrel.');
  if(proposal==='borrow') {
    if(view.social.loan)return answer(false,'The last two have not been returned yet.');
    if(view.remainingTurns<3)return answer(false,'There is too little time left for a three-move loan.');
    if(view.socialMemory&&view.social.lateLoans>0)return answer(false,'The earlier loan was late. I am keeping this water.');
    if(view.remainingTurns<6&&own<need)return answer(false,'I need what I have to finish my own barrel.');
    return answer(true,'All right. Return two within three moves.');
  }
  if(own-2>=need)return answer(true,'I have enough left for my household. These two are yours.');
  if(view.socialMemory&&view.social.given.player>view.social.given.neighbor&&view.remainingTurns>=5&&view.source>=4)
    return answer(true,'You shared with me earlier. I can give two back while there is time.');
  return answer(false,'I still need these for my household. I cannot give them away.');
}

/** Meryem owns this decision. Her visible-state rule is replaceable by a host. */
export function chooseNeighborAction(view) {
  const own=view.carried.neighbor,need=gap(view,'neighbor'),otherNeed=gap(view,'player');
  const canCollect=assessEffort(view.neighbor.body,spec('draw-careful'));
  const canPour=assessEffort(view.neighbor.body,spec('pour'));
  // Meryem decides after the player's effects settle, so her own observed
  // elapsed clock counts her remaining opportunities without an off-by-one.
  if(view.neighbor.minutes===(TURNS-1)*TURN_MINUTES)return need>0&&own>0&&canPour.allowed?'pour':'rest';
  if(!view.social.proposal&&view.round>=view.social.nextProposalRound&&view.remainingTurns>0) {
    if(own>=2&&view.carried.player<=4&&otherNeed>view.carried.player&&
      (own-2>=need||view.socialMemory&&view.social.given.player>view.social.given.neighbor&&view.source>=4&&view.remainingTurns>=5))return 'propose';
    if(need>own&&own<=4&&view.carried.player>=2&&
      (view.source===0||!canCollect.allowed||view.neighbor.body.fatigue>0.69))return 'request';
  }
  if(need===0)return 'rest';
  if(view.neighbor.body.hunger>0.80&&view.meals.neighbor)return 'eat';
  if(own>0&&(own>=3||own>=need||view.source===0))return canPour.allowed?'pour':view.meals.neighbor&&canPour.causes.includes('hunger')?'eat':'rest';
  if(view.source>0&&own<CARRY_LIMIT) {
    const fast=assessEffort(view.neighbor.body,spec('draw-quick'));
    if(!canCollect.allowed||view.neighbor.body.fatigue>0.69)return view.meals.neighbor&&canCollect.causes.includes('hunger')?'eat':'rest';
    return view.remainingTurns<=5&&fast.allowed&&need-own>2?'draw-quick':'draw-careful';
  }
  return 'rest';
}

function transfer(game,from,to,amount) {
  if(game.carried[from]<amount||game.carried[to]+amount>CARRY_LIMIT)throw new Error('Transfer lacks owned water or recipient capacity');
  game.carried[from]-=amount;game.carried[to]+=amount;
}

// World effects happen only after the same public lifecycle completes. The host
// owns consent and inventories; the human component receives only an outcome.
function work(game,actor,id,custom=null) {
  const before=game.people[actor],action=spec(id);
  let person=beginAttempt(before,action);const blocked=!person.pending.capacity.allowed;
  person=advanceAttempt(person,TURN_MINUTES);
  const event={actionId:id,status:blocked?'blocked':'completed',amount:0,message:'',reason:null};
  if(blocked)event.message='The effort was beyond capacity. Ten minutes passed without work or recovery.';
  else if(id.startsWith('draw-')) {
    const taken=Math.min(id==='draw-quick'?3:2,game.source,CARRY_LIMIT-game.carried[actor]);
    game.draws[actor]++;
    const chance=estimateSuccess({skill:before.skills.collection,body:before.body,difficulty:0.12});
    const spill=id==='draw-quick'&&taken>0&&keyedRandom(game.seed,'courtyard','collection',actor,game.draws[actor])>=chance?1:0;
    game.source-=taken;game.carried[actor]+=taken-spill;game.spilled+=spill;event.amount=taken-spill;
    event.message=taken?`${taken-spill} bucket${taken-spill===1?'':'s'} carried${spill?'; one spilled on the stones':''}.`:'The cistern had no water left to take.';
  } else if(id==='pour') {
    const amount=Math.min(3,game.carried[actor],TARGET-game.homes[actor]);
    game.carried[actor]-=amount;game.homes[actor]+=amount;event.amount=amount;
    event.message=`${amount} bucket${amount===1?'':'s'} added to ${actor==='player'?'your':'Meryem’s'} household barrel.`;
  } else if(id==='rest')event.message='Ten minutes in the shade eased fatigue.';
  else if(id==='eat') {
    if(game.meals[actor]<1)throw new Error('No owned meal');
    game.meals[actor]--;event.message='The packed meal eased hunger.';
  } else if(custom)custom(event);
  else if(id==='propose'||id==='request') {
    const kind=id==='propose'?'offer':'request';
    game.social.proposal={kind,amount:2,createdRound:game.round,expiresRound:game.round+1};
    game.social.nextProposalRound=game.round+3;
    event.message=id==='propose'?'I can spare two buckets. Would you like them?':'Could you give me two buckets? My household is still short.';
  }
  game.people[actor]=finishAttempt(person,{attemptId:person.pending.id,status:blocked?'blocked':'completed',mealConsumed:!blocked&&id==='eat'});
  return event;
}

export function playTurn(game,actionId) {
  if(game.status!=='playing')throw new Error('This courtyard run has finished');
  if(!playerIds.includes(actionId))throw new Error('Unknown courtyard action');
  const unavailable=actionAvailability(game,actionId);if(unavailable)throw new Error(unavailable);
  const next=copy(game);next.round++;
  let response=null;
  const oldProposal=next.social.proposal;
  const player=work(next,'player',actionId,event=>{
    if(['offer','ask','borrow'].includes(actionId)) {
      // This view follows the explicit spoken proposal. A decision may use the
      // content of a request, but never an outcome draw or unobserved body.
      response=chooseResponse(getGameView(next),actionId);
      event.status=response.accepted?'accepted':'refused';event.reason=response.reason;
      event.message=actionId==='offer'?'You offered two buckets.':actionId==='ask'?'You asked for two buckets.':'You asked to borrow two buckets, due within three moves.';
      if(response.accepted) {
        const from=actionId==='offer'?'player':'neighbor',to=from==='player'?'neighbor':'player';
        transfer(next,from,to,2);event.amount=2;
        if(actionId==='borrow')next.social.loan={amount:2,dueRound:next.round+3,late:false};
        else next.social.given[from]+=2;
      } else next.social.refusedByNeighbor++;
    } else if(actionId==='repay') {
      transfer(next,'player','neighbor',2);event.amount=2;
      if(next.social.loan.late)next.social.returnedLate++;else next.social.returnedOnTime++;
      next.social.loan=null;event.message='You returned the two borrowed buckets.';
    } else if(actionId==='accept') {
      const from=oldProposal.kind==='offer'?'neighbor':'player',to=from==='player'?'neighbor':'player';
      transfer(next,from,to,2);next.social.given[from]+=2;event.amount=2;event.status='accepted';
      event.message=from==='player'?'You gave Meryem the two buckets she requested.':'You accepted Meryem’s two buckets.';
    } else if(actionId==='refuse') {
      next.social.refusedByPlayer++;event.status='refused';event.message='You declined. Neither of you transferred water.';
    }
  });
  if(oldProposal) {
    next.social.proposal=null;
    if(!['accept','refuse'].includes(actionId))next.social.ignored++;
  }
  const neighbor=response?work(next,'neighbor','respond',event=>{
    event.status=response.accepted?'accepted':'refused';event.amount=response.accepted?2:0;
    event.message=response.reason;event.reason=response.reason;
  }):work(next,'neighbor',chooseNeighborAction(getGameView(next)));
  if(next.social.loan&&next.round>=next.social.loan.dueRound&&!next.social.loan.late){next.social.loan.late=true;next.social.lateLoans++;}
  next.clock=next.round*TURN_MINUTES;
  next.lastTurn={round:next.round,player,neighbor};
  if(next.round===TURNS) {
    next.social.proposal=null;
    next.status=next.homes.player===TARGET?(next.homes.neighbor===TARGET?'both-ready':'home-ready'):(next.homes.neighbor===TARGET?'neighbor-ready':'both-short');
  }
  return next;
}

/** Simple rivals live in this host and see exactly the player's projection. */
export function chooseAction(view,policy='reciprocal') {
  if(!POLICIES.includes(policy))throw new Error('Unknown courtyard policy');
  if(view.status!=='playing')return null;
  const action=id=>view.actions.find(a=>a.id===id),has=id=>Boolean(action(id)&&!action(id).unavailable);
  const need=gap(view,'player'),own=view.carried.player,proposal=view.social.proposal;
  if(policy!=='self-sufficient'&&view.social.loan&&has('repay')&&view.round>=view.social.loan.dueRound-1)return 'repay';
  const finalPour=view.remainingTurns===1&&has('pour')&&action('pour').capacity.allowed;
  if(finalPour&&policy!=='generous')return 'pour';
  if(proposal) {
    if(policy!=='self-sufficient'&&has('accept')&&(proposal.kind==='offer'||policy==='generous'||own-2>=need))return 'accept';
    return 'refuse';
  }
  if(finalPour)return 'pour';
  if(need===0) {
    if(policy!=='self-sufficient'&&has('repay'))return 'repay';
    if(policy!=='self-sufficient'&&has('offer')&&gap(view,'neighbor')>view.carried.neighbor&&view.carried.neighbor<=4)return 'offer';
    return 'rest';
  }
  if(view.player.body.hunger>0.80&&has('eat'))return 'eat';
  if(policy!=='self-sufficient'&&view.source===0&&own<need&&own<=4&&view.carried.neighbor>=2&&view.carried.neighbor-2>=gap(view,'neighbor'))return 'ask';
  const pour=action('pour');
  if(has('pour')&&(own>=3||own>=need||!has('draw-careful')))return pour.capacity.allowed?'pour':has('eat')&&pour.capacity.causes.includes('hunger')?'eat':'rest';
  const collect=action('draw-careful');
  if(has('draw-careful')) {
    if(!collect.capacity.allowed||view.player.body.fatigue>0.69)return has('eat')&&collect.capacity.causes.includes('hunger')?'eat':'rest';
    if(view.remainingTurns<=5)return action('draw-quick').capacity.allowed?'draw-quick':'draw-careful';
    return 'draw-careful';
  }
  return 'rest';
}

export function exportGame(game) {
  const record=copy(game);record.people=Object.fromEntries(actors.map(id=>[id,exportPerson(game.people[id])]));return record;
}

export function importGame(record) {
  requireKeys(record,['version','seed','profile','socialMemory','round','clock','status','source','spilled','carried','homes','meals','people','draws','social','lastTurn'],'courtyard save');
  if(record.version!==COURTYARD_VERSION)throw new Error('Unsupported courtyard save version');
  const initial=createGame({seed:record.seed,profile:record.profile,socialMemory:record.socialMemory});
  const next=copy(record);integer(next.round,0,TURNS,'round');
  if(next.clock!==next.round*TURN_MINUTES)throw new Error('Invalid courtyard clock');
  for(const key of ['carried','homes','meals','people','draws'])requireKeys(next[key],actors,key);
  for(const id of actors) {
    integer(next.carried[id],0,CARRY_LIMIT,'carried water');integer(next.homes[id],0,TARGET,'barrel water');integer(next.meals[id],0,1,'meals');integer(next.draws[id],0,next.round,'draw count');
    next.people[id]=restorePerson(record.people[id]);const person=next.people[id];
    requireKeys(person.skills,['collection'],'courtyard skills');
    if(person.id!==id||person.minutes!==next.clock||person.pending!==null||person.nextAttempt!==next.round+1)throw new Error('Invalid courtyard person or clock');
  }
  integer(next.source,0,initial.source,'cistern water');integer(next.spilled,0,next.round*2,'spilled water');
  if(next.source+next.spilled+next.carried.player+next.carried.neighbor+next.homes.player+next.homes.neighbor!==initial.source+6)throw new Error('Water conservation failed');
  if(next.spilled>next.draws.player+next.draws.neighbor||initial.source-next.source>3*(next.draws.player+next.draws.neighbor))throw new Error('Inconsistent collection history');
  const s=next.social;
  requireKeys(s,['given','loan','returnedOnTime','returnedLate','lateLoans','refusedByPlayer','refusedByNeighbor','ignored','proposal','nextProposalRound'],'social record');
  requireKeys(s.given,actors,'gifts');for(const id of actors){integer(s.given[id],0,next.round*2,'gifted water');if(s.given[id]%2)throw new Error('Invalid gift amount');}
  for(const key of ['returnedOnTime','returnedLate','lateLoans','refusedByPlayer','refusedByNeighbor','ignored'])integer(s[key],0,next.round,key);
  integer(s.nextProposalRound,0,TURNS+3,'proposal cooldown');
  if(s.returnedLate>s.lateLoans||s.returnedOnTime+s.returnedLate>Math.floor(next.round/2))throw new Error('Inconsistent loan counts');
  if(s.loan!==null) {
    requireKeys(s.loan,['amount','dueRound','late'],'loan');
    integer(s.loan.dueRound,4,Math.min(TURNS,next.round+3),'loan due round');
    if(s.loan.amount!==2||typeof s.loan.late!=='boolean'||s.loan.late!==(next.round>=s.loan.dueRound)||s.loan.late&&s.lateLoans<1)throw new Error('Invalid loan obligation');
  }
  if(s.lateLoans!==s.returnedLate+(s.loan?.late?1:0))throw new Error('Unaccounted late loan');
  if(s.proposal!==null) {
    requireKeys(s.proposal,['kind','amount','createdRound','expiresRound'],'proposal');
    if(!['offer','request'].includes(s.proposal.kind)||s.proposal.amount!==2||s.proposal.createdRound!==next.round||s.proposal.expiresRound!==next.round+1||next.round===0||next.round===TURNS||s.nextProposalRound!==next.round+3)throw new Error('Invalid open proposal');
    if(s.proposal.kind==='offer'&&(next.carried.neighbor<2||next.carried.player>4)||s.proposal.kind==='request'&&(next.carried.player<2||next.carried.neighbor>4))throw new Error('Unfunded proposal');
  }
  // Necessary ownership and paid-action bounds, not authentication of an entire
  // history. Transfers require a player turn and either a neighbor response or
  // an earlier neighbor proposal. Returning a loan does not cost the neighbor
  // an extra response turn.
  const gifts=(s.given.player+s.given.neighbor)/2,returns=s.returnedOnTime+s.returnedLate;
  const loans=returns+Number(s.loan!==null);
  const socialTurns={player:gifts+loans+returns+s.refusedByPlayer+s.refusedByNeighbor,
    neighbor:gifts+loans+s.refusedByPlayer+s.refusedByNeighbor+s.ignored+Number(s.proposal!==null)};
  for(const id of actors) {
    const other=id==='player'?'neighbor':'player',loanBalance=s.loan?(id==='player'?2:-2):0;
    const collected=next.carried[id]+next.homes[id]-initial.carried[id]+s.given[id]-s.given[other]-loanBalance;
    if(collected<0||collected>3*next.draws[id])throw new Error('Inconsistent water ownership history');
    if(next.draws[id]+Math.ceil(next.homes[id]/3)+(1-next.meals[id])+socialTurns[id]>next.round)throw new Error('Impossible paid-action history');
  }
  const expected=next.round<TURNS?'playing':next.homes.player===TARGET?(next.homes.neighbor===TARGET?'both-ready':'home-ready'):(next.homes.neighbor===TARGET?'neighbor-ready':'both-short');
  if(next.status!==expected)throw new Error('Inconsistent courtyard outcome');
  if(next.round===0) {if(JSON.stringify(next)!==JSON.stringify(initial))throw new Error('Invalid initial courtyard state');}
  else {
    requireKeys(next.lastTurn,['round','player','neighbor'],'last turn');
    if(next.lastTurn.round!==next.round)throw new Error('Invalid last turn timestamp');
    for(const id of actors) {
      const event=next.lastTurn[id];requireKeys(event,['actionId','status','amount','message','reason'],'turn event');
      if(!Object.hasOwn(definitions,event.actionId)||!['completed','blocked','accepted','refused'].includes(event.status))throw new Error('Invalid turn event');
      integer(event.amount,0,3,'event water');
      if(typeof event.message!=='string'||event.message.length>300||event.reason!==null&&(typeof event.reason!=='string'||event.reason.length>300))throw new Error('Invalid turn dialogue');
    }
  }
  return next;
}
