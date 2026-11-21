import test from "node:test";
import assert from "node:assert/strict";
import { createFixture, updateFixture } from "../src/dmx/engine.js";
import { fixturePlacementMarkup } from "../src/light-lab/fixture-placement.js";
import {fixturePlacementForRoom} from "../src/domain/fixture-placement.js";
import {roomPresets} from "../src/domain/room-presets.js";

test("fixture inspector exposes editable metric position and rotation fields", () => {
  const fixture=createFixture(2,"generic-moving-head-rgbw");
  const markup=fixturePlacementMarkup(fixture.transform,"Position / rotation","Shift-drag at an angled view");
  for (const axis of ["x","y","z","rotation"]) {
    const fields=markup.match(new RegExp(`id="fixture-${axis}"`, "g")) ?? [];
    assert.equal(fields.length,1,`expected one ${axis} field`);
  }
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
  assert.match(fixturePlacementMarkup({x:0,y:0,z:0,rotation:0},"Position","Move","<Drehung>"),/&lt;Drehung&gt; \(°\)/);
});

test("new room fixtures start inside each template and strips mount vertically on the rear wall",()=>{
  for(const preset of roomPresets){
    const {width,height,depth}=preset.room;
    const moving=fixturePlacementForRoom("generic-rgb-wash",preset.room);
    assert.ok(Math.abs(moving.x)<width/2&&moving.y>0&&moving.y<height&&Math.abs(moving.z)<depth/2,preset.id+" wash starts inside its room");
    const strip=fixturePlacementForRoom("generic-led-strip-rgb",preset.room);
    assert.ok(Math.abs(strip.x)<width/2&&strip.y===height/2&&Math.abs(strip.z-depth/2)<.1,preset.id+" strip mounts on a room wall");
  }
});

test("repeated fixtures spread to open positions and remain bounded in compact rooms",()=>{
  const room={width:2.4,height:2.7,depth:2},fixtures=[];
  for(let index=0;index<8;index++){
    const transform=fixturePlacementForRoom(index%2?"generic-led-strip-rgb":"generic-rgb-wash",room,fixtures);
    assert.ok(Math.abs(transform.x)<room.width/2&&transform.y>0&&transform.y<room.height&&Math.abs(transform.z)<room.depth/2);
    fixtures.push({transform});
  }
  assert.ok(new Set(fixtures.map(fixture=>JSON.stringify(fixture.transform))).size>1,"new fixtures use separated room positions");
});
