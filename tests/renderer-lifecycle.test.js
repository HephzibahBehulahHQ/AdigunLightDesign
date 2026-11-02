import test from "node:test";
import assert from "node:assert/strict";
import { createLightLabRenderer } from "../src/light-lab/renderer.js";

test("camera movement reuses geometry; changes invalidate it and destroy removes listeners",()=>{
  const previousWindow=Object.getOwnPropertyDescriptor(globalThis,"window");
  const previousObserver=Object.getOwnPropertyDescriptor(globalThis,"ResizeObserver");
  let uploads=0,deletedBuffers=0,deletedPrograms=0,deletedShaders=0,disconnected=false;
  const events=new Map();
  const drawStates=[],uploadLengths=[],matrices=[];let depthWrites=true,blending=false;
  const gl=new Proxy({
    BLEND:"blend",DEPTH_TEST:"depth",
    enable:(cap)=>{if(cap==="blend")blending=true;},disable:(cap)=>{if(cap==="blend")blending=false;},
    depthMask:(value)=>{depthWrites=value;},drawArrays:()=>drawStates.push({depthWrites,blending}),
    getShaderParameter:()=>true,getProgramParameter:()=>true,
    createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),
    getAttribLocation:()=>0,getUniformLocation:()=>({}),
    uniformMatrix4fv:(location,transpose,matrix)=>matrices.push([...matrix]),
    bufferData:(target,data)=>{uploads+=1;uploadLengths.push(data.length);},deleteBuffer:()=>{deletedBuffers+=1;},deleteProgram:()=>{deletedPrograms+=1;},deleteShader:()=>{deletedShaders+=1;}
  },{get:(target,key)=>key in target ? target[key] : ()=>{}});
  const canvas={clientWidth:800,clientHeight:450,width:800,height:450,
    getContext:()=>gl,setPointerCapture:()=>{},
    addEventListener:(name,handler)=>events.set(name,handler),
    removeEventListener:(name,handler)=>{if(events.get(name)===handler)events.delete(name);}
  };
  Object.defineProperty(globalThis,"window",{configurable:true,value:{devicePixelRatio:1}});
  Object.defineProperty(globalThis,"ResizeObserver",{configurable:true,value:class {
    observe(){} disconnect(){disconnected=true;}
  }});
  try {
    const fixture={id:"a",properties:{dimmer:255,red:255,green:0,blue:0}};
    const renderer=createLightLabRenderer(canvas,{fixtures:[{...fixture,selected:true}]});
    assert.deepEqual(drawStates.slice(0,2),[{depthWrites:true,blending:false},{depthWrites:false,blending:true}]);
    assert.equal(depthWrites,true);assert.equal(blending,false);
    assert.equal(uploads,1);
    events.get("keydown")({key:"ArrowLeft",preventDefault(){}});
    events.get("wheel")({deltaY:1,preventDefault(){}});
    renderer.reset();
    assert.equal(uploads,1);
    const beforeAxis=matrices.at(-1);renderer.setView("x");assert.notDeepEqual(matrices.at(-1),beforeAxis);assert.equal(uploads,1);
    renderer.setView("y");assert.ok(matrices.at(-1).every(Number.isFinite));renderer.setView("z");assert.equal(uploads,1);assert.throws(()=>renderer.setView("invalid"));
    const snapshot=renderer.cameraState();assert.equal(snapshot.yaw,0);snapshot.yaw=99;assert.equal(renderer.cameraState().yaw,0);
    renderer.setAccent("#FF0000");
    assert.equal(uploads,2);
    renderer.setFixtures([fixture]);
    assert.equal(uploadLengths[2],uploadLengths[1],"playback values retain the selected fixture outline");
    assert.equal(Object.hasOwn(fixture,"selected"),false,"renderer selection must not mutate project fixtures");
    renderer.setFixtures([{...fixture,selected:false}]);
    assert.ok(uploadLengths[3]<uploadLengths[2],"explicit deselection removes outline geometry");
    renderer.setFixtures([]);
    assert.equal(uploads,5);
    renderer.destroy();
    assert.equal(events.size,0);
    assert.equal(disconnected,true);
    assert.equal(deletedBuffers,1);
    assert.equal(deletedPrograms,1);
    assert.equal(deletedShaders,2);
  } finally {
    if(previousWindow)Object.defineProperty(globalThis,"window",previousWindow);else delete globalThis.window;
    if(previousObserver)Object.defineProperty(globalThis,"ResizeObserver",previousObserver);else delete globalThis.ResizeObserver;
  }
});
