import test from "node:test";
import assert from "node:assert/strict";
import { blackout, createFixture, dmxFrame, fixtureFootprint, firstAvailableAddress, patchFixture, validatePatch } from "../src/dmx/engine.js";

test("uses the declared footprint and validates universe bounds", () => { assert.equal(fixtureFootprint(), 6); assert.equal(validatePatch({fixtureId:"a",universe:1,startAddress:508,channelFootprint:6},[]).valid, false); });
test("detects DMX overlaps and finds the next valid address", () => { const fixture=createFixture(); fixture.id="a"; fixture.name="Wash A"; fixture.patchAssignment={fixtureId:"a",universe:1,startAddress:1,channelFootprint:6}; assert.equal(validatePatch({fixtureId:"b",universe:1,startAddress:4,channelFootprint:6},[fixture]).valid,false); assert.equal(firstAvailableAddress([fixture],1,6),7); });
test("patches virtual fixtures and creates a 512-channel frame", () => { const fixture=createFixture(); fixture.id="a"; const patched=patchFixture([fixture],"a",1); const frame=dmxFrame(patched); assert.equal(patched[0].patchAssignment.startAddress,1); assert.equal(frame.length,512); assert.equal(frame[0],255); assert.equal(frame[1],33); });
test("blackout changes virtual dimmers without enabling physical output", () => { const fixture=createFixture(); assert.equal(blackout([fixture])[0].properties.dimmer,0); assert.equal(fixture.properties.dimmer,255); });
