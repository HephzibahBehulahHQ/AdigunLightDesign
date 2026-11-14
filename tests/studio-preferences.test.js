import test from "node:test";
import assert from "node:assert/strict";
import { studioActiveModule,studioDefaults } from "../src/ui/studio-preferences.js";

test("a fresh studio opens in the target 3D fixture workspace",()=>{
  assert.equal(studioDefaults.module,"light");
  assert.equal(studioDefaults.view,"light");
  assert.equal(studioDefaults.inspectorMode,"fixture");
});

test("the active workspace follows its view and keeps fixture navigation distinct",()=>{
  assert.equal(studioActiveModule({module:"palette",view:"light"}),"light");
  assert.equal(studioActiveModule({module:"light",view:"palette"}),"palette");
  assert.equal(studioActiveModule({module:"canvas",view:"light"}),"light");
  assert.equal(studioActiveModule({module:"library",view:"light"}),"library");
  assert.equal(studioActiveModule({module:"copilot",view:"light"}),"copilot");
});
