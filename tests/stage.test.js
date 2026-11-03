import test from "node:test";
import assert from "node:assert/strict";
import { stageSettings,updateStage } from "../src/domain/stage.js";
import { sceneData } from "../src/light-lab/renderer.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
import { commitTransaction,undoTransaction } from "../src/domain/history.js";
test("stage platform produces actual box geometry and follows props visibility",()=>{
  const accent=[.2,.3,.4],stage={...stageSettings(),enabled:true};
  const off=sceneData(accent,[]),on=sceneData(accent,[],{},undefined,true,{},"balanced",stage);
  assert.equal(on.length-off.length,36*6);
  assert.ok(on.every(Number.isFinite));
  assert.deepEqual(sceneData(accent,[],{props:false},undefined,true,{},"balanced",stage),sceneData(accent,[],{props:false}));
});
test("stage editing is undoable and native imports reject invalid platform dimensions",()=>{
  const project=createStudioMoodProject(),stage={...stageSettings(),enabled:true,color:"#FF0000"};
  const result=commitTransaction({project,undoStack:[],redoStack:[]},"stage",(draft)=>{draft.scenes[0]=updateStage(draft.scenes[0],stage);});
  assert.equal(validateProject(JSON.parse(JSON.stringify(result.project))).valid,true);
  assert.deepEqual(undoTransaction(result).project,project);
  result.project.scenes[0].stage.height=-1;
  assert.equal(validateProject(result.project).valid,false);
  assert.throws(()=>stageSettings({...stage,width:Infinity}));
  assert.throws(()=>stageSettings({...stage,color:"url(unsafe)"}));
});
