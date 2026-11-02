import { normalizeHex,hexToRgb,rgbToOklab,oklabToOklch,mapOklchToSrgb } from "./color-engine.js";
export function temperatureVariant(hex,direction,amount=.2) {
  const color=normalizeHex(hex);
  if(!color || !["warm","cool"].includes(direction) || !Number.isFinite(amount) || amount<0 || amount>1)throw new Error("Invalid palette temperature variation.");
  const lch=oklabToOklch(rgbToOklab(hexToRgb(color)));
  if(amount===0 || lch.c<.0001)return color;
  const target=direction==="warm" ? 75 : 250,delta=((target-lch.h+540)%360)-180;
  return mapOklchToSrgb({...lch,h:(lch.h+delta*amount+360)%360}).hex;
}
export function temperaturePalette(colors,direction,amount=.2) {
  return colors.map((color)=>color.locked ? {...color} : {...color,hex:temperatureVariant(color.hex,direction,amount)});
}
