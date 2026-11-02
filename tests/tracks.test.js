import test from "node:test";
import assert from "node:assert/strict";
import { arrangeTracks,arrangementDuration,evaluateTracks,scheduleCue } from "../src/timeline/tracks.js";
import { duplicateCue } from "../src/timeline/engine.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
const source=[{id:"a",properties:{red:0,dimmer:255}},{id:"b",properties:{red:0,dimmer:255}}];
const cue=(id,fixtureId,red,trackId,startTime)=>({id,name:id,duration:4,fade:2,delay:0,trackId,startTime,targets:[{fixtureId,properties:{red}}]});
test("tracks run simultaneously with gaps and retain independent fixture values",()=>{
  const cues=[cue("one","a",200,"Key",2),cue("two","b",100,"Fill",0)];
  assert.equal(arrangementDuration(cues),6);
  const atThree=evaluateTracks(source,cues,3);
  assert.equal(atThree[0].properties.red,100);
  assert.equal(atThree[1].properties.red,100);
  assert.equal(evaluateTracks(source,cues,1)[0].properties.red,0);
  assert.equal(source[0].properties.red,0);
});
test("conflicting channels use stable later-track priority and preserve other channels",()=>{
  const cues=[cue("one","a",200,"Key",0),cue("two","a",100,"Fill",0)];
  assert.equal(evaluateTracks(source,cues,2)[0].properties.red,100);
  assert.equal(evaluateTracks(source,cues,2)[0].properties.dimmer,255);
});
test("same-track overlaps reject while legacy cues and scheduled copies remain valid",()=>{
  const cues=[cue("one","a",200,undefined,undefined),cue("two","b",100,undefined,undefined)];
  assert.deepEqual(arrangeTracks(cues)[0].entries.map((entry)=>entry.start),[0,4]);
  assert.throws(()=>scheduleCue(cues,"two","Main",1));
  const scheduled=scheduleCue(cues,"two","Fill",0);
  assert.equal(arrangeTracks(scheduled).length,2);
  assert.equal(cues[1].trackId,undefined);
  const copied=duplicateCue(scheduled,"two",{id:"three"});
  assert.equal(copied[2].startTime,4);
  assert.doesNotThrow(()=>arrangeTracks(copied));
});
test("native project validation retains valid scheduling and rejects imported overlap",()=>{
  const project=createStudioMoodProject(),id=project.fixtures[0].id;
  project.cues=[cue("one",id,100,"Key",0),cue("two",id,200,"Key",4)];
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).valid,true);
  project.cues[1].startTime=1;
  assert.equal(validateProject(project).valid,false);
});
