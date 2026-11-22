import test from "node:test";
import assert from "node:assert/strict";
import {createAccount,sharedSupabaseUrl} from "../src/cloud/account.js";
const key="sb_publishable_test_configuration_only";
function fixture({signOutError=null,productVerified=true}={}){
  let event,verified={id:"registered-test-user",is_anonymous:false,email:"test@example.invalid"},options,url,scope,unsubscribed=false;
  const account=createAccount({publishableKey:key,fetchImpl:async(_url,{body})=>Response.json(JSON.parse(body).step==="begin"?{step:"verify"}:{step:"signed-in",session:{access_token:"test",refresh_token:"test"}}),clientFactory:(endpoint,publishable,config)=>{url=endpoint;options=config;assert.equal(publishable,key);return {rpc:async(name)=>{assert.equal(name,"adigunlightdesign_has_verified_product_session");return {data:productVerified,error:null};},auth:{onAuthStateChange:callback=>{event=callback;return {data:{subscription:{unsubscribe(){unsubscribed=true;}}}};},getUser:async()=>({data:{user:verified},error:null}),setSession:async()=>({error:null}),signOut:async config=>{scope=config.scope;return {error:signOutError};},stopAutoRefresh(){}}};}});
  return {account,get options(){return options;},get url(){return url;},get scope(){return scope;},get unsubscribed(){return unsubscribed;},set verified(value){verified=value;},emit:(name,session)=>event(name,session)};
}
test("account remains unavailable without public configuration and rejects secret-shaped keys",async()=>{
  const account=createAccount();assert.equal(account.configured,false);await assert.rejects(account.begin("sign-in","a","b"),/authUnavailable/);await assert.rejects(account.requireUser(),/authRequired/);
  assert.throws(()=>createAccount({publishableKey:"sb_secret_never_embed"}));account.dispose();
});
test("sign-in exposes only server-verified registered identity; sessions stay in memory and sign-out is local",async()=>{
  const f=fixture(),updates=[];f.account.subscribe(user=>updates.push(user));assert.equal(f.account.user,null);
  await f.account.begin("sign-in","test@example.invalid","test-only-password");assert.equal(f.account.user,null);assert.equal(await f.account.verifyCode("12345678"),"signed-in");const user=f.account.user;assert.equal(user.id,"registered-test-user");assert.equal(f.url,sharedSupabaseUrl);assert.equal(f.options.auth.persistSession,false);assert.equal(f.options.auth.detectSessionInUrl,false);
  user.id="edited";assert.equal(f.account.user.id,"registered-test-user");await f.account.signOut();assert.equal(f.scope,"local");assert.equal(f.account.user,null);assert.equal(updates.at(-1),null);f.account.dispose();assert.equal(f.unsubscribed,true);
});
test("anonymous identities and failed server verification never become signed in",async()=>{
  const f=fixture();f.verified={id:"anonymous",is_anonymous:true};await assert.rejects(f.account.verifyCode("12345678"),/authSignInFailed/);assert.equal(f.account.user,null);
  f.verified=null;await assert.rejects(f.account.requireUser(),/authRequired/);f.account.dispose();
});
test("a sign-out event invalidates an outstanding verification result",async()=>{
  let callback,finish;
  const account=createAccount({publishableKey:key,clientFactory:()=>({auth:{onAuthStateChange:listener=>{callback=listener;return {data:{subscription:{unsubscribe(){}}}};},getUser:()=>new Promise(resolve=>{finish=resolve;}),stopAutoRefresh(){}}})});
  const pending=account.requireUser();callback("SIGNED_OUT",null);finish({data:{user:{id:"stale",is_anonymous:false}},error:null});await assert.rejects(pending,/authRequired/);assert.equal(account.user,null);account.dispose();
});

test("failed sign-out does not claim the verified account has signed out",async()=>{
  const f=fixture({signOutError:new Error("provider details")});await f.account.verifyCode("12345678");
  await assert.rejects(f.account.signOut(),/authSignOutFailed/);assert.equal(f.account.user.id,"registered-test-user");f.account.dispose();
});

test("a shared identity without a LightDesign session cannot access product data",async()=>{
  const f=fixture({productVerified:false});
  await assert.rejects(f.account.verifyCode("12345678"),/authSignInFailed/);
  await assert.rejects(f.account.requireUser(),/authRequired/);
  assert.equal(f.account.user,null);
  f.account.dispose();
});
