import test from "node:test";
import assert from "node:assert/strict";
import { parseProjectJson } from "../src/domain/import-project.js";
import { createProject } from "../src/domain/project.js";
import { projectJson } from "../src/export/formats.js";

test("round-trips a valid native project", () => { const project=createProject({id:"project",name:"Studio"}); const result=parseProjectJson(projectJson(project)); assert.equal(result.valid,true); assert.notEqual(result.project,project); assert.equal(result.project.name,"Studio"); });
test("rejects malformed and unsupported native imports", () => { assert.equal(parseProjectJson("not json").valid,false); assert.equal(parseProjectJson(JSON.stringify({schemaVersion:99,id:"x",name:"X"})).valid,false); });
