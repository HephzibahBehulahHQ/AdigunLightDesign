import test from "node:test";
import assert from "node:assert/strict";
import {createCanvasStateFeed,createLiveCopilot,analyzeLightingState} from "../src/ai/live-copilot.js";
import {createStudioMoodProject} from "../src/domain/studio-mood.js";
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
