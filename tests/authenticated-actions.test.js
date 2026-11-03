import test from "node:test";
import assert from "node:assert/strict";
import {previewUnpatchedFixture,confirmAuthenticatedAction} from "../src/ai/authenticated-actions.js";
import {createStudioMoodProject} from "../src/domain/studio-mood.js";
import {undoTransaction} from "../src/domain/history.js";
import {createFixture,patchFixture} from "../src/dmx/engine.js";
const owner={id:"registered-test-owner",is_anonymous:false};
const account=()=>({user:owner,requireUser:async()=>owner});
function setup(){const project=createStudioMoodProject();project.fixtures[2].patchAssignment=null;return {state:{project,undoStack:[],redoStack:[]},suggestion:{action:"review-patch",fixtureId:project.fixtures[2].id}};}
test("verified live patch preview changes nothing until confirmation, commits in memory and supports undo",async()=>{
  const f=setup(),auth=account(),before=JSON.stringify(f.state);
  const proposal=await previewUnpatchedFixture({getProject:()=>f.state.project,suggestion:f.suggestion,account:auth});
  assert.equal(JSON.stringify(f.state),before);assert.equal(proposal.changes[0].after.patchAssignment.startAddress,21);
  await assert.rejects(confirmAuthenticatedAction({getState:()=>f.state,proposal,account:auth}),/liveConfirmationRequired/);
  const result=await confirmAuthenticatedAction({getState:()=>f.state,proposal,account:auth,confirmed:true});
  assert.equal(result.project.fixtures[2].patchAssignment.startAddress,21);assert.equal(result.receipt.persisted,false);assert.equal(result.receipt.physicalOutput,false);assert.equal(JSON.stringify(f.state),before);
  assert.deepEqual(undoTransaction(result).project,f.state.project);
  await assert.rejects(confirmAuthenticatedAction({getState:()=>f.state,proposal,account:auth,confirmed:true}),/already applied/);
});
test("failed login canceled previews and changed accounts cannot apply a suggestion",async()=>{
  const f=setup(),auth=account(),before=JSON.stringify(f.state);
  await assert.rejects(previewUnpatchedFixture({getProject:()=>f.state.project,suggestion:f.suggestion,account:{user:null,requireUser:async()=>{throw new Error("authRequired");}}}),/authRequired/);
  const proposal=await previewUnpatchedFixture({getProject:()=>f.state.project,suggestion:f.suggestion,account:auth});
  await assert.rejects(confirmAuthenticatedAction({getState:()=>f.state,proposal,account:auth,confirmed:true,isCurrent:()=>false}),/liveProposalExpired/);
  const other={id:"other-owner",is_anonymous:false};await assert.rejects(confirmAuthenticatedAction({getState:()=>f.state,proposal,account:{user:other,requireUser:async()=>other},confirmed:true}),/liveProposalOwnerChanged/);
  assert.equal(JSON.stringify(f.state),before);
});
test("project edits while authentication is pending reject stale patch previews",async()=>{
  const f=setup();let finish;const auth={user:owner,requireUser:()=>new Promise(resolve=>{finish=resolve;})};
  const pending=previewUnpatchedFixture({getProject:()=>f.state.project,suggestion:f.suggestion,account:auth});f.state.project.name="Edited during verification";finish(owner);
  await assert.rejects(pending,/liveProposalExpired/);assert.equal(f.state.project.fixtures[2].patchAssignment,null);
});
test("the patch offer rejects occupied universes, already patched fixtures and unsupported fixes",async()=>{
  const f=setup(),auth=account();
  await assert.rejects(previewUnpatchedFixture({getProject:()=>f.state.project,suggestion:{action:"unknown"},account:auth}),/liveUnsupportedSuggestion/);
  await assert.rejects(previewUnpatchedFixture({getProject:()=>f.state.project,suggestion:{action:"review-patch",fixtureId:f.state.project.fixtures[0].id},account:auth}),/liveProposalExpired/);
  let fixtures=Array.from({length:128},(_,index)=>createFixture(index+1,"generic-led-strip-rgb"));
  for(let index=0;index<fixtures.length;index++)fixtures=patchFixture(fixtures,fixtures[index].id,1,index*4+1);
  const candidate=createFixture(129,"generic-led-strip-rgb");f.state.project.fixtures=[...fixtures,candidate];const before=JSON.stringify(f.state);
  await assert.rejects(previewUnpatchedFixture({getProject:()=>f.state.project,suggestion:{action:"review-patch",fixtureId:candidate.id},account:auth}),/livePatchUnavailable/);assert.equal(JSON.stringify(f.state),before);
});
