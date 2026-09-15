/** Private authored symbolic candidate; a belief view is attribution, not authenticated world truth. */
export const INFERENCE_VERSION='inference-0.1.0';
const FORMAT='human-framework-inference';
const BELIEFS_VERSION='beliefs-0.1.0';
const MAX_RULES=32,MAX_PROPOSITIONS=64,MAX_PREMISES=8,MAX_SUPPORTS=256;
const copy=value=>structuredClone(value);
const configFields=['version','ownerId','propositions','rules'];
const viewFields=['version','ownerId','now','beliefs','receiptCount','maxReceipts'];
const beliefFields=['propositionId','status','value','supportingOriginIds','opposingOriginIds','effectiveReceiptIds'];
const literalFields=['propositionId','value'];

function record(value,fields,label) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label} fields`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${label} fields`);
  for(const key of fields) {
    const d=Object.getOwnPropertyDescriptor(value,key);
    if(!d?.enumerable||!Object.hasOwn(d,'value'))throw new Error(`Invalid ${label} data fields`);
  }
}
function setup(value) {
  record(value,['ownerId','propositions','rules'],'inference setup');
}
function list(value,label,max=Infinity) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max)throw new Error(`Invalid ${label} limit`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw new Error(`Invalid ${label} data`);
  for(let i=0;i<value.length;i++) {
    const d=Object.getOwnPropertyDescriptor(value,String(i));
    if(!d?.enumerable||!Object.hasOwn(d,'value'))throw new Error(`Invalid ${label} data`);
  }
  if(keys.some(key=>key!=='length'&&(!/^\d+$/.test(key)||Number(key)>=value.length)))throw new Error(`Invalid ${label} data`);
}
function id(value,label) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${label}`);
}
function time(value,label) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0)||value>1e12)throw new Error(`Invalid ${label}`);
}
function ids(value,label,max=MAX_PROPOSITIONS) {
  list(value,label,max);
  const seen=new Set();
  for(const item of value) {
    id(item,`${label} ID`);
    if(seen.has(item))throw new Error(`Duplicate ${label} ID`);
    seen.add(item);
  }
}
function literal(value,propositions,label) {
  record(value,literalFields,label);
  id(value.propositionId,'proposition ID');
  if(!propositions.includes(value.propositionId))throw new Error('Unknown proposition ID');
  if(typeof value.value!=='boolean')throw new Error(`Invalid ${label} value`);
}
function validateConfig(config) {
  record(config,configFields,'inference configuration');
  if(config.version!==INFERENCE_VERSION)throw new Error('Incompatible inference version');
  id(config.ownerId,'inference owner ID');
  ids(config.propositions,'proposition',MAX_PROPOSITIONS);
  if(config.propositions.length<1)throw new Error('Invalid proposition limit');
  list(config.rules,'rule',MAX_RULES);
  const ruleIds=new Set(),edges=new Map(config.propositions.map(p=>[p,[]]));
  for(const rule of config.rules) {
    record(rule,['ruleId','when','then'],'inference rule');
    id(rule.ruleId,'rule ID');
    if(ruleIds.has(rule.ruleId))throw new Error('Duplicate rule ID');
    ruleIds.add(rule.ruleId);
    list(rule.when,'rule premise',MAX_PREMISES);
    if(rule.when.length<1)throw new Error('A rule needs at least one premise');
    const seen=new Set();
    for(const premise of rule.when) {
      literal(premise,config.propositions,'rule premise');
      if(seen.has(premise.propositionId))throw new Error('Duplicate rule premise proposition');
      seen.add(premise.propositionId);
    }
    literal(rule.then,config.propositions,'rule conclusion');
    for(const premise of rule.when)edges.get(premise.propositionId).push(rule.then.propositionId);
  }
  const visited=new Set(),active=new Set();
  function walk(p) {
    if(active.has(p))throw new Error('Inference proposition cycle');
    if(visited.has(p))return;
    active.add(p);
    for(const next of edges.get(p))walk(next);
    active.delete(p);visited.add(p);
  }
  for(const p of config.propositions)walk(p);
  return config;
}

function validateView(view,config) {
  record(view,viewFields,'belief view');
  if(view.version!==BELIEFS_VERSION)throw new Error('Incompatible belief view version');
  id(view.ownerId,'belief view owner ID');
  if(view.ownerId!==config.ownerId)throw new Error('Belief view owner mismatch');
  time(view.now,'belief view time');
  if(!Number.isSafeInteger(view.receiptCount)||view.receiptCount<0||
    !Number.isSafeInteger(view.maxReceipts)||view.maxReceipts<1||view.maxReceipts>256||view.receiptCount>view.maxReceipts)throw new Error('Invalid belief view receipt counts');
  list(view.beliefs,'belief view beliefs',MAX_PROPOSITIONS);
  const seen=new Set();
  for(const belief of view.beliefs) {
    record(belief,beliefFields,'belief view item');
    id(belief.propositionId,'belief proposition ID');
    if(!config.propositions.includes(belief.propositionId))throw new Error('Unknown belief proposition ID');
    if(seen.has(belief.propositionId))throw new Error('Duplicate belief proposition ID');
    seen.add(belief.propositionId);
    if(!['resolved','conflict','unknown'].includes(belief.status))throw new Error('Invalid belief status');
    if((belief.status==='resolved')!==(typeof belief.value==='boolean'))throw new Error('Invalid belief value');
    if(belief.status!=='resolved'&&belief.value!==null)throw new Error('Invalid unresolved belief value');
    ids(belief.supportingOriginIds,'supporting origin',256);
    ids(belief.opposingOriginIds,'opposing origin',256);
    ids(belief.effectiveReceiptIds,'effective receipt',256);
    if(belief.status==='unknown'&&(belief.supportingOriginIds.length||belief.opposingOriginIds.length||belief.effectiveReceiptIds.length))throw new Error('Unknown belief has support');
    if(belief.status==='resolved'&&(!belief.supportingOriginIds.length||belief.opposingOriginIds.length||!belief.effectiveReceiptIds.length))throw new Error('Resolved belief needs unopposed support');
    if(belief.status==='conflict'&&(!belief.supportingOriginIds.length||!belief.opposingOriginIds.length||!belief.effectiveReceiptIds.length))throw new Error('Conflicted belief needs opposing support');
  }
  return view;
}

const uniqueSorted=items=>[...new Set(items)].sort();
function combine(paths,value,ruleId) {
  return {
    value,
    propositionIds:uniqueSorted(paths.flatMap(p=>p.propositionIds)),
    originIds:uniqueSorted(paths.flatMap(p=>p.originIds)),
    evidenceIds:uniqueSorted(paths.flatMap(p=>p.evidenceIds)),
    ruleIds:uniqueSorted([...paths.flatMap(p=>p.ruleIds),ruleId]),
  };
}
function basePaths(belief) {
  if(!belief||belief.status==='unknown')return [];
  if(belief.status==='resolved')return [{value:belief.value,propositionIds:[belief.propositionId],originIds:uniqueSorted(belief.supportingOriginIds),evidenceIds:uniqueSorted(belief.effectiveReceiptIds),ruleIds:[]}];
  // The frozen view combines receipt IDs from both sides; do not assign them to a side.
  return [
    {value:false,propositionIds:[belief.propositionId],originIds:uniqueSorted(belief.opposingOriginIds),evidenceIds:[],ruleIds:[]},
    {value:true,propositionIds:[belief.propositionId],originIds:uniqueSorted(belief.supportingOriginIds),evidenceIds:[],ruleIds:[]},
  ];
}
function conclusion(propositionId,paths,belief) {
  const sorted=[...new Map(paths.map(path=>[JSON.stringify(path),path])).values()]
    .sort((a,b)=>Number(a.value)-Number(b.value)||JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if(sorted.length>MAX_SUPPORTS)throw new Error('Inference support limit exceeded');
  const hasTrue=sorted.some(p=>p.value),hasFalse=sorted.some(p=>!p.value);
  const status=hasTrue&&hasFalse?'conflict':hasTrue?'true':hasFalse?'false':'unknown';
  return {propositionId,status,value:status==='true'?true:status==='false'?false:null,
    effectiveReceiptIds:belief?copy(belief.effectiveReceiptIds):[],supports:sorted};
}
function order(config) {
  const visited=new Set(),result=[];
  function walk(p) {
    if(visited.has(p))return;
    for(const rule of config.rules.filter(r=>r.then.propositionId===p))for(const premise of rule.when)walk(premise.propositionId);
    visited.add(p);result.push(p);
  }
  for(const p of config.propositions)walk(p);
  return result;
}

export function createInference(input) {
  setup(input);
  return copy(validateConfig({version:INFERENCE_VERSION,...copy(input)}));
}

/** Recompute from the live conservative view. No result is added to the evidence ledger. */
export function inferBeliefs(configuration,beliefView) {
  const config=validateConfig(configuration),view=validateView(beliefView,config);
  const source=new Map(view.beliefs.map(item=>[item.propositionId,item]));
  const settled=new Map();
  for(const p of order(config)) {
    const base=source.get(p),paths=basePaths(base);
    for(const rule of config.rules.filter(item=>item.then.propositionId===p)) {
      let combinations=[[]];
      for(const premise of rule.when) {
        const prior=settled.get(premise.propositionId);
        if(prior.status!== (premise.value?'true':'false')) {combinations=[];break;}
        const candidates=prior.supports.filter(path=>path.value===premise.value);
        if(combinations.length*candidates.length>MAX_SUPPORTS)throw new Error('Inference support limit exceeded');
        combinations=combinations.flatMap(items=>candidates.map(path=>[...items,path]));
      }
      for(const items of combinations) {
        if(paths.length>=MAX_SUPPORTS)throw new Error('Inference support limit exceeded');
        paths.push(combine(items,rule.then.value,rule.ruleId));
      }
    }
    settled.set(p,conclusion(p,paths,base));
  }
  return copy({version:INFERENCE_VERSION,ownerId:config.ownerId,now:view.now,
    conclusions:config.propositions.map(p=>settled.get(p))});
}

export function exportInference(configuration) {
  validateConfig(configuration);
  return copy({format:FORMAT,version:1,inference:configuration});
}

export function restoreInference(snapshot,ownerId) {
  record(snapshot,['format','version','inference'],'inference snapshot');
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible inference snapshot');
  id(ownerId,'expected inference owner ID');
  validateConfig(snapshot.inference);
  if(snapshot.inference.ownerId!==ownerId)throw new Error('Inference owner mismatch; cross-actor restoration is forbidden');
  return copy(snapshot.inference);
}
