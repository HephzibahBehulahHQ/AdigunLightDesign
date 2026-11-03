import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createLuxHttpServer } from "../server/http-host.js";
import { createLuxEndpoint,bearerAuthenticator } from "../server/lux-endpoint.js";

test("HTTP host serves authenticated consented API requests and never exposes application/server files",async(t)=>{
  const token="test-only-service-token-32-characters-long";let requests=0;
  const handle=createLuxEndpoint({authenticate:bearerAuthenticator(token),allowedOrigins:["http://localhost"],suggest:async()=>{requests++;return {answer:"Mock provider suggestion",calls:[]};}});
  const server=createLuxHttpServer({handle});server.listen(0,"127.0.0.1");await once(server,"listening");
  t.after(async()=>{server.closeAllConnections();await new Promise((resolve)=>server.close(resolve));});
  const base=`http://127.0.0.1:${server.address().port}`,body=JSON.stringify({question:"Hello",locale:"en",context:{},consent:true});
  const denied=await fetch(`${base}/api/lux`,{method:"POST",headers:{"Content-Type":"application/json",Origin:"http://localhost"},body});
  assert.equal(denied.status,401);assert.equal(requests,0);
  const allowed=await fetch(`${base}/api/lux`,{method:"POST",headers:{"Content-Type":"application/json",Origin:"http://localhost",Authorization:`Bearer ${token}`},body});
  assert.equal(allowed.status,200);assert.equal((await allowed.json()).answer,"Mock provider suggestion");assert.equal(requests,1);
  const source=await fetch(`${base}/server/openai-lux.js`);assert.equal(source.status,404);assert.ok(!(await source.text()).includes("OPENAI_API_KEY"));
});

test("HTTP host maps internal handler failures to generic errors",async(t)=>{
  const server=createLuxHttpServer({handle:async()=>{throw new Error("private details");}});server.listen(0,"127.0.0.1");await once(server,"listening");
  t.after(async()=>{server.closeAllConnections();await new Promise((resolve)=>server.close(resolve));});
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/lux`);
  assert.equal(response.status,500);assert.ok(!(await response.text()).includes("private details"));
});
