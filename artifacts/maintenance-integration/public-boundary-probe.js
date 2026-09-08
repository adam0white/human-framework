import {createPerson,beginAttempt,advanceAttempt,exportPerson,restorePerson} from 'human-framework-runtime';
const initial=()=>createPerson({id:'probe',body:{fatigue:.1,hunger:.1},skills:{repair:.2}});
const person=beginAttempt(initial(),{actionId:'repair',durationMinutes:1,effort:.01,exertive:true,skill:'repair'});
const sorted=JSON.parse(JSON.stringify(exportPerson(person)));
sorted.person.pending.capacity=Object.fromEntries(Object.entries(sorted.person.pending.capacity).reverse());
const result={reorderedKeys:{before:Object.keys(exportPerson(person).person.pending.capacity),after:Object.keys(sorted.person.pending.capacity)}};
try{restorePerson(sorted);result.reorderedKeys.accepted=true;}catch(error){result.reorderedKeys.accepted=false;result.reorderedKeys.error=error.message;}
const large=exportPerson(initial());large.person.minutes=100000000;
let running=beginAttempt(restorePerson(large),{actionId:'idle',durationMinutes:1});
result.largeFraction={startingMinutes:large.person.minutes,increment:.1};
for(let i=1;i<=10;i++){
  try{running=advanceAttempt(running,.1);result.largeFraction.successfulAdvances=i;try{exportPerson(running);}catch(error){result.largeFraction.invalidReturnedAfter=i;result.largeFraction.exportError=error.message;break;}}
  catch(error){result.largeFraction.advanceError=error.message;break;}
}
console.log(JSON.stringify(result,null,2));