import {TARGET,TURN_MINUTES} from '../src/games/courtyard.js';
import {assessEffort} from '../src/human/index.js';

// Presentation only: consumes the same detached observation as a controller.
// It neither chooses for Meryem nor changes the courtyard 0.1 turn contract.
const discussion=new Set(['offer','ask','borrow']);
const labels={
  'draw-quick':'Lift water','draw-careful':'Carry carefully',pour:'Fill barrel',rest:'Rest',eat:'Eat',
  offer:'Offer a gift',ask:'Ask for a gift',borrow:'Ask for a loan',repay:'Return loan',
  accept:'Accept proposal',refuse:'Refuse proposal',respond:'Answer you',request:'Ask for water',propose:'Offer water'
};

export function actionGuidance(view,id){
  const action=view.actions.find(item=>item.id===id);
  const participation=discussion.has(id)
    ?'Meryem replies; the conversation uses both action slots.'
    :'Uses your action slot; Meryem then chooses her own action.';
  let warning=null;
  if(!action||action.unavailable)return {participation,warning};
  if(!action.capacity.allowed){
    const causes=action.capacity.causes.join(' and ')||'condition';
    warning=`Estimated ${causes} limit: trying still spends ${action.minutes} minutes, with no water moved and no recovery.`;
  }else if(view.remainingTurns===1&&(id.startsWith('draw-')||['ask','borrow'].includes(id)||id==='accept'&&view.social.proposal?.kind==='offer')){
    warning='This is the last move: water received now will stay in your cans. Filling your barrel takes a separate move.';
  }else if(action.effort&&view.remainingTurns>1){
    const pour=view.actions.find(item=>item.id==='pour');
    const need=Math.max(0,TARGET-view.homes.player-(id==='pour'?Math.min(3,view.carried.player):0));
    if(need>0&&pour){
      const after={fatigue:action.capacity.projectedFatigue,hunger:action.capacity.projectedHunger};
      const nextPour=assessEffort(after,{durationMinutes:pour.minutes,effort:pour.effort,exertive:true});
      if(!nextPour.allowed)warning='After this effort, you may be unable to pour next move. Leave a move for recovery.';
    }
  }
  return {participation,warning};
}

export function goalGuidance(view){
  const need=TARGET-view.homes.player;
  if(need===0)return 'Your barrel is full. Any water still in your cans can be offered or returned.';
  if(view.status!=='playing')return view.carried.player>0
    ?`${view.carried.player} bucket${view.carried.player===1?' remains':'s remain'} in your cans. Only water poured into the barrel counts toward its 14.`
    :`${need} more bucket${need===1?' was':'s were'} needed in your barrel.`;
  if(view.carried.player>=need){
    const pours=Math.ceil(need/3);
    return `You carry the ${need} bucket${need===1?'':'s'} still needed. Storing ${need===1?'it':'them'} takes ${pours} pouring move${pours===1?'':'s'}, if strength allows.`;
  }
  return `${need} more needed in your barrel. You carry ${view.carried.player}; collecting or receiving water and pouring it are separate moves.`;
}

export function neighborGoal(view){
  const need=TARGET-view.homes.neighbor;
  if(need===0)return 'Her barrel is full. Her collection goal ends there; she does not collect more water for your household.'+(view.status==='playing'?' She can still reply or offer carried surplus.':'');
  return `Her goal: ${need} more bucket${need===1?'':'s'} in her own barrel. She carries ${view.carried.neighbor} and chooses her work or recovery after your action.`;
}

export function turnAccount(view){
  const turn=view.lastTurn;if(!turn)return null;
  const describe=(event,isNeighbor)=>({
    action:labels[event.actionId]??event.actionId,
    phase:isNeighbor?(event.actionId==='respond'?'Reply to you':'Her own choice'):'Your choice',
    detail:event.status==='blocked'
      ?`Blocked: ${TURN_MINUTES} minutes paid; no water moved and no recovery.`
      :event.actionId==='respond'?`${event.message} This reply uses her action.`:event.message
  });
  return {round:turn.round,minutes:TURN_MINUTES,start:(turn.round-1)*TURN_MINUTES,end:turn.round*TURN_MINUTES,
    player:describe(turn.player,false),neighbor:describe(turn.neighbor,true)};
}
