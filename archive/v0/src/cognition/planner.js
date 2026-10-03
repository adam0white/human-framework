import {BELIEFS_VERSION} from './beliefs.js';

export const PLANNER_VERSION='planner-0.1.0';

const LIMITS=Object.freeze({actions:32,goals:16,items:128,predicates:32,maxDepth:8,maxNodes:4096,horizonMinutes:10080});
const INPUT_FIELDS=['actorId','now','beliefView','purposes','resources','conditions','goals','actions'];
const PURPOSE_STATUSES=['active','completed','withdrawn'];
const copy=value=>structuredClone(value);

function object(value,fields,label) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${label} fields`);
  for(const key of fields) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${label} fields`);
  }
}

function list(value,label,max=LIMITS.items) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max)throw new Error(`Invalid ${label} or ${label} limit exceeded`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw new Error(`Invalid ${label}`);
  for(let index=0;index<value.length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${label}`);
  }
}

function identity(value,label) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${label}`);
}

function integer(value,min,max,label) {
  if(!Number.isSafeInteger(value)||Object.is(value,-0)||value<min||value>max)throw new Error(`Invalid ${label}`);
}

function unique(records,key,label) {
  const ids=new Set();
  for(const record of records) {
    const id=record[key];identity(id,`${label} ID`);
    if(ids.has(id))throw new Error(`Duplicate ${label} ID`);
    ids.add(id);
  }
  return ids;
}

function validateBeliefs(view,input) {
  object(view,['version','ownerId','now','beliefs','receiptCount','maxReceipts'],'belief view');
  if(view.version!==BELIEFS_VERSION)throw new Error('Incompatible belief view');
  identity(view.ownerId,'belief owner ID');
  if(view.ownerId!==input.actorId)throw new Error('Belief owner does not match planning actor');
  integer(view.now,0,1e12,'belief time');
  if(view.now!==input.now)throw new Error('Belief time does not match planning chronology');
  list(view.beliefs,'beliefs',256);
  const ids=new Set(),effectiveIds=new Set();
  for(const belief of view.beliefs) {
    object(belief,['propositionId','status','value','supportingOriginIds','opposingOriginIds','effectiveReceiptIds'],'belief');
    identity(belief.propositionId,'proposition ID');
    if(ids.has(belief.propositionId))throw new Error('Duplicate proposition ID');ids.add(belief.propositionId);
    if(!['resolved','conflict','unknown'].includes(belief.status))throw new Error('Invalid belief status');
    if(belief.status==='resolved'?typeof belief.value!=='boolean':belief.value!==null)throw new Error('Belief value disagrees with status');
    for(const [field,values] of [['supporting origins',belief.supportingOriginIds],['opposing origins',belief.opposingOriginIds],['effective receipts',belief.effectiveReceiptIds]]) {
      list(values,field,256);const seen=new Set();
      for(const id of values) {identity(id,field);if(seen.has(id))throw new Error(`Duplicate belief ${field}`);seen.add(id);}
    }
    if(belief.status==='unknown'&&(belief.supportingOriginIds.length||belief.opposingOriginIds.length||belief.effectiveReceiptIds.length))throw new Error('Unknown belief has effective provenance');
    if(belief.status==='resolved'&&(belief.supportingOriginIds.length===0||belief.opposingOriginIds.length!==0||belief.effectiveReceiptIds.length<belief.supportingOriginIds.length))throw new Error('Resolved belief has invalid provenance');
    if(belief.status==='conflict'&&(belief.supportingOriginIds.length===0||belief.opposingOriginIds.length===0||belief.effectiveReceiptIds.length<belief.supportingOriginIds.length+belief.opposingOriginIds.length))throw new Error('Conflicting belief has invalid provenance');
    for(const receiptId of belief.effectiveReceiptIds) {
      if(effectiveIds.has(receiptId))throw new Error('Belief receipt appears in multiple propositions');effectiveIds.add(receiptId);
    }
  }
  integer(view.receiptCount,0,256,'belief receipt count');integer(view.maxReceipts,1,256,'belief receipt limit');
  if(view.receiptCount>view.maxReceipts)throw new Error('Belief receipt count exceeds limit');
  if(effectiveIds.size>view.receiptCount)throw new Error('Effective belief receipts exceed receipt count');
  return new Map(view.beliefs.map(belief=>[belief.propositionId,belief]));
}

