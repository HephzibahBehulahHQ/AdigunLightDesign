import test from "node:test";
import assert from "node:assert/strict";
import { createCue,evaluateCue,evaluateSequence } from "../src/timeline/engine.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
test("cue fades in, holds, and fades back to source at its boundary",()=>{
  const source=[{id:"a",properties:{dimmer:20}}];
  const cue=createCue([{id:"a",properties:{dimmer:220}}],{duration:8,delay:1,fade:2,fadeOut:2});
  const at=(time)=>evaluateCue(source,cue,time)[0].properties.dimmer;
  assert.equal(at(0),20);assert.equal(at(2),120);assert.equal(at(3),220);
  assert.equal(at(6),220);assert.equal(at(7),120);assert.equal(at(8),20);
  assert.equal(evaluateSequence(source,[cue],8).fixtures[0].properties.dimmer,20);
  assert.equal(source[0].properties.dimmer,20);
  assert.deepEqual(cue.keyframes.slice(-2).map((frame)=>frame.time),[6,8]);
});
test("fade-out validates total timing and preserves legacy cue imports",()=>{
  assert.throws(()=>createCue([],{duration:3,fade:2,fadeOut:2}));
  assert.throws(()=>createCue([],{fadeOut:-1}));
  const project=createStudioMoodProject();
  project.cues=[createCue(project.fixtures)];
  delete project.cues[0].fadeOut;
  assert.equal(validateProject(project).valid,true);
  project.cues[0].fadeOut=5;
  assert.equal(validateProject(project).valid,false);
});
