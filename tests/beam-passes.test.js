import test from "node:test";
import assert from "node:assert/strict";
import { sceneBuffers,sceneData } from "../src/light-lab/renderer.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
test("beam buffers follow opaque geometry and disappear with blackout or hidden lighting",()=>{
  const project=createStudioMoodProject(),accent=[.2,.3,.4],result=sceneBuffers(accent,project.fixtures);
  assert.deepEqual(result.data.slice(0,result.opaqueVertices*6),sceneData(accent,project.fixtures,{},undefined,false));
  assert.ok(result.data.length>result.opaqueVertices*6);
  assert.equal((result.data.length/6-result.opaqueVertices)%3,0);
  const hidden=sceneBuffers(accent,project.fixtures,{lighting:false});
  assert.equal(hidden.data.length,hidden.opaqueVertices*6);
  const off=sceneBuffers(accent,project.fixtures.map((fixture)=>({...fixture,properties:{...fixture.properties,dimmer:0}})));
  assert.equal(off.data.length,off.opaqueVertices*6);
  assert.ok(result.data.every(Number.isFinite));
});
