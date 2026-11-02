import test from "node:test";
import assert from "node:assert/strict";
import { updateFixture } from "../src/dmx/engine.js";
test("fixture placement updates preserve the source and reject invalid transforms", () => {
  const fixture=createFixture();
  const [updated]=updateFixture([fixture],fixture.id,{transform:{x:1.25,y:2,z:-3}});
  assert.deepEqual(updated.transform,{x:1.25,y:2,z:-3,rotation:0});
  assert.notEqual(fixture.transform.x,1.25);
  for (const transform of [{x:NaN},{y:Infinity},{z:"3"},{unknown:1}]) assert.throws(()=>updateFixture([fixture],fixture.id,{transform}));
});

test("fixture edits validate values and patch overlaps without changing the source", () => {
  const first=createFixture(),second=createFixture(2);
  const fixtures=patchFixture(patchFixture([first,second],first.id),second.id);
  for (const dimmer of [-1,256,NaN,Infinity,1.5]) assert.throws(()=>updateFixture(fixtures,first.id,{properties:{dimmer}}));
  assert.throws(()=>updateFixture(fixtures,first.id,{startAddress:7}),/overlaps/);
  const updated=updateFixture(fixtures,first.id,{name:" Key ",properties:{dimmer:72},startAddress:20});
  assert.equal(updated[0].name,"Key");
  assert.equal(updated[0].properties.dimmer,72);
  assert.equal(updated[0].patchAssignment.startAddress,20);
  assert.equal(fixtures[0].properties.dimmer,255);
  assert.equal(fixtures[0].patchAssignment.startAddress,1);
});
import { blackout, createFixture, dmxFrame, fixtureFootprint, fixtureProfiles, firstAvailableAddress, getFixtureProfile, patchFixture, validatePatch } from "../src/dmx/engine.js";

test("uses the declared footprint and validates universe bounds", () => { assert.equal(fixtureFootprint(), 6); assert.equal(validatePatch({fixtureId:"a",universe:1,startAddress:508,channelFootprint:6},[]).valid, false); });
test("detects DMX overlaps and finds the next valid address", () => { const fixture=createFixture(); fixture.id="a"; fixture.name="Wash A"; fixture.patchAssignment={fixtureId:"a",universe:1,startAddress:1,channelFootprint:6}; assert.equal(validatePatch({fixtureId:"b",universe:1,startAddress:4,channelFootprint:6},[fixture]).valid,false); assert.equal(firstAvailableAddress([fixture],1,6),7); });
test("patches virtual fixtures and creates a 512-channel frame", () => { const fixture=createFixture(); fixture.id="a"; const patched=patchFixture([fixture],"a",1); const frame=dmxFrame(patched); assert.equal(patched[0].patchAssignment.startAddress,1); assert.equal(frame.length,512); assert.equal(frame[0],255); assert.equal(frame[1],33); });
test("blackout changes virtual dimmers without enabling physical output", () => { const fixture=createFixture(); assert.equal(blackout([fixture])[0].properties.dimmer,0); assert.equal(fixture.properties.dimmer,255); });
test("keeps a small provenance-labelled generic fixture library", () => { const moving=getFixtureProfile("generic-moving-head-rgbw"), fixture=createFixture(1,moving.id), patched=patchFixture([fixture],fixture.id); assert.equal(fixtureProfiles.length,3); assert.match(moving.provenance,/not manufacturer validated/i); assert.equal(patched[0].patchAssignment.channelFootprint,10); assert.equal(dmxFrame(patched)[0],127); });
test("gives newly created virtual fixtures distinct preview positions", () => { assert.deepEqual([createFixture(1).transform.x,createFixture(2).transform.x,createFixture(3).transform.x],[-2.5,0,2.5]); });
