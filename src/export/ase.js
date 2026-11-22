import {hexToRgb,normalizeHex,rgbToHex} from "../domain/color-engine.js";

// ASE v1 RGB subset, written independently from documented reader behavior.
// Reference: GNOME/gimp app/core/gimppalette-load.c (gimp_palette_load_ase).
export function paletteAse(palette){
  if(!Array.isArray(palette?.colors) || palette.colors.length<1 || palette.colors.length>256)throw new Error("ASE requires 1–256 colors.");
  const nameBytes=value=>{
    if(typeof value!=="string" || !value.length || value.length>255 || value.includes("\0") || !value.isWellFormed())throw new Error("ASE names require 1–255 valid UTF-16 code units without NUL.");
    const bytes=new Uint8Array(2+(value.length+1)*2),view=new DataView(bytes.buffer);view.setUint16(0,value.length+1);
    for(let i=0;i<value.length;i++)view.setUint16(2+i*2,value.charCodeAt(i));return bytes;
  };
  const block=(type,payload)=>{const bytes=new Uint8Array(6+payload.length),view=new DataView(bytes.buffer);view.setUint16(0,type);view.setUint32(2,payload.length);bytes.set(payload,6);return bytes;};
  const blocks=[block(0xc001,nameBytes(palette.name))];
  for(const color of palette.colors){
    const hex=normalizeHex(color?.hex);if(!hex || (color.opacity!==undefined && color.opacity!==1))throw new Error("ASE RGB export requires valid opaque colors. Use JSON or SVG to retain opacity.");
    const name=nameBytes(color.name),payload=new Uint8Array(name.length+18),view=new DataView(payload.buffer);payload.set(name);
    payload.set([82,71,66,32],name.length);const rgb=hexToRgb(hex);
    [rgb.r,rgb.g,rgb.b].forEach((value,index)=>view.setFloat32(name.length+4+index*4,value/255));
    view.setUint16(name.length+16,2);blocks.push(block(1,payload));
  }
  blocks.push(block(0xc002,new Uint8Array()));
  const bytes=new Uint8Array(12+blocks.reduce((total,item)=>total+item.length,0)),view=new DataView(bytes.buffer);
  bytes.set([65,83,69,70]);view.setUint16(4,1);view.setUint16(6,0);view.setUint32(8,blocks.length);
  let offset=12;for(const item of blocks){bytes.set(item,offset);offset+=item.length;}return bytes;
}

export function readAsePaletteLibrary(bytes, fileName="") {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const invalid=()=>new Error("Expected an ASE v1 library with RGB process or global swatches.");
  if (view.byteLength<18 || view.getUint32(0)!==0x41534546 || view.getUint32(4)!==0x00010000) throw invalid();
  const blocks=view.getUint32(8);
  if (blocks<1 || blocks>768) throw invalid();

  const decoder=new TextDecoder("utf-16be",{fatal:true,ignoreBOM:true});
  const palettes=[];
  let group=null, ungrouped=null, totalColors=0, offset=12;
  for (let index=0;index<blocks;index++) {
    if (offset+6>view.byteLength) throw invalid();
    const type=view.getUint16(offset), length=view.getUint32(offset+2);
    const start=offset+6, end=start+length;
    offset=end;
    if (end>view.byteLength) throw invalid();
    if (type===0xc002) {
      if (!group?.colors.length || length!==0) throw invalid();
      group=null;
      continue;
    }
    if ((type!==0xc001 && type!==1) || length<2) throw invalid();
    const count=view.getUint16(start), nameEnd=start+2+count*2;
    if (count<2 || count>256 || nameEnd>end || view.getUint16(nameEnd-2)!==0) throw invalid();
    const label=decoder.decode(bytes.subarray(start+2,nameEnd-2));
    if (label.includes("\0")) throw invalid();
    if (type===0xc001) {
      if (group || nameEnd!==end || !label.trim()) throw invalid();
      group={name:label,colors:[],hasGlobal:false};
      palettes.push(group);
      continue;
    }
    if (nameEnd+18!==end || view.getUint32(nameEnd)!==0x52474220) throw invalid();
    const colorType=view.getUint16(end-2);
    if (colorType!==0 && colorType!==2) throw invalid();
    const rgb=[4,8,12].map(delta=>view.getFloat32(nameEnd+delta));
    if (rgb.some(channel=>!Number.isFinite(channel)||channel<0||channel>1)) throw invalid();
    const [r,g,b]=rgb.map(channel=>Math.round(channel*255));
    if (++totalColors>256) throw invalid();
    if (!group && !ungrouped) {
      ungrouped={name:fileName.replace(/\.ase$/i,"").trim() || "ASE",colors:[],hasGlobal:false};
      palettes.push(ungrouped);
    }
    const target=group ?? ungrouped;
    target.colors.push({id:crypto.randomUUID(),name:label,hex:rgbToHex({r,g,b}),locked:false});
    if (colorType===0) target.hasGlobal=true;
  }
  if (group || offset!==view.byteLength || !totalColors) throw invalid();
  return palettes;
}
