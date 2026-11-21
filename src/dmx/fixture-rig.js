import { fixtureProfiles } from "./engine.js";

const format = "adigunlightdesign.fixture-rig";
const version = 1;
const limit = 256;
const axes = ["x", "y", "z", "rotation"];

function fixtureSpec(value, useLegacyDefaults) {
  if (!value || typeof value.name !== "string" || !value.name.trim()) throw new Error("A fixture name is required.");
  const profile = fixtureProfiles.find(item => item.id === value.profileId);
  const mode = profile?.modes.find(item => item.id === value.modeId);
  if (!mode) throw new Error("The fixture rig contains an unsupported profile or mode.");

  const transform = Object.fromEntries(axes.map(axis => [axis, value.transform?.[axis] ?? (useLegacyDefaults ? 0 : undefined)]));
  if (!Object.values(transform).every(Number.isFinite)) throw new Error("Fixture placement requires finite coordinates and rotation.");
  const properties = Object.fromEntries(mode.channels.map(channel => [channel, value.properties?.[channel] ?? (useLegacyDefaults ? 0 : undefined)]));
  if (!Object.values(properties).every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
    throw new Error("Fixture rig channel values must be integers from 0 to 255.");
  }
  return {name:value.name, profileId:profile.id, modeId:mode.id, transform, properties};
}

function fixtureSpecs(fixtures, useLegacyDefaults = false) {
  if (!Array.isArray(fixtures) || fixtures.length < 1 || fixtures.length > limit) {
    throw new Error(`A fixture rig must contain 1–${limit} fixtures.`);
  }
  return fixtures.map(fixture => fixtureSpec(fixture, useLegacyDefaults));
}

export function fixtureRigJson(fixtures) {
  return JSON.stringify({format, schemaVersion:version, fixtures:fixtureSpecs(fixtures, true)}, null, 2);
}

export function readFixtureRig(text) {
  const rig = JSON.parse(text);
  if (rig?.format !== format || rig.schemaVersion !== version) throw new Error("Choose a supported AdigunLightDesign fixture rig.");
  return fixtureSpecs(rig.fixtures);
}
