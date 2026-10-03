import test from 'node:test';
import assert from 'node:assert/strict';
import {createBook,propose,respond,withdraw,release,renounce,fulfill,discard,exportBook,restoreBook} from '../src/social/contracts.js';

const fresh=()=>createBook({authority:'water-host',actors:['ada','meryem','sam']});
const offer=(book,extra={})=>propose(book,{actor:'ada',to:'meryem',obligor:'ada',slot:'loan',terms:'water:two',dueAt:4,at:0,...extra});
const accepted=()=>respond(offer(fresh()),{actor:'meryem',id:1,decision:'accept',at:1});
const receipt=(extra={})=>({issuer:'water-host',id:1,at:4,evidence:{sequence:1,contractId:1,terms:'water:two',reference:'transfer:2'},...extra});

test('an addressed proposal cannot consent for its recipient or move a world resource',()=>{
  const initial=fresh(),pending=offer(initial);
  assert.equal(initial.records.length,0);assert.equal(pending.records[0].status,'proposed');
  assert.throws(()=>respond(pending,{actor:'ada',id:1,decision:'accept',at:1}),/recipient/);
  assert.equal(respond(pending,{actor:'meryem',id:1,decision:'refuse',at:1}).records[0].status,'refused');
  assert.equal(accepted().records[0].status,'accepted');
  assert.equal(Object.hasOwn(pending,'resources'),false);
});

test('an existing obligation conflicts only in the same obligor and host-defined slot',()=>{
  const first=accepted();
  const second=offer(first,{to:'sam',at:2});
  assert.throws(()=>respond(second,{actor:'sam',id:2,decision:'accept',at:3}),/existing obligation/);
  assert.equal(respond(second,{actor:'sam',id:2,decision:'refuse',at:3}).records[1].status,'refused');
  const independent=offer(first,{to:'sam',slot:'work',at:2});
  assert.equal(respond(independent,{actor:'sam',id:2,decision:'accept',at:3}).records[1].status,'accepted');
});

test('withdrawal, beneficiary release and debtor renunciation have different authority and consequences',()=>{
  const proposed=offer(fresh());
  assert.throws(()=>withdraw(proposed,{actor:'meryem',id:1,at:1}),/proposer/);
  assert.equal(withdraw(proposed,{actor:'ada',id:1,at:1}).records[0].status,'withdrawn');
  const active=accepted();
  assert.throws(()=>withdraw(active,{actor:'ada',id:1,at:2}),/proposed/);
  assert.throws(()=>release(active,{actor:'ada',id:1,at:2}),/beneficiary/);
  const stopped=renounce(active,{actor:'ada',id:1,at:2});
  assert.equal(stopped.records[0].status,'accepted');assert.equal(stopped.records[0].renouncedAt,2);
  assert.equal(release(stopped,{actor:'meryem',id:1,at:3}).records[0].status,'released');
  assert.throws(()=>renounce(active,{actor:'meryem',id:1,at:2}),/obligor/);
});

test('fulfillment requires an authorized receipt bound to the exact contract and terms',()=>{
  const active=accepted();
  assert.throws(()=>fulfill(active,receipt({issuer:'ada'})),/authority/);
  for(const evidence of [
    {sequence:1,contractId:2,terms:'water:two',reference:'transfer:2'},
    {sequence:1,contractId:1,terms:'water:ten',reference:'transfer:2'},
    {sequence:0,contractId:1,terms:'water:two',reference:'transfer:2'}
  ])assert.throws(()=>fulfill(active,receipt({evidence})));
  const done=fulfill(active,receipt());assert.equal(done.records[0].status,'fulfilled');
  assert.equal(done.records[0].closedAt,4);assert.equal(done.records[0].receipt.reference,'transfer:2');
  assert.throws(()=>fulfill(done,receipt()),/accepted/);
  assert.equal(fulfill(renounce(active,{actor:'ada',id:1,at:2}),receipt()).records[0].status,'fulfilled');
});

