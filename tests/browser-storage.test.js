import test from "node:test";
import assert from "node:assert/strict";
import { readBrowserStorage,writeBrowserStorage } from "../src/domain/browser-storage.js";
test("storage returns actual success and retains stored data",()=>{
  const items=new Map(),storage=()=>({getItem:(key)=>items.get(key) ?? null,setItem:(key,value)=>items.set(key,value)});
  assert.deepEqual(readBrowserStorage("project",storage),{ok:true,value:null});
  assert.deepEqual(writeBrowserStorage("project","data",storage),{ok:true});
  assert.equal(readBrowserStorage("project",storage).value,"data");
});
test("blocked storage getters and quota failures return failure without throwing",()=>{
  const denied=()=>{throw new Error("Access denied");};
  assert.deepEqual(readBrowserStorage("project",denied),{ok:false,value:null});
  assert.deepEqual(writeBrowserStorage("project","data",denied),{ok:false});
  const full=()=>({setItem(){throw new Error("Quota exceeded");}});
  assert.deepEqual(writeBrowserStorage("project","data",full),{ok:false});
});
