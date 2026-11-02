export const genericRgbWash = {
  id: "generic-rgb-wash",
  manufacturer: "Generic",
  model: "RGB Wash (virtual)",
  type: "LED wash",
  provenance: "Application-defined virtual profile; not manufacturer validated.",
  validationStatus: "virtual mapping tested",
  modes: [{ id:"rgb-6", name:"6-channel RGB wash", channels:["dimmer","red","green","blue","strobe","beam"] }]
};

export function fixtureFootprint(profile = genericRgbWash, modeId = "rgb-6") { return profile.modes.find((mode) => mode.id === modeId)?.channels.length ?? 0; }
export function createFixture(index = 1) { return { id:crypto.randomUUID(), profileId:genericRgbWash.id, modeId:"rgb-6", name:`RGB Wash ${index}`, transform:{ x:0,y:3,z:0,rotation:0 }, properties:{ dimmer:255,red:33,green:150,blue:243,strobe:0,beam:128 }, patchAssignment:null }; }
export function patchRange(patch) { return { start:patch.startAddress, end:patch.startAddress + patch.channelFootprint - 1 }; }
export function validatePatch(candidate, fixtures) {
  const errors=[]; const footprint=candidate.channelFootprint;
  if (!Number.isInteger(candidate.universe) || candidate.universe < 1) errors.push("Universe must be a positive integer.");
  if (!Number.isInteger(candidate.startAddress) || candidate.startAddress < 1 || candidate.startAddress > 512) errors.push("Start address must be 1–512.");
  if (!Number.isInteger(footprint) || footprint < 1 || candidate.startAddress + footprint - 1 > 512) errors.push("Fixture footprint exceeds universe 512.");
  const range=patchRange(candidate);
  for (const fixture of fixtures) { const existing=fixture.patchAssignment; if (!existing || fixture.id === candidate.fixtureId || existing.universe !== candidate.universe) continue; const current=patchRange(existing); if (range.start <= current.end && current.start <= range.end) errors.push(`Address overlaps ${fixture.name}.`); }
  return { valid:errors.length===0, errors };
}
export function firstAvailableAddress(fixtures, universe, footprint) { for(let start=1;start+footprint-1<=512;start+=1) { if (validatePatch({fixtureId:"candidate",universe,startAddress:start,channelFootprint:footprint},fixtures).valid) return start; } return null; }
export function patchFixture(fixtures, fixtureId, universe = 1, startAddress) { const fixture=fixtures.find((item)=>item.id===fixtureId); if(!fixture) throw new Error("Fixture was not found."); const patch={fixtureId,universe,startAddress:startAddress ?? firstAvailableAddress(fixtures,universe,fixtureFootprint(genericRgbWash,fixture.modeId)),channelFootprint:fixtureFootprint(genericRgbWash,fixture.modeId)}; const result=validatePatch(patch,fixtures); if(!result.valid) throw new Error(result.errors.join(" ")); return fixtures.map((item)=>item.id===fixtureId?{...item,patchAssignment:patch}:item); }
export function dmxFrame(fixtures, universe = 1) { const frame=new Uint8Array(512); for(const fixture of fixtures){const patch=fixture.patchAssignment;if(!patch||patch.universe!==universe)continue;const values=[fixture.properties.dimmer,fixture.properties.red,fixture.properties.green,fixture.properties.blue,fixture.properties.strobe,fixture.properties.beam];values.forEach((value,index)=>{frame[patch.startAddress-1+index]=Math.max(0,Math.min(255,Math.round(value ?? 0)));});}return frame; }
export function blackout(fixtures) { return fixtures.map((fixture)=>({...fixture,properties:{...fixture.properties,dimmer:0}})); }
