import { paletteCssVariables } from "../domain/palette-store.js";
import { normalizeHex } from "../domain/color-engine.js";

const xmlText=(value)=>String(value ?? "").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[char]);
export function paletteSvg(palette) {
  if (!Array.isArray(palette?.colors) || !palette.colors.length || palette.colors.length>256) throw new Error("SVG export requires 1–256 colors.");
  const colors=palette.colors.map((color)=>{
    const hex=normalizeHex(color.hex);
    if (!hex) throw new Error("SVG export requires valid HEX colors.");
    return {...color,hex};
  });
  const columns=Math.min(5,colors.length),rows=Math.ceil(colors.length/columns),width=columns*180+40,height=rows*150+90;
  const swatches=colors.map((color,index)=>{
    const x=20+(index%columns)*180,y=70+Math.floor(index/columns)*150;
    return `<g transform="translate(${x} ${y})"><rect width="160" height="90" rx="8" fill="${color.hex}"/><text y="110" font-size="13">${xmlText(color.name)}</text><text y="130" font-size="12">${color.hex}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${xmlText(palette.name)}</title><rect width="100%" height="100%" fill="#0B1220"/><g fill="#F8FAFC" font-family="sans-serif"><text x="20" y="36" font-size="22">${xmlText(palette.name)}</text>${swatches}</g></svg>`;
}

const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
export function projectJson(project) { return JSON.stringify(project, null, 2); }
export function paletteJson(palette) { return JSON.stringify({ schemaVersion:1, id:palette.id, name:palette.name, harmonyType:palette.harmonyType, colors:palette.colors }, null, 2); }
export function paletteCss(palette) { return paletteCssVariables(palette.colors); }
export function patchCsv(fixtures) { return ["Fixture,Profile,Mode,Universe,Start address,Footprint", ...fixtures.filter((fixture)=>fixture.patchAssignment).map((fixture)=>[fixture.name,fixture.profileId,fixture.modeId,fixture.patchAssignment.universe,fixture.patchAssignment.startAddress,fixture.patchAssignment.channelFootprint].map(escapeCsv).join(","))].join("\n"); }
export function cueCsv(cues) {
  let start=0;
  const rows=cues.map((cue,index)=>{
    const end=start + cue.duration;
    const row=[cue.name,cue.duration,cue.fade,cue.delay ?? 0,cue.targets.length,index + 1,start,end].map(escapeCsv).join(",");
    start=end;
    return row;
  });
  return ["Cue,Duration seconds,Fade seconds,Delay seconds,Fixture targets,Sequence order,Start seconds,End seconds",...rows].join("\n");
}
export function safeFileStem(name) { return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "adigun-light-design"; }
