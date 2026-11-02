import test from "node:test";
import assert from "node:assert/strict";
import { pickScenePoint } from "../src/light-lab/picking.js";
import { viewportProjection } from "../src/light-lab/math.js";
test("fixture picking projects points in both projection modes and rejects clipped points",()=>{
  for (const mode of ["perspective","orthographic"]) {
    const matrix=viewportProjection(mode,2,10);
    assert.equal(pickScenePoint([{id:"a",x:0,y:0,z:-10}],matrix,800,400,400,200),"a");
    assert.equal(pickScenePoint([{id:"a",x:0,y:0,z:-10}],matrix,800,400,500,200),null);
    assert.equal(pickScenePoint([{id:"a",x:0,y:0,z:10}],matrix,800,400,400,200),null);
    assert.equal(pickScenePoint([{id:"a",x:100,y:0,z:-10}],matrix,800,400,400,200),null);
  }
});
test("overlapping projected centers prefer the closer fixture",()=>{
  const matrix=viewportProjection("perspective",2,10);
  assert.equal(pickScenePoint([{id:"far",x:0,y:0,z:-10},{id:"near",x:0,y:0,z:-5}],matrix,800,400,400,200),"near");
});
