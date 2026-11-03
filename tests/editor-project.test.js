import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "../src/domain/project.js";
import { prepareEditorProject } from "../src/domain/editor-project.js";

test("opens palette-free projects while retaining their identity and data",()=>{
  const source=createProject({name:"Imported rig"});
  source.assets=[{id:"asset",extension:{custom:true}}];
  const prepared=prepareEditorProject(source);
  assert.equal(prepared.id,source.id);
  assert.deepEqual(prepared.assets,source.assets);
  assert.equal(source.palettes.length,0);
  assert.equal(prepared.palettes[0].colors.length,5);
  const reopened=prepareEditorProject(prepared);
  assert.deepEqual(reopened,prepared);
});
