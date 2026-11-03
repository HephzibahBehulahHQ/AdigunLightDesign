import {readBrowserStorage,writeBrowserStorage} from "../domain/browser-storage.js";
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function normalizeBotWindow(value={},viewport={width:1440,height:900}){
  const width=Math.max(1,Number.isFinite(viewport.width)?viewport.width:1440),height=Math.max(1,Number.isFinite(viewport.height)?viewport.height:900);
  const number=(key,fallback)=>Number.isFinite(value.rect?.[key]) ? value.rect[key] : fallback;
  const w=clamp(number("width",340),Math.min(320,width),Math.min(900,width)),h=clamp(number("height",560),Math.min(400,height),Math.min(800,height));
  return {rect:{x:clamp(number("x",width-w-12),0,width-w),y:clamp(number("y",140),0,Math.max(0,height-(value.mode==="minimized"?44:h))),width:w,height:h},mode:["normal","minimized","maximized"].includes(value.mode)?value.mode:"normal",resumeMode:value.resumeMode==="maximized"?"maximized":"normal",open:typeof value.open==="boolean"?value.open:true,unread:value.unread===true};
}
export function botWindowRect(state,viewport){
  const normalized=normalizeBotWindow(state,viewport),v={width:Math.max(1,viewport.width),height:Math.max(1,viewport.height)};
  if(v.width<=670)return {x:0,y:0,width:v.width,height:normalized.mode==="minimized"?Math.min(44,v.height):v.height};
  if(normalized.mode==="maximized")return {x:12,y:12,width:Math.max(1,v.width-24),height:Math.max(1,v.height-24)};
  const height=normalized.mode==="minimized" ? Math.min(44,v.height) : normalized.rect.height;
  return {...normalized.rect,height,y:clamp(normalized.rect.y,0,Math.max(0,v.height-height))};
}
export function updateBotWindow(state,action,viewport){
  const next=normalizeBotWindow(state,viewport);
  if(action.type==="open"){next.open=true;next.unread=false;if(next.mode==="minimized")next.mode=next.resumeMode;}
  else if(action.type==="close")next.open=false;
  else if(action.type==="minimize"){if(next.mode==="minimized")next.mode=next.resumeMode;else{next.resumeMode=next.mode;next.mode="minimized";}}
  else if(action.type==="maximize")next.mode=next.mode==="maximized"?"normal":"maximized";
  else if(action.type==="restore")next.mode="normal";
  else if(action.type==="unread")next.unread=action.value===true;
  else if(action.type==="move" && next.mode!=="maximized")next.rect={...next.rect,x:action.x,y:action.y};
  else if(action.type==="resize" && next.mode==="normal")next.rect={...next.rect,width:action.width,height:action.height};
  if(action.type==="move" || action.type==="resize")return normalizeBotWindow(next,viewport);
  return {...next,rect:state.rect ?? next.rect};
}
export function createBotWindowStore({projectId,userId="guest",viewport,storage=()=>globalThis.localStorage}){
  const key=`adigunlightdesign/bot-window/v1/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}`;
  let raw;try{raw=JSON.parse(readBrowserStorage(key,storage).value);}catch{}
  const initialViewport=viewport();
  const desktopViewport=initialViewport.width<=670 ? {width:1440,height:900} : initialViewport;
  let state=normalizeBotWindow(raw ?? {},desktopViewport);
  return {get state(){return structuredClone(state);},dispatch(action,{persist=true}={}){state=updateBotWindow(state,action,viewport());return {state:structuredClone(state),persisted:persist ? writeBrowserStorage(key,JSON.stringify(state),storage).ok : false};}};
}
