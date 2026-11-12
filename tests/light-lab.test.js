import test from "node:test";
import assert from "node:assert/strict";
import { studioPlant, studioSeatCushion } from "../src/light-lab/renderer.js";
test("studio plants have deterministic finite leaves and pots at the requested position",()=>{
  const data=studioPlant(2,1,2.4);
  assert.equal(data.length%18,0);
  assert.ok(data.every(Number.isFinite));
  assert.deepEqual(studioPlant(2,1,2.4),data);
  const vein=[107/255,155/255,94/255];
  assert.ok(Array.from({length:data.length/6},(_,index)=>data.slice(index*6+3,index*6+6))
    .some((colour)=>colour.every((value,channel)=>Math.abs(value-vein[channel])<1e-7)));
  const positions=Array.from({length:data.length/6},(_,index)=>data.slice(index*6,index*6+3));
  assert.ok(positions.every(([x,y,z])=>x>1 && x<3 && y>=0 && y<3 && z>0 && z<2));
});
test("studio seat cushions have a soft crowned top and closed finite geometry",()=>{
  const cushion=studioSeatCushion(-1.55,.97,1.32,.95,.72,.12,[.6,.3,.2]);
  const positions=Array.from({length:cushion.length/6},(_,index)=>cushion.slice(index*6,index*6+3));
  assert.equal(cushion.length%18,0);
  assert.ok(cushion.every(Number.isFinite));
  assert.ok(Math.max(...positions.map(([,y])=>y))>1.11);
  assert.ok(positions.some(([x,y,z])=>x===-1.55 && z===1.32 && Math.abs(y-1.09)<1e-7));
  assert.deepEqual(studioSeatCushion(-1.55,.97,1.32,.95,.72,.12,[.6,.3,.2]),cushion);
  assert.throws(()=>studioSeatCushion(0,0,0,0,1,1,[1,1,1]),/Invalid studio cushion geometry/);
});
test("selected fixture adds viewport outline geometry without changing scene input",()=>{
  const fixture={transform:{x:0,y:3,z:0},properties:{dimmer:0}};
  const normal=sceneData([.2,.3,.4],[fixture]);
  const selected=sceneData([.2,.3,.4],[{...fixture,selected:true}]);
  assert.ok(selected.length>normal.length);
  assert.equal(fixture.selected,undefined);
});
import { studioFloorShade } from "../src/light-lab/renderer.js";
test("soft studio contact shadows add depth under props and disappear with the props layer",()=>{
  const plantBase=studioFloorShade(-3.65,1.8),clearFloor=studioFloorShade(0,-4);
  assert.ok(plantBase<clearFloor);
  assert.ok(plantBase>=.72 && plantBase<1);
  assert.equal(studioFloorShade(-3.65,1.8,false),1);
  assert.ok([plantBase,clearFloor].every(Number.isFinite));
});
test("studio sofa cushions include visible piping and omit it with the props layer",()=>{
  const scene=sceneData([.2,.3,.4],[]),hidden=sceneData([.2,.3,.4],[],{props:false});
  const thread=[156/255*.78*.7,79/255*.78*.7,72/255*.78*.7];
  const pipingVertices=Array.from({length:scene.length/6},(_,index)=>scene.slice(index*6,index*6+6))
    .filter((vertex)=>Math.abs(vertex[1]-1.091)<1e-6 && vertex.slice(3).every((value,channel)=>Math.abs(value-thread[channel])<1e-7));
  assert.equal(pipingVertices.length,72);
  assert.ok(pipingVertices.every(([x,,z])=>x>-1.51 && x<1.51 && z>1.36 && z<2.04));
  assert.ok(!hidden.some((value,index)=>index%6===1 && Math.abs(value-1.091)<1e-6));
});
import { surfaceGrid } from "../src/light-lab/renderer.js";
test("surface grid includes interior vertices for localized illumination",()=>{
  const data=surfaceGrid([0,0,0],[2,0,0],[0,0,2],[.2,.3,.4],2,2);
  assert.equal(data.length,4*6*6);
  const positions=Array.from({length:data.length/6},(_,index)=>data.slice(index*6,index*6+3));
  assert.ok(positions.some((point)=>point[0]===1 && point[2]===1));
  assert.ok(data.every(Number.isFinite));
});
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
test("surface spill respects two-sided face orientation",()=>{
  const base=[.2,.2,.2],light={x:0,y:3,z:0,colour:[1,0,0]};
  const upward=surfaceLighting([0,0,0],base,[light],[0,1,0]);
  const sideFacing=surfaceLighting([0,0,0],base,[light],[1,0,0]);
  assert.ok(upward[0]>sideFacing[0]);
  assert.deepEqual(sideFacing,base.map((value)=>value*.7));
  assert.deepEqual(surfaceLighting([0,0,0],base,[],[0,1,0]),base.map((value)=>value*.7));
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
  assert.ok(data[3]>data[9],"beam fades from source to footprint edge");
  assert.ok(data[21]>data[27],"footprint fades from center to rim");
  assert.deepEqual(data.slice(15,18),data.slice(45,48),"adjacent triangles share the rim colour");
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
test("decorative lamp spill stays local and warm",()=>{
  const lamp={x:0,y:1,z:0,colour:[.85,.46,.16],range:.85};
  const base=[.2,.2,.2];
  const nearby=surfaceLighting([0,.9,0],base,[lamp]);
  assert.ok(nearby[0]>nearby[1] && nearby[1]>nearby[2]);
  assert.deepEqual(surfaceLighting([0,0,0],base,[lamp]),surfaceLighting([0,0,0],base,[]));
});

