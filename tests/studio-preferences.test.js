import test from "node:test";
import assert from "node:assert/strict";
import { studioActiveModule,studioDefaults,viewCommandSource } from "../src/ui/studio-preferences.js";

test("a fresh studio opens in the target 3D fixture workspace",()=>{
  assert.equal(studioDefaults.module,"light");
  assert.equal(studioDefaults.view,"light");
  assert.equal(studioDefaults.inspectorMode,"fixture");
});

test("hidden source controls remain available for the docked 2D and 3D ribbon commands",()=>{
  const source=viewCommandSource({palette:"Palette Engine",light:"Light Lab"});
  assert.match(source,/hidden/);
  assert.match(source,/data-view="palette"/);
  assert.match(source,/data-view="light"/);
});

test("the active top-level studio module follows the selected 2D or 3D view",()=>{
  assert.equal(studioActiveModule({module:"palette",view:"light"}),"light");
  assert.equal(studioActiveModule({module:"light",view:"palette"}),"palette");
  assert.equal(studioActiveModule({module:"library",view:"light"}),"library");
});
