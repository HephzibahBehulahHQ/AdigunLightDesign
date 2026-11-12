import test from "node:test";
import assert from "node:assert/strict";
import { previewQuality } from "../src/light-lab/quality.js";
import { sceneBuffers,virtualFixtureVisuals } from "../src/light-lab/renderer.js";
test("preview modes use explicit fixture budgets with conservative fallback",()=>{
  const fixtures=Array.from({length:40},(_,index)=>({id:String(index),properties:{dimmer:0}}));
  for(const [mode,count] of [["performance",12],["balanced",12],["quality",32]]) assert.equal(virtualFixtureVisuals(fixtures,previewQuality(mode).fixtures).length,count);
  assert.equal(previewQuality("__proto__").fixtures,12);
  assert.equal(fixtures.length,40);
});
test("preview quality changes surface resolution without altering saved fixture values",()=>{
  const fixtures=[{id:"a",properties:{dimmer:100,red:255}}],before=structuredClone(fixtures);
  const low=sceneBuffers([.2,.3,.4],fixtures,{},undefined,{},"performance"),high=sceneBuffers([.2,.3,.4],fixtures,{},undefined,{},"quality");
  assert.ok(high.opaqueVertices>low.opaqueVertices);
  const beamVertices=scene=>scene.data.length/6-scene.opaqueVertices;
  assert.equal(beamVertices(low),previewQuality("performance").beamSegments*6);
  assert.equal(beamVertices(high),previewQuality("quality").beamSegments*6);
  assert.ok(beamVertices(high)>beamVertices(low));
  assert.deepEqual(fixtures,before);
  assert.ok(high.data.every(Number.isFinite));
});
test("performance preview retains all six default scene fixtures",()=>{
  const fixtures=Array.from({length:6},(_,index)=>({id:String(index),properties:{dimmer:255}}));
  assert.equal(virtualFixtureVisuals(fixtures,previewQuality("performance").fixtures).length,fixtures.length);
});
