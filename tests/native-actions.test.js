import test from "node:test";
import assert from "node:assert/strict";
import { commitNativeToolAction } from "../src/ai/native-actions.js";
import { validateToolCall } from "../src/ai/tool-registry.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { undoTransaction } from "../src/domain/history.js";
const call=(name,payload)=>({type:"adigunlightdesign.tool-call",version:1,name,payload});
const state=()=>({project:createStudioMoodProject(),undoStack:[],redoStack:[]});
test("native fixture actions require confirmation and share project undo with receipts",()=>{
  const initial=state(),request=call("add_fixture",{profileId:"generic-rgb-wash"});
  assert.throws(()=>commitNativeToolAction(initial,request),/confirmation/);
  const result=commitNativeToolAction(initial,request,{confirmed:true});
  assert.equal(result.project.fixtures.length,4);assert.equal(initial.project.fixtures.length,3);
  assert.equal(result.receipt.physicalOutput,false);assert.ok(result.receipt.historyId);
  assert.deepEqual(undoTransaction(result).project,initial.project);
});
test("invalid patch and cue actions are atomic and unsupported tools do not pretend to execute",()=>{
  const initial=state(),fixture=initial.project.fixtures[1];
  assert.throws(()=>commitNativeToolAction(initial,call("patch_fixture",{fixtureId:fixture.id,universe:1,startAddress:1}),{confirmed:true}));
  assert.equal(initial.project.history.length,0);
  assert.throws(()=>commitNativeToolAction(initial,call("create_cue",{name:"Bad",duration:1,fade:2}),{confirmed:true}));
  assert.throws(()=>commitNativeToolAction(initial,call("create_palette",{name:"New"}),{confirmed:true}),/no native executor/);
  for (const name of ["constructor","__proto__","toString"]) assert.equal(validateToolCall(call(name,{})).valid,false);
});
test("native scene and canvas actions validate and preserve the source document",()=>{
  const initial=state(),result=commitNativeToolAction(initial,call("add_object",{sceneId:initial.project.scenes[0].id,type:"ellipse",fill:"#f00"}),{confirmed:true});
  assert.equal(result.project.scenes[0].canvasObjects[0].type,"ellipse");
  assert.equal(initial.project.scenes[0].canvasObjects,undefined);
  assert.throws(()=>commitNativeToolAction(initial,call("add_object",{sceneId:"missing",type:"rect"}),{confirmed:true}));
});
test("fixture update and patch handlers use native channel and allocation validation",()=>{
  const initial=state(),id=initial.project.fixtures[0].id;
  const edited=commitNativeToolAction(initial,call("update_fixture",{fixtureId:id,changes:{properties:{dimmer:100}}}),{confirmed:true});
  assert.equal(edited.project.fixtures[0].properties.dimmer,100);
  const patched=commitNativeToolAction(edited,call("patch_fixture",{fixtureId:id,universe:2,startAddress:49}),{confirmed:true});
  assert.equal(patched.project.fixtures[0].patchAssignment.universe,2);
  assert.equal(patched.project.fixtures[0].patchAssignment.startAddress,49);
});
test("cue and scene handlers preserve snapshots and create valid named scenes",()=>{
  const initial=state(),created=commitNativeToolAction(initial,call("create_cue",{name:"Intro",duration:8,fade:2,fadeOut:1}),{confirmed:true});
  const cue=created.project.cues[0];
  const edited=commitNativeToolAction(created,call("update_cue",{cueId:cue.id,changes:{name:"Opening",duration:10}}),{confirmed:true});
  assert.equal(edited.project.cues[0].name,"Opening");
  assert.deepEqual(edited.project.cues[0].targets,cue.targets);
  const scene=commitNativeToolAction(edited,call("create_scene",{name:"Second room"}),{confirmed:true});
  assert.equal(scene.project.scenes.at(-1).name,"Second room");
  assert.equal(scene.project.scenes.length,initial.project.scenes.length+1);
});
