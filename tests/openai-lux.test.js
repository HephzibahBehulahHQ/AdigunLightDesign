import test from "node:test";
import assert from "node:assert/strict";
import { createOpenAiLuxAdapter } from "../server/openai-lux.js";
const response=(suggestion)=>({ok:true,async text(){return JSON.stringify({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(suggestion)}]}]});}});
test("provider adapter sends configured server credentials and validated structured suggestions only",async()=>{
  let request;
  const suggest=createOpenAiLuxAdapter({apiKey:"test-only-key",model:"configured-test-model",fetchImpl:async(url,options)=>{request={url,...options};return response({answer:"Review this palette.",calls:[{name:"generate_harmony",payloadJson:JSON.stringify({seed:"#2196F3",type:"triadic"})}]});}});
  const result=await suggest({question:"Create a palette",context:{projectName:"Untrusted name"},locale:"en"}),body=JSON.parse(request.body);
  assert.equal(request.url,"https://api.openai.com/v1/responses");assert.equal(request.headers.Authorization,"Bearer test-only-key");
  assert.equal(body.store,false);assert.equal(body.model,"configured-test-model");assert.equal(body.text.format.strict,true);
  assert.equal(result.calls[0].payload.type,"triadic");assert.equal(result.calls[0].version,1);
  assert.ok(request.signal instanceof AbortSignal);
});
test("provider configuration and requests reject before any transport call",async()=>{
  assert.throws(()=>createOpenAiLuxAdapter({apiKey:"",model:"test"}),/configuration/);
  let requests=0;const suggest=createOpenAiLuxAdapter({apiKey:"test",model:"test",fetchImpl:async()=>{requests++;return response({answer:"",calls:[]});}});
  await assert.rejects(suggest({question:""}));await assert.rejects(suggest({question:"Hello",context:{text:"x".repeat(50001)}}));
  assert.equal(requests,0);
});
test("provider errors refusals incomplete results and unknown actions never become executable suggestions",async()=>{
  for(const providerResponse of [
    {ok:false},
    {ok:true,text:async()=>JSON.stringify({status:"incomplete",output:[]})},
    {ok:true,text:async()=>JSON.stringify({status:"completed",output:[{type:"message",content:[{type:"refusal"}]}]})},
    response({answer:"No",calls:[{name:"constructor",payloadJson:"{}"}]}),
    response({answer:"No",calls:[{name:"create_scene",payloadJson:"not-json"}]})
  ]) {
    const suggest=createOpenAiLuxAdapter({apiKey:"test",model:"test",fetchImpl:async()=>providerResponse});
    await assert.rejects(suggest({question:"Hello"}));
  }
});
