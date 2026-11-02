import test from "node:test";
import assert from "node:assert/strict";
import { runNativeReadOnlyTool } from "../src/ai/read-only-actions.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
const call=(name,payload)=>({type:"adigunlightdesign.tool-call",version:1,name,payload});
test("read-only contrast reports actual measured thresholds without project mutation",()=>{
  const project=createStudioMoodProject(),before=JSON.stringify(project),result=runNativeReadOnlyTool(project,call("check_contrast",{foreground:"#fff",background:"#000"}));
  assert.equal(result.foreground,"#FFFFFF");assert.equal(result.result.ratio,21);assert.equal(result.result.aaa,true);
  assert.equal(JSON.stringify(project),before);
  assert.throws(()=>runNativeReadOnlyTool(project,call("check_contrast",{foreground:"invalid",background:"#000"})));
});
test("read-only exports return validated local artifacts for supported formats only",()=>{
  const project=createStudioMoodProject(),before=JSON.stringify(project);
  for(const format of ["project-json","palette-json","css","palette-svg","design-tokens","patch-csv","cue-csv","canvas-svg"]) {
    const result=runNativeReadOnlyTool(project,call("export_project",{format}));
    assert.ok(result.artifact.content.length);assert.ok(result.artifact.mimeType);assert.ok(result.artifact.filename);
  }
  assert.equal(JSON.stringify(project),before);
  for(const format of ["mvr","figma","constructor"])assert.throws(()=>runNativeReadOnlyTool(project,call("export_project",{format})),/Unsupported/);
  assert.throws(()=>runNativeReadOnlyTool(project,call("export_project",{format:"css",paletteId:"missing"})));
});
