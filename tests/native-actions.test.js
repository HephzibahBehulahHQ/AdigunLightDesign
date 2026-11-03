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
  assert.throws(()=>commitNativeToolAction(initial,call("check_contrast",{foreground:"#fff",background:"#000"}),{confirmed:true}),/no native executor/);
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
test("native palette creation updates locks and harmony preserve locked colors",()=>{
  let current=state();
  current=commitNativeToolAction(current,call("create_palette",{name:"Custom",colors:["#f00","#00f"]}),{confirmed:true});
  const palette=current.project.palettes.at(-1),id=palette.colors[0].id;
  current=commitNativeToolAction(current,call("update_swatch",{paletteId:palette.id,swatchId:id,changes:{hex:"#0f0",opacity:.5}}),{confirmed:true});
  current=commitNativeToolAction(current,call("lock_swatch",{paletteId:palette.id,swatchId:id}),{confirmed:true});
  assert.throws(()=>commitNativeToolAction(current,call("update_swatch",{paletteId:palette.id,swatchId:id,changes:{hex:"#fff"}}),{confirmed:true}),/Unlock/);
  current=commitNativeToolAction(current,call("generate_harmony",{paletteId:palette.id,seed:"#ff0000",type:"complementary"}),{confirmed:true});
  assert.equal(current.project.palettes.at(-1).colors[0].hex,"#00FF00");
  assert.equal(current.project.palettes.at(-1).colors[0].opacity,.5);
  assert.throws(()=>commitNativeToolAction(current,call("generate_harmony",{seed:"invalid",type:"unknown"}),{confirmed:true}));
});
test("native palette application changes chosen surfaces and only selected fixtures",()=>{
  const initial=state(),palette=initial.project.palettes[0],id=initial.project.fixtures[1].id;
  const material=commitNativeToolAction(initial,call("apply_palette_to_material",{paletteId:palette.id,materialId:"wall"}),{confirmed:true});
  assert.equal(material.project.scenes[0].materials.wall,palette.colors[0].hex);
  const lights=commitNativeToolAction(initial,call("apply_palette_to_lights",{paletteId:palette.id,fixtureIds:[id]}),{confirmed:true});
  assert.deepEqual(lights.project.fixtures[0],initial.project.fixtures[0]);
  assert.notDeepEqual(lights.project.fixtures[1].properties,initial.project.fixtures[1].properties);
  assert.equal(initial.project.scenes[0].materials,undefined);
});
