import test from "node:test";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {createAccount} from "../src/cloud/account.js";
import {createCloudProjectStore} from "../src/cloud/projects.js";
import {createProject} from "../src/domain/project.js";

const id="00000000-0000-4000-8000-000000000001";
const owner="00000000-0000-4000-8000-000000000002";
const key="sb_publishable_test_configuration_only";
const project=createProject({id:"canvas-1",name:"Cloud test"});
const saved={id,title:project.name,revision:1,updated_at:"2026-11-03T00:00:00Z"};

function fixture(replies){
  const requests=[];
  const client=createClient("https://project.example.invalid",key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(url,init)=>{
      requests.push({url:new URL(url),method:init.method,headers:new Headers(init.headers),body:init.body});
      const [body,status=200]=replies.shift();
      return Response.json(body,{status});
    }}
  });
  const projects=createCloudProjectStore({client,withUser:operation=>operation(owner)});
  return {requests,projects};
}

test("cloud actions serialize scoped requests and keep revision conflicts explicit",async()=>{
  const {projects,requests}=fixture([[[saved]],[saved],[[{...saved,revision:2}]],[[]],[{document:project}]]);
  assert.equal((await projects.list())[0].id,id);
  assert.equal((await projects.saveCopy(project)).revision,1);
  assert.equal((await projects.update(id,1,project)).revision,2);
  await assert.rejects(projects.update(id,1,project),/cloudConflict/);
  assert.deepEqual(await projects.open(id),project);
  assert.equal(requests[0].headers.get("accept-profile"),"adigunlightdesign");
  assert.equal(requests[0].url.searchParams.get("owner_id"),`eq.${owner}`);
  assert.equal(requests[0].url.searchParams.get("limit"),"50");
  assert.equal(requests[1].headers.get("content-profile"),"adigunlightdesign");
  assert.deepEqual(JSON.parse(requests[1].body),{owner_id:owner,title:project.name,document:project});
  assert.equal(requests[2].method,"PATCH");
  for(const [column,value] of Object.entries({id,owner_id:owner,revision:1,"document->>id":project.id})){
    assert.equal(requests[2].url.searchParams.get(column),`eq.${value}`);
  }
  assert.equal(requests[4].url.searchParams.get("owner_id"),`eq.${owner}`);
});

test("cloud actions reject invalid documents and explain unexposed schema without leaking provider details",async()=>{
  const {projects,requests}=fixture([[{code:"PGRST106",message:"provider detail"},406],[{document:{schemaVersion:9}}]]);
  assert.throws(()=>projects.saveCopy({...project,schemaVersion:9}),/cloudInvalidProject/);
  assert.equal(requests.length,0);
  await assert.rejects(projects.list(),{message:"cloudSchemaUnavailable"});
  await assert.rejects(projects.open(id),{message:"cloudInvalidProject"});
});

test("account guard blocks guest cloud requests and rejects stale results after sign-out",async()=>{
  let listener,resolveRead,requests=0;
  let identity={id:owner,is_anonymous:true};
  const account=createAccount({publishableKey:key,clientFactory:()=>({
    auth:{
      onAuthStateChange(callback){listener=callback;return {data:{subscription:{unsubscribe(){}}}};},
      getUser:async()=>({data:{user:identity}}),
      stopAutoRefresh(){}
    },
    schema(){
      requests++;
      const query={select:()=>query,eq:()=>query,order:()=>query,
        limit:()=>new Promise(resolve=>{resolveRead=resolve;})};
      return {from:()=>query};
    }
  })});
  await assert.rejects(account.projects.list(),/authRequired/);
  assert.equal(requests,0);
  identity={id:owner,is_anonymous:false};
  const pending=account.projects.list();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests,1);
  listener("SIGNED_OUT",null);
  resolveRead({data:[saved]});
  await assert.rejects(pending,/cloudSessionChanged/);
  account.dispose();
});
