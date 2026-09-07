import * as current from './simulation.js';
import {getView as currentView} from './observation.js';
import {rankActions as currentRanking} from './policy.js';
import * as legacy from '../legacy/v0.1/index.js';
export {createSimulation,step,runSimulation} from './simulation.js';
export {practice,retain,PARAMETERS,ENGINE_VERSION,MODULES,assessCapacity,actionEffort} from './model.js';
export {keyedRandom} from './random.js';

// Historical replay is isolated from the live kernel. Public step() only accepts
// the current version, so old commands are never silently run under new physics.
export function replay(record) {
  return record?.engineVersion==='0.1.0'?legacy.replay(record):current.replay(record);
}
export function exportReplay(state) {
  return state.version==='0.1.0'?legacy.exportReplay(state):current.exportReplay(state);
}
export function getView(state,actorId) {
  return {...(state.version==='0.1.0'?legacy.getView(state,actorId):currentView(state,actorId)),engineVersion:state.version};
}
export function rankActions(view,overrides={}) {
  return view.engineVersion==='0.1.0'?legacy.rankActions(view,overrides):currentRanking(view,overrides);
}
