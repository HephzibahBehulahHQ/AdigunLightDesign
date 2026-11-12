import test from "node:test";
import assert from "node:assert/strict";
import { designTokenJson } from "../src/export/formats.js";
import { comparePalettes } from "../src/domain/palette-versions.ts";
test("token export and version comparison retain opacity differences",()=>{
  const color={id:"c",name:"Red",hex:"#FF0000",locked:false,opacity:.5};
  assert.equal(JSON.parse(designTokenJson({colors:[color]})).color.swatch_1.value,"#FF000080");
  assert.equal(comparePalettes({colors:[color]},{colors:[{...color,opacity:1}]} )[0].changed,true);
});
import { compositeSwatch } from "../src/domain/swatch-opacity.js";
test("composites opacity against the selected contrast background",()=>{
  assert.equal(compositeSwatch({hex:"#000000",opacity:.5},"#FFFFFF"),"#808080");
  assert.equal(compositeSwatch({hex:"#FF0000",opacity:0},"#123456"),"#123456");
  assert.equal(compositeSwatch({hex:"#FF0000"},"#FFFFFF"),"#FF0000");
});
import { swatchCssColor } from "../src/domain/swatch-opacity.js";
import { paletteCssVariables } from "../src/domain/palette-store.js";
import { paletteSvg } from "../src/export/formats.js";
test("preserves default opacity and exports explicit alpha consistently",()=>{
  assert.equal(swatchCssColor({hex:"#f00"}),"#FF0000");
  const color={name:"Red",hex:"#FF0000",opacity:.5};
  assert.equal(swatchCssColor(color),"#FF000080");
  assert.match(paletteCssVariables([color]),/#FF000080/);
  assert.match(paletteSvg({name:"Studio",colors:[color]}),/fill="#FF000080"/);
  assert.equal(swatchCssColor({...color,opacity:0}),"#FF000000");
  for (const opacity of [-1,2,NaN,".5"]) assert.throws(()=>swatchCssColor({...color,opacity}));
});
