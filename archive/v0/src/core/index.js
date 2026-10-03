import * as current from './simulation.js';
import {getView as currentView} from './observation.js';
import {rankActions as currentRanking} from './policy.js';
import * as legacy from '../legacy/v0.1/index.js';
import * as previous from '../legacy/v0.2/index.js';
export {createSimulation,step,runSimulation} from './simulation.js';
export {practice,retain,PARAMETERS,ENGINE_VERSION,MODULES,assessCapacity,actionEffort} from './model.js';
export {keyedRandom} from './random.js';

// Historical replay is isolated from the live kernel. Public step() only accepts
// the current version, so old commands are never silently run under new physics.
export function replay(record) {
  return record?.engineVersion==='0.1.0'?legacy.replay(record):record?.engineVersion==='0.2.0'?previous.replay(record):current.replay(record);
}
export function exportReplay(state) {
  if(!['0.1.0','0.2.0','0.3.0'].includes(state.version))throw new Error('Incompatible engine version');
  return state.version==='0.1.0'?legacy.exportReplay(state):state.version==='0.2.0'?previous.exportReplay(state):current.exportReplay(state);
}
export function getView(state,actorId) {
  if(!['0.1.0','0.2.0','0.3.0'].includes(state.version))throw new Error('Incompatible engine version');
  return {...(state.version==='0.1.0'?legacy.getView(state,actorId):state.version==='0.2.0'?previous.getView(state,actorId):currentView(state,actorId)),engineVersion:state.version};
}
export function rankActions(view,overrides={}) {
  if(view.engineVersion!==undefined&&!['0.1.0','0.2.0','0.3.0'].includes(view.engineVersion))throw new Error('Incompatible engine version');
  return view.engineVersion==='0.1.0'?legacy.rankActions(view,overrides):view.engineVersion==='0.2.0'?previous.rankActions(view,overrides):currentRanking(view,overrides);
}
