import test from "node:test";
import assert from "node:assert/strict";
import { setChannelKeyframe,validateChannelKeyframes } from "../src/timeline/keyframes.js";
import { createCue,evaluateCue,duplicateCue } from "../src/timeline/engine.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
const source=[{id:"a",properties:{dimmer:20,red:0}}];
const base=()=>createCue([{id:"a",properties:{dimmer:220,red:200}}],{duration:8,fade:2,fadeOut:2});
const frame=(time,value)=>({fixtureId:"a",property:"dimmer",time,value});
test("channel keyframes override fades only on their channel and interpolate from source",()=>{
  const cue=setChannelKeyframe(setChannelKeyframe(base(),frame(2,100)),frame(6,200));
  const at=(time)=>evaluateCue(source,cue,time)[0].properties;
  assert.equal(at(1).dimmer,60);assert.equal(at(4).dimmer,150);
  assert.equal(at(8).dimmer,200);assert.equal(at(1).red,100);
  assert.equal(at(8).red,0);
  assert.equal(source[0].properties.dimmer,20);
});
test("same-time edits replace one frame while zero-time frames snap and copies remain independent",()=>{
  const original=base(),cue=setChannelKeyframe(setChannelKeyframe(original,frame(0,100)),frame(0,150));
  assert.equal(cue.channelKeyframes.length,1);
  assert.equal(evaluateCue(source,cue,0)[0].properties.dimmer,150);
  assert.equal(original.channelKeyframes,undefined);
  const copy=duplicateCue([cue],cue.id,{id:"copy"})[1];
  copy.channelKeyframes[0].value=0;
  assert.equal(cue.channelKeyframes[0].value,150);
});
test("keyframe validation rejects unknown channels, duplicate times and invalid timing or values",()=>{
  for (const change of [{time:9},{time:-1},{value:256},{value:1.5},{property:"unknown"},{fixtureId:"missing"}]) assert.throws(()=>setChannelKeyframe(base(),{...frame(2,100),...change}));
  assert.equal(validateChannelKeyframes({...base(),targets:{},channelKeyframes:[frame(2,100)]}),false);
  assert.equal(validateChannelKeyframes({...base(),channelKeyframes:[frame(2,100),frame(2,100)]}),false);
});
test("native imports retain channel keyframes and reject duration edits that truncate them",()=>{
  const project=createStudioMoodProject(),cue=createCue(project.fixtures,{duration:8});
  project.cues=[setChannelKeyframe(cue,{fixtureId:project.fixtures[0].id,property:"dimmer",time:7,value:100})];
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).valid,true);
  project.cues[0].duration=6;
  assert.equal(validateProject(project).valid,false);
});
