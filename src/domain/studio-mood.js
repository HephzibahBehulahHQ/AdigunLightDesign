import { createFixture, patchFixture } from "../dmx/engine.js";
import { starterPalette } from "./palette-store.js";
import { createProject } from "./project.js";

const studioRig = [
  { red:0, green:100, blue:255, beam:120 },
  { red:255, green:126, blue:26, beam:132 },
  { red:255, green:0, blue:184, beam:145 }
];

export function createStudioMoodProject() {
  const project=createProject({ name:"Studio Mood" });
  project.palettes=[{ id:"studio-modern", name:"Studio Modern", harmonyType:"analogous", colors:starterPalette }];
  project.scenes=[{ id:"studio-room", name:"Studio room", materialColor:"#C21888" }];
  let fixtures=studioRig.map((properties,index)=>{ const fixture=createFixture(index + 1,"generic-moving-head-rgbw"); return { ...fixture, properties:{ ...fixture.properties, ...properties } }; });
  fixtures=fixtures.reduce((patched,fixture)=>patchFixture(patched,fixture.id),fixtures);
  project.fixtures=fixtures;
  return project;
}
