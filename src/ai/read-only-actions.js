import { validateToolCall } from "./tool-registry.js";
import { validateProject } from "../domain/project.js";
import { normalizeHex,contrastResult } from "../domain/color-engine.js";
import { projectJson,paletteJson,paletteCss,paletteSvg,designTokenJson,patchCsv,cueCsv,safeFileStem } from "../export/formats.js";
import { canvasSvg } from "../export/canvas.js";

export function runNativeReadOnlyTool(project,call) {
  const validation=validateToolCall(call);
  if(!validation.valid)throw new Error(validation.errors.join(" "));
  if(!validateProject(project).valid)throw new Error("Source project is invalid.");
  if(call.name==="check_contrast") {
    const foreground=normalizeHex(call.payload.foreground),background=normalizeHex(call.payload.background);
    if(!foreground || !background)throw new Error("Contrast requires valid opaque HEX colors.");
    return {tool:call.name,kind:"contrast",foreground,background,result:contrastResult(foreground,background)};
  }
  if(call.name!=="export_project")throw new Error("Tool is not a supported read-only action.");
  const payload=call.payload,stem=safeFileStem(project.name);
  const palette=()=>{
    const value=payload.paletteId ? project.palettes.find((item)=>item.id===payload.paletteId) : project.palettes[0];
    if(!value)throw new Error("Export palette was not found.");return value;
  };
  const scene=()=>{
    const value=payload.sceneId ? project.scenes.find((item)=>item.id===payload.sceneId) : project.scenes[0];
    if(!value)throw new Error("Export scene was not found.");return value;
  };
  const formats={
    "project-json":()=>[projectJson(project),`${stem}.ald.json`,"application/json"],
    "palette-json":()=>[paletteJson(palette()),`${stem}-palette.json`,"application/json"],
    "css":()=>[paletteCss(palette()),`${stem}-palette.css`,"text/css"],
    "palette-svg":()=>[paletteSvg(palette()),`${stem}-palette.svg`,"image/svg+xml"],
    "design-tokens":()=>[designTokenJson(palette()),`${stem}-tokens.json`,"application/json"],
    "patch-csv":()=>[patchCsv(project.fixtures),`${stem}-patch.csv`,"text/csv"],
    "cue-csv":()=>[cueCsv(project.cues),`${stem}-cues.csv`,"text/csv"],
    "canvas-svg":()=>[canvasSvg(scene().canvasObjects ?? [],project.name),`${stem}-canvas.svg`,"image/svg+xml"]
  };
  if(!Object.hasOwn(formats,payload.format))throw new Error("Unsupported native export format.");
  const [content,filename,mimeType]=formats[payload.format]();
  return {tool:call.name,kind:"export",artifact:{content,filename,mimeType}};
}
