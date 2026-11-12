import test from "node:test";
import assert from "node:assert/strict";
import { saveFixtureGroup,groupFixtures } from "../src/domain/fixture-groups.ts";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { validateProject } from "../src/domain/project.js";
import { createCue,evaluateCue } from "../src/timeline/engine.js";
import { commitTransaction,undoTransaction } from "../src/domain/history.js";
test("groups validate members and preserve the original group list",()=>{
  const fixtures=[{id:"a"},{id:"b"}],groups=[];
  const result=saveFixtureGroup(groups,fixtures,{id:"g",name:" Key ",fixtureIds:["a"]});
  assert.equal(groups.length,0);assert.equal(result[0].name,"Key");
  assert.deepEqual(groupFixtures(fixtures,result,"g"),[fixtures[0]]);
  assert.throws(()=>saveFixtureGroup([],fixtures,{name:"X",fixtureIds:["missing"]}));
  assert.throws(()=>saveFixtureGroup([],fixtures,{name:"X",fixtureIds:["a","a"]}));
  assert.throws(()=>saveFixtureGroup([],fixtures,{name:"",fixtureIds:[]}));
});
test("group-scoped cue capture leaves other fixtures untouched and round-trips natively",()=>{
  const project=createStudioMoodProject(),id=project.fixtures[0].id;
  project.fixtureGroups=saveFixtureGroup([],project.fixtures,{id:"g",name:"Key",fixtureIds:[id]});
  const cue=createCue(groupFixtures(project.fixtures,project.fixtureGroups,"g"));
  assert.equal(cue.targets.length,1);
  cue.targets[0].properties.dimmer=0;
  const frame=evaluateCue(project.fixtures,cue,5);
  assert.equal(frame[0].properties.dimmer,0);
  assert.deepEqual(frame[1],project.fixtures[1]);
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).valid,true);
  project.fixtureGroups[0].fixtureIds.push("missing");
  assert.equal(validateProject(project).valid,false);
  delete project.fixtureGroups;
  assert.equal(validateProject(project).valid,true);
});
test("editing group membership preserves captured cues and is undoable",()=>{
  const project=createStudioMoodProject();
  project.fixtureGroups=saveFixtureGroup([],project.fixtures,{id:"g",name:"Key",fixtureIds:[project.fixtures[0].id]});
  project.cues=[createCue(groupFixtures(project.fixtures,project.fixtureGroups,"g"))];
  const state=commitTransaction({project,undoStack:[],redoStack:[]},"fixture-group-save",(draft)=>{
    draft.fixtureGroups=saveFixtureGroup(draft.fixtureGroups,draft.fixtures,{id:"g",name:"Fill",fixtureIds:[draft.fixtures[1].id]});
  });
  assert.equal(state.project.fixtureGroups.length,1);
  assert.equal(state.project.fixtureGroups[0].name,"Fill");
  assert.deepEqual(state.project.cues,project.cues);
  assert.deepEqual(undoTransaction(state).project.fixtureGroups,project.fixtureGroups);
});

