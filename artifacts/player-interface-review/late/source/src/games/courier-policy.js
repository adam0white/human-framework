// Three deliberately small host-native rivals, all given the player's projection.
import {estimateSuccess} from '../human/index.js';
export const POLICIES=Object.freeze(['reliable','shortest','inspect']);

function travelCost(view,route,policy){
  if(!route.crossing)return route.minutes;
  if(policy==='reliable')return Infinity;
  if(policy==='shortest')return route.minutes;
  const condition=view.crossings[route.id].report?.condition;
  const chance=estimateSuccess({skill:view.worker.skills.routecraft,body:view.worker.body,difficulty:condition==='calm'?0.24:condition==='exposed'?0.58:0.41});
  return route.minutes/Math.max(0.08,chance);
}

function path(view,destination,policy){
  const costs=Object.fromEntries(view.places.map(p=>[p.id,Infinity])),first={},unvisited=new Set(view.places.map(p=>p.id));costs[view.location]=0;
  while(unvisited.size){
    const here=[...unvisited].sort((a,b)=>costs[a]-costs[b])[0];unvisited.delete(here);
    if(here===destination)return {cost:costs[here],route:first[here]};
    for(const route of view.routes.filter(r=>r.from===here||r.to===here)){
      const there=route.from===here?route.to:route.from,candidate=costs[here]+travelCost(view,route,policy);
      if(candidate<costs[there]){costs[there]=candidate;first[there]=here===view.location?route.id:first[here];}
    }
  }
  return {cost:Infinity,route:null};
}

export function chooseAction(view,policy='reliable'){
  if(!POLICIES.includes(policy))throw new Error('Unknown courier policy');
  if(view.status!=='playing'||view.pending)return null;
  const find=id=>view.actions.find(a=>a.id===id);
  const delivery=view.actions.find(a=>a.kind==='deliver');if(delivery)return delivery.id;
  const bag=view.parcels.filter(p=>p.owner==='bag');
  if(view.location==='depot'&&bag.length<view.bagCapacity){
    const next=view.parcels.filter(p=>p.owner==='depot').sort((a,b)=>a.due-b.due)[0];
    if(next&&find(`load-${next.id}`))return `load-${next.id}`;
  }
  let destination='depot';
  if(bag.length){
    // Nearby deliveries first, with a modest preference for earlier due times.
    // This is an authored heuristic, not a search for an optimal itinerary.
    destination=bag.map(p=>({p,path:path(view,p.destination,policy)})).sort((a,b)=>(a.path.cost+Math.max(0,a.p.due-view.clock)*0.12)-(b.path.cost+Math.max(0,b.p.due-view.clock)*0.12))[0].p.destination;
  }
  const next=path(view,destination,policy),journey=find(`travel-${next.route}`);
  if(!journey)return 'rest';
  if(find('eat')&&(view.worker.body.hunger>0.7||journey.capacity.causes.includes('hunger')))return 'eat';
  if(!journey.capacity.allowed||view.worker.body.fatigue>0.66)return 'rest';
  if(policy==='inspect'&&journey.crossing&&find(`inspect-${next.route}`)&&view.remainingMinutes>journey.minutes+8)return `inspect-${next.route}`;
  return journey.id;
}
