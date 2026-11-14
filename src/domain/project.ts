import {fixtureProfiles} from "../dmx/engine.ts";
import {validateFixtureGroups} from "./fixture-groups.ts";
import {arrangeTracks} from "../timeline/tracks.ts";
import {validateChannelKeyframes} from "../timeline/keyframes.ts";
import {roomDimensions} from "./room.ts";
import {validSceneMaterials} from "./scene-materials.ts";
import {validCanvasObjects} from "./canvas.ts";
import {stageSettings} from "./stage.ts";
import {isRoomPresetId} from "./room-presets.js";
import type {Cue} from "../timeline/types.ts";

export const CURRENT_SCHEMA_VERSION = 1;

type UnknownRecord = Record<string, unknown>;

export interface ProjectDocument {
  id: string;
  schemaVersion: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  preferences: {locale: string; theme: string; renderingQuality: string};
  palettes: unknown[];
  scenes: unknown[];
  fixtures: unknown[];
  fixtureGroups: unknown[];
  patches: unknown[];
  cues: unknown[];
  assets: unknown[];
  history: unknown[];
}

export interface CreateProjectOptions {
  id?: string;
  name?: string;
}

export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function records(value: unknown): UnknownRecord[] | null {
  return Array.isArray(value) ? value.map((item) => asRecord(item) ?? {}) : null;
}

export function createProject({id = crypto.randomUUID(), name = "Untitled lighting project"}: CreateProjectOptions = {}): ProjectDocument {
  const now = new Date().toISOString();
  return {
    id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name,
    description: "",
    createdAt: now,
    updatedAt: now,
    preferences: {locale: "en", theme: "dark", renderingQuality: "high"},
    palettes: [], scenes: [], fixtures: [], fixtureGroups: [], patches: [], cues: [], assets: [], history: [],
  };
}

