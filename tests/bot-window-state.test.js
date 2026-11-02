import test from "node:test";
import assert from "node:assert/strict";
import {normalizeBotWindow,botWindowRect,updateBotWindow,createBotWindowStore} from "../src/ui/bot-window-state.js";
const viewport={width:1440,height:900};
test("window geometry persists across reload and scopes guest/user and project state",()=>{
  const data=new Map(),storage=()=>({getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value)});
  const options={projectId:"p1",viewport:()=>viewport,storage},store=createBotWindowStore(options);
  store.dispatch({type:"move",x:100,y:120});store.dispatch({type:"resize",width:500,height:600});store.dispatch({type:"close"});
  assert.deepEqual(createBotWindowStore(options).state,store.state);assert.equal(store.state.open,false);
  assert.equal(createBotWindowStore({...options,projectId:"p2"}).state.open,true);assert.equal(createBotWindowStore({...options,userId:"registered-user"}).state.open,true);
});
test("maximize restore and minimize retain normal geometry while reopening clears unread",()=>{
  const original=normalizeBotWindow({rect:{x:80,y:100,width:420,height:520}},viewport);
  let state=updateBotWindow(original,{type:"maximize"},viewport);assert.deepEqual(botWindowRect(state,viewport),{x:12,y:12,width:1416,height:876});
  state=updateBotWindow(state,{type:"restore"},viewport);assert.deepEqual(state.rect,original.rect);
  state=updateBotWindow(state,{type:"minimize"},viewport);assert.equal(botWindowRect(state,viewport).height,44);
  state=updateBotWindow(state,{type:"close"},viewport);state=updateBotWindow(state,{type:"unread",value:true},viewport);assert.equal(state.open,false);
  state=updateBotWindow(state,{type:"open"},viewport);assert.equal(state.mode,"normal");assert.equal(state.unread,false);assert.deepEqual(state.rect,original.rect);
  state=updateBotWindow(state,{type:"maximize"},viewport);state=updateBotWindow(state,{type:"minimize"},viewport);state=updateBotWindow(state,{type:"minimize"},viewport);assert.equal(state.mode,"maximized");
});
test("invalid persisted values and viewport changes keep the title bar recoverable",()=>{
  const state=normalizeBotWindow({rect:{x:Infinity,y:99999,width:-10,height:99999},mode:"unknown"},viewport);
  const rect=botWindowRect(state,viewport);assert.ok(rect.x>=0 && rect.x+rect.width<=1440);assert.ok(rect.y>=0 && rect.y+rect.height<=900);
  assert.deepEqual(botWindowRect(state,{width:360,height:640}),{x:0,y:0,width:360,height:640});
  const store=createBotWindowStore({projectId:"p",viewport:()=>viewport,storage:()=>{throw new Error("denied");}});
  const result=store.dispatch({type:"close"});assert.equal(result.persisted,false);assert.equal(result.state.open,false);
});
