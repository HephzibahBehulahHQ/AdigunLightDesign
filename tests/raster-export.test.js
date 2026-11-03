import test from "node:test";
import assert from "node:assert/strict";
import { paletteRaster } from "../src/export/raster.js";
test("rejects unsupported formats and invalid palettes before browser rendering",async()=>{
  await assert.rejects(paletteRaster({colors:[]},"image/gif"),/Unsupported/);
  await assert.rejects(paletteRaster({colors:[]}),/1–256/);
});

test("raster adapter returns requested encodings and releases URLs on success and failure",async(t)=>{
  const previousImage=Object.getOwnPropertyDescriptor(globalThis,"Image"),previousDocument=Object.getOwnPropertyDescriptor(globalThis,"document");
  let revoked=0,created=0,failDecode=false,encodedType=null,empty=false;
  t.mock.method(URL,"createObjectURL",()=>`blob:test-${++created}`);
  t.mock.method(URL,"revokeObjectURL",()=>{revoked+=1;});
  Object.defineProperty(globalThis,"Image",{configurable:true,value:class {
    naturalWidth=400;naturalHeight=240;
    set src(value){queueMicrotask(()=>failDecode ? this.onerror() : this.onload());}
  }});
  Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:()=>({
    getContext:()=>({drawImage(){}}),
    toBlob:(callback,type)=>callback(empty ? null : new Blob(["mock pixels"],{type:encodedType ?? type}))
  })}});
  const palette={name:"Studio",colors:[{name:"Blue",hex:"#00f"}]};
  try {
    assert.equal((await paletteRaster(palette,"image/png")).type,"image/png");
    assert.equal((await paletteRaster(palette,"image/jpeg")).type,"image/jpeg");
    encodedType="image/png";
    await assert.rejects(paletteRaster(palette,"image/jpeg"),/encode/);
    empty=true;
    await assert.rejects(paletteRaster(palette),/encode/);
    failDecode=true;
    await assert.rejects(paletteRaster(palette),/rendered/);
    assert.equal(created,5);
    assert.equal(revoked,created);
  } finally {
    if(previousImage)Object.defineProperty(globalThis,"Image",previousImage);else delete globalThis.Image;
    if(previousDocument)Object.defineProperty(globalThis,"document",previousDocument);else delete globalThis.document;
  }
});
