import test from "node:test";
import assert from "node:assert/strict";
import {studioCameraMatrix,cameraAxisView,cameraPitchLimit,normalizeCameraState,multiply,viewportProjection} from "../src/light-lab/math.js";
import {pickScenePoint} from "../src/light-lab/picking.js";
test("studio camera keeps positive-Z rear surfaces behind furniture while preserving screen right",()=>{
  const matrix=studioCameraMatrix({yaw:0,pitch:0,distance:11,targetHeight:.35});
  const depth=z=>matrix[10]*z+matrix[14];
  assert.ok(depth(4)<depth(1.5));assert.ok(depth(1.5)<depth(-4));assert.ok(matrix[0]>0);
  for(const projection of ["perspective","orthographic"]){
    const combined=multiply(viewportProjection(projection,2,11),matrix);
    const y=.35;
    assert.equal(pickScenePoint([{id:"rear",x:0,y,z:4},{id:"front",x:0,y,z:-4}],combined,800,400,400,200),"front");
  }
});
test("room target height places furniture below and the rig above the camera center",()=>{
  const matrix=studioCameraMatrix({yaw:0,pitch:0,distance:11,targetHeight:2.2});
  const vertical=y=>matrix[5]*y+matrix[13];assert.ok(vertical(.9)<0);assert.ok(vertical(3.7)>0);assert.ok(Math.abs(vertical(2.2))<1e-6);
  assert.throws(()=>studioCameraMatrix({targetHeight:NaN}));
});
test("axis presets produce finite distinct views with a bounded overhead angle",()=>{
  assert.equal(cameraAxisView("x").yaw,-Math.PI/2);assert.equal(cameraAxisView("y").pitch,cameraPitchLimit);assert.equal(cameraAxisView("z").yaw,0);
  const matrices=["x","y","z"].map(axis=>studioCameraMatrix({...cameraAxisView(axis),distance:11}));assert.ok(matrices.every(matrix=>[...matrix].every(Number.isFinite)));assert.notDeepEqual(matrices[0],matrices[2]);assert.notDeepEqual(matrices[1],matrices[2]);assert.throws(()=>cameraAxisView("invalid"));
});
test("camera snapshots round-trip and reject nonfinite or out-of-range saved controls",()=>{
  const state={...cameraAxisView("x"),distance:7};assert.deepEqual(normalizeCameraState(state),state);assert.deepEqual(normalizeCameraState(null),{yaw:-.25,pitch:.1,distance:11});
  const bounded=normalizeCameraState({yaw:NaN,pitch:100,distance:-5});assert.equal(bounded.yaw,-.25);assert.equal(bounded.pitch,cameraPitchLimit);assert.equal(bounded.distance,4);
});
test('matrix multiplication rejects malformed size and nonfinite elements',()=>{
 const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 assert.deepEqual(multiply(identity,identity),identity);
 assert.throws(()=>multiply(new Float32Array(15),identity),/4x4/);
 const invalid=new Float32Array(identity);invalid[7]=NaN;assert.throws(()=>multiply(identity,invalid),/4x4/);
 assert.throws(()=>multiply(invalid,identity),/4x4/);
});
