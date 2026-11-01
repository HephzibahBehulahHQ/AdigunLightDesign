import test from "node:test";
import assert from "node:assert/strict";
import { createCue, cueProgress, evaluateCue, interpolate } from "../src/timeline/engine.js";

test("interpolates numeric lighting values deterministically", () => { assert.equal(interpolate(0,255,.5),127.5); assert.equal(interpolate(0,255,2),255); });
test("captures fixture snapshots independent of later fixture edits", () => { const fixtures=[{id:"wash",properties:{dimmer:20,red:1,green:2,blue:3}}]; const cue=createCue(fixtures,{id:"cue",name:"Intro",fade:2}); fixtures[0].properties.red=90; assert.equal(cue.targets[0].properties.red,1); assert.equal(cueProgress(cue,1),.2); });
test("evaluates a cue without mutating its source state", () => { const source=[{id:"wash",properties:{dimmer:0,red:0,green:0,blue:0}}]; const cue={id:"cue",name:"Look",duration:5,fade:2,targets:[{fixtureId:"wash",properties:{dimmer:200,red:100,green:50,blue:25}}]}; const output=evaluateCue(source,cue,1); assert.equal(output[0].properties.dimmer,100); assert.equal(source[0].properties.dimmer,0); });
