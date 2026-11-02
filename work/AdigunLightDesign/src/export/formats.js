import { paletteCssVariables } from "../domain/palette-store.js";

const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
export function projectJson(project) { return JSON.stringify(project, null, 2); }
export function paletteJson(palette) { return JSON.stringify({ schemaVersion:1, id:palette.id, name:palette.name, harmonyType:palette.harmonyType, colors:palette.colors }, null, 2); }
export function paletteCss(palette) { return paletteCssVariables(palette.colors); }
export function patchCsv(fixtures) { return ["Fixture,Profile,Mode,Universe,Start address,Footprint", ...fixtures.filter((fixture)=>fixture.patchAssignment).map((fixture)=>[fixture.name,fixture.profileId,fixture.modeId,fixture.patchAssignment.universe,fixture.patchAssignment.startAddress,fixture.patchAssignment.channelFootprint].map(escapeCsv).join(","))].join("\n"); }
export function cueCsv(cues) { return ["Cue,Duration seconds,Fade seconds,Delay seconds,Fixture targets", ...cues.map((cue)=>[cue.name,cue.duration,cue.fade,cue.delay,cue.targets.length].map(escapeCsv).join(","))].join("\n"); }
export function safeFileStem(name) { return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "adigun-light-design"; }
