import { dmxFrame,getFixtureProfile } from "./engine.js";
export function virtualDmxPreview(fixtures,fixtureId) {
  const fixture=fixtures.find((item)=>item.id===fixtureId) ?? fixtures[0];
  const universe=fixture?.patchAssignment?.universe ?? 1,frame=dmxFrame(fixtures,universe);
  if (!fixture?.patchAssignment) return {universe,frame,channels:[]};
  const mode=getFixtureProfile(fixture.profileId).modes.find((item)=>item.id===fixture.modeId);
  return {universe,frame,channels:(mode?.channels ?? []).map((name,index)=>({name,address:fixture.patchAssignment.startAddress+index,value:frame[fixture.patchAssignment.startAddress-1+index]}))};
}
