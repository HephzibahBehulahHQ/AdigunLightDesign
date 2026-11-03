import test from "node:test";
import assert from "node:assert/strict";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";

import { arrangementDuration, evaluateTracks } from "../src/timeline/tracks.ts";
test("creates a patchable three-fixture virtual studio rig", () => {
  const project=createStudioMoodProject();
  assert.equal(project.fixtures.length,3);
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.patchAssignment.startAddress),[1,11,21]);
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.profileId),Array(3).fill("generic-moving-head-rgbw"));
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.properties.blue),[255,26,184]);
});

test("starter tracks play a 30-second virtual arrangement with a fade and colour change",()=>{
  const project=createStudioMoodProject();
  assert.equal(arrangementDuration(project.cues),30);
  assert.equal(evaluateTracks(project.fixtures,project.cues,0)[0].properties.dimmer,0);
  assert.equal(evaluateTracks(project.fixtures,project.cues,2)[0].properties.dimmer,255);
  assert.equal(evaluateTracks(project.fixtures,project.cues,15)[1].properties.blue,220);
});
