import test from "node:test";
import assert from "node:assert/strict";
import { virtualDmxPreview } from "../src/dmx/preview.js";
import { createFixture,patchFixture } from "../src/dmx/engine.js";
import { createCue,evaluateCue } from "../src/timeline/engine.js";
test("DMX monitor reflects interpolated preview channels in the selected universe",()=>{
  const fixture=createFixture(),source=patchFixture([fixture],fixture.id,2,49);
  source[0].properties.dimmer=0;
  const target=structuredClone(source);target[0].properties.dimmer=200;
  const cue=createCue(target,{duration:4,fade:2});
  const result=virtualDmxPreview(evaluateCue(source,cue,1),fixture.id);
  assert.equal(result.universe,2);assert.equal(result.channels[0].address,49);
  assert.equal(result.channels[0].value,100);assert.equal(result.frame[48],100);
  assert.equal(source[0].properties.dimmer,0);
  assert.equal(virtualDmxPreview(source,fixture.id).frame[48],0);
});
test("DMX monitor supports missing selections and empty projects without physical output",()=>{
  const result=virtualDmxPreview([],"missing");
  assert.equal(result.universe,1);assert.equal(result.frame.length,512);
  assert.deepEqual(result.channels,[]);assert.ok(result.frame.every((value)=>value===0));
});
