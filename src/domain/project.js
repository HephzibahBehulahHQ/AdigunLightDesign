import { fixtureProfiles } from "../dmx/engine.js";
import { validateFixtureGroups } from "./fixture-groups.js";
import { arrangeTracks } from "../timeline/tracks.js";
import { validateChannelKeyframes } from "../timeline/keyframes.js";

export const CURRENT_SCHEMA_VERSION = 1;

export function createProject({ id = crypto.randomUUID(), name = "Untitled lighting project" } = {}) {
  const now = new Date().toISOString();
  return {
    id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name,
    description: "",
    createdAt: now,
    updatedAt: now,
    preferences: { locale: "en", theme: "dark", renderingQuality: "high" },
    palettes: [], scenes: [], fixtures: [], fixtureGroups: [], patches: [], cues: [], assets: [], history: []
  };
}

export function validateProject(project) {
  const errors = [];
  if (project?.fixtureGroups!==undefined && !validateFixtureGroups(project.fixtureGroups,Array.isArray(project.fixtures) ? project.fixtures : [])) errors.push("Fixture groups require unique identities, names and existing fixture members.");
  if (!project || typeof project !== "object") errors.push("Project must be an object.");
  if (project?.schemaVersion !== CURRENT_SCHEMA_VERSION) errors.push("Unsupported project schema version.");
  if (typeof project?.id !== "string" || !project.id.trim() || typeof project?.name !== "string" || !project.name.trim()) errors.push("Project needs a string id and a nonempty name.");
  for (const key of ["palettes", "scenes", "fixtures", "patches", "cues", "assets", "history"]) {
    if (!Array.isArray(project?.[key])) errors.push(`Project.${key} must be an array.`);
  }
  if (Array.isArray(project?.palettes)) {
    for (const palette of project.palettes) {
      if (!palette || typeof palette.id !== "string" || typeof palette.name !== "string" || !Array.isArray(palette.colors) || !palette.colors.length) {
        errors.push("Each palette needs an id, name, and nonempty colors array.");
        continue;
      }
      const ids=new Set();
      for (const color of palette.colors) {
        if (color?.opacity !== undefined && (!Number.isFinite(color.opacity) || color.opacity<0 || color.opacity>1)) errors.push("Color opacity must be from 0 to 1.");
        if (!color || typeof color.id !== "string" || !color.id.trim() || ids.has(color.id) || typeof color.name !== "string" || typeof color.hex !== "string" || !/^#[0-9a-f]{6}$/i.test(color.hex) || typeof color.locked !== "boolean") errors.push("Palette colors require unique ids, names, six-digit HEX values, and boolean locks.");
        if (color) ids.add(color.id);
      }
    }
  }
  if (Array.isArray(project?.cues)) {
    try { arrangeTracks(project.cues); } catch { errors.push("Cue track scheduling is invalid."); }
    const ids=new Set();
    for (const cue of project.cues) {
      if (!cue || typeof cue.id !== "string" || !cue.id.trim() || ids.has(cue.id) || typeof cue.name !== "string" || !cue.name.trim()) errors.push("Cues require unique ids and nonempty names.");
      if (!cue) continue;
      if (!validateChannelKeyframes(cue)) errors.push("Cue channel keyframes are invalid.");
      ids.add(cue.id);
      const delay=cue.delay ?? 0;
      const fadeOut=cue.fadeOut ?? 0;
      if (![cue.duration,cue.fade,delay,fadeOut].every(Number.isFinite) || cue.duration <= 0 || cue.fade < 0 || delay < 0 || fadeOut<0 || delay + cue.fade + fadeOut > cue.duration) errors.push("Cue timing is invalid.");
      if (!Array.isArray(cue.targets)) { errors.push("Cue targets must be an array."); continue; }
      for (const target of cue.targets) {
        if (!target || typeof target.fixtureId !== "string" || !target.properties || typeof target.properties !== "object" || Array.isArray(target.properties) || !Object.values(target.properties).every((value)=>Number.isInteger(value) && value >= 0 && value <= 255)) errors.push("Cue targets require fixture ids and DMX channel values from 0 to 255.");
      }
    }
  }
  if (Array.isArray(project?.fixtures)) {
    const ids=new Set();
    for (const fixture of project.fixtures) {
      if (!fixture || typeof fixture.id !== "string" || !fixture.id.trim() || ids.has(fixture.id) || typeof fixture.name !== "string" || typeof fixture.profileId !== "string" || typeof fixture.modeId !== "string") errors.push("Fixtures require unique ids, names, profiles, and modes.");
      if (!fixture) continue;
      ids.add(fixture.id);
      const profile=fixtureProfiles.find((item)=>item.id===fixture.profileId);
      const mode=profile?.modes.find((item)=>item.id===fixture.modeId);
      if (!mode) errors.push("Fixture profile or mode is unsupported.");
      if (fixture.transform && (typeof fixture.transform !== "object" || Array.isArray(fixture.transform) || !Object.entries(fixture.transform).every(([key,value])=>["x","y","z","rotation"].includes(key) && Number.isFinite(value)))) errors.push("Fixture positions and rotations must be finite numbers.");
      if (!fixture.properties || typeof fixture.properties !== "object" || Array.isArray(fixture.properties) || !Object.values(fixture.properties).every((value)=>Number.isInteger(value) && value >= 0 && value <= 255)) errors.push("Fixture channel values must be integers from 0 to 255.");
      const patch=fixture.patchAssignment;
      if (patch && mode && patch.channelFootprint !== mode.channels.length) errors.push("Fixture patch footprint does not match its mode.");
      if (patch) {
        if (patch.fixtureId !== fixture.id) errors.push("Fixture patch must reference its owning fixture.");
        for (const other of project.fixtures) {
          const existing=other?.patchAssignment;
          if (!existing || other === fixture || existing.universe !== patch.universe) continue;
          if (patch.startAddress <= existing.startAddress + existing.channelFootprint - 1 && existing.startAddress <= patch.startAddress + patch.channelFootprint - 1) errors.push("Imported fixture patches overlap.");
        }
      }
      if (patch && (!Number.isInteger(patch.universe) || patch.universe < 1 || !Number.isInteger(patch.startAddress) || patch.startAddress < 1 || !Number.isInteger(patch.channelFootprint) || patch.channelFootprint < 1 || patch.startAddress + patch.channelFootprint - 1 > 512)) errors.push("Fixture patch exceeds valid universe or address bounds.");
    }
  }
  if (Array.isArray(project?.scenes)) {
    const ids=new Set();
    for (const scene of project.scenes) {
      if (!scene || typeof scene.id !== "string" || !scene.id.trim() || ids.has(scene.id) || typeof scene.name !== "string" || !scene.name.trim()) errors.push("Scenes require unique ids and nonempty names.");
      if (!scene) continue;
      if (scene.visibility!==undefined && (!scene.visibility || typeof scene.visibility!=="object" || Array.isArray(scene.visibility) || !Object.entries(scene.visibility).every(([key,value])=>["lighting","props","palette"].includes(key) && typeof value==="boolean"))) errors.push("Scene visibility requires boolean layer settings.");
      ids.add(scene.id);
      if (typeof scene.materialColor !== "string" || !/^#[0-9a-f]{6}$/i.test(scene.materialColor)) errors.push("Scene material color must be a six-digit HEX value.");
    }
  }
  return { valid: errors.length === 0, errors };
}
