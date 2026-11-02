import { paletteCssVariables } from "../domain/palette-store.js";

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
