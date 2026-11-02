import { harmony, normalizeHex } from "./color-engine.js";

export const starterPalette = [
  { id:"deep-blue", name:"Deep Blue", hex:"#0B3D91", locked:false }, { id:"ocean-blue", name:"Ocean Blue", hex:"#2196F3", locked:false },
  { id:"amber", name:"Amber", hex:"#FFB347", locked:false }, { id:"magenta", name:"Magenta", hex:"#C21888", locked:false }, { id:"warm-neutral", name:"Warm Neutral", hex:"#F5E6D3", locked:false }
];

export function paletteCssVariables(palette) { return `:root {\n${palette.map((swatch) => `  --ald-${swatch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}: ${swatch.hex};`).join("\n")}\n}\n`; }
export function rerollUnlocked(palette, seed, type) { const colours = harmony(seed, type); return palette.map((swatch, index) => swatch.locked ? swatch : { ...swatch, hex: colours[index % colours.length] }); }
export function updateSwatch(palette, id, change) { return palette.map((swatch) => swatch.id === id ? { ...swatch, ...change, hex: normalizeHex(change.hex ?? swatch.hex) ?? swatch.hex } : swatch); }
export function removeSwatch(colors,id) {
  if (!colors.some((color)=>color.id===id)) throw new Error("Color was not found.");
  if (colors.length<2) throw new Error("Keep at least one palette color.");
  return colors.filter((color)=>color.id!==id);
}
export function moveSwatch(colors,id,offset) {
  const index=colors.findIndex((color)=>color.id===id);
  if (index<0 || ![-1,1].includes(offset)) throw new Error("Invalid color movement.");
  const result=[...colors],next=index+offset;
  if (next>=0 && next<colors.length) [result[index],result[next]]=[result[next],result[index]];
  return result;
}
