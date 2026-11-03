import test from "node:test";
import assert from "node:assert/strict";
import { addCanvasObject,updateCanvasObject,validCanvasObjects,duplicateCanvasObject,moveCanvasObject } from "../src/domain/canvas.js";
import { canvasMarkup } from "../src/ui/canvas.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
import { commitTransaction,undoTransaction } from "../src/domain/history.js";
test("canvas objects add edit and persist through native validation and undo",()=>{
  const project=createStudioMoodProject(),state=commitTransaction({project,undoStack:[],redoStack:[]},"canvas-add",(draft)=>{draft.scenes[0]=addCanvasObject(draft.scenes[0],"rect","#f00",{id:"rect"});});
  const edited=updateCanvasObject(state.project.scenes[0],"rect",{x:50,width:300,fill:"#0000FF"});
  assert.equal(edited.canvasObjects[0].width,300);assert.equal(state.project.scenes[0].canvasObjects[0].width,200);
  assert.equal(validateProject(JSON.parse(JSON.stringify(state.project))).valid,true);
  assert.deepEqual(undoTransaction(state).project.scenes,project.scenes);
  assert.throws(()=>updateCanvasObject(edited,"rect",{width:-1}));
  assert.throws(()=>addCanvasObject(edited,"rect","#fff",{id:"rect"}));
});
test("canvas text and identifiers cannot become executable SVG markup",()=>{
  const scene=addCanvasObject({},"text","#fff",{id:'a" onclick="bad()',text:"<script>alert(1)</script>"});
  const html=canvasMarkup(scene.canvasObjects,scene.canvasObjects[0].id,"Canvas");
  assert.ok(!html.includes("<script>"));assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes('data-canvas-object="a&quot; onclick=&quot;bad()"'));
  assert.equal(validCanvasObjects([{...scene.canvasObjects[0],fontSize:Infinity}]),false);
  assert.throws(()=>canvasMarkup([{...scene.canvasObjects[0],fill:"url(unsafe)"}],null,"Canvas"));
});
test("ellipse copies preserve independent geometry and stacking moves preserve content",()=>{
  const scene=addCanvasObject({},"ellipse","#f00",{id:"a"}),copy=duplicateCanvasObject(scene,"a","b");
  assert.equal(copy.canvasObjects[1].x,scene.canvasObjects[0].x+20);
  assert.equal(copy.canvasObjects[1].type,"ellipse");
  const moved=moveCanvasObject(copy,"b",-1);
  assert.deepEqual(moved.canvasObjects.map((object)=>object.id),["b","a"]);
  assert.deepEqual(copy.canvasObjects.map((object)=>object.id),["a","b"]);
  assert.deepEqual(moveCanvasObject(moved,"b",-1),moved);
  assert.throws(()=>duplicateCanvasObject(scene,"a","a"));
  assert.match(canvasMarkup(scene.canvasObjects,"a","Canvas"),/<ellipse cx="200" cy="160" rx="100" ry="60"/);
});
