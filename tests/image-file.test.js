import test from "node:test";
import assert from "node:assert/strict";
import { readImagePalette } from "../src/domain/image-file.ts";
test("rejects unsupported or oversized uploads before decoding",async()=>{
  for (const file of [null,{type:"image/svg+xml",size:100},{type:"image/png",size:10_000_001},{type:"image/jpeg",size:0}]) await assert.rejects(readImagePalette(file));
});
test("downsamples accepted images, reports copied pixels and closes the bitmap",async(t)=>{
  const originalBitmap=globalThis.createImageBitmap,originalDocument=globalThis.document;
  t.after(()=>{
    if(originalBitmap)globalThis.createImageBitmap=originalBitmap;else delete globalThis.createImageBitmap;
    if(originalDocument)globalThis.document=originalDocument;else delete globalThis.document;
  });
  let closed=false,drawnSize,decoded;
  globalThis.createImageBitmap=async()=>({width:512,height:256,close(){closed=true;}});
  globalThis.document={createElement:()=>({
    getContext:()=>({drawImage(_bitmap,_x,_y,width,height){drawnSize=[width,height];},getImageData(_x,_y,width,height){
      const pixels=new Uint8ClampedArray(width*height*4);pixels.set([255,0,0,255]);return {data:pixels};
    }}),
  })};
  const colors=await readImagePalette({type:"image/png",size:100,name:"stage.png"},{onDecoded:asset=>{decoded=asset;}});
  assert.deepEqual(drawnSize,[256,128]);
  assert.deepEqual(colors,[{hex:"#FF0000",population:1}]);
  assert.equal(decoded.width,256);assert.equal(decoded.height,128);assert.equal(decoded.name,"stage.png");
  assert.equal(decoded.pixels.length,256*128*4);assert.equal(closed,true);
});
test("closes decoded bitmaps when the pixel limit is exceeded",async(t)=>{
  const originalBitmap=globalThis.createImageBitmap;
  t.after(()=>{if(originalBitmap)globalThis.createImageBitmap=originalBitmap;else delete globalThis.createImageBitmap;});
  let closed=false;
  globalThis.createImageBitmap=async()=>({width:5001,height:4000,close(){closed=true;}});
  await assert.rejects(readImagePalette({type:"image/webp",size:100}),/20-megapixel/);
  assert.equal(closed,true);
});

