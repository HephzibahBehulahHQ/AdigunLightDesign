import test from "node:test";
import assert from "node:assert/strict";
import { commitTransaction, redoTransaction, undoTransaction } from "../src/domain/history.js";
import { createProject } from "../src/domain/project.js";

test("records a full-document transaction and clears stale redo state", () => { const project=createProject({id:"p",name:"Before"}); const next=commitTransaction({project,undoStack:[],redoStack:[project]},"rename",(draft)=>{draft.name="After";}); assert.equal(next.project.name,"After"); assert.equal(next.undoStack[0].name,"Before"); assert.equal(next.redoStack.length,0); assert.equal(next.project.history.at(-1).label,"rename"); });
test("undoes and redoes project-wide changes", () => { const start=createProject({id:"p",name:"A"}); const committed=commitTransaction({project:start,undoStack:[],redoStack:[]},"fixture",(draft)=>{draft.fixtures.push({id:"f"});}); const undone=undoTransaction(committed); const redone=redoTransaction(undone); assert.equal(undone.project.fixtures.length,0); assert.equal(redone.project.fixtures[0].id,"f"); });
test('history retains the most recent 100 undo snapshots and failed mutations preserve source',()=>{
 let state={project:{name:'0',history:[]},undoStack:[],redoStack:[]};const original=structuredClone(state);
 assert.throws(()=>commitTransaction(state,'fail',draft=>{draft.name='bad';throw Error('invalid');}));assert.deepEqual(state,original);
 for(let i=1;i<=105;i++)state=commitTransaction(state,'rename',draft=>{draft.name=String(i);});
 assert.equal(state.undoStack.length,100);assert.equal(state.project.history.length,100);
 for(let i=0;i<100;i++)state=undoTransaction(state);assert.equal(state.project.name,'5');assert.equal(state.redoStack.length,100);
 assert.equal(undoTransaction(state),state);
 for(let i=0;i<100;i++)state=redoTransaction(state);assert.equal(state.project.name,'105');assert.equal(state.undoStack.length,100);
 assert.equal(redoTransaction(state),state);
});