function validatePredicate(value,sets,beliefs,label) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`Invalid ${label}`);
  if(value.kind==='belief') {
    object(value,['kind','propositionId','value'],label);identity(value.propositionId,'predicate proposition ID');
    if(!beliefs.has(value.propositionId)||typeof value.value!=='boolean')throw new Error('Unknown or invalid belief predicate');
  } else if(value.kind==='condition') {
    object(value,['kind','conditionId','value'],label);identity(value.conditionId,'predicate condition ID');
    if(!sets.conditions.has(value.conditionId)||typeof value.value!=='boolean')throw new Error('Unknown or invalid condition predicate');
  } else if(value.kind==='resource') {
    object(value,['kind','resourceId','atLeast'],label);identity(value.resourceId,'predicate resource ID');
    if(!sets.resources.has(value.resourceId))throw new Error('Unknown resource predicate');
    integer(value.atLeast,0,1e12,'resource minimum');
  } else throw new Error(`Invalid ${label} kind`);
}

function validateInput(input) {
  object(input,INPUT_FIELDS,'planner input');identity(input.actorId,'planning actor ID');integer(input.now,0,1e12,'planning time');
  list(input.purposes,'purposes');list(input.resources,'resources');list(input.conditions,'conditions');
  list(input.goals,'goals',LIMITS.goals);list(input.actions,'actions',LIMITS.actions);
  const purposeMap=new Map();
  for(const record of input.purposes) {
    object(record,['id','status'],'purpose');
    if(!PURPOSE_STATUSES.includes(record.status))throw new Error('Invalid purpose status');
  }
  const purposes=unique(input.purposes,'id','purpose');
  for(const record of input.purposes)purposeMap.set(record.id,record.status);
  for(const record of input.resources)object(record,['id','quantity'],'resource');
  const resources=unique(input.resources,'id','resource');
  for(const record of input.resources)integer(record.quantity,0,1e12,'resource quantity');
  for(const record of input.conditions)object(record,['id','value'],'condition');
  const conditions=unique(input.conditions,'id','condition');
  for(const record of input.conditions)if(typeof record.value!=='boolean')throw new Error('Invalid condition value');
  const beliefs=validateBeliefs(input.beliefView,input),sets={resources,conditions};
  for(const goal of input.goals)object(goal,['id','purposeId','dueAt','requires'],'goal');
  unique(input.goals,'id','goal');
  for(const goal of input.goals) {
    identity(goal.purposeId,'goal purpose ID');
    if(!purposes.has(goal.purposeId))throw new Error('Unknown goal purpose ID');integer(goal.dueAt,0,1e12,'goal deadline');
    list(goal.requires,'goal predicates',LIMITS.predicates);if(goal.requires.length===0)throw new Error('Goal requires at least one predicate');
    for(const predicate of goal.requires)validatePredicate(predicate,sets,beliefs,'goal predicate');
  }
  for(const action of input.actions)object(action,['id','durationMinutes','preconditions','expectedEffects'],'action');
  unique(input.actions,'id','action');
  for(const action of input.actions) {
    integer(action.durationMinutes,1,LIMITS.horizonMinutes,'action duration');
    list(action.preconditions,'action preconditions',LIMITS.predicates);
    for(const predicate of action.preconditions)validatePredicate(predicate,sets,beliefs,'action predicate');
    object(action.expectedEffects,['conditions','resources'],'expected effects');
    list(action.expectedEffects.conditions,'condition effects',LIMITS.predicates);list(action.expectedEffects.resources,'resource effects',LIMITS.predicates);
    for(const effect of action.expectedEffects.conditions)object(effect,['conditionId','value'],'condition effect');
    unique(action.expectedEffects.conditions,'conditionId','condition effect');
    for(const effect of action.expectedEffects.conditions) {
      if(!conditions.has(effect.conditionId)||typeof effect.value!=='boolean')throw new Error('Unknown or invalid condition effect');
    }
    for(const effect of action.expectedEffects.resources)object(effect,['resourceId','delta'],'resource effect');
    unique(action.expectedEffects.resources,'resourceId','resource effect');
    for(const effect of action.expectedEffects.resources) {
      if(!resources.has(effect.resourceId))throw new Error('Unknown resource effect');integer(effect.delta,-1e12,1e12,'resource delta');
    }
  }
  return {beliefs,purposeMap};
}

function validateOptions(options={}) {
  object(options,['maxDepth','maxNodes','horizonMinutes'],'planner options');
  integer(options.maxDepth,1,LIMITS.maxDepth,'maxDepth');integer(options.maxNodes,1,LIMITS.maxNodes,'maxNodes');
  integer(options.horizonMinutes,1,LIMITS.horizonMinutes,'horizonMinutes');return options;
}

