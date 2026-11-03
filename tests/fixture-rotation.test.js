import test from "node:test";
import assert from "node:assert/strict";
import { virtualFixtureVisuals } from "../src/light-lab/renderer.js";
import { createFixture,updateFixture } from "../src/dmx/engine.js";
test("fixture yaw rotates its virtual beam target while preserving origin and source data",()=>{
  const fixture=createFixture(1,"generic-moving-head-rgbw"),before=virtualFixtureVisuals([fixture])[0];
  const rotated=updateFixture([fixture],fixture.id,{transform:{rotation:90}}),after=virtualFixtureVisuals(rotated)[0];
  assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(after.z,before.z);
  assert.ok(Math.abs(after.targetX-(before.x+1.35))<1e-9);
  assert.ok(Math.abs(after.targetZ-before.z)<1e-9);
  assert.equal(fixture.transform.rotation,0);
  const full=virtualFixtureVisuals(updateFixture([fixture],fixture.id,{transform:{rotation:360}}))[0];
  assert.ok(Math.abs(full.targetX-before.targetX)<1e-9);
  assert.ok(Math.abs(full.targetZ-before.targetZ)<1e-9);
});
