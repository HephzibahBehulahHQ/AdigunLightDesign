import test from "node:test";
import assert from "node:assert/strict";
import { customHueHarmony,perceptualScale } from "../src/domain/color-engine.js";
test("custom hue spacing wraps predictably and tetradic differs from square",()=>{
  assert.deepEqual(customHueHarmony("#FF0000",120,3),["#FF0000","#00FF00","#0000FF"]);
  assert.notDeepEqual(harmony("#FF0000","tetradic"),harmony("#FF0000","square"));
  assert.throws(()=>customHueHarmony("#FF0000",NaN));
});
test("perceptual scales increase OKLab lightness within sRGB",()=>{
  const colors=perceptualScale("#2196F3",7),levels=colors.map((hex)=>rgbToOklab(hexToRgb(hex)).l);
  assert.equal(colors.length,7);
  assert.ok(levels.every((value,index)=>index===0 || value>levels[index-1]));
  assert.throws(()=>perceptualScale("#2196F3",1));
});
import { mapOklchToSrgb } from "../src/domain/color-engine.js";
test("maps excessive OKLCH chroma explicitly into sRGB",()=>{
  const result=mapOklchToSrgb({l:.65,c:.8,h:30});
  assert.equal(result.mapped,true);
  assert.ok(result.chroma<.8);
  assert.match(result.hex,/^#[0-9A-F]{6}$/);
  assert.deepEqual(mapOklchToSrgb({l:.65,c:.8,h:30}),result);
  assert.equal(mapOklchToSrgb({l:.5,c:0,h:0}).mapped,false);
  assert.throws(()=>mapOklchToSrgb({l:2,c:.2,h:0}));
});
import { suggestContrast } from "../src/domain/color-engine.js";
test("contrast suggestions meet their measured target or report no solution",()=>{
  for (const [foreground,background] of [["#777777","#FFFFFF"],["#333333","#0B1220"],["#FF0000","#FFFFFF"]]) {
    const candidate=suggestContrast(foreground,background);
    assert.ok(candidate);
    assert.equal(contrastResult(candidate,background).aa,true);
  }
  assert.equal(suggestContrast("#000000","#FFFFFF"),"#000000");
  assert.equal(suggestContrast("#777777","#777777",21),null);
  assert.throws(()=>suggestContrast("invalid","#FFFFFF"));
});
import { contrastResult, harmony, hexToRgb, hsvToRgb, isSrgbGamut, labToRgb, normalizeHex, rgbToHsv, rgbToLab, rgbToOklab, shiftHue } from "../src/domain/color-engine.js";
import { paletteCssVariables, rerollUnlocked, starterPalette } from "../src/domain/palette-store.js";

test("normalizes valid hex and rejects invalid values", () => { assert.equal(normalizeHex("abc"), "#AABBCC"); assert.equal(normalizeHex("#00ff99"), "#00FF99"); assert.equal(normalizeHex("blue"), null); });
test("calculates complementary and triadic harmonies deterministically", () => { assert.deepEqual(harmony("#FF0000", "complementary"), ["#FF0000", "#00FFFF"]); assert.equal(harmony("#FF0000", "triadic").length, 3); assert.equal(shiftHue("#FF0000", 120), "#00FF00"); });
test("reports WCAG contrast thresholds", () => { const result = contrastResult("#000000", "#FFFFFF"); assert.equal(result.ratio, 21); assert.equal(result.aa, true); assert.equal(contrastResult("#777777", "#FFFFFF").aaa, false); });
test("separates normal and large-text contrast outcomes near the AA threshold",()=>{
  const below=contrastResult("#777777","#FFFFFF"),above=contrastResult("#767676","#FFFFFF");
  assert.equal(below.aa,false);
  assert.equal(below.largeAa,true);
  assert.equal(below.largeAaa,false);
  assert.equal(above.aa,true);
  assert.equal(above.largeAaa,true);
  assert.equal(above.aaa,false);
  assert.equal(contrastResult("#000000","#FFFFFF").aaa,true);
});
test("preserves locked swatches during deterministic reroll and exports CSS", () => { const source = starterPalette.map((swatch, index) => index === 0 ? { ...swatch, locked:true } : swatch); const rerolled = rerollUnlocked(source, "#FF0000", "triadic"); assert.equal(rerolled[0].hex, source[0].hex); assert.match(paletteCssVariables(rerolled), /--ald-deep-blue/); });
test("converts RGB, HSV, Lab and OKLab without hiding gamut loss", () => { const red=hexToRgb("#FF0000"), hsv=rgbToHsv(red), lab=rgbToLab(red), recovered=labToRgb(lab); assert.deepEqual(hsvToRgb(hsv),red); assert.ok(Math.abs(lab.l-53.24)<.2); assert.ok(Math.abs(recovered.r-255)<.1); assert.ok(rgbToOklab(red).l>.6); assert.equal(isSrgbGamut({r:256,g:0,b:0}),false); });
test('unknown harmony names cannot resolve inherited object properties',()=>{
 for(const name of ['constructor','toString','__proto__','unknown'])assert.deepEqual(harmony('#ff0000',name),['#FF0000']);
});
