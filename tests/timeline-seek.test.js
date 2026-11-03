import test from 'node:test';
import assert from 'node:assert/strict';
import {bindTimelineSeek} from '../src/ui/timeline-seek.js';
function setup(duration=12){
 const attrs=new Map(),handlers=new Map(),commits=[],previews=[];let captured=false;
 const ruler={dataset:{},setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),getBoundingClientRect:()=>({left:100,width:300}),setPointerCapture:()=>captured=true,hasPointerCapture:()=>captured,releasePointerCapture:()=>captured=false,addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)};
 const cleanup=bindTimelineSeek(ruler,{span:30,duration,label:'Seek',onSeek:(t,meta)=>commits.push({t,...meta}),onPreview:t=>previews.push(t)});
 const fire=(type,x,id=1)=>handlers.get(type)({type,clientX:x,pointerId:id,button:0,preventDefault(){}});
 const key=(key,shiftKey=false)=>handlers.get('keydown')({key,shiftKey,preventDefault(){}});
 return {attrs,handlers,commits,previews,ruler,cleanup,fire,key};
}
test('ruler seeks scaled timeline position once and clamps to actual duration',()=>{
 const h=setup();h.fire('pointerdown',150);h.fire('pointermove',180);h.fire('pointermove',400,2);
 assert.deepEqual(h.previews,[5,8]);assert.equal(h.commits.length,0);h.fire('pointerup',400);
 assert.deepEqual(h.commits,[{t:12,keyboard:false}]);assert.equal(h.attrs.get('aria-valuenow'),'12');h.cleanup();
});
test('ruler cancellation restores preview and keyboard follows current playback value',()=>{
 const h=setup();h.fire('pointerdown',170);h.fire('pointercancel',170);assert.equal(h.previews.at(-1),0);assert.equal(h.commits.length,0);
 h.ruler.setAttribute('aria-valuenow','4');h.key('ArrowRight');h.key('ArrowLeft',true);h.key('End');h.key('Home');
 assert.deepEqual(h.commits.map(x=>x.t),[4.1,3.1,12,0]);assert.ok(h.commits.every(x=>x.keyboard));
 h.cleanup();assert.equal(h.handlers.size,0);
 const empty=setup(0);empty.fire('pointerdown',200);empty.key('End');assert.equal(empty.commits.length,0);assert.equal(empty.ruler.tabIndex,-1);empty.cleanup();
});
test('fractional duration never rounds past the endpoint and unrelated keys do not seek',()=>{
 const h=setup(.06);h.key('End');assert.equal(h.commits.at(-1).t,.06);
 h.fire('pointerdown',400);h.fire('pointerup',400);assert.equal(h.commits.at(-1).t,.06);
 const count=h.commits.length;h.key('Tab');h.key('toString');assert.equal(h.commits.length,count);h.cleanup();
});