function resolvedOptions(options) {
  if(options===undefined)return {maxDepth:6,maxNodes:1024,horizonMinutes:480};
  if(!options||typeof options!=='object'||Array.isArray(options))throw new Error('Invalid planner options');
  const next={maxDepth:options.maxDepth??6,maxNodes:options.maxNodes??1024,horizonMinutes:options.horizonMinutes??480};
  if(Reflect.ownKeys(options).some(key=>!['maxDepth','maxNodes','horizonMinutes'].includes(key)))throw new Error('Invalid planner options fields');
  return validateOptions(next);
}

function predicateResult(predicate,node,beliefs) {
  if(predicate.kind==='belief') {
    const belief=beliefs.get(predicate.propositionId);
    if(belief.status!=='resolved')return {satisfied:false,reason:'belief-unresolved',beliefStatus:belief.status};
    if(belief.value!==predicate.value)return {satisfied:false,reason:'belief-mismatch',beliefStatus:belief.status};
    return {satisfied:true};
  }
  if(predicate.kind==='condition')return node.conditions.get(predicate.conditionId)===predicate.value?{satisfied:true}:{satisfied:false,reason:'condition-mismatch'};
  return node.resources.get(predicate.resourceId)>=predicate.atLeast?{satisfied:true}:{satisfied:false,reason:'resource-below-minimum'};
}

function goalPredicatesHold(goal,node,beliefs) {
  return goal.requires.every(predicate=>predicateResult(predicate,node,beliefs).satisfied);
}

function goalSatisfied(goal,node,beliefs) {
  return node.now<=goal.dueAt&&goalPredicatesHold(goal,node,beliefs);
}

function applyAction(node,action,beliefs,goals) {
  const checks=[];
  for(const predicate of action.preconditions) {
    const result=predicateResult(predicate,node,beliefs);
    if(!result.satisfied)return {rejection:{actionId:action.id,reason:result.reason,...(result.beliefStatus?{beliefStatus:result.beliefStatus}:{})}};
    checks.push({...copy(predicate),status:'satisfied'});
  }
  const conditions=new Map(node.conditions),resources=new Map(node.resources);
  for(const effect of action.expectedEffects.conditions)conditions.set(effect.conditionId,effect.value);
  for(const effect of action.expectedEffects.resources) {
    const quantity=resources.get(effect.resourceId)+effect.delta;
    if(!Number.isSafeInteger(quantity)||quantity<0||quantity>1e12)return {rejection:{actionId:action.id,reason:'insufficient-resource',resourceId:effect.resourceId}};
    resources.set(effect.resourceId,quantity);
  }
  const next={now:node.now+action.durationMinutes,conditions,resources,achieved:new Map(node.achieved),steps:[...node.steps],sequence:[...node.sequence]};
  const completed=[];
  for(const goal of goals) {
    const prior=next.achieved.has(goal.id),holds=goalPredicatesHold(goal,next,beliefs);
    if(prior&&!holds)next.achieved.delete(goal.id);
    else if(!prior&&holds&&next.now<=goal.dueAt){next.achieved.set(goal.id,next.now);completed.push(goal.id);}
  }
  next.steps.push({actionId:action.id,startAt:node.now,finishAt:next.now,preconditions:checks,expectedEffects:copy(action.expectedEffects),completedGoalIds:completed});
  return {node:next};
}

function better(left,right,goals) {
  for(const goal of goals) {
    const a=left.achieved.has(goal.id),b=right.achieved.has(goal.id);if(a!==b)return a;
  }
  for(const goal of goals)if(left.achieved.has(goal.id)) {
    const a=left.achieved.get(goal.id),b=right.achieved.get(goal.id);if(a!==b)return a<b;
  }
  if(left.now!==right.now)return left.now<right.now;
  if(left.steps.length!==right.steps.length)return left.steps.length<right.steps.length;
  for(let index=0;index<left.sequence.length;index++)if(left.sequence[index]!==right.sequence[index])return left.sequence[index]<right.sequence[index];
  return false;
}

