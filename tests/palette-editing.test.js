import test from "node:test";
import assert from "node:assert/strict";
import { reorderSwatch } from "../src/domain/palette-store.js";
test("drag reordering supports both directions and keeps source data intact",()=>{
  const colors=[{id:"a",locked:true},{id:"b"},{id:"c"}];
  assert.deepEqual(reorderSwatch(colors,"a","c").map((color)=>color.id),["b","c","a"]);
  assert.deepEqual(reorderSwatch(colors,"c","a").map((color)=>color.id),["c","a","b"]);
  assert.deepEqual(reorderSwatch(colors,"b","b"),colors);
  assert.deepEqual(colors.map((color)=>color.id),["a","b","c"]);
  assert.throws(()=>reorderSwatch(colors,"unknown","a"));
});
import { moveSwatch, removeSwatch } from "../src/domain/palette-store.js";
test("moves and removes colors without mutating source or losing lock flags",()=>{
  const colors=[{id:"a",locked:true},{id:"b",locked:false}];
  assert.deepEqual(moveSwatch(colors,"a",1).map((color)=>color.id),["b","a"]);
  assert.equal(moveSwatch(colors,"a",1)[1].locked,true);
  assert.deepEqual(moveSwatch(colors,"a",-1),colors);
  assert.deepEqual(removeSwatch(colors,"b"),[colors[0]]);
  assert.equal(colors.length,2);
  assert.throws(()=>removeSwatch([colors[0]],"a"));
  assert.throws(()=>moveSwatch(colors,"missing",1));
});
