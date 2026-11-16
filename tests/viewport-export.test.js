import test from "node:test";
import assert from "node:assert/strict";
import { viewportPng } from "../src/export/viewport.js";
test("viewport redraw happens immediately before PNG encoding",async()=>{
  const events=[],blob=new Blob(["pixels"],{type:"image/png"});
  const result=await viewportPng({toBlob(callback,type){events.push(type);callback(blob);}},()=>events.push("draw"));
  assert.equal(result,blob);assert.deepEqual(events,["draw","image/png","draw"]);
});
test("HD viewport export uses a 1920 by 1080 frame and restores the live viewport",async()=>{
  const sizes=[],blob=new Blob(["pixels"],{type:"image/png"});
  const result=await viewportPng({toBlob(callback,type){assert.equal(type,"image/png");callback(blob);}},(size)=>sizes.push(size),{width:1920,height:1080});
  assert.equal(result,blob);assert.deepEqual(sizes,[{width:1920,height:1080},undefined]);
});
test("viewport encoder failures and missing capabilities reject without fabricated output",async()=>{
  await assert.rejects(viewportPng(null,()=>{}));
  await assert.rejects(viewportPng({toBlob(callback){callback(null);}},()=>{}));
  await assert.rejects(viewportPng({toBlob(callback){callback(new Blob(["x"],{type:"image/jpeg"}));}},()=>{}));
  await assert.rejects(viewportPng({toBlob(){throw new Error("Blocked");}},()=>{}),/Blocked/);
  await assert.rejects(viewportPng({toBlob(){}},()=>{throw new Error("Draw failed");}),/Draw failed/);
});
