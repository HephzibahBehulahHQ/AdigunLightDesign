import test from "node:test";
import assert from "node:assert/strict";
import { spotlightConeCoverage } from "../src/light-lab/renderer.js";

test("artistic spotlight spill eases smoothly across the beam edge",()=>{
  const edge=.94;
  assert.equal(spotlightConeCoverage(edge-.01,edge),0);
  assert.equal(spotlightConeCoverage(1,edge),1);
  assert.ok(Math.abs(spotlightConeCoverage(edge+(1-edge)*.5,edge)-.5)<1e-12);
  assert.ok(spotlightConeCoverage(edge+(1-edge)*.1,edge)<.03);
  assert.ok(spotlightConeCoverage(edge+(1-edge)*.9,edge)>.97);
  assert.equal(spotlightConeCoverage(NaN,edge),0);
});
