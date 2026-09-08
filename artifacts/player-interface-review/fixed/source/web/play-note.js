/** Optional local play-note export. It never grades a response or reads a save. */
const answerFields=['objective','tradeoff','surprise','response'];
function object(value,allowed,required,label){
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label}.`);
  if(required.some(key=>!Object.hasOwn(value,key))||Reflect.ownKeys(value).some(key=>{
    const field=Object.getOwnPropertyDescriptor(value,key);
    return !allowed.includes(key)||!field.enumerable||!Object.hasOwn(field,'value');
  }))throw new Error(`Invalid ${label} fields.`);
}
function text(value,max,label,blank=false){
  if(typeof value!=='string'||value.length>max||(!blank&&!value.trim()))throw new Error(`Invalid ${label}.`);
  return value.trim();
}
export function createPlayNote(input){
  object(input,['game','context','answers','capturedAt'],['game','context','answers','capturedAt'],'play note');
  object(input.game,['id','title','version'],['id','title','version'],'game');
  const {id,title,version}=input.game;
  if(typeof id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(id)||typeof version!=='string'||!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid game identity.');
  text(title,120,'game title');
  object(input.context,['minute','summary'],['minute','summary'],'public context');
  const {minute,summary}=input.context;
  if(!Number.isFinite(minute)||minute<0||minute>1e9||!Array.isArray(summary)||summary.length>8)throw new Error('Invalid public context.');
  const cleanSummary=Array.from(summary,item=>text(item,240,'public summary'));
  object(input.answers,answerFields,[],'answers');
  const answers=Object.fromEntries(Object.entries(input.answers).map(([key,value])=>[key,text(value,2000,'answer',true)]));
  if(!Object.values(answers).some(Boolean))throw new Error('Write at least one note before downloading.');
  if(typeof input.capturedAt!=='string'||!Number.isFinite(Date.parse(input.capturedAt))||new Date(input.capturedAt).toISOString()!==input.capturedAt)throw new Error('Invalid capture timestamp.');
  return {format:'human-framework-play-note',version:1,game:{id,title,version},capturedAt:input.capturedAt,
    context:{minute,summary:cleanSummary},answers};
}

/** getContext must explicitly project public fields; never pass a whole host save. */
export function mountPlayNote({container,game,getContext,onOpen,hasCompanion=false}){
  const doc=container.ownerDocument,details=doc.createElement('details');details.className='play-note';
  const summary=doc.createElement('summary');summary.textContent='Save a play note';details.append(summary);
  const introduction=doc.createElement('p');introduction.textContent='What made sense, and what changed your plan? Answer any of these. Download your words with a small public game summary to share with your feedback.';details.append(introduction);
  const form=doc.createElement('form'),fields=new Map();
  const prompts={objective:'What were you trying to achieve?',tradeoff:'Which choice had a cost?',surprise:'What went wrong, surprised you, or felt unclear?',response:'How did the other person respond?'};
  for(const [key,prompt] of Object.entries(prompts)){
    if(key==='response'&&!hasCompanion)continue;
    const label=doc.createElement('label');label.textContent=prompt;
    const input=doc.createElement('textarea');input.name=key;input.id=`${game.id}-play-note-${key}`;input.rows=2;input.maxLength=2000;
    label.htmlFor=input.id;label.append(input);form.append(label);fields.set(key,input);
  }
  const button=doc.createElement('button');button.type='submit';button.textContent='Download play note';form.append(button);
  const status=doc.createElement('p');status.className='play-note-status';status.setAttribute('role','status');
  status.textContent='Drafts stay on this page until you leave. A play note is separate from your game save.';
  form.append(status);details.append(form);container.append(details);
  details.addEventListener('toggle',()=>{if(details.open)onOpen?.();});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    try{
      const note=createPlayNote({game,context:getContext(),answers:Object.fromEntries([...fields].map(([key,input])=>[key,input.value])),capturedAt:new Date().toISOString()});
      const url=URL.createObjectURL(new Blob([JSON.stringify(note,null,2)],{type:'application/json'})),link=doc.createElement('a');
      link.href=url;link.download=`${game.id}-play-note-minute-${Math.floor(note.context.minute)}.json`;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent=`Downloaded your note with the public summary at minute ${note.context.minute}. Your game save is separate.`;
    }catch(error){status.textContent=error.message;}
  });
  return details;
}
