import { normalizeHex,hexToRgb,rgbToHex } from "./color-engine.js";
export function compositeSwatch(swatch,background) {
  swatchCssColor(swatch);
  const foreground=hexToRgb(swatch.hex),back=hexToRgb(background),alpha=swatch.opacity ?? 1;
  if (!back) throw new Error("Invalid background color.");
  return rgbToHex(Object.fromEntries(["r","g","b"].map((key)=>[key,foreground[key]*alpha+back[key]*(1-alpha)])));
}
export function swatchCssColor(swatch) {
  const hex=normalizeHex(swatch.hex),opacity=swatch.opacity ?? 1;
  if (!hex || !Number.isFinite(opacity) || opacity<0 || opacity>1) throw new Error("Swatch requires a valid color and opacity from 0 to 1.");
  return opacity===1 ? hex : hex+Math.round(opacity*255).toString(16).padStart(2,"0").toUpperCase();
}
