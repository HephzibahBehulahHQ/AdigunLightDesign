import test from "node:test";
import assert from "node:assert/strict";
import { parseProjectJson, readProjectFile } from "../src/domain/import-project.ts";

test("rejects wrong metadata types without throwing", () => {
  for (const name of [42,{},[],null]) {
    const source=JSON.stringify({...createProject(),name});
    assert.equal(parseProjectJson(source).valid,false);
  }
  assert.equal(parseProjectJson(JSON.stringify({...createProject(),id:42})).valid,false);
});
test("reports file read failures as import errors", async () => {
  const result=await readProjectFile({size:10,type:"application/json",text:async()=>{throw new Error("Access failed");}});
  assert.equal(result.valid,false);
  assert.equal(result.project,null);
  assert.match(result.errors[0],/could not be read/);
});
test("rejects oversized and unsupported files before reading their contents",async()=>{
  let reads=0;
  const read=async(file)=>readProjectFile({...file,text:async()=>{reads++;return "{}";}});
  const oversized=await read({size:5_000_001,type:"application/json"});
  const unsupported=await read({size:10,type:"application/octet-stream"});
  assert.equal(oversized.valid,false);assert.equal(unsupported.valid,false);assert.equal(reads,0);
  assert.match(oversized.errors[0],/exceeds 5 MB/);assert.match(unsupported.errors[0],/must be JSON/);
});
test("reads an in-limit JSON project file and returns a validated copy",async()=>{
  const source=createProject({id:"file-project",name:"File project"});
  const result=await readProjectFile({size:100,type:"application/json",text:async()=>JSON.stringify(source)});
  assert.equal(result.valid,true);assert.notEqual(result.project,source);assert.equal(result.project.name,source.name);
});
import { createProject } from "../src/domain/project.js";
import { projectJson } from "../src/export/formats.js";

test("round-trips a valid native project", () => { const project=createProject({id:"project",name:"Studio"}); const result=parseProjectJson(projectJson(project)); assert.equal(result.valid,true); assert.notEqual(result.project,project); assert.equal(result.project.name,"Studio"); });
test("rejects malformed and unsupported native imports", () => { assert.equal(parseProjectJson("not json").valid,false); assert.equal(parseProjectJson(JSON.stringify({schemaVersion:99,id:"x",name:"X"})).valid,false); });
