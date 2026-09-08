import {createGame,getGameView,exportGame,restoreGame} from '../src/games/across-cut-player.js';

export const STORAGE_KEY='human-across-cut-player-v0.1.0';
export const MAX_SAVE_BYTES=2*1024*1024;
// Variation is chosen only at creation. Ordinary rendering never receives setup.
export function newShift(draw=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
  const value=draw();if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid shift draw.');
  return createGame({valveMinutes:6,inletMinutes:value%2?14:2,launchAt:Math.floor(value/2)%2?15:27,channelMode:'bounded',channelOverrides:{'receiver:2':6}});
}
export function parseSave(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_SAVE_BYTES)throw Error('Choose an Across the cut save smaller than two megabytes.');
  const value=JSON.parse(raw);if(value?.format!=='human-across-cut-player')throw Error('This is not an Across the cut save.');
  return restoreGame(value);
}
export function createSaveStore(storage){
  let protectedStorage=false;
  return {
    load(){let raw=null;try{raw=storage.getItem(STORAGE_KEY);return {game:raw===null?null:parseSave(raw),backup:null,error:null};}
      catch{protectedStorage=true;return {game:null,backup:raw,error:'The device save could not be opened and has not been replaced. Download this shift before leaving.'};}},
    save(game){if(protectedStorage)return {ok:false,error:'The unreadable device save is protected. Download this shift before leaving.'};
      try{storage.setItem(STORAGE_KEY,JSON.stringify(exportGame(game)));return {ok:true,error:null};}
      catch{return {ok:false,error:'Device storage is unavailable or full. Your shift is still here; download it before leaving.'};}}
  };
}
export function createImportPreview(current){
  let epoch=0,pending=null;
  const invalidate=()=>{epoch++;pending=null;};
  return {invalidate,
    async read(file){invalidate();const token=epoch,base=current(),stale=()=>token!==epoch||base!==current();
      try{if(!file||!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_SAVE_BYTES)throw Error('Choose a save smaller than two megabytes.');
        const raw=await file.text();if(stale())return {status:'stale'};const game=parseSave(raw);pending={game,base};return {status:'ready',view:getGameView(game)};
      }catch(error){if(stale())return {status:'stale'};pending=null;return {status:'error',error:error.message};}},
    confirm(){if(!pending||pending.base!==current()){invalidate();throw Error('This preview is no longer current. Select the save again.');}const game=pending.game;invalidate();return game;}
  };
}
