import test from "node:test";
import assert from "node:assert/strict";
import { createFixture, updateFixture } from "../src/dmx/engine.js";
import { fixturePlacementMarkup } from "../src/light-lab/fixture-placement.js";

test("fixture inspector exposes editable metric position and rotation fields", () => {
  const fixture=createFixture(2,"generic-moving-head-rgbw");
  const markup=fixturePlacementMarkup(fixture.transform,"Position / rotation","Shift-drag at an angled view");
  for (const axis of ["x","y","z","rotation"]) assert.match(markup,new RegExp(`id="fixture-${axis}"`));
  assert.match(markup,/X \(m\)[\s\S]*value="0"/);
  assert.match(markup,/Y \(m\)[\s\S]*value="3\.65"/);
  assert.match(markup,/Z \(m\)[\s\S]*value="0\.45"/);
  assert.match(markup,/Rotation \(°\)[\s\S]*step="1" value="0"/);
  const moved=updateFixture([fixture],fixture.id,{transform:{x:1.2,y:2.4,z:-.8,rotation:45}})[0];
  assert.deepEqual(moved.transform,{x:1.2,y:2.4,z:-.8,rotation:45});
  assert.deepEqual(fixture.transform,{x:0,y:3.65,z:.45,rotation:0});
});

test("fixture placement heading is HTML escaped", () => {
  assert.match(fixturePlacementMarkup({x:0,y:0,z:0,rotation:0},"<Placement>","<Hint>"),/<legend>&lt;Placement&gt;<\/legend><small>&lt;Hint&gt;<\/small>/);
});


