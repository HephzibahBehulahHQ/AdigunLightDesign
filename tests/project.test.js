import test from "node:test";
import assert from "node:assert/strict";
import { createCue } from "../src/timeline/engine.js";

test("validates imported cue timing and captured channel values", () => {
  const project=createProject();
  const cue=createCue([{id:"f",properties:{dimmer:72}}]);
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
