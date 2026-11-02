import test from "node:test";
import assert from "node:assert/strict";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
import { createCue } from "../src/timeline/engine.js";
test("palette identities are unique while versioned swatch identities may be shared",()=>{
  const project=createStudioMoodProject(),copy=structuredClone(project.palettes[0]);
  project.palettes.push(copy);assert.equal(validateProject(project).valid,false);
  copy.id="version-two";assert.equal(validateProject(project).valid,true);
  copy.id=" ";assert.equal(validateProject(project).valid,false);
});
test("cue references reject missing or repeated fixtures before evaluation",()=>{
  const project=createStudioMoodProject(),cue=createCue(project.fixtures);project.cues=[cue];
  assert.equal(validateProject(project).valid,true);
  cue.targets.push(structuredClone(cue.targets[0]));assert.equal(validateProject(project).valid,false);
  cue.targets.pop();cue.targets[0].fixtureId="missing";assert.equal(validateProject(project).valid,false);
  cue.targets=[];assert.equal(validateProject(project).valid,true);
});
