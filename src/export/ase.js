import {hexToRgb,normalizeHex} from "../domain/color-engine.js";

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