function planningContext(input,options) {
  const {beliefs,purposeMap}=validateInput(input),limits=resolvedOptions(options);
  const eligible=input.goals.filter(goal=>purposeMap.get(goal.purposeId)==='active');
  const inactive=input.goals.filter(goal=>purposeMap.get(goal.purposeId)!=='active').map(goal=>({goalId:goal.id,purposeId:goal.purposeId,status:purposeMap.get(goal.purposeId)}));
  const root={now:input.now,conditions:new Map(input.conditions.map(item=>[item.id,item.value])),resources:new Map(input.resources.map(item=>[item.id,item.quantity])),achieved:new Map(),steps:[],sequence:[]};
  for(const goal of eligible)if(goalSatisfied(goal,root,beliefs))root.achieved.set(goal.id,root.now);
  return {beliefs,limits,eligible,inactive,root,horizonAt:input.now+limits.horizonMinutes};
}

function result(provider,node,input,context,search,rootRejections) {
  const achievedGoals=context.eligible.filter(goal=>node.achieved.has(goal.id)).map(goal=>({goalId:goal.id,at:node.achieved.get(goal.id)}));
  return copy({
    version:PLANNER_VERSION,provider,actionId:node.steps[0]?.actionId??null,steps:node.steps,
    forecast:{at:node.now,conditions:input.conditions.map(item=>({id:item.id,value:node.conditions.get(item.id)})),resources:input.resources.map(item=>({id:item.id,quantity:node.resources.get(item.id)})),achievedGoals,unachievedGoalIds:context.eligible.filter(goal=>!node.achieved.has(goal.id)).map(goal=>goal.id)},
    trace:{steps:node.steps,rootRejections},eligibleGoalIds:context.eligible.map(goal=>goal.id),inactiveGoals:context.inactive,search,
  });
}

export function plan(input,options) {
  const context=planningContext(input,options),{root,eligible,beliefs,limits,horizonAt}=context;
  const queue=[root],rootRejections=[];let best=root,nodesVisited=1,nodeLimitReached=false,depthPruned=false,horizonPruned=false;
  search: for(let cursor=0;cursor<queue.length;cursor++) {
    const node=queue[cursor];
    if(node.steps.length===limits.maxDepth){depthPruned=true;continue;}
    for(let actionIndex=0;actionIndex<input.actions.length;actionIndex++) {
      const action=input.actions[actionIndex];
      if(node.now+action.durationMinutes>horizonAt){horizonPruned=true;if(node===root)rootRejections.push({actionId:action.id,reason:'beyond-horizon'});continue;}
      const applied=applyAction(node,action,beliefs,eligible);
      if(applied.rejection){if(node===root)rootRejections.push(applied.rejection);continue;}
      if(nodesVisited===limits.maxNodes){nodeLimitReached=true;break search;}
      applied.node.sequence.push(actionIndex);queue.push(applied.node);nodesVisited++;
      if(better(applied.node,best,eligible))best=applied.node;
    }
  }
  const improved=better(best,root,eligible),chosen=improved?best:root;
  return result('bounded-search',chosen,input,context,{...limits,nodesVisited,nodeLimitReached,depthPruned,horizonPruned,frontierComplete:!nodeLimitReached},rootRejections);
}

export function greedyPlan(input,options) {
  const context=planningContext(input,options),{root,eligible,beliefs,limits,horizonAt}=context;
  const rootRejections=[];let current=root,nodesVisited=1,nodeLimitReached=false,depthPruned=false,horizonPruned=false;
  for(let depth=0;depth<limits.maxDepth;depth++) {
    let selected=null;
    for(let actionIndex=0;actionIndex<input.actions.length;actionIndex++) {
      const action=input.actions[actionIndex];
      if(current.now+action.durationMinutes>horizonAt){horizonPruned=true;if(depth===0)rootRejections.push({actionId:action.id,reason:'beyond-horizon'});continue;}
      const applied=applyAction(current,action,beliefs,eligible);
      if(applied.rejection){if(depth===0)rootRejections.push(applied.rejection);continue;}
      if(nodesVisited===limits.maxNodes){nodeLimitReached=true;break;}
      nodesVisited++;applied.node.sequence.push(actionIndex);
      const newlyAchieved=eligible.some(goal=>!current.achieved.has(goal.id)&&applied.node.achieved.has(goal.id));
      if(!newlyAchieved||!better(applied.node,current,eligible))continue;
      if(!selected||better(applied.node,selected,eligible))selected=applied.node;
    }
    if(nodeLimitReached||!selected)break;
    current=selected;
  }
  if(current.steps.length===limits.maxDepth)depthPruned=true;
  return result('greedy',current,input,context,{...limits,nodesVisited,nodeLimitReached,depthPruned,horizonPruned,frontierComplete:!nodeLimitReached},rootRejections);
}
