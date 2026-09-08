import {COURTYARD_VERSION,TURNS,createGame,playTurn} from './courtyard.js';

// A transcript is an optional external artifact. The active host never appends it.
export function createSession(setup={},actions=[]) {
  const game=createGame(setup);
  if(!Array.isArray(actions)||actions.length>TURNS||actions.some(action=>typeof action!=='string'||action.length>40))throw new Error('Invalid courtyard replay actions');
  return {format:'courtyard-replay',version:COURTYARD_VERSION,setup:{seed:game.seed,profile:game.profile,socialMemory:game.socialMemory},actions:[...actions]};
}

export function replaySession(record) {
  if(!record||Object.keys(record).sort().join(',')!=='actions,format,setup,version'||record.format!=='courtyard-replay'||record.version!==COURTYARD_VERSION)throw new Error('Unsupported courtyard replay');
  if(!record.setup||Object.keys(record.setup).sort().join(',')!=='profile,seed,socialMemory')throw new Error('Invalid replay setup');
  const checked=createSession(record.setup,record.actions);
  let game=createGame(checked.setup);for(const action of checked.actions)game=playTurn(game,action);return game;
}
