import test from "node:test";
import assert from "node:assert/strict";
import { createRoomScene,roomAmbience,roomPresetOptions,roomPresets } from "../src/domain/room-presets.js";
import { createProject,validateProject } from "../src/domain/project.js";
import { sceneData } from "../src/light-lab/renderer.js";

test("room templates create distinct valid, localized scene documents",()=>{
  assert.equal(roomPresets.length,10);
  assert.deepEqual(roomPresetOptions("de").map(room=>room.label).slice(0,3),["Wohnzimmer","Bibliothek","Küche"]);
  const project=createProject();
  project.scenes=roomPresets.map(preset=>createRoomScene(preset.id,{id:preset.id}));
  assert.equal(validateProject(project).valid,true);
  assert.equal(new Set(project.scenes.map(scene=>scene.roomType)).size,10);
  assert.equal(new Set(project.scenes.map(scene=>JSON.stringify(scene.room))).size,10);
  assert.equal(new Set(project.scenes.map(scene=>JSON.stringify(scene.ambience))).size,10);
});
test("room templates have separate mutable settings and validate their ambient fill",()=>{
  const first=createRoomScene("kitchen",{id:"first"}),second=createRoomScene("kitchen",{id:"second"});
  first.room.width=20;first.materials.wall="#123456";first.ambience.color="#52B8D8";
  assert.equal(second.room.width,6);assert.notEqual(second.materials.wall,"#123456");
  assert.equal(roomAmbience(second).color,"#FFF0D2");
  const project=createProject();project.scenes=[createRoomScene("library",{id:"library"})];
  for(const ambience of [{color:"red",intensity:.2},{color:"#FFFFFF",intensity:1.1},{color:"#FFFFFF",intensity:NaN}]){
    project.scenes[0].ambience=ambience;
    assert.equal(validateProject(project).valid,false);
  }
  project.scenes[0].roomType="unsupported";
  assert.equal(validateProject(project).valid,false);
  assert.throws(()=>createRoomScene("spaceship",{id:"bad"}),/supported room template/);
});
test("room templates generate distinct 3D structures and ambient fill affects rendered surfaces",()=>{
  const geometries=roomPresets.map(preset=>sceneData([.1,.2,.3],[],{},preset.room,false,preset.materials,"performance",undefined,preset.ambience,preset.id));
  assert.ok(geometries.every(data=>data.length>0&&Array.from(data).every(Number.isFinite)));
  assert.equal(new Set(geometries.map(data=>Array.from(data).join(","))).size,roomPresets.length);
  const preset=roomPresets[0],low=sceneData([0,0,0],[],{},preset.room,false,preset.materials,"performance",undefined,{color:"#FF0000",intensity:0},"living-room"),high=sceneData([0,0,0],[],{},preset.room,false,preset.materials,"performance",undefined,{color:"#FF0000",intensity:1},"living-room");
  assert.notDeepEqual(high,low);
});
