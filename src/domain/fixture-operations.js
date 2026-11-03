import { patchFixture } from "../dmx/engine.js";

export function duplicateFixture(project,fixtureId,{id=crypto.randomUUID(),name}={}) {
  const source=project.fixtures.find((fixture)=>fixture.id===fixtureId);
  if (!source || typeof id!=="string" || !id.trim() || project.fixtures.some((fixture)=>fixture.id===id)) throw new Error("Fixture source or new identity is invalid.");
  const result=structuredClone(project),copy=structuredClone(source);
  copy.id=id;copy.name=name ?? `${source.name} (copy)`;
  if (typeof copy.name!=="string" || !copy.name.trim()) throw new Error("Fixture name must not be empty.");
  copy.transform={...copy.transform,x:(copy.transform?.x ?? 0)+.5};copy.patchAssignment=null;
  result.fixtures=patchFixture([...result.fixtures,copy],id,source.patchAssignment?.universe ?? 1);
  return result;
}

export function deleteFixture(project,fixtureId) {
  if (!project.fixtures.some((fixture)=>fixture.id===fixtureId)) throw new Error("Fixture was not found.");
  const result=structuredClone(project);
  result.fixtures=result.fixtures.filter((fixture)=>fixture.id!==fixtureId);
  result.patches=result.patches.filter((patch)=>patch?.fixtureId!==fixtureId);
  if (result.fixtureGroups) result.fixtureGroups=result.fixtureGroups.map((group)=>({...group,fixtureIds:group.fixtureIds.filter((id)=>id!==fixtureId)})).filter((group)=>group.fixtureIds.length);
  result.cues=result.cues.map((cue)=>({...cue,targets:cue.targets.filter((target)=>target.fixtureId!==fixtureId),...(cue.channelKeyframes ? {channelKeyframes:cue.channelKeyframes.filter((frame)=>frame.fixtureId!==fixtureId)} : {})}));
  return result;
}
