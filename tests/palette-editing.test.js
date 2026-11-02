import test from "node:test";
import assert from "node:assert/strict";
import { paletteCssVariables } from "../src/domain/palette-store.js";
test("CSS export retains every swatch despite duplicate or non-Latin names",()=>{
  const css=paletteCssVariables([{name:"Blue",hex:"#00f"},{name:"Blue",hex:"#f00"},{name:"Blue-2",hex:"#0f0"},{name:"Àwọ̀",hex:"#fff"}]);
  const names=[...css.matchAll(/(--ald-[\w-]+):/g)].map((match)=>match[1]);
  assert.equal(new Set(names).size,4);
  assert.match(css,/#0000FF/);
  assert.throws(()=>paletteCssVariables([{name:"X",hex:"red; color:black"}]));
});
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
