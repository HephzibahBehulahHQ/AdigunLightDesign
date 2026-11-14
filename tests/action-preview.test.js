import test from "node:test";
import assert from "node:assert/strict";
import { previewNativeToolAction,confirmNativeToolAction } from "../src/ai/action-preview.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { undoTransaction } from "../src/domain/history.js";
const request={type:"adigunlightdesign.tool-call",version:1,name:"add_fixture",payload:{profileId:"generic-rgb-wash"}};
test("preview preserves exact planned identities and commits one undoable action only after confirmation",()=>{
  const project=createStudioMoodProject(),state={project,undoStack:[],redoStack:[]},proposal=previewNativeToolAction(project,request);
  assert.equal(project.fixtures.length,9);assert.equal(project.history.length,0);
  assert.equal(proposal.changes.length,1);
  const plannedId=proposal.changes[0].after.id;
  assert.throws(()=>confirmNativeToolAction(state,proposal),/confirmation/);
  const applied=confirmNativeToolAction(state,proposal,{confirmed:true});
  assert.equal(applied.project.fixtures.at(-1).id,plannedId);
  assert.equal(applied.project.history.length,1);
  assert.deepEqual(undoTransaction(applied).project,project);
  assert.throws(()=>confirmNativeToolAction(state,proposal,{confirmed:true}),/already applied/);
});
test("stale forged and altered public previews cannot change the private candidate",()=>{
  const project=createStudioMoodProject(),state={project,undoStack:[],redoStack:[]},proposal=previewNativeToolAction(project,request);
  assert.throws(()=>confirmNativeToolAction(state,{...proposal},{confirmed:true}),/missing/);
  proposal.changes[0].after.name="Tampered";
  project.name="Changed";
  assert.throws(()=>confirmNativeToolAction(state,proposal,{confirmed:true}),/Project changed/);
  const fresh=previewNativeToolAction(project,request);fresh.changes[0].after.name="Tampered";
  const applied=confirmNativeToolAction(state,fresh,{confirmed:true});
  assert.notEqual(applied.project.fixtures.at(-1).name,"Tampered");
});
