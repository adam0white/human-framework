/** A suggested learning order. Every game remains directly accessible. */
const cards=[...document.querySelectorAll('a.game')],games=document.querySelector('.games');
const main=document.querySelector('main'),intro=document.querySelector('.intro');
const chooser=document.createElement('div');chooser.className='game-chooser';
const label=document.createElement('label');label.htmlFor='game-choice';label.textContent='Choose a world';
const select=document.createElement('select');select.id='game-choice';
const list=document.createElement('div');list.className='collection-list';list.setAttribute('role','tablist');list.setAttribute('aria-orientation','vertical');list.setAttribute('aria-label','Games in suggested learning order');
const learning=['Start with one job','Choose an order','Plan a delivery round','Meet an independent neighbor','Build a place together','Choose who receives supplies','Protect a shared site','Act on changing reports','Carry a morning into the afternoon','Agree a plan, then do the work'];
const buttons=[];
cards.forEach((card,i)=>{
 const name=card.querySelector('h2').textContent;
 const option=document.createElement('option');option.value=i;option.textContent=`${String(i+1).padStart(2,'0')} · ${name}`;select.append(option);
 const button=document.createElement('button');button.type='button';button.id='collection-tab-'+i;button.setAttribute('role','tab');button.setAttribute('aria-controls','collection-preview-'+i);
 const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');
 const title=document.createElement('span');title.textContent=name;button.append(number,title);
 button.addEventListener('click',()=>choose(i));
 button.addEventListener('keydown',event=>{const next=event.key==='ArrowDown'?(i+1)%cards.length:event.key==='ArrowUp'?(i-1+cards.length)%cards.length:event.key==='Home'?0:event.key==='End'?cards.length-1:null;if(next!==null){event.preventDefault();choose(next);buttons[next].focus();}});
 buttons.push(button);list.append(button);
 const panel=document.createElement('section');panel.className='collection-preview';panel.id='collection-preview-'+i;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
 const step=document.createElement('p');step.className='learning-step';step.textContent=learning[i];card.querySelector('.tag').textContent=card.querySelector('.tag').textContent.replace(/^New · /,'');
 panel.append(step,card);games.append(panel);
});
function choose(index){select.value=index;cards.forEach((card,i)=>{card.parentElement.hidden=i!==index;buttons[i].setAttribute('aria-selected',String(i===index));buttons[i].tabIndex=i===index?0:-1;});}
select.addEventListener('change',()=>choose(Number(select.value)));label.append(select);chooser.append(label,list);
const browser=document.createElement('div');browser.className='collection-browser';intro.after(browser);browser.append(chooser,games);
const notes=document.querySelector('.notes'),noteSummary=notes.querySelector('summary');
const help=document.createElement('details');help.className='collection-notes';help.append(noteSummary,...notes.children);notes.replaceWith(help);
choose(0);document.body.classList.add('compact-collection');
