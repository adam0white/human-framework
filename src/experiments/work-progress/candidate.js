/** Private dependency-free item accounting; the caller owns payment and effects. */
export const WORK_VERSION='0.1.1';
export const WORK_LIMITS=Object.freeze({workers:16,durationMinutes:1440});
const EPS=1e-12,TOLERANCE=1e-10,copy=structuredClone,trusted=new WeakSet();
const fail=message=>{throw new Error(message);};
function record(value,required,optional=[],seen=new Set()){
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||seen.has(value))fail('Expected an unshared plain work record');
  seen.add(value);
  for(const key of Reflect.ownKeys(value)){
    const field=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!field.enumerable||!Object.hasOwn(field,'value')||![...required,...optional].includes(key))fail('Unknown or non-data work field');
  }
  if(required.some(key=>!Object.hasOwn(value,key)))fail('Missing work field');
}
function number(value,min,max){if(typeof value!=='number'||!Number.isFinite(value)||Object.is(value,-0)||value<min||value>max)fail('Invalid work number');}
function integer(value,min,max){number(value,min,max);if(!Number.isSafeInteger(value))fail('Expected whole work minutes');}
function identity(value){if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value))fail('Invalid work or worker identity');}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function seal(work){freeze(work);trusted.add(work);return work;}
function validate(work){
  if(trusted.has(work))return work;
  const seen=new Set();record(work,['version','id','effort','minimumDuration','progress','workers','status'],[],seen);
  if(work.version!==WORK_VERSION)fail('Incompatible work version');identity(work.id);number(work.effort,0,1);
  integer(work.minimumDuration,1,WORK_LIMITS.durationMinutes);number(work.progress,0,1);
  if(!['open','complete','settled'].includes(work.status)||(work.status==='open'?work.progress>=1-EPS:work.progress!==1))fail('Inconsistent work completion');
  if(!work.workers||typeof work.workers!=='object')fail('Invalid work contributors');
  const ids=Reflect.ownKeys(work.workers);if(ids.length>WORK_LIMITS.workers)fail('Too many work contributors');
  record(work.workers,ids,[],seen);let fraction=0,minutes=0;
  for(const id of ids){
    identity(id);const worker=work.workers[id];record(worker,['basisMinutes','minutes','fraction','effort'],[],seen);
    integer(worker.basisMinutes,work.minimumDuration,WORK_LIMITS.durationMinutes);integer(worker.minutes,0,WORK_LIMITS.durationMinutes);
    number(worker.fraction,0,1);number(worker.effort,0,1);
    const minimumFraction=(work.status==='open'?worker.minutes:Math.max(0,worker.minutes-1))/worker.basisMinutes;
    if(Math.abs(worker.effort-work.effort*worker.fraction)>TOLERANCE||worker.fraction>worker.minutes/work.minimumDuration+EPS||worker.fraction<minimumFraction-EPS||(!worker.minutes&&worker.fraction)||(worker.minutes>0&&worker.fraction===0))fail('Unpaid or inconsistent worker contribution');
    fraction+=worker.fraction;minutes+=worker.minutes;
  }
  const contributors=ids.map(id=>work.workers[id]),paid=contributors.filter(worker=>worker.minutes>0);
  if(minutes>Math.max(0,...paid.map(worker=>worker.basisMinutes))||Math.abs(fraction-work.progress)>TOLERANCE)fail('Inconsistent total work progress');
  if(work.status!=='open'&&!paid.some(last=>last.fraction>(last.minutes-1)/last.basisMinutes&&
    contributors.every(worker=>worker===last||worker.fraction>=worker.minutes/worker.basisMinutes-EPS)))fail('Work cannot have multiple or zero-work terminal exposures');
  return work;
}
export function createWork(input){
  record(input,['id','effort','minimumDuration']);
  return seal(validate({version:WORK_VERSION,...input,progress:0,workers:{},status:'open'}));
}
/** Register credit only after the host accepts assignment; a repeat never refreshes basis. */
export function prepareWorker(work,input){
  validate(work);record(input,['workerId','basisMinutes']);identity(input.workerId);integer(input.basisMinutes,work.minimumDuration,WORK_LIMITS.durationMinutes);
  if(work.status!=='open')fail('Work is already complete');
  if(Object.hasOwn(work.workers,input.workerId))return seal(copy(work));
  if(Object.keys(work.workers).length>=WORK_LIMITS.workers)fail('Too many work contributors');
  const next=copy(work);next.workers[input.workerId]={basisMinutes:input.basisMinutes,minutes:0,fraction:0,effort:0};return seal(next);
}
/** A quote is a pure plan, not proof that time, body or resources have been paid. */
export function quoteWork(work,input){
  validate(work);record(input,['workerId'],['durationReduction']);identity(input.workerId);
  const reduction=input.durationReduction??0;integer(reduction,0,WORK_LIMITS.durationMinutes);
  if(work.status!=='open')fail('Work is already complete');
  if(!Object.hasOwn(work.workers,input.workerId))fail('Worker has no latched basis');
  const durationMinutes=Math.max(work.minimumDuration,work.workers[input.workerId].basisMinutes-reduction);
  const fraction=Math.min(1-work.progress,1/durationMinutes);
  return freeze({workerId:input.workerId,minutes:1,fraction,effort:work.effort*fraction,durationMinutes,
    remainingMinutes:Math.max(1,Math.ceil((1-work.progress)*durationMinutes-EPS)),remainingEffort:work.effort*(1-work.progress)});
}
/** Commit one paid exposure. The host must atomically pair this with its real payment. */
export function advanceWork(work,input){
  const quote=quoteWork(work,input),next=copy(work),worker=next.workers[quote.workerId];
  next.progress+=quote.fraction;worker.minutes++;worker.fraction+=quote.fraction;worker.effort+=quote.effort;
  if(next.progress>=1-EPS){next.progress=1;next.status='complete';}
  const payment={workerId:quote.workerId,minutes:1,fraction:quote.fraction,effort:quote.effort};
  return freeze({work:seal(validate(next)),payment});
}
/** One bounded status transition, not a reusable receipt or external transaction. */
export function settleWork(work){
  validate(work);if(work.status==='open')fail('Work is unfinished');
  if(work.status==='settled')return freeze({work:seal(copy(work)),completion:null});
  const next=copy(work);next.status='settled';return freeze({work:seal(next),completion:{id:work.id}});
}
export function exportWork(work){validate(work);return copy({format:'paid-durable-work',version:1,work});}
export function restoreWork(snapshot){
  record(snapshot,['format','version','work']);
  if(snapshot.format!=='paid-durable-work'||snapshot.version!==1)fail('Incompatible work snapshot');
  return seal(copy(validate(snapshot.work)));
}
