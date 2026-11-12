import test from "node:test";
import assert from "node:assert/strict";
import { extractImagePalette } from "../src/domain/image-palette.ts";

test("extracts dominant colors deterministically and ignores transparent pixels",()=>{
  const pixels=new Uint8ClampedArray([255,0,0,255,255,0,0,255,0,0,255,255,0,255,0,0]);
  const result=extractImagePalette(pixels);
  assert.deepEqual(result.map((color)=>color.hex),["#FF0000","#0000FF"]);
  assert.equal(result[0].population,2/3);
  assert.deepEqual(extractImagePalette(pixels),result);
  assert.equal(extractImagePalette(pixels,{count:1}).length,1);
});
test("combines nearby quantized colors and weights partial transparency",()=>{
  const result=extractImagePalette(new Uint8Array([248,0,0,255,255,0,0,255,0,0,255,128]));
  assert.equal(result.length,2);
  assert.equal(result[0].hex,"#FC0000");
  assert.ok(result[0].population>.79);
});
test("bounds samples and rejects malformed data",()=>{
  assert.deepEqual(extractImagePalette(new Uint8Array(4)),[]);
  assert.throws(()=>extractImagePalette([1,2,3,4]));
  assert.throws(()=>extractImagePalette(new Uint8Array(3)));
  assert.throws(()=>extractImagePalette(new Uint8Array(4),{count:0}));
  const pixels=new Uint8Array(400).fill(255);
  assert.deepEqual(extractImagePalette(pixels,{maxSamples:1}),[{hex:"#FFFFFF",population:1}]);
});
