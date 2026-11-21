import assert from "node:assert/strict";
import test from "node:test";
import { createFixture } from "../src/dmx/engine.js";
import { fixtureRigJson, readFixtureRig } from "../src/dmx/fixture-rig.js";

test("fixture rigs preserve virtual settings without carrying project identities and patches", () => {
  const fixture = createFixture(1, "generic-led-strip-rgb");
  fixture.sceneId = "source-room";
  fixture.patchAssignment = {fixtureId:fixture.id, universe:2, startAddress:31, channelFootprint:4};
  fixture.transform.rotation = 55;
  fixture.properties.blue = 90;
  assert.deepEqual(readFixtureRig(fixtureRigJson([fixture])), [{
    name:fixture.name, profileId:fixture.profileId, modeId:fixture.modeId,
    transform:fixture.transform, properties:fixture.properties,
  }]);
});

test("fixture rig imports reject unsupported profiles, invalid channels, and nonfinite coordinates", () => {
  const valid = JSON.parse(fixtureRigJson([createFixture()]));
  for (const changes of [
    {profileId:"unknown"},
    {modeId:"unknown"},
    {properties:{dimmer:256}},
    {transform:{x:"Infinity",y:0,z:0,rotation:0}},
  ]) {
    assert.throws(() => readFixtureRig(JSON.stringify({...valid, fixtures:[{...valid.fixtures[0], ...changes}]})));
  }
  assert.throws(() => readFixtureRig(JSON.stringify({...valid, schemaVersion:2})), /supported/);
});
