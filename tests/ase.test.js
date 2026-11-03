import test from "node:test";
import assert from "node:assert/strict";
import {paletteAse} from "../src/export/ase.js";
test("ASE contains a complete big-endian group with named RGB process colors",()=>{
  const palette={name:"Yorùbá 🎨",colors:[{name:"Red",hex:"#FF0000"},{name:"Àwọ̀",hex:"#2196F3",opacity:1}]},before=JSON.stringify(palette);
  const buffer=Buffer.from(paletteAse(palette));assert.equal(buffer.toString("ascii",0,4),"ASEF");assert.equal(buffer.readUInt16BE(4),1);assert.equal(buffer.readUInt16BE(6),0);assert.equal(buffer.readUInt32BE(8),4);
  let offset=12;const records=[];
  while(offset<buffer.length){const type=buffer.readUInt16BE(offset),length=buffer.readUInt32BE(offset+2),payload=buffer.subarray(offset+6,offset+6+length);assert.equal(payload.length,length);records.push({type,payload});offset+=6+length;}
  assert.equal(offset,buffer.length);assert.deepEqual(records.map(r=>r.type),[0xc001,1,1,0xc002]);assert.equal(records[3].payload.length,0);
  const readName=payload=>{const count=payload.readUInt16BE(0);let name="";for(let i=0;i<count-1;i++)name+=String.fromCharCode(payload.readUInt16BE(2+i*2));assert.equal(payload.readUInt16BE(count*2),0);return {name,end:2+count*2};};
  assert.equal(readName(records[0].payload).name,palette.name);
  for(let i=0;i<2;i++){const {payload}=records[i+1],name=readName(payload);assert.equal(name.name,palette.colors[i].name);assert.equal(payload.toString("ascii",name.end,name.end+4),"RGB ");const expected=i ? [33,150,243] : [255,0,0];for(let c=0;c<3;c++)assert.ok(Math.abs(payload.readFloatBE(name.end+4+c*4)-expected[c]/255)<1e-7);assert.equal(payload.readUInt16BE(name.end+16),2);assert.equal(payload.length,name.end+18);}
  assert.equal(JSON.stringify(palette),before);
});
test("ASE rejects opacity and malformed palettes instead of silently discarding data",()=>{
  const valid={name:"Test",colors:[{name:"Blue",hex:"#0000FF"}]};assert.ok(paletteAse(valid).length>12);
  for(const bad of [{...valid,colors:[]},{...valid,colors:Array(257).fill(valid.colors[0])},{...valid,name:"Bad\0name"},{...valid,name:"\ud800"},{...valid,colors:[{name:"Blue",hex:"#0000FF",opacity:.5}]},{...valid,colors:[{name:"Blue",hex:"invalid"}]}])assert.throws(()=>paletteAse(bad));
});
