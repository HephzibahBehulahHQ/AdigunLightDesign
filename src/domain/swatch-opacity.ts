import { normalizeHex,hexToRgb,rgbToHex } from "./color-engine.ts";
export interface SwatchColor {hex:string;opacity?:number;}
export function compositeSwatch(swatch:SwatchColor,background:unknown) {
  swatchCssColor(swatch);
  const foreground=hexToRgb(swatch.hex),back=hexToRgb(background),alpha=swatch.opacity ?? 1;
  if (!foreground || !back) throw new Error("Invalid background color.");
  return rgbToHex({r:foreground.r*alpha+back.r*(1-alpha),g:foreground.g*alpha+back.g*(1-alpha),b:foreground.b*alpha+back.b*(1-alpha)});
}
export function swatchCssColor(swatch:SwatchColor) {
  const hex=normalizeHex(swatch.hex),opacity=swatch.opacity ?? 1;
  if (!hex || !Number.isFinite(opacity) || opacity<0 || opacity>1) throw new Error("Swatch requires a valid color and opacity from 0 to 1.");
  return opacity===1 ? hex : hex+Math.round(opacity*255).toString(16).padStart(2,"0").toUpperCase();
}
