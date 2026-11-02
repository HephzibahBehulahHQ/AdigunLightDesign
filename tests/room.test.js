import test from "node:test";
import assert from "node:assert/strict";
import { roomDimensions } from "../src/domain/room.js";
import { sceneData } from "../src/light-lab/renderer.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
import { commitTransaction,undoTransaction } from "../src/domain/history.js";
test("room dimensions retain legacy defaults and reject malformed bounds",()=>{
  assert.deepEqual(roomDimensions(),{width:10,height:4,depth:8});
  for (const room of [null,[],{width:1,height:4,depth:8},{width:10,height:21,depth:8},{width:10,height:4,depth:NaN}]) assert.throws(()=>roomDimensions(room));
});
test("room floor walls and ceiling use the chosen world dimensions",()=>{
  const data=sceneData([.2,.3,.4],[],{props:false},{width:14,height:6,depth:12});
  const coordinates=Array.from({length:data.length/6},(_,index)=>data.slice(index*6,index*6+3));
  assert.equal(Math.min(...coordinates.map((point)=>point[0])),-7);
  assert.equal(Math.max(...coordinates.map((point)=>point[0])),7);
  assert.equal(Math.max(...coordinates.map((point)=>point[1])),6);
  assert.equal(Math.min(...coordinates.map((point)=>point[2])),-6);
  assert.equal(Math.max(...coordinates.map((point)=>point[2])),6);
  assert.ok(data.every(Number.isFinite));
});
test("room resize persists through native files and undo restores the old scene",()=>{
  const project=createStudioMoodProject(),state=commitTransaction({project,undoStack:[],redoStack:[]},"resize",(draft)=>{draft.scenes[0].room={width:14,height:6,depth:12};});
  assert.equal(validateProject(JSON.parse(JSON.stringify(state.project))).valid,true);
  assert.deepEqual(undoTransaction(state).project.scenes,project.scenes);
  state.project.scenes[0].room.width=-1;
  assert.equal(validateProject(state.project).valid,false);
});
