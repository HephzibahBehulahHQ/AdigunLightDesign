import test from "node:test";
import assert from "node:assert/strict";
import { cameraMatrix, hexVector, perspective, radians } from "../src/light-lab/math.js";

test("creates stable projection and camera transforms", () => {
  const projection = perspective(radians(48), 16 / 9, .1, 100);
  assert.equal(projection.length, 16);
  assert.ok(projection[0] > 0);
  assert.equal(cameraMatrix({ yaw:0, pitch:0, distance:11 })[14], -11);
});

test("converts a palette material to normalized GPU values", () => {
  assert.deepEqual(hexVector("#22D3EE").map((value) => Number(value.toFixed(3))), [.133,.827,.933]);
});
