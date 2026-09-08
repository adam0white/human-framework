// Independent miniature achievement-project host. No promise drives a worker's actions.
import * as contract from '../src/social/contracts.js';
const clone=value=>structuredClone(value),actors=['owner','worker'],targets=['pump','gate'];
const records=g=>g.social.records,targetOf=r=>r.target??r.terms.slice('repair:'.length);
function check(g){
  if(!['shared','direct'].includes(g.mode)||!Number.isSafeInteger(g.now)||g.now<0)throw new Error('Invalid project host');
  const reserved=actors.reduce((n,actor)=>n+(g.jobs[actor]?.job==='work'?1:0),0);
  if(g.parts+g.crate+reserved+Object.values(g.projects).filter(Boolean).length!==2)throw new Error('Part conservation mismatch');
  if(g.food+actors.filter(actor=>g.jobs[actor]?.job==='meal').length+g.meals!==1)throw new Error('Food conservation mismatch');
  if(g.mode==='shared')contract.exportBook(g.social);
  else{
    if(records(g).length>8||!Number.isSafeInteger(g.social.nextId))throw new Error('Invalid commitments');
    let previous=0;
    for(const r of records(g)){
      if(Object.keys(r).sort().join(',')!=='closedAt,id,renouncedAt,status,target'||!Number.isSafeInteger(r.id)||r.id<=previous||r.id>=g.social.nextId||!targets.includes(r.target))throw new Error('Invalid project identity');previous=r.id;
      if(!['proposed','accepted','refused','withdrawn','released','fulfilled'].includes(r.status))throw new Error('Invalid project status');
      if(['refused','withdrawn','released','fulfilled'].includes(r.status)!==(r.closedAt!==null)||r.closedAt!==null&&(!Number.isSafeInteger(r.closedAt)||r.closedAt<0||r.closedAt>g.now))throw new Error('Invalid project closure');
      if(r.renouncedAt!==null&&(!Number.isSafeInteger(r.renouncedAt)||r.renouncedAt<0||r.renouncedAt>(r.closedAt??g.now)||!['accepted','released','fulfilled'].includes(r.status)))throw new Error('Invalid renunciation');
    }
    if(records(g).filter(r=>r.status==='accepted').length>1)throw new Error('Conflicting existing obligation');
  }
  for(const r of records(g))if(r.status==='fulfilled'&&!g.projects[targetOf(r)])throw new Error('Project fulfillment lacks world completion');
  return g;
}
function obligation(g,id,status){const r=records(g).find(item=>item.id===id);if(!r)throw new Error('Unknown project request');if(status&&r.status!==status)throw new Error(`Project must be ${status}`);return r;}
function cancel(g,actor){const job=g.jobs[actor];if(!job)throw new Error('No job to cancel');if(job.job==='work')g.parts++;if(job.job==='meal')g.food++;g.jobs[actor]=null;}

