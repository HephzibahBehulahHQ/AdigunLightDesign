export const genericRgbWash = {
  id: "generic-rgb-wash",
  manufacturer: "Generic",
  model: "RGB Wash (virtual)",
  type: "LED wash",
  provenance: "Application-defined virtual profile; not manufacturer validated.",
  validationStatus: "virtual mapping tested",
  modes: [{ id:"rgb-6", name:"6-channel RGB wash", channels:["dimmer","red","green","blue","strobe","beam"] }]
};

export const fixtureProfiles = [
  genericRgbWash,
  { id:"generic-moving-head-rgbw", manufacturer:"Generic", model:"Moving Head RGBW (virtual)", type:"Moving-head wash", provenance:"Application-defined virtual profile; not manufacturer validated.", validationStatus:"virtual mapping tested", license:"Product-authored generic data", physicalDimensions:{ width:.28,height:.42,depth:.25,unit:"m" }, panTiltLimits:{ pan:540,tilt:270 }, modes:[{ id:"rgbw-10", name:"10-channel RGBW moving head", channels:["pan","tilt","dimmer","red","green","blue","white","strobe","gobo","beam"] }] },
  { id:"generic-led-strip-rgb", manufacturer:"Generic", model:"LED Strip RGB (virtual)", type:"LED strip", provenance:"Application-defined virtual profile; not manufacturer validated.", validationStatus:"virtual mapping tested", license:"Product-authored generic data", physicalDimensions:{ width:1,height:.02,depth:.01,unit:"m" }, modes:[{ id:"rgb-4", name:"4-channel RGB strip", channels:["dimmer","red","green","blue"] }] }
];

export function getFixtureProfile(profileId) { return fixtureProfiles.find((profile) => profile.id === profileId) ?? genericRgbWash; }

export function fixtureFootprint(profile = genericRgbWash, modeId = "rgb-6") { return profile.modes.find((mode) => mode.id === modeId)?.channels.length ?? 0; }
export function createFixture(index = 1, profileId = genericRgbWash.id) { const profile=getFixtureProfile(profileId),mode=profile.modes[0],properties=Object.fromEntries(mode.channels.map((channel)=>[channel,0])); Object.assign(properties,{dimmer:255,red:33,green:150,blue:243,white:0,strobe:0,beam:128,pan:127,tilt:127,gobo:0}); return { id:crypto.randomUUID(), profileId:profile.id, modeId:mode.id, name:`${profile.model.replace(" (virtual)","")} ${index}`, transform:{ x:(index - 2) * 2.5,y:3.65,z:.45,rotation:0 }, properties, patchAssignment:null }; }
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
export function patchFixture(fixtures, fixtureId, universe = 1, startAddress) { const fixture=fixtures.find((item)=>item.id===fixtureId); if(!fixture) throw new Error("Fixture was not found."); const profile=getFixtureProfile(fixture.profileId),footprint=fixtureFootprint(profile,fixture.modeId),patch={fixtureId,universe,startAddress:startAddress ?? firstAvailableAddress(fixtures,universe,footprint),channelFootprint:footprint}; const result=validatePatch(patch,fixtures); if(!result.valid) throw new Error(result.errors.join(" ")); return fixtures.map((item)=>item.id===fixtureId?{...item,patchAssignment:patch}:item); }
export function updateFixture(fixtures, fixtureId, { name, properties = {}, universe, startAddress } = {}) {
  const fixture=fixtures.find((item)=>item.id===fixtureId);
  if (!fixture) throw new Error("Fixture was not found.");
  for (const [channel,value] of Object.entries(properties)) {
    if (!Object.hasOwn(fixture.properties,channel)) throw new Error(`Unknown fixture property: ${channel}.`);
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error(`${channel} must be an integer from 0 to 255.`);
  }
  if (name !== undefined && (typeof name !== "string" || !name.trim())) throw new Error("Fixture name must not be empty.");
  const revised=fixtures.map((item)=>item.id===fixtureId ? { ...item, name:name?.trim() ?? item.name, properties:{...item.properties,...properties} } : item);
  return patchFixture(revised,fixtureId,universe ?? fixture.patchAssignment?.universe ?? 1,startAddress ?? fixture.patchAssignment?.startAddress);
}
export function dmxFrame(fixtures, universe = 1) { const frame=new Uint8Array(512); for(const fixture of fixtures){const patch=fixture.patchAssignment;if(!patch||patch.universe!==universe)continue;const profile=getFixtureProfile(fixture.profileId),mode=profile.modes.find((item)=>item.id===fixture.modeId) ?? profile.modes[0];mode.channels.forEach((channel,index)=>{frame[patch.startAddress-1+index]=Math.max(0,Math.min(255,Math.round(fixture.properties[channel] ?? 0)));});}return frame; }
export function blackout(fixtures) { return fixtures.map((fixture)=>({...fixture,properties:{...fixture.properties,dimmer:0}})); }
