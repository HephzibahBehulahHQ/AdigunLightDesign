import test from "node:test";
import assert from "node:assert/strict";
import { contrastResult, harmony, hexToRgb, hsvToRgb, isSrgbGamut, labToRgb, normalizeHex, rgbToHsv, rgbToLab, rgbToOklab, shiftHue } from "../src/domain/color-engine.js";
import { paletteCssVariables, rerollUnlocked, starterPalette } from "../src/domain/palette-store.js";

test("normalizes valid hex and rejects invalid values", () => { assert.equal(normalizeHex("abc"), "#AABBCC"); assert.equal(normalizeHex("#00ff99"), "#00FF99"); assert.equal(normalizeHex("blue"), null); });
test("calculates complementary and triadic harmonies deterministically", () => { assert.deepEqual(harmony("#FF0000", "complementary"), ["#FF0000", "#00FFFF"]); assert.equal(harmony("#FF0000", "triadic").length, 3); assert.equal(shiftHue("#FF0000", 120), "#00FF00"); });
test("reports WCAG contrast thresholds", () => { const result = contrastResult("#000000", "#FFFFFF"); assert.equal(result.ratio, 21); assert.equal(result.aa, true); assert.equal(contrastResult("#777777", "#FFFFFF").aaa, false); });
test("preserves locked swatches during deterministic reroll and exports CSS", () => { const source = starterPalette.map((swatch, index) => index === 0 ? { ...swatch, locked:true } : swatch); const rerolled = rerollUnlocked(source, "#FF0000", "triadic"); assert.equal(rerolled[0].hex, source[0].hex); assert.match(paletteCssVariables(rerolled), /--ald-deep-blue/); });
test("converts RGB, HSV, Lab and OKLab without hiding gamut loss", () => { const red=hexToRgb("#FF0000"), hsv=rgbToHsv(red), lab=rgbToLab(red), recovered=labToRgb(lab); assert.deepEqual(hsvToRgb(hsv),red); assert.ok(Math.abs(lab.l-53.24)<.2); assert.ok(Math.abs(recovered.r-255)<.1); assert.ok(rgbToOklab(red).l>.6); assert.equal(isSrgbGamut({r:256,g:0,b:0}),false); });
