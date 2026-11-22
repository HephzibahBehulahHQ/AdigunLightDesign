import test from "node:test";
import assert from "node:assert/strict";
import {paletteAse,readPaletteAse} from "../src/export/ase.js";
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

test("ASE import preserves the group, ordered RGB values, accents and emoji",()=>{
  const palette={name:"Àwọ̀ 🎨",colors:[{name:"Ìmọ́lẹ̀ 💡",hex:"#0180FE"},{name:"Dúdú",hex:"#000000"}]};
  const decoded=readPaletteAse(paletteAse(palette));
  assert.equal(decoded.name,palette.name);
  assert.deepEqual(decoded.colors.map(({name,hex})=>({name,hex})),palette.colors);
  assert.equal(new Set(decoded.colors.map(color=>color.id)).size,2);
  assert.ok(decoded.colors.every(color=>!color.locked));
});

test("ASE import reads the ungrouped RGB file emitted by Swatch 0.4.0",()=>{
  const header="415345460001000000000002";
  const warm="00010000001e0005005700610072006d0000524742203f8000003f000000000000000002";
  const blue="00010000001e00050042006c00750065000052474220000000003e8000003f8000000002";
  const bytes=Buffer.from(header+warm+blue,"hex");
  const decoded=readPaletteAse(bytes,"Independent RGB.ASE");
  assert.equal(decoded.name,"Independent RGB");
  assert.deepEqual(decoded.colors.map(({name,hex})=>({name,hex})),[
    {name:"Warm",hex:"#FF8000"}, {name:"Blue",hex:"#0040FF"}
  ]);
  assert.throws(()=>readPaletteAse(Buffer.from(header+warm+blue+"c00200000000","hex")));
});

test("ASE import rejects truncation, trailing data and unsupported color records",()=>{
  const valid=paletteAse({name:"Studio",colors:[{name:"Blue",hex:"#0000FF"}]});
  for (const bytes of [valid.subarray(0,-1),Uint8Array.of(...valid,0)]) {
    assert.throws(()=>readPaletteAse(bytes));
  }
  const view=new DataView(valid.buffer);
  const colorBlock=18+view.getUint32(14);
  const model=colorBlock+8+view.getUint16(colorBlock+6)*2;
  const spot=valid.slice(), nonRgb=valid.slice(), outOfRange=valid.slice();
  new DataView(spot.buffer).setUint16(spot.length-8,1);
  nonRgb.set([67,77,89,75],model);
  new DataView(outOfRange.buffer).setFloat32(model+4,1.1);
  for (const bytes of [spot,nonRgb,outOfRange]) assert.throws(()=>readPaletteAse(bytes));
});
