import test from "node:test";
import assert from "node:assert/strict";
import { pickScenePoint,projectScenePoint,rayHitDistance,rayOccluded,filterOccludedPoints } from "../src/light-lab/picking.js";
import { multiply,studioCameraMatrix,viewportProjection } from "../src/light-lab/math.js";
import { fixtureHousing,sceneData } from "../src/light-lab/renderer.js";
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

test("fixture selection can reject geometry occluded before the fixture point",()=>{
 const ray={origin:[0,0,0],direction:[0,0,-1],length:20};
 const triangle=(z,x=0)=>[-1+x,-1,z,0,0,0,1+x,-1,z,0,0,0,x,1,z,0,0,0];
 const target=[0,0,-8];
 assert.equal(rayOccluded(target,ray,triangle(-4)),true);
 assert.equal(rayOccluded(target,ray,triangle(-10)),false);
 assert.equal(rayOccluded(target,ray,triangle(-4,3)),false);
 assert.equal(rayOccluded(target,ray,triangle(-4),4.5),false,"margin protects the fixture's own housing volume");
 assert.equal(rayOccluded(target,ray,new Float32Array(17)),false);
});

test("fixture housing ray picking returns the nearest triangle surface",()=>{
 const ray={origin:[0,0,0],direction:[0,0,-1],length:20};
 const triangle=(z)=>[-1,-1,z,0,0,0,1,-1,z,0,0,0,0,1,z,0,0,0];
 assert.equal(rayHitDistance([...triangle(-4),...triangle(-8)],ray),4);
 assert.equal(rayHitDistance(triangle(-4),ray,3),null);
 assert.equal(rayHitDistance(triangle(-4),{...ray,direction:[0,1,0]}),null);
 assert.equal(rayHitDistance(new Float32Array(17),ray),null);
});

test("fixture housing geometry produces a direct ray hit",()=>{
 const housing=fixtureHousing({x:0,y:3,z:0,targetX:0,targetZ:1.35,colour:[1,.5,.2]});
 assert.ok(rayHitDistance(housing,{origin:[0,3,2],direction:[0,0,-1],length:10})!==null);
});

test("projected fixture centers stay inside screen coordinates and depth bounds",()=>{
 const matrix=viewportProjection("perspective",2,10);
 const projected=projectScenePoint({id:"a",x:0,y:0,z:-10},matrix,800,400);
 assert.deepEqual({x:projected.x,y:projected.y},{x:400,y:200});assert.ok(Math.abs(projected.depth-.981982)<1e-5);
 assert.equal(projectScenePoint({id:"a",x:100,y:0,z:-10},matrix,800,400),null);
});

test("fixture picker ignores points behind opaque room and prop geometry",()=>{
 const matrix=multiply(viewportProjection("perspective",800/450,9.8),studioCameraMatrix({yaw:-.08,pitch:.1,distance:9.8,targetHeight:2.2}));
 const room=sceneData([0,0,0],[],{},undefined,false);
 const visible=filterOccludedPoints([
  {id:"visible",x:0,y:2,z:.45},
  {id:"behind-wall",x:0,y:2,z:5}
 ],matrix,800,450,room);
 assert.deepEqual(visible.map(point=>point.id),["visible"]);
});
