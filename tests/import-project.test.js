import test from "node:test";
import assert from "node:assert/strict";
import { parseProjectJson, readProjectFile } from "../src/domain/import-project.js";

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
import { createProject } from "../src/domain/project.js";
import { projectJson } from "../src/export/formats.js";

test("round-trips a valid native project", () => { const project=createProject({id:"project",name:"Studio"}); const result=parseProjectJson(projectJson(project)); assert.equal(result.valid,true); assert.notEqual(result.project,project); assert.equal(result.project.name,"Studio"); });
test("rejects malformed and unsupported native imports", () => { assert.equal(parseProjectJson("not json").valid,false); assert.equal(parseProjectJson(JSON.stringify({schemaVersion:99,id:"x",name:"X"})).valid,false); });
