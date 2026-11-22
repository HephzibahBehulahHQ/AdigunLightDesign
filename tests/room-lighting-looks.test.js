import test from "node:test";
import assert from "node:assert/strict";
import {createFixture} from "../src/dmx/engine.js";
import {createRoomScene,roomPresets} from "../src/domain/room-presets.js";
import {createProject,validateProject} from "../src/domain/project.js";
import {applyRoomLightingLook,createRoomStarterLighting,isRoomLightingLookIndex,roomLightingLooks} from "../src/domain/room-lighting-looks.js";

test("one hundred lighting looks provide distinct paint, ambience and fixture channel states",()=>{
  assert.equal(roomLightingLooks.length,100);
  assert.equal(new Set(roomLightingLooks.map(look=>look.id)).size,100);
  assert.equal(new Set(roomLightingLooks.map(look=>JSON.stringify([look.materials,look.materialColor,look.ambience,look.rgb,look.dimmer]))).size,100);
  assert.ok(roomLightingLooks.every((look,index)=>isRoomLightingLookIndex(index)&&look.rgb.length===3&&look.rgb.every(value=>Number.isInteger(value)&&value>=0&&value<=255)));
  assert.equal(isRoomLightingLookIndex(-1),false);assert.equal(isRoomLightingLookIndex(100),false);assert.equal(isRoomLightingLookIndex(2.5),false);
});

test("a room look scales the RGB channels when the fixture mode has no dimmer", () => {
  const scene=createRoomScene("kitchen",{id:"kitchen"});
  const fixture={...createFixture(1,"eurolite-led-par-56-tcl","3ch"),sceneId:scene.id};
  fixture.properties.dimmer=255;
  const {fixtures:[updated]}=applyRoomLightingLook(scene,[fixture],0);
  assert.deepEqual(updated.properties,{red:220,green:143,blue:79});
  assert.equal(fixture.properties.dimmer,255,"the source fixture remains available for Undo");
});

test("saved scene look metadata is validated while older scenes without it remain compatible",()=>{
  const project=createProject(),scene=createRoomScene("kitchen",{id:"kitchen"});
  project.scenes=[scene];assert.equal(validateProject(project).valid,true);
  scene.lightingLookIndex=19;scene.lightingLookCustomized=true;assert.equal(validateProject(project).valid,true);
  scene.lightingLookIndex=100;assert.equal(validateProject(project).valid,false);
  scene.lightingLookIndex=0;scene.lightingLookCustomized="yes";assert.equal(validateProject(project).valid,false);
});

test("new room scenes get a patched, room-bounded automatic wash and wall-strip rig",()=>{
  const project=createProject();
  project.scenes=roomPresets.map(preset=>createRoomScene(preset.id,{id:preset.id}));
  for(const scene of project.scenes){
    const before=project.fixtures.length,seeded=createRoomStarterLighting(scene,project.fixtures,0),{width,height,depth}=scene.room;
    assert.ok(seeded.fixtures.length>before,scene.roomType+" receives virtual fixtures");
    const fixtures=seeded.fixtures.filter(fixture=>fixture.sceneId===scene.id);
    assert.ok(fixtures.some(fixture=>fixture.profileId==="generic-rgb-wash"),scene.roomType+" receives an RGB wash");
    assert.ok(fixtures.some(fixture=>fixture.profileId==="generic-led-strip-rgb"),scene.roomType+" receives a wall strip");
    assert.ok(fixtures.every(fixture=>fixture.patchAssignment),scene.roomType+" fixtures receive available DMX addresses");
    assert.ok(fixtures.every(({transform})=>Math.abs(transform.x)<width/2&&transform.y>0&&transform.y<height&&Math.abs(transform.z)<depth/2),scene.roomType+" fixtures fit its room");
    assert.ok(fixtures.every(({properties})=>properties.dimmer>0&&properties.red===255&&properties.green===166&&properties.blue===91));
    Object.assign(project,{fixtures:seeded.fixtures});
  }
  assert.equal(validateProject(project).valid,true,validateProject(project).errors.join(" "));
});

test("cycling a look changes only the selected room and keeps fixture patches intact",()=>{
  const kitchen=createRoomScene("kitchen",{id:"kitchen"}),living=createRoomScene("living-room",{id:"living"});
  const kitchenRig=createRoomStarterLighting(kitchen,[],0),livingRig=createRoomStarterLighting(living,kitchenRig.fixtures,0);
  const otherBefore=structuredClone(livingRig.fixtures.filter(fixture=>fixture.sceneId===living.id));
  const next=applyRoomLightingLook(kitchenRig.scene,livingRig.fixtures,7);
  assert.equal(next.scene.lightingLookIndex,7);assert.equal(next.scene.lightingLookCustomized,false);
  assert.equal(next.scene.materials.wall,roomLightingLooks[7].materials.wall);
  assert.deepEqual(next.fixtures.filter(fixture=>fixture.sceneId===living.id),otherBefore,"other scene fixtures are untouched");
  assert.ok(next.fixtures.filter(fixture=>fixture.sceneId===kitchen.id).every(fixture=>fixture.patchAssignment&&fixture.properties.red===142&&fixture.properties.green===78&&fixture.properties.blue===255));
  const patches=next.fixtures.map(fixture=>[fixture.id,fixture.patchAssignment]);
  assert.deepEqual(next.fixtures.map(fixture=>[fixture.id,fixture.patchAssignment]),patches);
});

test("an older fixtureless scene can receive the selected look and starter rig without mutating source",()=>{
  const scene=createRoomScene("bathroom",{id:"bathroom"}),initial=createRoomStarterLighting(scene,[],0);
  const empty=createRoomScene("toilet",{id:"toilet"});
  const withOtherRoom=initial.fixtures.map(fixture=>({...fixture,sceneId:"bathroom"}));
  const changed=createRoomStarterLighting(empty,withOtherRoom,4);
  assert.equal(scene.lightingLookIndex,undefined);assert.equal(empty.lightingLookIndex,undefined);
  assert.equal(changed.scene.lightingLookIndex,4);
  assert.equal(changed.fixtures.filter(fixture=>fixture.sceneId==="toilet").length,2);
  assert.deepEqual(changed.fixtures.filter(fixture=>fixture.sceneId==="bathroom"),withOtherRoom);
});

test("a new room receives its full starter rig when universe 1 is occupied", () => {
  const otherRoom = Array.from({length:128}, (_, index) => {
    const fixture = createFixture(index + 1, "generic-led-strip-rgb");
    return {...fixture, sceneId:"existing", patchAssignment:{fixtureId:fixture.id, universe:1, startAddress:1 + index * 4, channelFootprint:4}};
  });
  const room = createRoomScene("living-room", {id:"new-room"});
  const result = createRoomStarterLighting(room, otherRoom);
  assert.deepEqual(result.fixtures.slice(0, otherRoom.length), otherRoom);
  assert.deepEqual(result.fixtures.slice(otherRoom.length).map(({sceneId, patchAssignment}) =>
    [sceneId, patchAssignment.universe, patchAssignment.startAddress, patchAssignment.channelFootprint]),
  [["new-room",2,1,6], ["new-room",2,7,6], ["new-room",2,13,6], ["new-room",2,19,4]]);
});

