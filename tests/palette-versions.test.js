import test from "node:test";
import assert from "node:assert/strict";
import { comparePalettes } from "../src/domain/palette-versions.js";
test("comparison matches stable ids across changes, additions and removals",()=>{
  const saved={colors:[{id:"a",hex:"#FF0000",name:"A",locked:false},{id:"b",hex:"#000000"}]};
  const current={colors:[{...saved.colors[0],hex:"#FFFFFF"},{id:"c",hex:"#0000FF"}]};
  const rows=comparePalettes(current,saved);
  assert.equal(rows.length,3);
  assert.ok(rows.every((row)=>row.changed));
  assert.equal(rows.find((row)=>row.id==="b").current,null);
  assert.equal(rows.find((row)=>row.id==="c").saved,null);
  rows[0].current.hex="#ABCDEF";
  assert.equal(current.colors[0].hex,"#FFFFFF");
});
import { snapshotPalette,restorePalette } from "../src/domain/palette-versions.js";
test("palette snapshots retain colors and locks independent of future edits",()=>{
  const source={id:"p",name:"Studio",harmonyType:"triadic",colors:[{id:"c",hex:"#FF0000",locked:true}]};
  const saved=snapshotPalette(source,"Version 1");
  source.colors[0].hex="#000000";
  assert.equal(saved.colors[0].hex,"#FF0000");
  assert.notEqual(saved.id,source.id);
  const restored=restorePalette(source,saved);
  assert.equal(restored.id,"p");
  assert.equal(restored.colors[0].locked,true);
  restored.colors[0].hex="#FFFFFF";
  assert.equal(saved.colors[0].hex,"#FF0000");
});
