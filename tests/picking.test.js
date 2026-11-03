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
test('picking rejects malformed projections and unusable viewport coordinates',()=>{
 const point=[{id:'a',x:0,y:0,z:-10}],matrix=viewportProjection('perspective',2,10);
 for(const values of [[0,400,0,0,28],[800,-1,0,0,28],[800,400,NaN,200,28],[800,400,400,200,-1]])assert.equal(pickScenePoint(point,matrix,...values),null);
 assert.equal(pickScenePoint(point,new Float32Array(15),800,400,400,200),null);
 const invalid=new Float32Array(matrix);invalid[0]=Infinity;assert.equal(pickScenePoint(point,invalid,800,400,400,200),null);
 assert.equal(pickScenePoint([{id:'bad',x:NaN,y:0,z:-10}],matrix,800,400,400,200),null);
});
