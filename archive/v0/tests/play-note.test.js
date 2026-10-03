import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayNote} from '../web/play-note.js';

const input=()=>({game:{id:'watch',title:'Before the Water',version:'0.1.0'},
  context:{minute:15,summary:['Two gate sections repaired.','No completed diversion.']},
  answers:{objective:' Keep the site dry. ',tradeoff:'Stopping rest early left more repair time.',surprise:'',response:'Deniz shared a part after lookout.'},
  capturedAt:'2026-09-08T06:00:00.000Z'});

test('a play note preserves entered words with bounded public context and makes no assessment',()=>{
  const supplied=input(),before=structuredClone(supplied),note=createPlayNote(supplied);
  assert.equal(note.format,'human-framework-play-note');assert.equal(note.version,1);
  assert.equal(note.answers.objective,'Keep the site dry.');assert.equal(note.context.minute,15);
  assert.equal(note.capturedAt,supplied.capturedAt);assert.equal(note.assessment,undefined);assert.equal(note.participantId,undefined);
  note.context.summary[0]='changed';assert.deepEqual(supplied,before);
  assert.deepEqual(JSON.parse(JSON.stringify(createPlayNote(supplied))),createPlayNote(supplied));
});

test('blank notes, hidden context fields and malformed or oversized export data reject',()=>{
  assert.throws(()=>createPlayNote({...input(),answers:{objective:' ',tradeoff:'',surprise:'',response:''}}),/Write/);
  for(const mutate of [
    x=>x.context.oracle='hidden world fact',x=>x.context.minute=-1,x=>x.context.minute=Infinity,
    x=>x.context.summary=Array(9).fill('too many'),x=>x.context.summary[0]='x'.repeat(241),
    x=>x.answers.objective='x'.repeat(2001),x=>x.answers.grade=4,x=>x.answers.objective={command:'advance'},
    x=>x.game.version='unknown',x=>x.game.id='../private',x=>x.game.secret=true,
    x=>x.capturedAt='not a date',x=>x.userAccount='hidden'
  ]){const x=input();mutate(x);assert.throws(()=>createPlayNote(x));}
});

test('solo notes can omit the response field; markup remains plain entered text',()=>{
  const x=input();delete x.answers.response;x.answers.surprise='<script>advanceTime()</script>';
  const note=createPlayNote(x);assert.equal(Object.hasOwn(note.answers,'response'),false);
  assert.equal(note.answers.surprise,'<script>advanceTime()</script>');
});
