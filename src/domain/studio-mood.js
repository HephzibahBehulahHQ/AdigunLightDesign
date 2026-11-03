import { createFixture, patchFixture } from "../dmx/engine.js";
import { createCue } from "../timeline/engine.js";
import { starterPalette } from "./palette-store.js";
import { createProject } from "./project.js";

const studioRig = [
  { red:0, green:100, blue:255, tilt:220, beam:120 },
  { red:255, green:126, blue:26, tilt:220, beam:132 },
  { red:255, green:0, blue:184, tilt:220, beam:145 }
];

export function createStudioMoodProject() {
  const project=createProject({ name:"Studio Mood" });
  project.palettes=[{ id:"studio-modern", name:"Studio Modern", harmonyType:"analogous", colors:starterPalette }];
  project.scenes=[{ id:"studio-room", name:"Studio room", materialColor:"#C21888" }];
  let fixtures=studioRig.map((properties,index)=>{ const fixture=createFixture(index + 1,"generic-moving-head-rgbw"); return { ...fixture, properties:{ ...fixture.properties, ...properties } }; });
  fixtures=fixtures.reduce((patched,fixture)=>patchFixture(patched,fixture.id),fixtures);
  project.fixtures=fixtures;
  const starterTracks=[
    {name:"Look 1 - Fade In",startTime:0,duration:10,fade:2},
    {name:"Color Chase",startTime:11,duration:13,fade:1},
    {name:"Ambient Fill",startTime:0,duration:30,fade:1}
  ];
  project.cues=starterTracks.map(({name,startTime,duration,fade},index)=>({
    ...createCue([fixtures[index]],{name,duration,fade}),
    trackId:name,
    startTime,
    ...(index===0 ? {channelKeyframes:[
      {fixtureId:fixtures[index].id,property:"dimmer",time:0,value:0},
      {fixtureId:fixtures[index].id,property:"dimmer",time:2,value:255}
    ]} : index===1 ? {channelKeyframes:[
      {fixtureId:fixtures[index].id,property:"blue",time:4,value:220},
      {fixtureId:fixtures[index].id,property:"blue",time:8,value:26}
    ]} : {})
  }));
  return project;
}
