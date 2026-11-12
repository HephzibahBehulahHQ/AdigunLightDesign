import {starterPalette} from "./palette-store.ts";
import type {Swatch} from "./palette-store.ts";

interface EditorPalette {
  id: string;
  name: string;
  harmonyType: string;
  colors: Swatch[];
}

interface EditorProject {
  palettes: EditorPalette[];
}

export function prepareEditorProject<T extends EditorProject>(project: T): T {
  const prepared = structuredClone(project);
  if (!prepared.palettes.length) prepared.palettes = [{
    id: crypto.randomUUID(),
    name: "Studio Modern",
    harmonyType: "analogous",
    colors: structuredClone(starterPalette),
  }];
  return prepared;
}

