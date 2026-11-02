import test from "node:test";
import assert from "node:assert/strict";
import {createLiveCopilotPanel} from "../src/ui/live-copilot-panel.js";
import {createCanvasStateFeed} from "../src/ai/live-copilot.js";
import {createStudioMoodProject} from "../src/domain/studio-mood.js";
import {translate} from "../src/i18n.js";
function harness(){
  const listeners=new Map(),feed=createCanvasStateFeed();let time=0,tick,cancelled=false,html="",nodes;
  const documentRef={hidden:false,activeElement:null,addEventListener:(name,handler)=>listeners.set(name,handler),removeEventListener:name=>listeners.delete(name)};
  const host={isConnected:true,get innerHTML(){return html;},set innerHTML(value){html=value;nodes=new Map([["[data-live-enabled]",{}],["[data-live-goal]",{elements:{goal:{value:""}}}]]);for(const id of ["dismiss","more"])if(value.includes(`data-live-${id}`))nodes.set(`[data-live-${id}]`,{});},insertAdjacentHTML:(position,value)=>{html+=value;},querySelector:key=>nodes.get(key)};
  const panel=createLiveCopilotPanel({feed,getLocale:()=>"en",translate,documentRef,now:()=>time,schedule:callback=>{tick=callback;return 0;},cancel:handle=>{assert.equal(handle,0);cancelled=true;}});
  panel.mount(host);
  return {panel,feed,host,documentRef,listeners,advance:value=>{time=value;tick();},get cancelled(){return cancelled;}};
}
test("panel suppresses offers during drag typing focus hidden pages and off state",()=>{
  const h=harness(),project=createStudioMoodProject();h.feed.publish(project);
  h.listeners.get("pointerdown")();h.advance(1000);assert.ok(!h.host.innerHTML.includes("live-suggestion"));
  h.listeners.get("pointercancel")();h.listeners.get("input")();h.advance(2000);assert.ok(!h.host.innerHTML.includes("live-suggestion"));
  h.documentRef.activeElement={matches:()=>true};h.advance(3000);assert.ok(!h.host.innerHTML.includes("live-suggestion"));
  h.documentRef.activeElement=null;h.documentRef.hidden=true;h.advance(4000);assert.ok(!h.host.innerHTML.includes("live-suggestion"));
  h.documentRef.hidden=false;h.advance(5000);assert.ok(h.host.innerHTML.includes("live-suggestion"));
  h.host.querySelector("[data-live-dismiss]").onclick();h.advance(31000);assert.ok(!h.host.innerHTML.includes("live-suggestion"));
  h.host.querySelector("[data-live-enabled]").onchange({target:{checked:false}});h.advance(200000);assert.ok(!h.host.innerHTML.includes("live-suggestion"));
  h.panel.dispose();assert.equal(h.cancelled,true);assert.equal(h.listeners.size,0);
});
test("selection explanations update from the live feed and escape project names",()=>{
  const h=harness(),project=createStudioMoodProject(),fixture=project.fixtures[0];fixture.name='<img src=x onerror="bad">';
  h.feed.publish(project,{selection:{kind:"fixture",id:fixture.id}});
  assert.ok(h.host.innerHTML.includes("live-selection"));assert.ok(h.host.innerHTML.includes("&lt;img"));assert.ok(!h.host.innerHTML.includes("<img"));
  h.feed.publish(project,{selection:{kind:"fixture",id:"deleted"}});assert.ok(!h.host.innerHTML.includes("live-selection"));h.panel.dispose();
});
test("project switching clears the session goal and offers never change or save project data",()=>{
  const h=harness(),project=createStudioMoodProject();h.feed.publish(project);
  const form=h.host.querySelector("[data-live-goal]");form.elements.goal.value="Warm portrait";form.onsubmit({preventDefault(){},currentTarget:form});
  h.advance(1000);assert.ok(!h.host.innerHTML.includes("live-suggestion"));
  const other=createStudioMoodProject();other.fixtures[0].patchAssignment=null;const before=JSON.stringify(other);
  h.feed.publish(other);assert.ok(!h.host.innerHTML.includes("Warm portrait"));h.advance(2000);
  assert.ok(h.host.innerHTML.includes("live-suggestion"));assert.ok(h.host.innerHTML.includes("button disabled"));
  h.host.querySelector("[data-live-more]").onclick();assert.ok(h.host.innerHTML.includes(translate("en","liveUnpatchedExplanation")));
  assert.equal(JSON.stringify(other),before);h.panel.dispose();
});
