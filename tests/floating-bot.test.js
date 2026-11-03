import test from "node:test";
import assert from "node:assert/strict";
import {createFloatingBot} from "../src/ui/floating-bot.js";
import {translate} from "../src/i18n.js";
function harness(data=new Map(),width=1440){
  const classes=()=>{const values=new Set();return {add:value=>values.add(value),toggle:(value,on)=>on?values.add(value):values.delete(value),has:value=>values.has(value)};};
  let documentRef;
  const element=()=>({dataset:{},style:{},children:[],classList:classes(),attrs:{},setAttribute(key,value){this.attrs[key]=value;},append(child){this.children.push(child);},insertBefore(child){this.children.push(child);},focus(){documentRef.activeElement=this;},setPointerCapture(){this.captured=true;},hasPointerCapture(){return this.captured;},releasePointerCapture(){this.captured=false;}});
  const ai=element(),status=element(),header=element(),close=element(),input=element(),host=element(),listeners=new Map();
  host.querySelector=selector=>selector===".lux-heading"?header:selector==="#toggle-lux"?close:selector.includes("textarea")?input:header.children.find(child=>Object.hasOwn(child.dataset,selector.includes("maximize")?"botMaximize":"botMinimize"));
  host.contains=value=>[header,close,input,...header.children,...host.children].includes(value);
  documentRef={body:{classList:classes(),style:{setProperty(key,value){this[key]=value;}}},activeElement:null,createElement:element,querySelector:selector=>selector==="#status"?status:ai};
  const windowRef={innerWidth:width,innerHeight:900,addEventListener:(name,handler)=>listeners.set(name,handler),removeEventListener:name=>listeners.delete(name)};
  const bot=createFloatingBot({getProjectId:()=>"project",getLocale:()=>"en",translate,documentRef,windowRef,storage:()=>({getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)})});bot.mount(host);
  const pointer=(target,type,x,y)=>target[`on${type}`]({type,button:0,pointerId:1,clientX:x,clientY:y,target:{closest:()=>null},preventDefault(){}});
  return {bot,host,header,input,ai,status,data,pointer,close,body:documentRef.body,resize:host.children.find(child=>child.className==="bot-resize-handle"),maximize:host.querySelector("[data-bot-maximize]"),minimize:host.querySelector("[data-bot-minimize]"),listeners,get focused(){return documentRef.activeElement;}};
}

test("normal assistant reserves desktop space and releases it for other window states",()=>{
  const h=harness(),reserved=()=>h.body.classList.has("has-open-floating-bot");
  assert.equal(reserved(),true);h.minimize.onclick();assert.equal(reserved(),false);
  h.minimize.onclick();assert.equal(reserved(),true);h.maximize.onclick();assert.equal(reserved(),false);
  h.maximize.onclick();assert.equal(reserved(),true);h.close.onclick();assert.equal(reserved(),false);
  h.bot.open();assert.equal(reserved(),true);h.bot.dispose();assert.equal(reserved(),false);
});
test("floating controls move resize persist maximize/restore and restore after canceled movement",()=>{
  const h=harness(),originalX=parseFloat(h.host.style.left);
  h.pointer(h.header,"pointerdown",100,100);h.pointer(h.header,"pointerup",0,120);assert.equal(parseFloat(h.host.style.left),originalX-100);
  h.pointer(h.resize,"pointerdown",0,0);h.pointer(h.resize,"pointerup",100,50);assert.equal(h.host.style.width,"440px");assert.equal(h.host.style.height,"610px");
  const normal={...h.host.style};h.maximize.onclick();assert.equal(h.host.style.width,"1416px");h.maximize.onclick();assert.deepEqual(h.host.style,normal);
  h.pointer(h.header,"pointerdown",0,0);h.pointer(h.header,"pointermove",-100,50);h.pointer(h.header,"pointercancel",-100,50);assert.deepEqual(h.host.style,normal);
  const reload=harness(h.data);assert.deepEqual(reload.host.style,normal);reload.bot.dispose();h.bot.dispose();assert.equal(h.listeners.size,0);
});

test("workspace reservation follows edge resizing and releases when moved away or too wide",()=>{
  const h=harness(),reserved=()=>h.body.classList.has("has-open-floating-bot");
  assert.equal(h.body.style["--bot-workspace-reserve"],"352px");
  h.pointer(h.resize,"pointerdown",0,0);h.pointer(h.resize,"pointerup",60,0);
  assert.equal(reserved(),true);assert.equal(h.body.style["--bot-workspace-reserve"],"400px");
  h.pointer(h.header,"pointerdown",0,0);h.pointer(h.header,"pointerup",-100,0);assert.equal(reserved(),false);
  h.pointer(h.header,"pointerdown",0,0);h.pointer(h.header,"pointerup",100,0);assert.equal(reserved(),true);
  h.pointer(h.resize,"pointerdown",0,0);h.pointer(h.resize,"pointerup",300,0);assert.equal(reserved(),false);
  h.bot.dispose();
});
test("closed suggestions badge without opening or focusing; keyboard close and reopen restore focus",()=>{
  const h=harness();h.close.onclick();assert.equal(h.host.hidden,true);assert.equal(h.focused,h.ai);h.bot.notify();assert.equal(h.host.hidden,true);assert.equal(h.focused,h.ai);assert.equal(h.ai.classList.has("has-bot-unread"),true);
  h.bot.open();assert.equal(h.host.hidden,false);assert.equal(h.ai.classList.has("has-bot-unread"),false);assert.equal(h.focused,h.input);
  h.minimize.onclick();assert.equal(h.host.style.height,"44px");h.minimize.onclick();assert.equal(h.host.style.height,"560px");
  h.host.onkeydown({key:"Escape",preventDefault(){},stopPropagation(){}});assert.equal(h.host.hidden,true);
  assert.equal(h.host.attrs.role,"complementary");h.bot.dispose();
  const mobile=harness(new Map(),360);assert.equal(mobile.host.style.width,"360px");assert.equal(mobile.host.style.height,"900px");mobile.close.onclick();assert.equal(mobile.host.hidden,true);mobile.bot.dispose();
});
