import test from "node:test";
import assert from "node:assert/strict";
import { createCue, cueProgress, evaluateCue, interpolate } from "../src/timeline/engine.js";

test("interpolates numeric lighting values deterministically", () => { assert.equal(interpolate(0,255,.5),127.5); assert.equal(interpolate(0,255,2),255); });
test("delayed fades hold source values and snap only at the scheduled instant", () => {
  const source=[{id:"f",properties:{dimmer:0}}],target=[{id:"f",properties:{dimmer:200}}];
  const cue=createCue(target,{duration:5,delay:2,fade:2});
  assert.deepEqual([1,2,3,4,8].map((time)=>evaluateCue(source,cue,time)[0].properties.dimmer),[0,0,100,200,200]);
  const snap=createCue(target,{duration:5,delay:2,fade:0});
  assert.equal(evaluateCue(source,snap,1.99)[0].properties.dimmer,0);
  assert.equal(evaluateCue(source,snap,2)[0].properties.dimmer,200);
});
test("rejects cue timings that cannot complete within the duration", () => {
  for (const options of [{duration:0},{fade:-1},{delay:NaN},{duration:2,delay:1,fade:2}]) assert.throws(()=>createCue([],options));
});
test("captures fixture snapshots independent of later fixture edits", () => { const fixtures=[{id:"wash",properties:{dimmer:20,red:1,green:2,blue:3}}]; const cue=createCue(fixtures,{id:"cue",name:"Intro",fade:2}); fixtures[0].properties.red=90; assert.equal(cue.targets[0].properties.red,1); assert.equal(cueProgress(cue,1),.2); });
test("evaluates a cue without mutating its source state", () => { const source=[{id:"wash",properties:{dimmer:0,red:0,green:0,blue:0}}]; const cue={id:"cue",name:"Look",duration:5,fade:2,targets:[{fixtureId:"wash",properties:{dimmer:200,red:100,green:50,blue:25}}]}; const output=evaluateCue(source,cue,1); assert.equal(output[0].properties.dimmer,100); assert.equal(source[0].properties.dimmer,0); });
