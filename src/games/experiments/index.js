import {createWorkshop,chooseWorkshop,getWorkshopView,exportWorkshop,restoreWorkshop} from './workshop.js';
import {createDoorstep,chooseDoorstep,getDoorstepView,exportDoorstep,restoreDoorstep} from './doorstep.js';
export const EXPERIMENT_VERSION='0.1.0';
export const EXPERIMENT_KINDS=Object.freeze(['workshop','doorstep','dispatch']);
function kind(value){if(!EXPERIMENT_KINDS.includes(value))throw Error('Unknown experiment');return value;}
export function createExperiment(type='workshop',variant=0){return kind(type)==='doorstep'?createDoorstep(variant):createWorkshop(type,variant);}
export function chooseExperiment(state,actionId){return kind(state.kind)==='doorstep'?chooseDoorstep(state,actionId):chooseWorkshop(state,actionId);}
export function getExperimentView(state){return kind(state.kind)==='doorstep'?getDoorstepView(state):getWorkshopView(state);}
export function exportExperiment(state){const type=kind(state.kind);return {format:'human-field-experiment',version:EXPERIMENT_VERSION,kind:type,data:type==='doorstep'?exportDoorstep(state):exportWorkshop(state)};}
export function restoreExperiment(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||Object.keys(snapshot).sort().join(',')!=='data,format,kind,version'||snapshot.format!=='human-field-experiment'||snapshot.version!==EXPERIMENT_VERSION)throw Error('This is not a supported experiment save');
 const type=kind(snapshot.kind),state=type==='doorstep'?restoreDoorstep(snapshot.data):restoreWorkshop(snapshot.data);
 if(state.kind!==type)throw Error('Save experiment does not match its contents');
 return state;
}
