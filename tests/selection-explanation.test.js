import test from "node:test";
import assert from "node:assert/strict";
import {explainSelection} from "../src/ai/selection-explanation.js";
import {createStudioMoodProject} from "../src/domain/studio-mood.js";
import {createCue} from "../src/timeline/engine.js";
import {addCanvasObject} from "../src/domain/canvas.js";
test("fixture explanations follow actual patch dimmer and cue membership without mutating state",()=>{
  const project=createStudioMoodProject(),fixture=project.fixtures[0];project.cues=[createCue(project.fixtures)];
  const before=JSON.stringify(project),state={project,selection:{kind:"fixture",id:fixture.id}},result=explainSelection(state);
  assert.equal(result.facts.find(f=>f.key==="explainCueCount").value,"1");
  assert.equal(result.facts.find(f=>f.key==="explainPatch").value,"1 / 1–10");assert.equal(JSON.stringify(project),before);
  fixture.patchAssignment=null;fixture.properties.dimmer=0;
  const revised=explainSelection(state);assert.equal(revised.facts.find(f=>f.key==="explainPatch").value,null);assert.equal(revised.facts.find(f=>f.key==="explainVirtualDimmer").value,"0");
});
test("selection kinds prevent stale or ambiguous matches and report actual swatch/object values",()=>{
  const project=createStudioMoodProject(),palette=project.palettes[0],swatch=palette.colors[0];
  assert.equal(explainSelection({project,selection:{kind:"fixture",id:swatch.id}}),null);
  const color=explainSelection({project,selection:{kind:"swatch",id:swatch.id,paletteId:palette.id}});assert.equal(color.facts.find(f=>f.key==="hex").value,swatch.hex);
  project.scenes[0]=addCanvasObject(project.scenes[0],"rect","#123456",{id:"shape-1"});
  const object=explainSelection({project,selection:{kind:"object",id:"shape-1",sceneId:project.scenes[0].id}});assert.equal(object.facts.find(f=>f.key==="explainFill").value,"#123456");
  project.scenes[0].canvasObjects=[];assert.equal(explainSelection({project,selection:{kind:"object",id:"shape-1",sceneId:project.scenes[0].id}}),null);
});
