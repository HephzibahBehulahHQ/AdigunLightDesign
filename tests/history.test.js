import test from "node:test";
import assert from "node:assert/strict";
import { commitTransaction, redoTransaction, undoTransaction } from "../src/domain/history.js";
import { createProject } from "../src/domain/project.js";

test("records a full-document transaction and clears stale redo state", () => { const project=createProject({id:"p",name:"Before"}); const next=commitTransaction({project,undoStack:[],redoStack:[project]},"rename",(draft)=>{draft.name="After";}); assert.equal(next.project.name,"After"); assert.equal(next.undoStack[0].name,"Before"); assert.equal(next.redoStack.length,0); assert.equal(next.project.history.at(-1).label,"rename"); });
test("undoes and redoes project-wide changes", () => { const start=createProject({id:"p",name:"A"}); const committed=commitTransaction({project:start,undoStack:[],redoStack:[]},"fixture",(draft)=>{draft.fixtures.push({id:"f"});}); const undone=undoTransaction(committed); const redone=redoTransaction(undone); assert.equal(undone.project.fixtures.length,0); assert.equal(redone.project.fixtures[0].id,"f"); });
