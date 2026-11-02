import test from "node:test";
import assert from "node:assert/strict";
test("rejects malformed scene data before rendering", () => {
  const project=createProject();
  const scene={id:"s",name:"Studio",materialColor:"#C21888"};
  project.scenes=[scene];
  assert.equal(validateProject(project).valid,true);
  for (const invalid of [null,{...scene,name:42},{...scene,materialColor:"red"},{...scene,materialColor:null}]) {
    project.scenes=[invalid];
    assert.equal(validateProject(project).valid,false);
  }
  project.scenes=[scene,{...scene}];
  assert.equal(validateProject(project).valid,false);
});
import { createFixture } from "../src/dmx/engine.js";
test("rejects unsupported fixture mappings and malformed transform data", () => {
  const project=createProject(),fixture=createFixture();
  for (const bad of [{...fixture,profileId:"unknown"},{...fixture,modeId:"unknown"},{...fixture,transform:{x:'\" onfocus=\"alert(1)'}},{...fixture,transform:{y:Infinity}},{...fixture,patchAssignment:{fixtureId:fixture.id,universe:1,startAddress:1,channelFootprint:1}}]) {
    project.fixtures=[bad];
    assert.equal(validateProject(project).valid,false);
  }
});
test("rejects imported overlaps while allowing identical addresses in different universes", () => {
  const project=createProject(),a=createFixture(),b=createFixture(2);
  a.patchAssignment={fixtureId:a.id,universe:1,startAddress:1,channelFootprint:6};
  b.patchAssignment={fixtureId:b.id,universe:1,startAddress:6,channelFootprint:6};
  project.fixtures=[a,b];
  assert.equal(validateProject(project).valid,false);
  b.patchAssignment.startAddress=7;
  assert.equal(validateProject(project).valid,true);
  b.patchAssignment.startAddress=1;
  b.patchAssignment.universe=2;
  assert.equal(validateProject(project).valid,true);
  b.patchAssignment.fixtureId=a.id;
  assert.equal(validateProject(project).valid,false);
});
test("rejects malformed imported fixtures and out-of-range patches", () => {
  const project=createProject(),fixture=createFixture();
  project.fixtures=[fixture];
  assert.equal(validateProject(project).valid,true);
  for (const bad of [null,{...fixture,properties:null},{...fixture,properties:{dimmer:256}},{...fixture,patchAssignment:{universe:1,startAddress:510,channelFootprint:6}}]) {
    project.fixtures=[bad];
    assert.equal(validateProject(project).valid,false);
  }
});
import { createCue } from "../src/timeline/engine.js";

test("validates imported cue timing and captured channel values", () => {
  const project=createProject();
  const fixture=createFixture();fixture.id="f";
  project.fixtures=[fixture];
  const cue=createCue(project.fixtures);
  project.cues=[cue];
  assert.equal(validateProject(project).valid,true);
  for (const bad of [null,{...cue,targets:null},{...cue,duration:0},{...cue,targets:[{fixtureId:"f",properties:{dimmer:999}}]}]) {
    project.cues=[bad];
    assert.equal(validateProject(project).valid,false);
  }
});
import { createProject, validateProject, CURRENT_SCHEMA_VERSION } from "../src/domain/project.js";

test("creates a versioned project document", () => {
  const project = createProject({ id: "project-1", name: "Studio Mood" });
  assert.equal(project.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(project.name, "Studio Mood");
  assert.deepEqual(validateProject(project), { valid: true, errors: [] });
});

test("rejects an incomplete imported project", () => {
  const result = validateProject({ schemaVersion: CURRENT_SCHEMA_VERSION, id: "x", name: "" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 1);
});

test("rejects malformed nested palette data and duplicate swatch ids", () => {
  const project=createProject();
  for (const palette of [null,{id:"p",name:"P",colors:[]},{id:"p",name:"P",colors:[{id:"x",name:"X",hex:"red",locked:false}]}]) {
    project.palettes=[palette];
    assert.equal(validateProject(project).valid,false);
  }
  const swatch={id:"x",name:"X",hex:"#2196F3",locked:false};
  project.palettes=[{id:"p",name:"P",colors:[swatch]}];
  assert.equal(validateProject(project).valid,true);
  project.palettes[0].colors.push({...swatch});
  assert.equal(validateProject(project).valid,false);
});