test('discarding a terminal record cannot recycle its contract or receipt identity',()=>{
  const done=discard(fulfill(accepted(),receipt()),{issuer:'water-host',id:1,at:4});
  assert.equal(done.records.length,0);assert.equal(done.nextId,2);
  let second=offer(done,{at:4,dueAt:8});second=respond(second,{actor:'meryem',id:2,decision:'accept',at:5});
  assert.throws(()=>fulfill(second,{issuer:'water-host',id:2,at:6,evidence:{sequence:1,contractId:2,terms:'water:two',reference:'transfer:2'}}),/receipt sequence/);
  assert.throws(()=>fulfill(second,{...receipt(),at:6}),/Unknown contract/);
  assert.throws(()=>discard(second,{issuer:'water-host',id:2,at:6}),/terminal/);
});

test('detached snapshots resume the same unresolved obligation and reject inconsistent transitions',()=>{
  const active=accepted(),snapshot=exportBook(active),restored=restoreBook(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(fulfill(restored,receipt()),fulfill(active,receipt()));
  snapshot.book.records[0].terms='mutated';assert.equal(active.records[0].terms,'water:two');
  const attacks=[
    b=>b.records[0].status='fulfilled',b=>b.records[0].from='alien',b=>b.records[0].answeredAt=null,
    b=>b.records[0].closedAt=1,b=>b.records[0].renouncedAt=0,b=>b.records[0].id=b.nextId,
    b=>b.records.push(structuredClone(b.records[0])),b=>b.at=0,b=>b.extra='unknown',b=>b.authority='ada'
  ];
  for(const attack of attacks){const invalid=exportBook(active);attack(invalid.book);assert.throws(()=>restoreBook(invalid));}
  assert.throws(()=>respond(active,{actor:'meryem',id:1,decision:'accept',at:0}),/backward/);
});

test('the host remains responsible for authenticating issuer identity and verifying evidence truth',()=>{
  // Deliberate limit: this library has no access to the host world or callers.
  const assertion=receipt({evidence:{sequence:1,contractId:1,terms:'water:two',reference:'unverified-host-assertion'}});
  assert.equal(fulfill(accepted(),assertion).records[0].status,'fulfilled');
});

test('unknown decisions, malformed identities and non-JSON arguments do not become consent',()=>{
  assert.throws(()=>offer(fresh(),{to:'ada'}));
  assert.throws(()=>offer(fresh(),{obligor:'sam'}));
  assert.throws(()=>offer(fresh(),{terms:'x'.repeat(97)}));
  assert.throws(()=>offer(fresh(),{at:NaN}));
  assert.throws(()=>respond(offer(fresh()),{actor:'meryem',id:1,decision:'maybe',at:1}));
  const bad={actor:'ada',to:'meryem',obligor:'ada',slot:'loan',terms:'water:two',dueAt:4,at:0};
  Object.defineProperty(bad,'terms',{get(){throw new Error('getter executed');},enumerable:true});
  assert.throws(()=>propose(fresh(),bad),/plain data/);
});

test('snapshot chronology preserves atomic refusal and increasing proposal creation times',()=>{
  const refused=respond(offer(fresh()),{actor:'meryem',id:1,decision:'refuse',at:1});
  const delayedClosure=exportBook(refused);delayedClosure.book.at=2;delayedClosure.book.records[0].closedAt=2;
  assert.throws(()=>restoreBook(delayedClosure),/refusal/);
  const proposals=offer(offer(fresh(),{at:1}),{at:2});
  const reversed=exportBook(proposals);reversed.book.records[1].createdAt=0;
  assert.throws(()=>restoreBook(reversed),/proposal time/);
});

test('ten thousand completed contracts leave bounded active state and never reuse identities',()=>{
  let book=fresh(),largest=0;
  for(let n=0;n<10000;n++){
    const at=n*3;book=offer(book,{at,dueAt:null});
    book=respond(book,{actor:'meryem',id:n+1,decision:'accept',at:at+1});
    book=fulfill(book,{issuer:'water-host',id:n+1,at:at+2,evidence:{sequence:n+1,contractId:n+1,terms:'water:two',reference:`receipt:${n+1}`}});
    largest=Math.max(largest,JSON.stringify(exportBook(book)).length);
    book=discard(book,{issuer:'water-host',id:n+1,at:at+2});
  }
  assert.equal(book.nextId,10001);assert.equal(book.lastReceipt,10000);assert.equal(book.records.length,0);
  assert.ok(largest<1200);assert.ok(JSON.stringify(exportBook(book)).length<400);
  let full=fresh();for(let n=0;n<8;n++)full=offer(full);
  assert.throws(()=>offer(full),/record limit/);
});
