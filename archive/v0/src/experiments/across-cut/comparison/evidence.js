import {createHash} from 'node:crypto';
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export function intern(dictionary,value){
  const snapshot=structuredClone(value),id=hash(snapshot);
  if(Object.hasOwn(dictionary,id)&&hash(dictionary[id])!==id)throw Error('Corrupt evidence input hash.');
  dictionary[id]=snapshot;return id;
}
export function resolveInput(dictionary,id){
  if(!Object.hasOwn(dictionary,id)||hash(dictionary[id])!==id)throw Error('Missing or corrupt evidence input hash.');
  return structuredClone(dictionary[id]);
}
