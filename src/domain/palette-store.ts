import { harmony, normalizeHex } from "./color-engine.ts";
import { swatchCssColor } from "./swatch-opacity.ts";

export interface Swatch {id:string;name:string;hex:string;locked:boolean;opacity?:number;}
export const starterPalette:Swatch[] = [
  { id:"deep-blue", name:"Deep Blue", hex:"#0B3D91", locked:false }, { id:"ocean-blue", name:"Ocean Blue", hex:"#2196F3", locked:false },
  { id:"amber", name:"Amber", hex:"#FFB347", locked:false }, { id:"magenta", name:"Magenta", hex:"#C21888", locked:false }, { id:"warm-neutral", name:"Warm Neutral", hex:"#F5E6D3", locked:false }
];

export function paletteCssVariables(palette:readonly Swatch[]) {
  const used=new Set();
  const declarations=palette.map((swatch,index)=>{
    const base=String(swatch.name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || `color-${index+1}`;
    let name=base,suffix=2;
    while(used.has(name)) name=`${base}-${suffix++}`;
    used.add(name);
    const hex=normalizeHex(swatch.hex);
    if (!hex) throw new Error("CSS export requires valid HEX colors.");
    return `  --ald-${name}: ${swatchCssColor({...swatch,hex})};`;
  });
  return `:root {\n${declarations.join("\n")}\n}\n`;
}
export function rerollUnlocked<T extends Swatch>(palette:readonly T[], seed:unknown, type?:string) { const colours = harmony(seed, type); return palette.map((swatch, index) => swatch.locked ? swatch : { ...swatch, hex: colours[index % colours.length]! }); }
export function updateSwatch<T extends Swatch>(palette:readonly T[], id:string, change:Partial<Swatch>) { return palette.map((swatch) => swatch.id === id ? { ...swatch, ...change, hex: normalizeHex(change.hex ?? swatch.hex) ?? swatch.hex } : swatch); }
export function removeSwatch<T extends Swatch>(colors:readonly T[],id:string) {
  if (!colors.some((color)=>color.id===id)) throw new Error("Color was not found.");
  if (colors.length<2) throw new Error("Keep at least one palette color.");
  return colors.filter((color)=>color.id!==id);
}
export function moveSwatch<T extends Swatch>(colors:readonly T[],id:string,offset:number) {
  const index=colors.findIndex((color)=>color.id===id);
  if (index<0 || ![-1,1].includes(offset)) throw new Error("Invalid color movement.");
  const result=[...colors],next=index+offset;
  if (next>=0 && next<colors.length) [result[index],result[next]]=[result[next]!,result[index]!];
  return result;
}
export function reorderSwatch<T extends Swatch>(colors:readonly T[],sourceId:string,targetId:string) {
  const source=colors.findIndex((color)=>color.id===sourceId),target=colors.findIndex((color)=>color.id===targetId);
  if (source<0 || target<0) throw new Error("Color was not found.");
  const result=[...colors];
  const [color]=result.splice(source,1);
  result.splice(target,0,color!);
  return result;
}

