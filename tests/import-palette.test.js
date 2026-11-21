import assert from "node:assert/strict";
import test from "node:test";
import {readPaletteJson} from "../src/domain/import-palette.js";
import {paletteJson} from "../src/export/formats.js";
import {createStudioMoodProject} from "../src/domain/studio-mood.js";

test("portable palette import preserves supported exported fields and excludes the source palette ID",()=>{
  const palette=structuredClone(createStudioMoodProject().palettes[0]);
  palette.harmonyType="square";
  palette.colors[0].opacity=.6;
  palette.colors[0].locked=true;
  assert.deepEqual(readPaletteJson(paletteJson(palette)),{
    name:palette.name,harmonyType:"square",colors:palette.colors
  });
});

test("portable palette import rejects incompatible versions and invalid swatches",()=>{
  const original=JSON.parse(paletteJson(createStudioMoodProject().palettes[0]));
  for (const changes of [
    {schemaVersion:2},
    {colors:[]},
    {colors:[original.colors[0],original.colors[0]]},
    {colors:[{...original.colors[0],opacity:1.01}]},
    {harmonyType:42},
  ]) assert.throws(()=>readPaletteJson(JSON.stringify({...original,...changes})),/Invalid palette/);
});