export function validateProject(input: unknown): ProjectValidationResult {
  const errors: string[] = [];
  const project = asRecord(input) ?? {};
  if (project.fixtureGroups !== undefined && !validateFixtureGroups(project.fixtureGroups, Array.isArray(project.fixtures) ? project.fixtures : [])) errors.push("Fixture groups require unique identities, names and existing fixture members.");
  if (!asRecord(input)) errors.push("Project must be an object.");
  if (project.schemaVersion !== CURRENT_SCHEMA_VERSION) errors.push("Unsupported project schema version.");
  if (typeof project.id !== "string" || !project.id.trim() || typeof project.name !== "string" || !project.name.trim()) errors.push("Project needs a string id and a nonempty name.");
  for (const key of ["palettes", "scenes", "fixtures", "patches", "cues", "assets", "history"]) {
    if (!Array.isArray(project[key])) errors.push(`Project.${key} must be an array.`);
  }

  const palettes = records(project.palettes);
  if (Array.isArray(project.palettes) && palettes) {
    const paletteIds = new Set<string>();
    for (const palette of palettes) {
      if (typeof palette.id !== "string" || !palette.id.trim() || paletteIds.has(palette.id) || typeof palette.name !== "string" || !palette.name.trim() || !Array.isArray(palette.colors) || !palette.colors.length) {
        errors.push("Each palette needs an id, name, and nonempty colors array.");
        continue;
      }
      paletteIds.add(palette.id);
      const colorIds = new Set<string>();
      for (const colorValue of palette.colors as unknown[]) {
        const color = asRecord(colorValue);
        if (color?.opacity !== undefined && (typeof color.opacity !== "number" || !Number.isFinite(color.opacity) || color.opacity < 0 || color.opacity > 1)) errors.push("Color opacity must be from 0 to 1.");
        if (!color || typeof color.id !== "string" || !color.id.trim() || colorIds.has(color.id) || typeof color.name !== "string" || typeof color.hex !== "string" || !/^#[0-9a-f]{6}$/i.test(color.hex) || typeof color.locked !== "boolean") errors.push("Palette colors require unique ids, names, six-digit HEX values, and boolean locks.");
        if (typeof color?.id === "string") colorIds.add(color.id);
      }
    }
  }

  const fixtures = records(project.fixtures);
  const cues = records(project.cues);
  if (Array.isArray(project.cues) && cues) {
    try { arrangeTracks(cues as unknown as Cue[]); } catch { errors.push("Cue track scheduling is invalid."); }
    const cueIds = new Set<string>();
    const fixtureIds = new Set((fixtures ?? []).map((fixture) => fixture.id));
    for (const cue of cues) {
      if (typeof cue.id !== "string" || !cue.id.trim() || cueIds.has(cue.id) || typeof cue.name !== "string" || !cue.name.trim()) errors.push("Cues require unique ids and nonempty names.");
      if (typeof cue.id === "string") cueIds.add(cue.id);
      if (!validateChannelKeyframes(cue as unknown as Cue)) errors.push("Cue channel keyframes are invalid.");
      const duration = cue.duration, fade = cue.fade, delay = cue.delay ?? 0, fadeOut = cue.fadeOut ?? 0;
      if (![duration, fade, delay, fadeOut].every((value) => typeof value === "number" && Number.isFinite(value)) || typeof duration !== "number" || typeof fade !== "number" || typeof delay !== "number" || typeof fadeOut !== "number" || duration <= 0 || fade < 0 || delay < 0 || fadeOut < 0 || delay + fade + fadeOut > duration) errors.push("Cue timing is invalid.");
      if (!Array.isArray(cue.targets)) { errors.push("Cue targets must be an array."); continue; }
      const targetIds = new Set<unknown>();
      for (const targetValue of cue.targets as unknown[]) {
        const target = asRecord(targetValue);
        if (target && (!fixtureIds.has(target.fixtureId) || targetIds.has(target.fixtureId))) errors.push("Cue targets require unique existing fixture references.");
        if (target) targetIds.add(target.fixtureId);
        const properties = asRecord(target?.properties);
        if (!target || typeof target.fixtureId !== "string" || !properties || !Object.values(properties).every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255)) errors.push("Cue targets require fixture ids and DMX channel values from 0 to 255.");
      }
    }
  }

  if (Array.isArray(project.fixtures) && fixtures) {
    const fixtureIds = new Set<string>();
    for (const fixture of fixtures) {
      if (typeof fixture.id !== "string" || !fixture.id.trim() || fixtureIds.has(fixture.id) || typeof fixture.name !== "string" || typeof fixture.profileId !== "string" || typeof fixture.modeId !== "string") errors.push("Fixtures require unique ids, names, profiles, and modes.");
      if (typeof fixture.id === "string") fixtureIds.add(fixture.id);
      const profile = fixtureProfiles.find((item) => item.id === fixture.profileId);
      const mode = profile?.modes.find((item) => item.id === fixture.modeId);
      if (!mode) errors.push("Fixture profile or mode is unsupported.");
      const transform = asRecord(fixture.transform);
      if (fixture.transform && (!transform || !Object.entries(transform).every(([key, value]) => ["x", "y", "z", "rotation"].includes(key) && typeof value === "number" && Number.isFinite(value)))) errors.push("Fixture positions and rotations must be finite numbers.");
      const properties = asRecord(fixture.properties);
      if (!properties || !Object.values(properties).every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255)) errors.push("Fixture channel values must be integers from 0 to 255.");
      const patchValue = fixture.patchAssignment;
      const patch = asRecord(patchValue);
      if (patchValue && !patch) errors.push("Fixture patch exceeds valid universe or address bounds.");
      if (patch && mode && patch.channelFootprint !== mode.channels.length) errors.push("Fixture patch footprint does not match its mode.");
      if (patch) {
        if (patch.fixtureId !== fixture.id) errors.push("Fixture patch must reference its owning fixture.");
        for (const other of fixtures) {
          const existing = asRecord(other.patchAssignment);
          if (!existing || other === fixture || existing.universe !== patch.universe) continue;
          if (typeof patch.startAddress === "number" && typeof patch.channelFootprint === "number" && typeof existing.startAddress === "number" && typeof existing.channelFootprint === "number" && patch.startAddress <= existing.startAddress + existing.channelFootprint - 1 && existing.startAddress <= patch.startAddress + patch.channelFootprint - 1) errors.push("Imported fixture patches overlap.");
        }
      }
      if (patch && (typeof patch.universe !== "number" || !Number.isInteger(patch.universe) || patch.universe < 1 || typeof patch.startAddress !== "number" || !Number.isInteger(patch.startAddress) || patch.startAddress < 1 || typeof patch.channelFootprint !== "number" || !Number.isInteger(patch.channelFootprint) || patch.channelFootprint < 1 || patch.startAddress + patch.channelFootprint - 1 > 512)) errors.push("Fixture patch exceeds valid universe or address bounds.");
    }
  }

  const scenes = records(project.scenes);
  if (Array.isArray(project.scenes) && scenes) {
    const sceneIds = new Set<string>();
    for (const scene of scenes) {
      if (typeof scene.id !== "string" || !scene.id.trim() || sceneIds.has(scene.id) || typeof scene.name !== "string" || !scene.name.trim()) errors.push("Scenes require unique ids and nonempty names.");
      if (typeof scene.id === "string") sceneIds.add(scene.id);
      try { stageSettings(scene.stage); } catch { errors.push("Scene stage platform is invalid."); }
      if (!validCanvasObjects(scene.canvasObjects)) errors.push("Scene canvas objects are invalid.");
      if (!validSceneMaterials(scene.materials)) errors.push("Scene materials require known surfaces and six-digit HEX colors.");
      try { roomDimensions(scene.room); } catch { errors.push("Scene room dimensions are invalid."); }
      const visibility = asRecord(scene.visibility);
      if (scene.visibility !== undefined && (!visibility || !Object.entries(visibility).every(([key, value]) => ["lighting", "props", "palette"].includes(key) && typeof value === "boolean"))) errors.push("Scene visibility requires boolean layer settings.");
      if (typeof scene.materialColor !== "string" || !/^#[0-9a-f]{6}$/i.test(scene.materialColor)) errors.push("Scene material color must be a six-digit HEX value.");
      if (scene.roomType !== undefined && !isRoomPresetId(scene.roomType)) errors.push("Scene room type is unsupported.");
      if (scene.ambience !== undefined) { const ambience=asRecord(scene.ambience); if (!ambience || typeof ambience.color !== "string" || !/^#[0-9a-f]{6}$/i.test(ambience.color) || typeof ambience.intensity !== "number" || !Number.isFinite(ambience.intensity) || ambience.intensity<0 || ambience.intensity>1) errors.push("Scene ambience requires a HEX color and intensity between zero and one."); }
    }
  }
  return {valid: errors.length === 0, errors};
}

