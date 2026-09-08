/** Independent current examples; earlier experiments remain ordinary links. */
const cards=[...document.querySelectorAll('.games a.game')],games=document.querySelector('.games');
const intro=document.querySelector('.intro');
const chooser=document.createElement('div');chooser.className='game-chooser';
const label=document.createElement('label');label.htmlFor='game-choice';label.textContent='Choose a current example';
const select=document.createElement('select');select.id='game-choice';
const list=document.createElement('div');list.className='collection-list';list.setAttribute('role','tablist');list.setAttribute('aria-orientation','vertical');list.setAttribute('aria-label','Current examples');
const focuses={'/camp/':'Ongoing work','/signals/':'Costly information','/service-plan/':'Coordination','/workshop/':'Work and recovery'};
const buttons=[];
cards.forEach((card,i)=>{
 const name=card.querySelector('h2').textContent,focus=focuses[card.getAttribute('href')];
 const option=document.createElement('option');option.value=i;option.textContent=name;select.append(option);
 const button=document.createElement('button');button.type='button';button.id='collection-tab-'+i;button.setAttribute('role','tab');button.setAttribute('aria-controls','collection-preview-'+i);
 const title=document.createElement('span');title.textContent=name;
 const detail=document.createElement('small');detail.textContent=focus;button.append(title,detail);
 button.addEventListener('click',()=>choose(i));
 button.addEventListener('keydown',event=>{const next=event.key==='ArrowDown'?(i+1)%cards.length:event.key==='ArrowUp'?(i-1+cards.length)%cards.length:event.key==='Home'?0:event.key==='End'?cards.length-1:null;if(next!==null){event.preventDefault();choose(next);buttons[next].focus();}});
 buttons.push(button);list.append(button);
 const panel=document.createElement('section');panel.className='collection-preview';panel.id='collection-preview-'+i;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
 panel.append(card);games.append(panel);
});
function choose(index){select.value=index;cards.forEach((card,i)=>{card.parentElement.hidden=i!==index;buttons[i].setAttribute('aria-selected',String(i===index));buttons[i].tabIndex=i===index?0:-1;});games.scrollTop=0;}
select.addEventListener('change',()=>choose(Number(select.value)));label.append(select);chooser.append(label,list);
const browser=document.createElement('div');browser.className='collection-browser';intro.after(browser);browser.append(chooser,games);
document.querySelector('.notes').classList.add('collection-notes');
choose(0);document.body.classList.add('compact-collection');
