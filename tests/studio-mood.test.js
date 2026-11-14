import test from "node:test";
import assert from "node:assert/strict";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";

import { arrangementDuration, evaluateTracks } from "../src/timeline/tracks.ts";
test("creates the nine-fixture reference starter rig with non-overlapping patches", () => {
  const project=createStudioMoodProject();
  assert.equal(project.scenes[0].name,"Main room");
  assert.equal(project.fixtures.length,9);
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.name),[
    "Moving Head RGB 1","Moving Head RGB 2","Moving Head RGB 3",
    "RGB Wash 4","RGB Wash 5","RGB Wash 6","RGB Wash 7",
    "LED Strip RGB 8","LED Strip RGB 9"
  ]);
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.patchAssignment.startAddress),[1,11,21,31,37,43,49,55,59]);
  assert.deepEqual(project.fixtures.map((fixture)=>fixture.profileId),[
    "generic-moving-head-rgbw","generic-moving-head-rgbw","generic-moving-head-rgbw",
    "generic-rgb-wash","generic-rgb-wash","generic-rgb-wash","generic-rgb-wash",
    "generic-led-strip-rgb","generic-led-strip-rgb"
  ]);
  assert.deepEqual(project.fixtures.slice(0,3).map((fixture)=>fixture.properties.blue),[255,26,184]);
});

test("starter tracks play a 30-second virtual arrangement with a fade and colour change",()=>{
  const project=createStudioMoodProject();
  assert.equal(arrangementDuration(project.cues),30);
  assert.equal(evaluateTracks(project.fixtures,project.cues,0)[0].properties.dimmer,0);
  assert.equal(evaluateTracks(project.fixtures,project.cues,2)[0].properties.dimmer,255);
  assert.equal(evaluateTracks(project.fixtures,project.cues,15)[1].properties.blue,220);
});
