import test from "node:test";
import assert from "node:assert/strict";
import { sceneData } from "../src/light-lab/renderer.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
import { dmxFrame } from "../src/dmx/engine.js";
test("hidden lighting and props remove geometry without changing saved DMX values",()=>{
  const project=createStudioMoodProject(),before=dmxFrame(project.fixtures),accent=[.2,.3,.4];
  const normal=sceneData(accent,project.fixtures);
  const noLights=sceneData(accent,project.fixtures,{lighting:false});
  const noProps=sceneData(accent,project.fixtures,{props:false});
  assert.ok(noLights.length<normal.length);assert.ok(noProps.length<normal.length);
  assert.deepEqual(dmxFrame(project.fixtures),before);
  assert.deepEqual(sceneData(accent,project.fixtures,{lighting:true,props:true}),normal);
});
test("native scene visibility defaults remain compatible and invalid flags reject",()=>{
  const project=createStudioMoodProject();
  project.scenes[0].visibility={lighting:false,props:true,palette:false};
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).valid,true);
  for (const visibility of [null,[],{lighting:"false"},{unknown:true}]) {
    project.scenes[0].visibility=visibility;
    assert.equal(validateProject(project).valid,false);
  }
  delete project.scenes[0].visibility;
  assert.equal(validateProject(project).valid,true);
});
