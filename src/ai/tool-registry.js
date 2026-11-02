const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const integer = (value) => Number.isInteger(value);

export const toolRegistry = {
  create_palette:{ required:{ name:text } }, update_swatch:{ required:{ paletteId:text, swatchId:text } }, lock_swatch:{ required:{ paletteId:text, swatchId:text } }, generate_harmony:{ required:{ seed:text, type:text } }, check_contrast:{ required:{ foreground:text, background:text } }, extract_image_palette:{ required:{ assetId:text } }, create_scene:{ required:{ name:text } }, add_object:{ required:{ sceneId:text, type:text } }, add_fixture:{ required:{ profileId:text } }, update_fixture:{ required:{ fixtureId:text } }, patch_fixture:{ required:{ fixtureId:text, universe:integer, startAddress:integer } }, create_cue:{ required:{ name:text } }, update_cue:{ required:{ cueId:text } }, apply_palette_to_material:{ required:{ paletteId:text, materialId:text } }, apply_palette_to_lights:{ required:{ paletteId:text } }, export_project:{ required:{ format:text } }
};

export function validateToolCall(call) {
  const errors=[];
  if (!object(call) || call.type !== "adigunlightdesign.tool-call" || call.version !== 1) errors.push("Tool call must use the v1 AdigunLightDesign envelope.");
  const definition=typeof call?.name==="string" && Object.hasOwn(toolRegistry,call.name) ? toolRegistry[call.name] : null; if (!definition) errors.push("Tool is not registered.");
  if (!object(call?.payload)) errors.push("Tool payload must be an object.");
  if (definition && object(call?.payload)) for (const [key, valid] of Object.entries(definition.required)) if (!valid(call.payload[key])) errors.push(`Invalid ${key}.`);
  return { valid:errors.length===0, errors };
}

export function previewToolCall(call) {
  const validation=validateToolCall(call); if(!validation.valid) return { ...validation, preview:null, requiresConfirmation:false };
  const mutating=!['check_contrast','export_project'].includes(call.name);
  return { valid:true, errors:[], requiresConfirmation:mutating, preview:{ tool:call.name, payload:structuredClone(call.payload), mode:mutating?"proposed project mutation":"read-only/export" } };
}
