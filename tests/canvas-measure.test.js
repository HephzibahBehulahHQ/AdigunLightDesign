import test from "node:test";
import assert from "node:assert/strict";
import {bindCanvasMeasure} from "../src/ui/canvas-measure.js";
test("measurement maps scaled coordinates, restores cancellation, supports keyboard and cleans up",()=>{
  const events=new Map(),values=[];let captured=false,removed=false;
  const node=()=>({setAttribute(){},append(){},remove(){removed=true;}});
  const svg={ownerDocument:{createElementNS:node},append(){},setAttribute(){},
    getScreenCTM:()=>({inverse:()=>({})}),createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x/2,y:this.y/2};}};},
    setPointerCapture(){captured=true;},hasPointerCapture:()=>captured,releasePointerCapture(){captured=false;},
    addEventListener:(name,handler)=>events.set(name,handler),removeEventListener:name=>events.delete(name)};
  const cleanup=bindCanvasMeasure(svg,{units:"units",onMeasure:value=>values.push(value)});
  const pointer=(type,x,y,id=1)=>events.get(type)({type,clientX:x,clientY:y,button:0,pointerId:id,preventDefault(){}});
  pointer("pointerdown",20,20);pointer("pointermove",26,28);pointer("pointerup",26,28);
  assert.deepEqual(values.at(-1),{from:{x:10,y:10},to:{x:13,y:14},distance:5});assert.equal(captured,false);
  pointer("pointerdown",0,0);pointer("pointermove",100,100,2);assert.equal(values.at(-1).distance,0);
  pointer("pointercancel",100,100);assert.equal(values.at(-1).distance,5);
  const key=(key,shiftKey=false)=>events.get("keydown")({target:svg,key,shiftKey,preventDefault(){}});
  key("Enter");key("ArrowRight",true);assert.equal(values.at(-1).distance,10);key("Escape");assert.equal(values.at(-1).distance,0);
  cleanup();assert.equal(events.size,0);assert.equal(removed,true);
});
