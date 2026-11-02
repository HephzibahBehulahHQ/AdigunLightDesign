import test from "node:test";
import assert from "node:assert/strict";
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
