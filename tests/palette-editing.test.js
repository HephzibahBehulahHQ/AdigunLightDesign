import test from "node:test";
import assert from "node:assert/strict";
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
