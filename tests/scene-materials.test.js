import test from "node:test";
import assert from "node:assert/strict";
import { applySceneMaterial } from "../src/domain/scene-materials.js";
import { sceneData } from "../src/light-lab/renderer.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
test("painting a surface changes vertex colors while preserving geometry and other surfaces",()=>{
  const before=sceneData([.2,.3,.4],[],{props:false},undefined,false);
  const after=sceneData([.2,.3,.4],[],{props:false},undefined,false,{floor:"#FF0000"});
  assert.equal(after.length,before.length);
  for(let offset=0;offset<before.length;offset+=6) assert.deepEqual(after.slice(offset,offset+3),before.slice(offset,offset+3));
  assert.ok(after[3]>before[3]);assert.equal(after[4],0);assert.equal(after[5],0);
  const floorLength=20*16*6*6;
  const floorGrainLength=9*32*6*6;
  assert.ok(after[floorLength+3]>before[floorLength+3]);
  assert.equal(after[floorLength+4],0);assert.equal(after[floorLength+5],0);
  assert.deepEqual(after.slice(floorLength+floorGrainLength),before.slice(floorLength+floorGrainLength));
});
test("surface painting preserves prior materials and validates native import",()=>{
  const project=createStudioMoodProject(),original=project.scenes[0];
  const wall=applySceneMaterial(original,"wall","#f00"),floor=applySceneMaterial(wall,"floor","#00f"),left=applySceneMaterial(floor,"wallLeft","#0066FF"),right=applySceneMaterial(left,"wallRight","#E31B54");
  assert.equal(original.materials,undefined);
  assert.deepEqual(floor.materials,{wall:"#FF0000",wallRear:"#FF0000",wallLeft:"#FF0000",wallRight:"#FF0000",floor:"#0000FF"});
  assert.equal(left.materials.wallLeft,"#0066FF");assert.equal(left.materials.wallRight,"#FF0000");
  assert.equal(right.materials.wallLeft,"#0066FF");assert.equal(right.materials.wallRight,"#E31B54");
  assert.equal(right.materials.wallRear,"#FF0000");assert.equal(right.materialColor,original.materialColor);
  project.scenes[0]=right;
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).valid,true);
  project.scenes[0].materials.wall="url(invalid)";
  assert.equal(validateProject(project).valid,false);
  assert.throws(()=>applySceneMaterial(original,"unknown","#fff"));
});
test("left, rear and right room walls keep independently editable paint",()=>{
  const source={materialColor:"#123456",materials:{wall:"#445566"}},left=applySceneMaterial(source,"wallLeft","#0066ff"),rear=applySceneMaterial(left,"wallRear","#ffaa00"),right=applySceneMaterial(rear,"wallRight","#e31b54");
  assert.equal(right.materials.wall,"#445566");assert.equal(right.materials.wallRear,"#FFAA00");assert.equal(right.materials.wallLeft,"#0066FF");assert.equal(right.materials.wallRight,"#E31B54");
  const all=applySceneMaterial(right,"wall","#ffffff");
  assert.deepEqual([all.materials.wall,all.materials.wallRear,all.materials.wallLeft,all.materials.wallRight],["#FFFFFF","#FFFFFF","#FFFFFF","#FFFFFF"]);
  const project=createStudioMoodProject();project.scenes[0]={...project.scenes[0],...right};assert.equal(validateProject(project).valid,true);
});

