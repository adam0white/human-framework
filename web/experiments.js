import {EXPERIMENT_KINDS,createExperiment,chooseExperiment,getExperimentView,exportExperiment,restoreExperiment} from '../src/games/experiments/index.js';
const $=id=>document.getElementById(id),KEY='human-small-situations-v0.1.0';
const requested=new URL(location.href).searchParams.get('game');
let kind=EXPERIMENT_KINDS.includes(requested)?requested:'workshop',variant=0,state;
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=String(text);if(className)node.className=className;return node;};
function notify(message){$('notice').textContent=message;$('notice').hidden=!message;}
function readSaves(){const value=JSON.parse(localStorage.getItem(KEY)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid save collection');return value;}
function save(){try{let existing;try{existing=readSaves();}catch{existing={};}existing[kind]=exportExperiment(state);localStorage.setItem(KEY,JSON.stringify(existing));$('save-status').textContent='Saved on this device after each choice.';}catch{$('save-status').textContent='Progress stays in this tab. Export to keep a copy.';}}
function render(){
 const view=getExperimentView(state);kind=view.kind;document.body.dataset.kind=kind;document.title=view.title+' · Human Framework';
 document.querySelectorAll('[data-kind]').forEach(a=>{if(a===document.body)return;if(a.dataset.kind===kind)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('title').textContent=view.title;$('subtitle').textContent=view.subtitle;$('objective').textContent=view.objective;
 $('clock').textContent=`${Math.max(0,view.deadline-view.now)} min`;$('clock-fill').style.width=`${100*Math.max(0,view.deadline-view.now)/view.deadline}%`;$('variation').textContent=`Variation ${variant+1} of 3 · minute ${view.now}`;
 $('room-title').textContent=view.scene.location;
 $('people').replaceChildren(...view.scene.people.map(p=>{const node=el('div',null,'person'),avatar=el('span',p.name.slice(0,1),'avatar'),details=el('div');avatar.setAttribute('aria-hidden','true');details.append(el('strong',p.name),el('small',p.status));node.append(avatar,details);return node;}));
 $('objects').replaceChildren(...view.scene.objects.map(o=>{const node=el('span');node.append(el('b',o.name+': '),document.createTextNode(o.status));return node;}));
 $('metrics').replaceChildren(...view.metrics.map(m=>{const node=el('div',null,'metric');node.append(el('span',m.label),el('strong',m.value));return node;}));
 $('outcome-label').textContent=view.finished?'What happened':view.history.length?'Your last choice':'Your next move';
 $('summary').textContent=view.finished?view.summary:(view.history.at(-1)?.text||view.summary||'You have time to act. Choose what to do first.');
 $('facts').replaceChildren(...(view.facts.length?view.facts:['You have no further first-hand information yet.']).map(f=>el('li',f)));
 $('message-count').textContent=`${view.messages.filter(m=>m.text!==null).length}/${view.messages.length} read`;
 $('messages').replaceChildren(...view.messages.map(m=>{const node=el('article',null,'message'+(m.text===null?' unread':''));node.append(el('strong',m.label),el('p',m.text??'Unread. Choose a reading action to see the contents.'));return node;}));
 if(!view.messages.length)$('messages').append(el('p','No messages waiting.','muted'));
 $('actions').replaceChildren(...(view.finished?[]:view.actions).map(a=>{const button=el('button',null,'action');button.type='button';button.dataset.action=a.id;button.disabled=Boolean(a.disabled);const title=el('span',null,'action-title');title.append(el('span',a.label),el('span',a.minutes?`${a.minutes} min`:'End','action-time'));button.append(title,el('span',a.disabled&&a.reason?a.reason:a.description,'action-description'));button.addEventListener('click',()=>act(a.id));return button;}));
 $('ending').hidden=!view.finished;
 $('history-count').textContent=`${view.history.length} events`;$('history').replaceChildren(...view.history.map(h=>{const node=el('li');node.append(el('time',`${h.at} min`),el('span',h.text));return node;}));
}
function act(id){try{state=chooseExperiment(state,id);notify('');render();save();$('outcome').focus({preventScroll:true});}catch(error){notify('That choice could not be applied. Your previous progress is intact.');console.error(error);}}
function restart(next=false){variant=next?(variant+1)%3:variant;state=createExperiment(kind,variant);notify('');render();save();}
$('restart').addEventListener('click',()=>restart());$('replay-end').addEventListener('click',()=>restart());$('next-variation').addEventListener('click',()=>restart(true));
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(exportExperiment(state),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download=`human-${kind}-variation-${variant+1}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>250000)throw Error('Save too large');const restored=restoreExperiment(JSON.parse(await file.text()));state=restored;kind=getExperimentView(state).kind;variant=state.variant;const url=new URL(location.href);url.searchParams.set('game',kind);history.replaceState(null,'',url);notify('Progress imported.');render();save();}catch{notify('This file is not a valid save for these experiments. Your progress is unchanged.');}finally{event.target.value='';}});
try{const stored=readSaves();if(stored[kind]){const restored=restoreExperiment(stored[kind]);if(getExperimentView(restored).kind!==kind)throw Error('Wrong game');state=restored;variant=state.variant;}}catch{notify('Saved progress could not be restored. Starting a new variation.');}
state??=createExperiment(kind,variant);render();
