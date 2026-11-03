import test from "node:test";
import assert from "node:assert/strict";
import { viewportProjection } from "../src/light-lab/math.js";
test("orthographic projection preserves apparent size across depth and responds to zoom",()=>{
  const orthographic=viewportProjection("orthographic",2,10),perspective=viewportProjection("perspective",2,10);
  const projectedX=(matrix,z)=>matrix[0]/(matrix[11]*z+matrix[15]);
  assert.equal(projectedX(orthographic,-5),projectedX(orthographic,-10));
  assert.ok(projectedX(perspective,-5)>projectedX(perspective,-10));
  assert.ok(viewportProjection("orthographic",2,5)[0]>orthographic[0]);
  assert.equal(orthographic[5]/orthographic[0],2);
  assert.ok(orthographic.every(Number.isFinite));
  assert.throws(()=>viewportProjection("unknown",2,10));
  assert.throws(()=>viewportProjection("perspective",0,10));
});
