// Independent miniature loan host; shared and direct modes use identical water physics.
import * as contract from '../src/social/contracts.js';
const clone=value=>structuredClone(value),terminal=['refused','withdrawn','released','fulfilled'];
const records=game=>game.social.records;
function check(game){
  if(!['shared','direct'].includes(game.mode)||!Number.isSafeInteger(game.now)||game.now<0)throw new Error('Invalid water host');
  for(const n of [game.source,...Object.values(game.carried),...Object.values(game.stored)])if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid water quantity');
  if(game.carried.borrower>6||game.carried.lender>6||game.source+Object.values(game.carried).reduce((a,b)=>a+b,0)+Object.values(game.stored).reduce((a,b)=>a+b,0)!==14)throw new Error('Water ownership mismatch');
  if(game.mode==='shared')contract.exportBook(game.social);
  else{
    if(records(game).length>8||!Number.isSafeInteger(game.social.nextId))throw new Error('Invalid loan records');
    let previous=0;
    for(const r of records(game)){
      if(Object.keys(r).sort().join(',')!=='closedAt,dueAt,id,renouncedAt,status'||!Number.isSafeInteger(r.id)||r.id<=previous||r.id>=game.social.nextId)throw new Error('Invalid loan identity');previous=r.id;
      if(!['proposed','accepted',...terminal].includes(r.status)||!Number.isSafeInteger(r.dueAt)||r.dueAt<0)throw new Error('Invalid loan terms');
      if(terminal.includes(r.status)!==(r.closedAt!==null)||r.closedAt!==null&&(!Number.isSafeInteger(r.closedAt)||r.closedAt>game.now||r.closedAt<0))throw new Error('Invalid loan outcome');
      if(r.renouncedAt!==null&&(!Number.isSafeInteger(r.renouncedAt)||r.renouncedAt<0||r.renouncedAt>(r.closedAt??game.now)||!['accepted','fulfilled','released'].includes(r.status)))throw new Error('Invalid renunciation');
    }
    if(records(game).filter(r=>r.status==='accepted').length>1)throw new Error('Conflicting existing obligation');
  }
  return game;
}
function loan(game,id,status){const r=records(game).find(item=>item.id===id);if(!r)throw new Error('Unknown loan');if(status&&r.status!==status)throw new Error(`Loan must be ${status}`);return r;}
function transfer(game,from,to){if(game.carried[from]<2)throw new Error('Owned water unavailable');if(game.carried[to]>4)throw new Error('Recipient capacity unavailable');game.carried[from]-=2;game.carried[to]+=2;}

// The direct rival knows only this host's fixed borrower, lender and two-bucket loan.
function direct(game,cmd){
  if(cmd.type==='ask'){
    if(records(game).length===8)throw new Error('Loan record limit');
    records(game).push({id:game.social.nextId++,status:'proposed',dueAt:game.now+40,renouncedAt:null,closedAt:null});return;
  }
  const r=loan(game,cmd.id,cmd.type==='respond'||cmd.type==='withdraw'?'proposed':'accepted');
  if(cmd.type==='respond'){
    if(cmd.actor!=='lender')throw new Error('Only the lender may respond');
    if(!['accept','refuse'].includes(cmd.decision))throw new Error('Invalid response');
    if(cmd.decision==='accept'&&records(game).some(item=>item.status==='accepted'))throw new Error('Conflicts with existing obligation');
    r.status=cmd.decision==='accept'?'accepted':'refused';if(cmd.decision==='refuse')r.closedAt=game.now;
  }else if(cmd.type==='withdraw'){
    if(cmd.actor!=='borrower')throw new Error('Only the proposer may withdraw');r.status='withdrawn';r.closedAt=game.now;
  }else if(cmd.type==='release'){
    if(cmd.actor!=='lender')throw new Error('Only the beneficiary lender may release');r.status='released';r.closedAt=game.now;
  }else if(cmd.type==='renounce'){
    if(cmd.actor!=='borrower')throw new Error('Only the obligor borrower may renounce');if(r.renouncedAt!==null)throw new Error('Already renounced');r.renouncedAt=game.now;
  }else if(cmd.type==='repay'){r.status='fulfilled';r.closedAt=game.now;}
}
function shared(game,cmd){
  const at=game.now;
  if(cmd.type==='ask')game.social=contract.propose(game.social,{actor:'borrower',to:'lender',obligor:'borrower',slot:'water-loan',terms:'water:two',dueAt:at+40,at});
  else if(cmd.type==='respond')game.social=contract.respond(game.social,{actor:cmd.actor,id:cmd.id,decision:cmd.decision,at});
  else if(cmd.type==='repay')game.social=contract.fulfill(game.social,{issuer:'water-host',id:cmd.id,at,evidence:{sequence:game.receipts,contractId:cmd.id,terms:'water:two',reference:`water-return:${game.receipts}`}});
  else game.social=contract[cmd.type](game.social,{actor:cmd.actor,id:cmd.id,at});
}
export function createWaterHost(mode='shared'){
  return check({mode,now:0,source:8,carried:{borrower:2,lender:4},stored:{borrower:0,lender:0},receipts:0,
    social:mode==='shared'?contract.createBook({authority:'water-host',actors:['borrower','lender']}):{nextId:1,records:[]}});
}
export function waterCommand(state,cmd){
  check(state);const game=clone(state);
  if(cmd.type==='tick'){
    if(!Number.isSafeInteger(cmd.minutes)||cmd.minutes<0||cmd.minutes>1000)throw new Error('Invalid elapsed time');game.now+=cmd.minutes;
  }else if(['collect','pour'].includes(cmd.type)){
    if(!['borrower','lender'].includes(cmd.actor))throw new Error('Unknown water owner');
    if(cmd.type==='collect'){if(game.source<2||game.carried[cmd.actor]>4)throw new Error('Source or capacity unavailable');game.source-=2;game.carried[cmd.actor]+=2;}
    else{if(game.carried[cmd.actor]<2)throw new Error('No owned water to pour');game.carried[cmd.actor]-=2;game.stored[cmd.actor]+=2;}
    game.now+=10;
  }else if(['ask','respond','withdraw','release','renounce','repay'].includes(cmd.type)){
    if(cmd.type==='respond'){
      loan(game,cmd.id,'proposed');game.now+=10;
      if(cmd.decision==='accept')transfer(game,'lender','borrower');
    }
    if(cmd.type==='repay'){
      loan(game,cmd.id,'accepted');if(cmd.actor!=='borrower')throw new Error('Only the borrower may repay');
      transfer(game,'borrower','lender');game.now+=10;game.receipts++;
    }
    if(game.mode==='shared')shared(game,cmd);else direct(game,cmd);
  }else throw new Error('Unknown water command');
  return check(game);
}
export function waterView(game){
  check(game);return clone({now:game.now,source:game.source,carried:game.carried,stored:game.stored,receipts:game.receipts,
    contracts:records(game).map(r=>({id:r.id,status:r.status,dueAt:r.dueAt,renouncedAt:r.renouncedAt,late:r.status==='fulfilled'&&r.closedAt>r.dueAt}))});
}
