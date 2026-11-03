import { dmxFrame,getFixtureProfile } from "./engine.ts";
import type {Fixture} from "./engine.ts";
export function virtualDmxPreview(fixtures:readonly Fixture[],fixtureId:string|null|undefined) {
  const fixture=fixtures.find((item)=>item.id===fixtureId) ?? fixtures[0];
  const universe=fixture?.patchAssignment?.universe ?? 1,frame=dmxFrame(fixtures,universe);
  if (!fixture?.patchAssignment) return {universe,frame,channels:[]};
  const patch=fixture.patchAssignment;
  const mode=getFixtureProfile(fixture.profileId).modes.find((item)=>item.id===fixture.modeId);
  return {universe,frame,channels:(mode?.channels ?? []).map((name,index)=>({name,address:patch.startAddress+index,value:frame[patch.startAddress-1+index]}))};
}
