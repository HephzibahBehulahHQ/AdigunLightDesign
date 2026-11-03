import test from "node:test";
import assert from "node:assert/strict";
import { duplicateCue,removeCue } from "../src/timeline/engine.js";
import { commitTransaction,undoTransaction } from "../src/domain/history.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { createCue } from "../src/timeline/engine.js";

test("duplicate inserts an independent snapshot after its source",()=>{
  const cues=[{id:"a",name:"Look",duration:3,targets:[{properties:{red:100}}],keyframes:[{time:0}]}];
  const result=duplicateCue(cues,"a",{id:"b"});
  assert.deepEqual(result.map((cue)=>cue.id),["a","b"]);
  result[1].targets[0].properties.red=0;
  result[1].keyframes[0].time=2;
  assert.equal(cues[0].targets[0].properties.red,100);
  assert.equal(cues[0].keyframes[0].time,0);
  assert.throws(()=>duplicateCue(cues,"a",{id:"a"}));
  assert.throws(()=>duplicateCue(cues,"missing"));
});
test("removal supports the final cue and project undo restores its snapshot",()=>{
  const project=createStudioMoodProject();
  project.cues=[createCue(project.fixtures,{id:"a"})];
  const state=commitTransaction({project,undoStack:[],redoStack:[]},"cue-delete",(draft)=>{draft.cues=removeCue(draft.cues,"a");});
  assert.equal(state.project.cues.length,0);
  assert.deepEqual(undoTransaction(state).project.cues,project.cues);
  assert.throws(()=>removeCue([],"missing"));
});
