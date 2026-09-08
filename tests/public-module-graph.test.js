import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyStaticModules} from '../scripts/public-module-graph.js';

test('static graph links browser imports and reexports without executing any target source',()=>{
  const graph=verifyStaticModules([
    {path:'web/app.js',source:'import {value} from "../src/core/index.js"; export {value}; throw Error("Target source ran"); await new Promise(()=>{});'},
    {path:'src/core/index.js',source:'export {value} from "./value.js";'},
    {path:'src/core/value.js',source:'export const value=1;'}
  ]);
  assert.equal(graph.modules,3);assert.equal(graph.staticEdges.length,2);
  assert.ok(graph.staticEdges.some(e=>e.from==='web/app.js'&&e.to==='src/core/index.js'));
});
test('URL-instance aliases are rejected rather than collapsed into a false export proof',()=>{
  for(const alias of ['./value.js?a','./value.js#b','./value.js?','./%76alue.js']){
    assert.throws(()=>verifyStaticModules([
      {path:'web/app.js',source:'import {value} from "./barrel.js";'},
      {path:'web/barrel.js',source:`export * from "./value.js"; export * from ${JSON.stringify(alias)};`},
      {path:'web/value.js',source:'export const value=1;'}
    ]),/query|fragment|encoded|identity/i);
  }
});
test('a private or missing static dependency cannot hide in otherwise valid public source',()=>{
  for(const source of ['import "../src/cognition/private.js";',String.raw`export * from "..\u002fsrc/cognition/private.js";`])
    assert.throws(()=>verifyStaticModules([{path:'web/app.js',source}]),/unavailable|private|missing/i);
});
test('bare and remote imports reject and real export mismatches fail linkage',()=>{
  for(const specifier of ['node:fs','a-package','https://example.invalid/module.js'])
    assert.throws(()=>verifyStaticModules([{path:'web/app.js',source:`import ${JSON.stringify(specifier)};`}]),/local|browser|import/i);
  assert.throws(()=>verifyStaticModules([{path:'web/app.js',source:'import {missing} from "./other.js";'},
    {path:'web/other.js',source:'export const present=1;'}]),/export|link/i);
});
test('cycles are valid; comments and string contents do not become fake dependencies',()=>{
  const graph=verifyStaticModules([
    {path:'web/a.js',source:'import {b} from "./b.js"; export const a=1; // import "./missing.js"\nexport const text="import from ./not-a-module.js";'},
    {path:'web/b.js',source:'import {a} from "./a.js"; export const b=2;'}
  ]);assert.equal(graph.staticEdges.length,2);
});
test('invalid syntax and duplicate or noncanonical public paths fail before build output is touched',()=>{
  assert.throws(()=>verifyStaticModules([{path:'web/bad.js',source:'export const = ;'}]),/bad.js|syntax/i);
  assert.throws(()=>verifyStaticModules([{path:'web/a.js',source:''},{path:'web/a.js',source:''}]),/duplicate/i);
  assert.throws(()=>verifyStaticModules([{path:'../private.js',source:''}]),/path/i);
});
test('the guard labels its static scope instead of claiming runtime or dynamic-import coverage',()=>{
  const result=verifyStaticModules([{path:'web/app.js',source:'export const later=()=>import("./runtime-only.js");'}]);
  assert.equal(result.staticEdges.length,0);assert.match(result.scope,/static/i);assert.match(result.scope,/dynamic/);
});
