import test from "node:test";
import assert from "node:assert/strict";
import { temperatureVariant,temperaturePalette } from "../src/domain/temperature.js";
import { hexToRgb,rgbToOklab } from "../src/domain/color-engine.js";
test("temperature variations are deterministic and approximately preserve perceptual lightness",()=>{
  const seed="#2196F3",warm=temperatureVariant(seed,"warm",.5),cool=temperatureVariant(seed,"cool",.5);
  assert.notEqual(warm,cool);assert.equal(temperatureVariant(seed,"warm",.5),warm);
  const lightness=(hex)=>rgbToOklab(hexToRgb(hex)).l;
  assert.ok(Math.abs(lightness(warm)-lightness(seed))<.003);
  assert.ok(Math.abs(lightness(cool)-lightness(seed))<.003);
  assert.equal(temperatureVariant(seed,"warm",0),seed);
  for(const neutral of ["#000000","#FFFFFF","#808080"])assert.equal(temperatureVariant(neutral,"warm",1),neutral);
  assert.throws(()=>temperatureVariant(seed,"warm",2));
  assert.throws(()=>temperatureVariant("invalid","cool"));
});
test("palette temperature preserves locks opacity order and source values",()=>{
  const colors=[{id:"a",hex:"#2196F3",locked:true,opacity:.5},{id:"b",hex:"#C21888",locked:false,opacity:.7}],result=temperaturePalette(colors,"warm",.5);
  assert.deepEqual(result[0],colors[0]);assert.notEqual(result[1].hex,colors[1].hex);
  assert.equal(result[1].opacity,.7);assert.deepEqual(result.map((color)=>color.id),["a","b"]);
  assert.equal(colors[1].hex,"#C21888");
});
