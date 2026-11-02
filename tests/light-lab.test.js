import test from "node:test";
import assert from "node:assert/strict";
test("surface light follows the beam target and excludes points outside its cone",()=>{
  const base=[.2,.2,.2],light={x:0,y:3,z:0,targetX:0,targetZ:0,spread:1,colour:[1,0,0]};
  const inside=surfaceLighting([0,.03,0],base,[light]);
  const outside=surfaceLighting([3,.03,0],base,[light]);
  assert.ok(inside[0]>outside[0]);
  assert.deepEqual(outside,base.map((value)=>value*.7));
  const moved=surfaceLighting([0,.03,0],base,[{...light,targetX:3}]);
  assert.ok(moved[0]<inside[0]);
});
test("virtual pan and tilt move beam targets without changing fixture positions",()=>{
  const neutral=virtualFixtureVisuals([{transform:{x:1,y:3,z:2},properties:{pan:127,tilt:127}}])[0];
  const aimed=virtualFixtureVisuals([{transform:{x:1,y:3,z:2},properties:{pan:255,tilt:255}}])[0];
  assert.equal(neutral.targetX,1);
  assert.equal(aimed.targetX,4);
  assert.ok(aimed.targetZ>neutral.targetZ);
  assert.equal(aimed.x,neutral.x);
  assert.deepEqual(virtualFixtureVisuals([]),[]);
});
import { surfaceLighting } from "../src/light-lab/renderer.js";
test("artistic surface spill follows fixture colour, distance and blackout",()=>{
  const base=[.2,.2,.2],light={x:0,y:3,z:0,colour:[1,0,0]};
  const near=surfaceLighting([0,0,0],base,[light]);
  const far=surfaceLighting([20,0,0],base,[light]);
  assert.ok(near[0]>near[1]);
  assert.ok(near[0]>far[0]);
  assert.deepEqual(surfaceLighting([0,0,0],base,[{...light,colour:[0,0,0]}]),base.map((value)=>value*.7));
  assert.deepEqual(base,[.2,.2,.2]);
});
import { sceneData } from "../src/light-lab/renderer.js";
test("studio furniture produces finite interleaved triangle geometry",()=>{
  const data=sceneData([.5,.1,.7],[]);
  assert.ok(data instanceof Float32Array);
  assert.ok(data.length>1000);
  assert.equal(data.length%18,0);
  assert.ok(data.every(Number.isFinite));
});
import { beamVolume } from "../src/light-lab/renderer.js";
test("builds a closed three-dimensional beam with a floor footprint",()=>{
  const data=beamVolume({x:1,y:3,z:0,spread:1,colour:[1,.5,0]});
  assert.equal(data.length,16*6*6);
  assert.ok(data.every(Number.isFinite));
  const positions=Array.from({length:data.length/6},(_,index)=>data.slice(index*6,index*6+3));
  assert.ok(positions.some((point)=>point[0]===0));
  assert.ok(positions.some((point)=>point[0]===2));
  assert.ok(positions.some((point)=>point[1]===.03));
  assert.ok(positions.some((point)=>point[1]>2));
});
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
test("RGBW preview mixes white with RGB and respects blackout", () => {
  const fixture={properties:{red:255,green:0,blue:0,white:255,dimmer:255}};
  assert.deepEqual(virtualFixtureVisuals([fixture])[0].colour,[1,1,1]);
  fixture.properties.dimmer=0;
  assert.deepEqual(virtualFixtureVisuals([fixture])[0].colour,[0,0,0]);
});
