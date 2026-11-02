import test from "node:test";
import assert from "node:assert/strict";
import {roundTableTop,acousticSlats,sceneData} from "../src/light-lab/renderer.js";
test("round table is closed finite geometry within its requested circular bounds",()=>{
  const data=roundTableTop(2,.6,-1,.8,.05,[.1,.2,.3]);let top=false,bottom=false;
  for(let i=0;i<data.length;i+=6){const [x,y,z]=data.slice(i,i+3);assert.ok([x,y,z].every(Number.isFinite));assert.ok(Math.hypot(x-2,z+1)<=.800001);assert.ok(y>=.6 && y<=.65);top ||= y===.65;bottom ||= y===.6;}
  assert.equal(top,true);assert.equal(bottom,true);
  const edges=new Map(),point=offset=>data.slice(offset,offset+3).map(value=>Number(value.toFixed(6))).join(",");
  for(let offset=0;offset<data.length;offset+=18){const vertices=[point(offset),point(offset+6),point(offset+12)];for(let i=0;i<3;i++){const edge=[vertices[i],vertices[(i+1)%3]].sort().join("|");edges.set(edge,(edges.get(edge) ?? 0)+1);}}
  assert.ok([...edges.values()].every(count=>count===2),"every triangle edge belongs to two faces");
  for(const args of [[0,0,0,0,.1],[0,0,0,1,-1],[0,0,NaN,1,.1]])assert.throws(()=>roundTableTop(...args,[1,1,1]));
});
test("acoustic slats adapt to room dimensions and participate in artistic lighting",()=>{
  const room={width:8,height:3,depth:6},slats=acousticSlats(room,[.3,.2,.1]);
  for(let i=0;i<slats.length;i+=6){const [x,y,z]=slats.slice(i,i+3);assert.ok(x>=3.9 && x<=4);assert.ok(y>=0 && y<=3);assert.ok(z>=-3 && z<=3);}
  const fixture={id:"lamp",properties:{dimmer:255,red:255,green:0,blue:0},transform:{x:0,y:3,z:0}};
  const unlit=sceneData([.2,.3,.4],[],{},room,false),lit=sceneData([.2,.3,.4],[fixture],{lighting:true},room,false);
  assert.ok(lit.every(Number.isFinite));assert.ok(lit.length>unlit.length);
  let changed=false;for(let i=3;i<unlit.length;i+=6)if(lit[i]!==unlit[i]){changed=true;break;}assert.equal(changed,true);
});
