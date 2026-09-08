import assert from 'node:assert/strict';
import * as camp from '/Users/abdul/code/human-framework/src/games/camp-current.js';
const saved=camp.exportGame(camp.createGame());saved.game.people.player.body.fatigue=.95;
const initial=camp.restoreGame(saved);
const states=[];
for(let minute=0;minute<=5;minute++){
  const g=minute?camp.advanceGame(initial,minute):initial;
  const c=camp.getGameView(g).choices.find(c=>c.id==='gather-timber');
  states.push({minute,fatigue:g.people.player.body.fatigue,available:c.unavailable===null});
  assert.equal(c.unavailable===null,minute===5);
}
const next=camp.advanceToNextEvent(initial);assert.equal(next.clock.now,5);assert.equal(next.paid.player.recovery,5);
console.log(JSON.stringify({passed:true,explanation:'Correction: timber needs .13 + 16*.0015 = .154 capacity; .95 - n*.0235 + .154 <= 1 first holds at n=5.',nextStop:camp.getGameView(initial).nextStop,states}));
