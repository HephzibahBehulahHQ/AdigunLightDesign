import test from "node:test";
import assert from "node:assert/strict";
import {createCanvasStateFeed,createLiveCopilot,analyzeLightingState} from "../src/ai/live-copilot.js";
import {createStudioMoodProject} from "../src/domain/studio-mood.js";
import {createCue} from "../src/timeline/engine.js";
import {evaluateTracks} from "../src/timeline/tracks.js";
test("track-priority information matches actual shared-channel playback semantics",()=>{
  const project=createStudioMoodProject(),fixture=project.fixtures[0];
  const cue=(id,trackId,properties)=>({...createCue([fixture],{id,name:id,fade:0}),trackId,startTime:0,targets:[{fixtureId:fixture.id,properties}]});
  project.cues=[cue("base","Base",{dimmer:40}),cue("overlay","Overlay",{dimmer:200})];
  const before=JSON.stringify(project),findings=analyzeLightingState({project},{goal:"Layered studio"});
  assert.equal(findings.length,1);assert.equal(findings[0].kind,"information");assert.deepEqual(findings[0].channels,["dimmer"]);
  assert.equal(findings[0].trackId,"Overlay");assert.equal(evaluateTracks(project.fixtures,project.cues,6)[0].properties.dimmer,200);assert.equal(JSON.stringify(project),before);
  project.cues[1].targets[0].properties={red:200};assert.deepEqual(analyzeLightingState({project},{goal:"Layered studio"}),[]);
  project.cues[1].targets[0]={fixtureId:project.fixtures[1].id,properties:{dimmer:200}};assert.deepEqual(analyzeLightingState({project},{goal:"Layered studio"}),[]);
  project.cues=[cue("first","Main",{dimmer:40}),{...cue("next","Main",{dimmer:200}),startTime:5}];assert.deepEqual(analyzeLightingState({project},{goal:"Sequence"}),[]);
});
test("changing projects clears the analyzer goal without bypassing suggestion rate limits",()=>{
  let time=0;const feed=createCanvasStateFeed(),bot=createLiveCopilot({feed,now:()=>time,onSuggestion:()=>{}});
  feed.publish(createStudioMoodProject());bot.setEnabled(true);bot.setGoal("First project goal");time=1000;assert.equal(bot.tick(),null);
  const next=createStudioMoodProject();feed.publish(next);time=2000;
  assert.equal(bot.tick().id,`goal:${next.id}`);feed.publish(createStudioMoodProject());time=3000;assert.equal(bot.tick(),null);bot.dispose();
});
test("state subscription tracks changes and selection with isolated snapshots",()=>{
  const feed=createCanvasStateFeed(),project=createStudioMoodProject(),events=[];
  const stop=feed.subscribe(state=>{events.push(state);state.project.name="observer copy";});
  assert.equal(feed.publish(project),true);assert.equal(feed.publish(project),false);
  project.fixtures[0].transform.x+=1;feed.publish(project,{selection:project.fixtures[0].id});
  assert.equal(events.length,2);assert.equal(events[1].revision,2);assert.equal(project.name,"Studio Mood");
  stop();feed.publish(project);assert.equal(events.length,2);
});
test("analyzer offers patch review only for actual unpatched fixtures and asks a session goal",()=>{
  const project=createStudioMoodProject();assert.deepEqual(analyzeLightingState({project},{goal:"Studio scene"}),[]);
  project.fixtures[0].patchAssignment=null;
  const findings=analyzeLightingState({project});assert.equal(findings[0].action,"review-patch");assert.equal(findings[0].fixtureId,project.fixtures[0].id);
  assert.equal(findings[1].kind,"question");assert.equal(findings.some(item=>item.kind==="warning"),false);
});
test("suggestions respect debounce dragging typing dismissal rate limits and off switch",()=>{
  let time=0;const feed=createCanvasStateFeed(),events=[],project=createStudioMoodProject();
  const bot=createLiveCopilot({feed,now:()=>time,onSuggestion:value=>events.push(value)});
  feed.publish(project);time=1000;assert.equal(bot.tick(),null);bot.setEnabled(true);
  bot.activity({dragging:true});assert.equal(bot.tick(),null);bot.activity({dragging:false,typing:true});
  time=2499;assert.equal(bot.tick(),null);time=2500;const first=bot.tick();assert.equal(first.kind,"question");
  bot.dismiss(first.id);time=30000;assert.equal(bot.tick(),null);
  project.fixtures[0].patchAssignment=null;feed.publish(project);assert.equal(bot.tick(),null);
  time=30600;assert.equal(bot.tick().action,"review-patch");time=40000;assert.equal(bot.tick(),null);
  bot.setEnabled(false);time=200000;assert.equal(bot.tick(),null);bot.setEnabled(true);bot.setGoal("Warm interview lighting");
  assert.equal(bot.tick().action,"review-patch");bot.dispose();time+=200000;assert.equal(bot.tick(),null);
  assert.equal(events.length,3);
});
