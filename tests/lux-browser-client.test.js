import test from "node:test";
import assert from "node:assert/strict";
import { createLuxBrowserClient,luxEndpointUrl } from "../src/ai/browser-client.js";
import { buildLuxProjectContext } from "../src/ai/project-context.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
const token="test-only-service-token-32-characters-long";
test("browser client requires consent and protects transport credentials from redirects/ambient cookies",async()=>{
  let requests=0,options;const client=createLuxBrowserClient({endpoint:"https://example.test/api/lux",accessToken:token,fetchImpl:async(url,request)=>{requests++;options=request;return {ok:true,text:async()=>JSON.stringify({requestId:"test-request",answer:"Review this.",calls:[]})};}});
  const input={question:"Palette please",locale:"en",context:{}};
  await assert.rejects(client.suggest(input),/consent/);assert.equal(requests,0);
  const result=await client.suggest({...input,consent:true});assert.equal(result.answer,"Review this.");
  assert.equal(options.redirect,"error");assert.equal(options.credentials,"omit");assert.equal(JSON.parse(options.body).consent,true);
});
test("browser client rejects insecure destinations and unsupported model suggestions",async()=>{
  assert.equal(luxEndpointUrl("http://127.0.0.1:8787/api/lux"),"http://127.0.0.1:8787/api/lux");
  for(const url of ["http://example.test/api/lux","https://user:pass@example.test/api/lux","https://example.test/other","https://example.test/api/lux?key=secret"])assert.throws(()=>luxEndpointUrl(url));
  const client=createLuxBrowserClient({endpoint:"https://example.test/api/lux",accessToken:token,fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({requestId:"test",answer:"No",calls:[{type:"adigunlightdesign.tool-call",version:1,name:"constructor",payload:{}}]})})});
  await assert.rejects(client.suggest({question:"Hello",locale:"en",context:{},consent:true}),/unsupported/);
});
test("project context is bounded and excludes image bytes history and private description",()=>{
  const project=createStudioMoodProject();project.description="private-description-marker";project.history.push({private:"private-history-marker"});project.assets.push({pixels:"private-image-marker"});
  project.scenes[0].room={width:10,height:4,depth:8};
  const before=JSON.stringify(project),context=buildLuxProjectContext(project),json=JSON.stringify(context);
  assert.ok(!json.includes("private-description-marker"));assert.ok(!json.includes("private-history-marker"));assert.ok(!json.includes("private-image-marker"));
  assert.equal(context.totals.fixtures,9);assert.equal(context.fixtures[0].id,project.fixtures[0].id);
  context.fixtures[0].properties.red=99;context.scenes[0].room.width=20;assert.equal(JSON.stringify(project),before);
});
