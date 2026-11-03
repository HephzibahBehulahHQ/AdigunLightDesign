import test from "node:test";
import assert from "node:assert/strict";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";

test("creates a patchable three-fixture virtual studio rig", () => {
  const project=createStudioMoodProject();
  assert.equal(project.fixtures.length,3);
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.patchAssignment.startAddress),[1,11,21]);
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.profileId),Array(3).fill("generic-moving-head-rgbw"));
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.properties.blue),[255,26,184]);
});
