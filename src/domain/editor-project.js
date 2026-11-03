import { starterPalette } from "./palette-store.js";

export function prepareEditorProject(project) {
  const prepared=structuredClone(project);
  if (!prepared.palettes.length) prepared.palettes=[{
    id:crypto.randomUUID(),name:"Studio Modern",harmonyType:"analogous",colors:structuredClone(starterPalette)
  }];
  return prepared;
}
