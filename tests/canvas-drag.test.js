import test from "node:test";
import assert from "node:assert/strict";
import { bindCanvasDrag } from "../src/ui/canvas-drag.js";
function setup() {
  const handlers=new Map(),moves=[],selections=[],attributes=new Map();let captured=false;
  const object={id:"a",x:10,y:20},element={dataset:{canvasObject:"a"},setAttribute:(key,value)=>attributes.set(key,value),removeAttribute:(key)=>attributes.delete(key)};
  const svg={contains:()=>true,getScreenCTM:()=>({inverse:()=>({})}),createSVGPoint:()=>({x:0,y:0,matrixTransform(){return {x:(this.x-100)/2,y:(this.y-50)/2};}}),setPointerCapture:()=>{captured=true;},hasPointerCapture:()=>captured,releasePointerCapture:()=>{captured=false;},addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:(key)=>handlers.delete(key)};
  const cleanup=bindCanvasDrag(svg,[object],{onSelect:(id)=>selections.push(id),onMove:(id,position)=>moves.push({id,...position})});
  const fire=(type,x,y,pointerId=1)=>handlers.get(type)({type,button:0,pointerId,clientX:x,clientY:y,target:{closest:()=>element},preventDefault(){}});
  return {handlers,moves,selections,attributes,object,cleanup,fire};
}
test("canvas drag maps scaled coordinates and commits once on release",()=>{
  const state=setup();state.fire("pointerdown",120,90);state.fire("pointermove",160,110);
  assert.equal(state.moves.length,0);assert.equal(state.attributes.get("transform"),"translate(20 10)");
  state.fire("pointerup",180,130);
  assert.deepEqual(state.moves,[{id:"a",x:40,y:40}]);
  assert.equal(state.attributes.size,0);assert.deepEqual(state.object,{id:"a",x:10,y:20});
  state.cleanup();assert.equal(state.handlers.size,0);
});
test("cancelled drags never commit and clicking selects without a mutation",()=>{
  const state=setup();state.fire("pointerdown",120,90);state.fire("pointermove",160,110);state.fire("pointercancel",160,110);
  assert.equal(state.moves.length,0);assert.equal(state.selections.length,0);assert.equal(state.attributes.size,0);
  state.fire("pointerdown",120,90);state.fire("pointerup",120,90);
  assert.deepEqual(state.selections,["a"]);assert.equal(state.moves.length,0);
});
