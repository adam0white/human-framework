// Private experiment. No public runtime export and no dependency on host worlds.
export const SOCIAL_PROBE_VERSION='0.1.0-experimental';
const LIMIT=8,MAX=Number.MAX_SAFE_INTEGER,terminal=['refused','withdrawn','released','fulfilled'];
const copy=value=>structuredClone(value);
function fields(value,names,label){
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label}`);
  const own=Reflect.ownKeys(value);
  if(own.length!==names.length||own.some(key=>typeof key!=='string'||!names.includes(key)))throw new Error(`Invalid ${label} fields`);
  for(const key of own){const d=Object.getOwnPropertyDescriptor(value,key);if(!d.enumerable||!Object.hasOwn(d,'value'))throw new Error(`${label} requires plain data`);}
}
function number(n,label,min=0,max=MAX){if(!Number.isSafeInteger(n)||Object.is(n,-0)||n<min||n>max)throw new Error(`Invalid ${label}`);}
function text(value,label,max=48){if(typeof value!=='string'||value.length<1||value.length>max||value.trim()!==value)throw new Error(`Invalid ${label}`);}
function array(value,label,max){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max||Reflect.ownKeys(value).length!==value.length+1)throw new Error(`Invalid ${label}`);
  for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw new Error(`${label} requires plain data`);}
}
function evidence(value,record,last){
  fields(value,['sequence','contractId','terms','reference'],'receipt');number(value.sequence,'receipt sequence',1,last);
  text(value.reference,'receipt reference',96);
  if(value.contractId!==record.id||value.terms!==record.terms)throw new Error('Receipt contract or terms mismatch');
}
function validate(book){
  fields(book,['version','authority','actors','at','nextId','lastReceipt','records'],'book');
  if(book.version!==SOCIAL_PROBE_VERSION)throw new Error('Incompatible social experiment');
  text(book.authority,'authority');array(book.actors,'actors',8);
  if(book.actors.length<2||new Set(book.actors).size!==book.actors.length||book.actors.includes(book.authority))throw new Error('Invalid actors or authority');
  for(const actor of book.actors)text(actor,'actor');
  number(book.at,'time');number(book.nextId,'next identity',1);number(book.lastReceipt,'last receipt');array(book.records,'records',LIMIT);
  let previous=0,previousCreated=0;const slots=new Set(),receipts=new Set();
  for(const record of book.records){
    fields(record,['id','from','to','obligor','slot','terms','dueAt','createdAt','answeredAt','closedAt','renouncedAt','status','receipt'],'contract');
    number(record.id,'contract identity',previous+1,book.nextId-1);previous=record.id;
    if(!book.actors.includes(record.from)||!book.actors.includes(record.to)||record.from===record.to||![record.from,record.to].includes(record.obligor))throw new Error('Invalid contract participants');
    text(record.slot,'obligation slot');text(record.terms,'terms reference',96);number(record.createdAt,'proposal time',previousCreated,book.at);previousCreated=record.createdAt;
    if(record.dueAt!==null)number(record.dueAt,'due time',record.createdAt);
    if(!['proposed','accepted',...terminal].includes(record.status))throw new Error('Invalid contract status');
    const answered=['accepted','refused','released','fulfilled'].includes(record.status),closed=terminal.includes(record.status);
    if(answered!==(record.answeredAt!==null)||closed!==(record.closedAt!==null))throw new Error('Inconsistent transition times');
    if(answered)number(record.answeredAt,'response time',record.createdAt,book.at);
    if(closed)number(record.closedAt,'closure time',record.answeredAt??record.createdAt,book.at);
    if(record.status==='refused'&&record.closedAt!==record.answeredAt)throw new Error('A refusal closes at its response time');
    if(record.renouncedAt!==null){
      if(!['accepted','released','fulfilled'].includes(record.status))throw new Error('Unaccepted renunciation');
      number(record.renouncedAt,'renunciation time',record.answeredAt,record.closedAt??book.at);
    }
    if(record.status==='accepted'){
      const key=JSON.stringify([record.obligor,record.slot]);if(slots.has(key))throw new Error('Conflicting existing obligation');slots.add(key);
    }
    if((record.status==='fulfilled')!==(record.receipt!==null))throw new Error('Missing or premature fulfillment evidence');
    if(record.receipt){evidence(record.receipt,record,book.lastReceipt);if(receipts.has(record.receipt.sequence))throw new Error('Duplicate receipt sequence');receipts.add(record.receipt.sequence);}
  }
  return book;
}
function input(book,command,names){
  validate(book);fields(command,names,'command');number(command.at,'command time');
  if(command.at<book.at)throw new Error('Time cannot go backward');
  const next=copy(book);next.at=command.at;return next;
}
function find(book,id,status){
  number(id,'contract identity',1);const record=book.records.find(r=>r.id===id);
  if(!record)throw new Error('Unknown contract');
  if(status&&record.status!==status)throw new Error(`Contract must be ${status}`);return record;
}
function actor(book,id){if(!book.actors.includes(id))throw new Error('Unknown actor');}
function host(book,issuer){if(issuer!==book.authority)throw new Error('Wrong host authority');}
const beneficiary=record=>record.obligor===record.from?record.to:record.from;

export function createBook(setup){
  fields(setup,['authority','actors'],'setup');array(setup.actors,'actors',8);
  return validate({version:SOCIAL_PROBE_VERSION,authority:setup.authority,actors:copy(setup.actors),at:0,nextId:1,lastReceipt:0,records:[]});
}
export function propose(book,command){
  const next=input(book,command,['actor','to','obligor','slot','terms','dueAt','at']);actor(next,command.actor);actor(next,command.to);
  if(next.records.length===LIMIT)throw new Error('Contract record limit reached; discard terminal records');
  if(next.nextId===MAX)throw new Error('Contract identity space exhausted');
  next.records.push({id:next.nextId++,from:command.actor,to:command.to,obligor:command.obligor,slot:command.slot,terms:command.terms,dueAt:command.dueAt,
    createdAt:command.at,answeredAt:null,closedAt:null,renouncedAt:null,status:'proposed',receipt:null});
  return validate(next);
}
export function respond(book,command){
  const next=input(book,command,['actor','id','decision','at']),record=find(next,command.id,'proposed');
  if(command.actor!==record.to)throw new Error('Only the addressed recipient can respond');
  if(!['accept','refuse'].includes(command.decision))throw new Error('Unknown response');
  if(command.decision==='accept'&&next.records.some(r=>r.status==='accepted'&&r.obligor===record.obligor&&r.slot===record.slot))throw new Error('Conflicts with an existing obligation');
  record.status=command.decision==='accept'?'accepted':'refused';record.answeredAt=command.at;
  if(command.decision==='refuse')record.closedAt=command.at;return validate(next);
}
export function withdraw(book,command){
  const next=input(book,command,['actor','id','at']),record=find(next,command.id,'proposed');
  if(command.actor!==record.from)throw new Error('Only the proposer can withdraw');
  record.status='withdrawn';record.closedAt=command.at;return validate(next);
}
export function release(book,command){
  const next=input(book,command,['actor','id','at']),record=find(next,command.id,'accepted');
  if(command.actor!==beneficiary(record))throw new Error('Only the beneficiary can release this obligation');
  record.status='released';record.closedAt=command.at;return validate(next);
}
export function renounce(book,command){
  const next=input(book,command,['actor','id','at']),record=find(next,command.id,'accepted');
  if(command.actor!==record.obligor)throw new Error('Only the obligor can renounce performance');
  if(record.renouncedAt!==null)throw new Error('Performance was already renounced');
  record.renouncedAt=command.at;return validate(next);
}
export function fulfill(book,command){
  const next=input(book,command,['issuer','id','at','evidence']);host(next,command.issuer);
  const record=find(next,command.id,'accepted');evidence(command.evidence,record,MAX);
  if(command.evidence.sequence<=next.lastReceipt)throw new Error('Stale or duplicate receipt sequence');
  next.lastReceipt=command.evidence.sequence;record.status='fulfilled';record.closedAt=command.at;record.receipt=copy(command.evidence);return validate(next);
}
export function discard(book,command){
  const next=input(book,command,['issuer','id','at']);host(next,command.issuer);const record=find(next,command.id);
  if(!terminal.includes(record.status))throw new Error('Only a terminal contract may be discarded');
  next.records=next.records.filter(r=>r.id!==record.id);return validate(next);
}
export function exportBook(book){return {format:'experimental-social-contracts',version:1,book:copy(validate(book))};}
export function restoreBook(snapshot){fields(snapshot,['format','version','book'],'snapshot');if(snapshot.format!=='experimental-social-contracts'||snapshot.version!==1)throw new Error('Incompatible contract save');return copy(validate(snapshot.book));}
