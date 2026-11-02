import test from "node:test";
import assert from "node:assert/strict";
import { createLuxServicePanel } from "../src/ui/lux-service.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
import { translate } from "../src/i18n.js";

// Event-surface double: exercises handlers, not browser layout or native validation.
function surface() {
  let html="",nodes=new Map(),reviews=[];
  return {
    closest:()=>null,
    get innerHTML(){return html;},
    set innerHTML(value){
      html=value;nodes=new Map();
      nodes.set("[data-lux-settings]",{elements:{endpoint:{value:""},token:{value:""}}});
      nodes.set("[data-lux-disconnect]",{});
      const question={value:""};nodes.set('[name="question"]',question);
      nodes.set("[data-lux-request]",{elements:{question,consent:{checked:false}}});
      nodes.set("[data-lux-result]",{textContent:""});
      reviews=[...value.matchAll(/data-lux-review="(\d+)"/g)].map(match=>({dataset:{luxReview:match[1]}}));
    },
    querySelector(selector){return nodes.get(selector);},
    querySelectorAll(){return reviews;}
  };
}
function submit(form){return form.onsubmit({currentTarget:form,preventDefault(){}});}
function configure(host){const form=host.querySelector("[data-lux-settings]");form.elements.endpoint.value="https://example.test/api/lux";form.elements.token.value="test-only-service-token-32-characters-long";submit(form);}
function ask(host,consent){const form=host.querySelector("[data-lux-request]");form.elements.question.value="Light my scene";form.elements.consent.checked=consent;return submit(form);}

test("panel consent controls transport and mutation suggestions require review without automatic execution",async()=>{
  const host=surface(),project=createStudioMoodProject(),before=JSON.stringify(project);let requests=0,preview;
  const panel=createLuxServicePanel({getProject:()=>project,getLocale:()=>"en",translate,onPreview:value=>{preview=value;},onError:assert.fail,findContainer:()=>host,fetchImpl:async()=>{
    requests++;return {ok:true,text:async()=>JSON.stringify({requestId:"r1",answer:'<img src=x onerror="alert(1)">',calls:[{type:"adigunlightdesign.tool-call",version:1,name:"apply_palette_to_lights",payload:{paletteId:project.palettes[0].id}}]})};
  }});
  panel.mount(host);configure(host);
  await ask(host,false);assert.equal(requests,0);
  await ask(host,true);assert.equal(requests,1);assert.equal(JSON.stringify(project),before);assert.equal(preview,undefined);
  assert.ok(host.innerHTML.includes("&lt;img"));assert.ok(!host.innerHTML.includes('<img src=x'));
  assert.ok(!host.innerHTML.includes("test-only-service-token"));
  assert.equal(host.querySelector("[data-lux-request]").elements.consent.checked,false);
  host.querySelectorAll()[0].onclick();assert.equal(preview.requiresConfirmation,true);assert.equal(JSON.stringify(project),before);
});
test("disconnect discards an outstanding response and leaves the panel offline",async()=>{
  const host=surface(),project=createStudioMoodProject();let finish;
  const panel=createLuxServicePanel({getProject:()=>project,getLocale:()=>"de",translate,onPreview:assert.fail,onError:assert.fail,findContainer:()=>host,fetchImpl:()=>new Promise(resolve=>{finish=()=>resolve({ok:true,text:async()=>JSON.stringify({requestId:"r",answer:"Discard this answer",calls:[]})});})});
  panel.mount(host);configure(host);const pending=ask(host,true);
  host.querySelector("[data-lux-disconnect]").onclick();finish();await pending;
  assert.ok(host.innerHTML.includes(translate("de","luxServiceDisconnected")));
  assert.ok(!host.innerHTML.includes("Discard this answer"));
});