// Direct rival: fixed project owner requests a worker's achievement of a target.
function direct(g,c){
  if(c.type==='ask'){if(records(g).length===8)throw new Error('Project record limit');records(g).push({id:g.social.nextId++,target:c.target,status:'proposed',renouncedAt:null,closedAt:null});return;}
  const r=obligation(g,c.id,c.type==='respond'||c.type==='withdraw'?'proposed':'accepted');
  if(c.type==='respond'){
    if(c.actor!=='worker')throw new Error('Only the recipient worker may respond');
    if(!['accept','refuse'].includes(c.decision))throw new Error('Invalid response');
    if(c.decision==='accept'&&records(g).some(item=>item.status==='accepted'))throw new Error('Conflicts with existing obligation');
    r.status=c.decision==='accept'?'accepted':'refused';if(c.decision==='refuse')r.closedAt=g.now;
  }else if(c.type==='withdraw'){
    if(c.actor!=='owner')throw new Error('Only the proposer owner may withdraw');r.status='withdrawn';r.closedAt=g.now;
  }else if(c.type==='release'){
    if(c.actor!=='owner')throw new Error('Only the beneficiary owner may release');r.status='released';r.closedAt=g.now;
  }else if(c.type==='renounce'){
    if(c.actor!=='worker')throw new Error('Only the obligor worker may renounce');if(r.renouncedAt!==null)throw new Error('Already renounced');r.renouncedAt=g.now;
  }else if(c.type==='finish'){r.status='fulfilled';r.closedAt=g.now;}
}
function shared(g,c){
  const at=g.now;
  if(c.type==='ask')g.social=contract.propose(g.social,{actor:'owner',to:'worker',obligor:'worker',slot:'project',terms:`repair:${c.target}`,dueAt:null,at});
  else if(c.type==='respond')g.social=contract.respond(g.social,{actor:c.actor,id:c.id,decision:c.decision,at});
  else if(c.type==='finish'){
    const r=obligation(g,c.id,'accepted');
    g.social=contract.fulfill(g.social,{issuer:'project-host',id:c.id,at,evidence:{sequence:g.receipts,contractId:c.id,terms:r.terms,reference:`project-result:${g.receipts}`}});
  }else g.social=contract[c.type](g.social,{actor:c.actor,id:c.id,at});
}
function settleCommitments(g){
  // Goal receipt is checked even when the worker is eating or resting.
  for(const r of records(g).filter(r=>r.status==='accepted'&&g.projects[targetOf(r)])){
    g.receipts++;if(g.mode==='shared')shared(g,{type:'finish',id:r.id});else direct(g,{type:'finish',id:r.id});
  }
}
export function createWorkHost(mode='shared'){
  return check({mode,now:0,parts:0,crate:2,food:1,meals:0,rests:0,workMinutes:0,receipts:0,projects:{pump:false,gate:false},jobs:{owner:null,worker:null},
    social:mode==='shared'?contract.createBook({authority:'project-host',actors}):{nextId:1,records:[]}});
}
export function workCommand(state,c){
  check(state);const g=clone(state);
  if(['ask','respond','withdraw','release','renounce'].includes(c.type)){
    if(c.type==='ask'&&(!targets.includes(c.target)||g.projects[c.target]))throw new Error('Project unavailable');
    if(g.mode==='shared')shared(g,c);else direct(g,c);
    if(['release','renounce'].includes(c.type)&&g.jobs.worker?.job==='work'&&g.jobs.worker.target===targetOf(obligation(g,c.id)))cancel(g,'worker');
  }else if(c.type==='deliver'){
    if(!g.crate)throw new Error('No parts left in delivery crate');g.crate--;g.parts++;
  }else if(c.type==='start'){
    if(!actors.includes(c.actor)||g.jobs[c.actor])throw new Error('Unknown or busy actor');
    if(!['work','meal','rest'].includes(c.job))throw new Error('Unknown job');
    if(c.job==='work'){
      if(!targets.includes(c.target)||g.projects[c.target]||Object.values(g.jobs).some(job=>job?.target===c.target))throw new Error('Project unavailable or reserved');
      if(!g.parts)throw new Error('A part must arrive before work starts');g.parts--;
    }
    if(c.job==='meal'){if(!g.food)throw new Error('No food available');g.food--;}
    g.jobs[c.actor]={job:c.job,target:c.job==='work'?c.target:null,remaining:c.job==='work'?5:8};
  }else if(c.type==='cancel'){
    if(!actors.includes(c.actor))throw new Error('Unknown actor');cancel(g,c.actor);
  }else if(c.type==='tick'){
    if(!Number.isSafeInteger(c.minutes)||c.minutes<0||c.minutes>1000)throw new Error('Invalid elapsed time');
    for(let i=0;i<c.minutes;i++){
      g.now++;
      for(const actor of actors){const job=g.jobs[actor];if(!job)continue;if(job.job==='work')g.workMinutes++;job.remaining--;
        if(job.remaining===0){if(job.job==='work')g.projects[job.target]=true;if(job.job==='meal')g.meals++;if(job.job==='rest')g.rests++;g.jobs[actor]=null;}
      }
      settleCommitments(g);
    }
  }else throw new Error('Unknown project command');
  settleCommitments(g);return check(g);
}
export function workView(g){
  check(g);return clone({now:g.now,parts:g.parts,crate:g.crate,food:g.food,meals:g.meals,rests:g.rests,workMinutes:g.workMinutes,projects:g.projects,jobs:g.jobs,receipts:g.receipts,
    contracts:records(g).map(r=>({id:r.id,target:targetOf(r),status:r.status,renouncedAt:r.renouncedAt}))});
}
