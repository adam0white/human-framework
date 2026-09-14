/** Serious smaller rival: host-specific notebook lookups and explicit branches. */
export function directDecision(person,stage,external=null){
 const record=(kind,subject,contextId)=>person.observations.filter(o=>o.kind===kind&&o.subject===subject&&(contextId===undefined||o.contextId===contextId)).at(-1);
 const last=(kind,subject,contextId)=>record(kind,subject,contextId)?.value;
 const active=id=>person.purposes.some(p=>p.id===id&&p.status==='active');
 let action;
 switch(stage){
  case 'learning':action=last('fact','method')===true&&active('learn')?'guided-practice':'basic-practice';break;
  case 'household':action=last('commitment','delivery')==='accepted'&&active('care')?(record('commitment','delivery').details.revision===1?'deliver-revised':'deliver'):'paid-work';break;
  case 'collaboration':action=last('interaction','colleague','supply')==='breached'&&active('work')?'confirm':'coordinate';break;
  case 'housemate-response':action=last('fact','delivery-received')===true?'acknowledge':'seek-alternative';break;
  case 'colleague-response':action=last('fact','confirmation-request')===true?'send-plan':'start-together';break;
  default:throw new Error('Unknown baseline stage');
 }
 return {actionId:external??action,provider:external===null?'baseline':'external',ruleId:null,evidence:[],noticedOptions:[]};
}
