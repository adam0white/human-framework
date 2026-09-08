import fs from 'node:fs';import assert from 'node:assert/strict';
import {createPerson,beginAttempt,advanceAttempt,finishAttempt,assessEffort} from '/Users/abdul/code/human-framework/src/runtime/index.js';
const result=[];
for(const id of ['H1','H2','H3','H4','H5','H6','H7','H8']){
 const schedule={},progress={},completed={},credit={};
 function work(item,actor,first,count,basis){progress[item]??=0;credit[item]??={};credit[item][actor]??={basis,minutes:0,fraction:0,effort:0};for(let t=first;t<first+count;t++){const fraction=Math.min(1-progress[item],1/basis);progress[item]+=fraction;schedule[t]??={};schedule[t][actor]={type:'construct',item,fraction,effort:.2*fraction};const c=credit[item][actor];c.minutes++;c.fraction+=fraction;c.effort+=.2*fraction;if(progress[item]>=1-1e-12){completed[item]=t;progress[item]=1;}}}
 if(['H1','H7','H8'].includes(id))work('work-1','A',1,20,20);
 if(['H2','H4'].includes(id)){work('work-1','A',1,1,20);work('work-1','A',2,14,14);schedule[1].C={type:'craft',effort:.02};}
 if(id==='H3'){work('work-1','A',1,7,20);work('work-1','A',11,13,20);}
 if(id==='H5'){work('work-1','A',1,1,20);work('work-1','B',2,18,18);}
 if(id==='H6'){work('work-1','B',1,1,18);work('work-1','A',2,19,20);}
 if(id==='H7')for(let t=1;t<=4;t++)schedule[t].B={type:'haul',effort:.01};
 if(id==='H8')work('work-2','B',3,18,18);
 const people={A:createPerson({id:'A',body:{fatigue:.2,hunger:.2},skills:{construction:.1,hauling:.1}}),B:createPerson({id:'B',body:{fatigue:.2,hunger:.2},skills:{construction:.6,hauling:.1}}),C:createPerson({id:'C',body:{fatigue:.2,hunger:.2},skills:{crafting:.1}})};
 const paid=Object.fromEntries(['A','B','C'].map(a=>[a,{work:0,recovery:0,effort:0,construction:0,hauling:0,crafting:0}]));
 let highestPaidProjection=0;
 for(let t=1;t<=40;t++)for(const actor of ['A','B','C']){const job=schedule[t]?.[actor];const action=job?{actionId:job.type,targetId:job.item??null,durationMinutes:1,effort:job.effort,exertive:true,skill:{construct:'construction',haul:'hauling',craft:'crafting'}[job.type]}:{actionId:'recover',durationMinutes:1,activity:'rest'};let p=beginAttempt(people[actor],action);assert.equal(p.pending.capacity.allowed,true,id+' '+actor+' '+t);highestPaidProjection=Math.max(highestPaidProjection,p.pending.capacity.projectedFatigue);p=advanceAttempt(p,1);people[actor]=finishAttempt(p,{attemptId:p.pending.id,status:'completed'});if(job){paid[actor].work++;paid[actor].effort+=job.effort;paid[actor][action.skill]++;}else paid[actor].recovery++;}
 for(const person of Object.values(people)){assert.equal(person.minutes,40);assert.equal(person.nextAttempt,41);assert.equal(person.pending,null);assert.equal(person.body.fatigue,0);assert.ok(Math.abs(person.body.hunger-.28)<1e-12);}
 assert.ok(Object.values(progress).every(n=>n===1));
 result.push({id,completed,credit,paid,bodyAt40:Object.fromEntries(Object.entries(people).map(([a,p])=>[a,p.body])),skillsAt40:Object.fromEntries(Object.entries(people).map(([a,p])=>[a,p.skills])),highestPaidProjection});
}
const admission={AStart:assessEffort({fatigue:.2,hunger:.2},{durationMinutes:20,effort:.2,exertive:true}),BStart:assessEffort({fatigue:.2,hunger:.2},{durationMinutes:18,effort:.2,exertive:true}),supplier:assessEffort({fatigue:.2,hunger:.2},{durationMinutes:1,effort:.02,exertive:true}),busyB:assessEffort({fatigue:.2,hunger:.2},{durationMinutes:4,effort:.04,exertive:true})};
fs.writeFileSync('/tmp/work-progress-payment-check.json',JSON.stringify({scope:'Independent prescribed Human payment check only; no candidate or rival source used',admission,result},null,2));console.log(JSON.stringify({admission,rows:result.map(x=>({id:x.id,completed:x.completed,paid:x.paid,highestPaidProjection:x.highestPaidProjection}))},null,2));
