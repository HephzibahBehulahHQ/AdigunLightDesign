import test from "node:test";
import assert from "node:assert/strict";
import { cameraMatrix, hexVector, perspective, radians } from "../src/light-lab/math.js";
import { createLightLabRenderer, virtualFixtureVisuals } from "../src/light-lab/renderer.js";

test("fixture editing remains usable when WebGL is unavailable", () => {
  const renderer = createLightLabRenderer({ getContext: () => null });
  assert.equal(renderer.supported, false);
  assert.doesNotThrow(() => {
    renderer.setFixtures([{ properties: { dimmer:128 } }]);
    renderer.setAccent("#2196F3");
    renderer.reset();
    renderer.destroy();
  });
});

test("creates stable projection and camera transforms", () => {
  const projection = perspective(radians(48), 16 / 9, .1, 100);
  assert.equal(projection.length, 16);
  assert.ok(projection[0] > 0);
  assert.equal(cameraMatrix({ yaw:0, pitch:0, distance:11 })[14], -11);
});

test("converts a palette material to normalized GPU values", () => {
  assert.deepEqual(hexVector("#22D3EE").map((value) => Number(value.toFixed(3))), [.133,.827,.933]);
});

test("maps virtual DMX colour, dimmer, and beam channels to preview lights", () => {
  const [light] = virtualFixtureVisuals([{ transform:{ x:2,y:3,z:4 }, properties:{ red:255,green:128,blue:0,white:0,dimmer:128,beam:255 } }]);
  assert.deepEqual([light.x,light.y,light.z], [2,3,4]);
  assert.deepEqual(light.colour.map((value)=>Number(value.toFixed(3))), [.502,.252,0]);
  assert.equal(Number(light.spread.toFixed(2)), 1.4);
});
