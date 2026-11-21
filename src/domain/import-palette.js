import {createProject,validateProject} from "./project.js";

export function readPaletteJson(text) {
  const palette=JSON.parse(text);
  if (palette?.schemaVersion!==1 || (palette.harmonyType!==undefined && typeof palette.harmonyType!=="string")) {
    throw new Error("Invalid palette file.");
  }
  const project=createProject({id:"palette-validation"});
  project.palettes=[palette];
  if (!validateProject(project).valid) throw new Error("Invalid palette file.");
  const colors=palette.colors.map(({id,name,hex,locked,opacity})=>({id,name,hex,locked,...(opacity===undefined ? {} : {opacity})}));
  return {name:palette.name,harmonyType:palette.harmonyType ?? "analogous",colors};
}
