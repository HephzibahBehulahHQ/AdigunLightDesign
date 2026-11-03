import test from "node:test";
import assert from "node:assert/strict";
import { viewportPng } from "../src/export/viewport.js";
test("viewport redraw happens immediately before PNG encoding",async()=>{
  const events=[],blob=new Blob(["pixels"],{type:"image/png"});
  const result=await viewportPng({toBlob(callback,type){events.push(type);callback(blob);}},()=>events.push("draw"));
  assert.equal(result,blob);assert.deepEqual(events,["draw","image/png"]);
});
test("viewport encoder failures and missing capabilities reject without fabricated output",async()=>{
  await assert.rejects(viewportPng(null,()=>{}));
  await assert.rejects(viewportPng({toBlob(callback){callback(null);}},()=>{}));
  await assert.rejects(viewportPng({toBlob(callback){callback(new Blob(["x"],{type:"image/jpeg"}));}},()=>{}));
  await assert.rejects(viewportPng({toBlob(){throw new Error("Blocked");}},()=>{}),/Blocked/);
  await assert.rejects(viewportPng({toBlob(){}},()=>{throw new Error("Draw failed");}),/Draw failed/);
});
