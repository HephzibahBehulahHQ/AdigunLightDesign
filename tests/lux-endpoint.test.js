import test from "node:test";
import assert from "node:assert/strict";
import { createLuxEndpoint,bearerAuthenticator } from "../server/lux-endpoint.js";
const token="test-only-service-token-32-characters-long";
const request=(body={question:"Palette please",locale:"en",context:{},consent:true},headers={})=>new Request("http://localhost/api/lux",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,Origin:"http://localhost",...headers},body:JSON.stringify(body)});
test("endpoint fails closed for missing auth denied origins and absent provider consent",async()=>{
  let calls=0;const suggest=async()=>{calls++;return {answer:"Hello",calls:[]};};
  const denied=createLuxEndpoint({suggest,allowedOrigins:["http://localhost"]});
  assert.equal((await denied(request())).status,401);
  const endpoint=createLuxEndpoint({suggest,authenticate:bearerAuthenticator(token),allowedOrigins:["http://localhost"]});
  assert.equal((await endpoint(request(undefined,{Origin:"http://evil.test"}))).status,403);
  assert.equal((await endpoint(request({question:"Hello",locale:"en",context:{},consent:false}))).status,400);
  assert.equal(calls,0);
});
test("authenticated consented requests return suggestions with metadata-only audit and no-store headers",async()=>{
  const events=[];const endpoint=createLuxEndpoint({suggest:async()=>({answer:"Review first",calls:[]}),authenticate:bearerAuthenticator(token),allowedOrigins:["http://localhost"],audit:async(event)=>events.push(event)});
  const result=await endpoint(request()),body=await result.json();
  assert.equal(result.status,200);assert.equal(body.answer,"Review first");assert.ok(body.requestId);
  assert.equal(result.headers.get("cache-control"),"no-store");assert.equal(result.headers.get("access-control-allow-origin"),"http://localhost");
  assert.equal(events.length,1);assert.ok(!Object.hasOwn(events[0],"context"));assert.ok(!Object.hasOwn(events[0],"question"));
});
test("rate limits reset and oversized requests never reach the provider",async()=>{
  let time=0,calls=0;const endpoint=createLuxEndpoint({suggest:async()=>{calls++;return {answer:"OK",calls:[]};},authenticate:bearerAuthenticator(token),allowedOrigins:["http://localhost"],requestsPerMinute:1,now:()=>time});
  assert.equal((await endpoint(request())).status,200);assert.equal((await endpoint(request())).status,429);
  time=60000;assert.equal((await endpoint(request({question:"Hello",locale:"en",context:{text:"x".repeat(66000)},consent:true}))).status,413);
  assert.equal(calls,1);
});
test("provider failures and invalid actions return generic errors without credential details",async()=>{
  const endpoint=createLuxEndpoint({suggest:async()=>{throw new Error(token);},authenticate:bearerAuthenticator(token),allowedOrigins:["http://localhost"]});
  const result=await endpoint(request());assert.equal(result.status,502);assert.ok(!(await result.text()).includes(token));
  assert.throws(()=>bearerAuthenticator("short"));
  const invalid=createLuxEndpoint({suggest:async()=>({answer:"No",calls:[{type:"adigunlightdesign.tool-call",version:1,name:"constructor",payload:{}}]}),authenticate:bearerAuthenticator(token),allowedOrigins:["http://localhost"]});
  assert.equal((await invalid(request())).status,502);
  assert.equal((await endpoint(request(undefined,{"Content-Type":"application/jsonevil"}))).status,415);
});
