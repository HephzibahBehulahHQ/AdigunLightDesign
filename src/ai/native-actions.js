import { validateToolCall } from "./tool-registry.js";
import { validateProject } from "../domain/project.js";
import { commitTransaction } from "../domain/history.js";
import { createFixture,fixtureProfiles,patchFixture,updateFixture } from "../dmx/engine.js";
import { createCue,editCue } from "../timeline/engine.js";
import { addCanvasObject } from "../domain/canvas.js";
import { starterPalette,rerollUnlocked,updateSwatch } from "../domain/palette-store.js";
import { normalizeHex,hexToRgb } from "../domain/color-engine.js";
import { applySceneMaterial } from "../domain/scene-materials.js";
import { extractImagePalette } from "../domain/image-palette.ts";

function paletteById(project,id) {
  const palette=project.palettes.find((item)=>item.id===id);
  if (!palette) throw new Error("Palette was not found.");
  return palette;
}

const handlers={
  extract_image_palette(project,payload,context) {
    const asset=context.imageAssets?.get(payload.assetId);
    if(!asset)throw new Error("Approved decoded image asset is unavailable. Select the local image again.");
    const extracted=extractImagePalette(asset.pixels,{count:payload.count ?? 5});
    if(!extracted.length)throw new Error("Image asset has no visible colors.");
    project.palettes.push({id:crypto.randomUUID(),name:payload.name ?? asset.name ?? "Image palette",harmonyType:"image",sourceAssetId:payload.assetId,colors:extracted.map((color,index)=>({id:crypto.randomUUID(),name:`Image ${index+1}`,hex:color.hex,locked:false}))});
  },
  create_palette(project,payload) {
    let colors=structuredClone(starterPalette);
    if (payload.colors!==undefined) {
      if (!Array.isArray(payload.colors) || !payload.colors.length || payload.colors.length>256) throw new Error("Palette needs 1–256 HEX colors.");
      colors=payload.colors.map((value,index)=>{const hex=normalizeHex(value);if(!hex)throw new Error("Invalid palette color.");return {id:crypto.randomUUID(),name:`Color ${index+1}`,hex,locked:false};});
    }
    project.palettes.push({id:crypto.randomUUID(),name:payload.name,harmonyType:"custom",colors});
  },
  update_swatch(project,payload) {
    const palette=paletteById(project,payload.paletteId),swatch=palette.colors.find((item)=>item.id===payload.swatchId),changes=payload.changes;
    if (!swatch || !changes || typeof changes!=="object" || Array.isArray(changes) || !Object.keys(changes).every((key)=>["name","hex","opacity"].includes(key))) throw new Error("Invalid swatch update.");
    if (swatch.locked && (changes.hex!==undefined || changes.opacity!==undefined)) throw new Error("Unlock the swatch before changing its color.");
    if (changes.hex!==undefined && !normalizeHex(changes.hex)) throw new Error("Invalid swatch color.");
    palette.colors=updateSwatch(palette.colors,swatch.id,changes);
  },
  lock_swatch(project,payload) {
    const palette=paletteById(project,payload.paletteId),locked=payload.locked ?? true;
    if (typeof locked!=="boolean" || !palette.colors.some((item)=>item.id===payload.swatchId)) throw new Error("Invalid swatch lock.");
    palette.colors=updateSwatch(palette.colors,payload.swatchId,{locked});
  },
  generate_harmony(project,payload) {
    if (!normalizeHex(payload.seed) || !["analogous","complementary","splitComplementary","triadic","tetradic","square","monochromatic"].includes(payload.type)) throw new Error("Unsupported harmony request.");
    const palette=paletteById(project,payload.paletteId ?? project.palettes[0]?.id);
    palette.colors=rerollUnlocked(palette.colors,payload.seed,payload.type);palette.harmonyType=payload.type;
  },
  apply_palette_to_material(project,payload) {
    const palette=paletteById(project,payload.paletteId),swatch=payload.swatchId ? palette.colors.find((item)=>item.id===payload.swatchId) : palette.colors[0];
    const index=payload.sceneId ? project.scenes.findIndex((scene)=>scene.id===payload.sceneId) : 0;
    if (!swatch || !project.scenes[index]) throw new Error("Material scene or swatch was not found.");
    project.scenes[index]=applySceneMaterial(project.scenes[index],payload.materialId,swatch.hex);
  },
  apply_palette_to_lights(project,payload) {
    const palette=paletteById(project,payload.paletteId);
    if (payload.fixtureIds!==undefined && (!Array.isArray(payload.fixtureIds) || !payload.fixtureIds.every((id)=>project.fixtures.some((fixture)=>fixture.id===id)))) throw new Error("Invalid fixture selection.");
    let index=0;
    project.fixtures=project.fixtures.map((fixture)=>{
      if(payload.fixtureIds && !payload.fixtureIds.includes(fixture.id))return fixture;
      const rgb=hexToRgb(palette.colors[index++%palette.colors.length].hex);
      return {...fixture,properties:{...fixture.properties,red:rgb.r,green:rgb.g,blue:rgb.b}};
    });
  },
  add_fixture(project,payload) {
    if (!fixtureProfiles.some((profile)=>profile.id===payload.profileId)) throw new Error("Unsupported fixture profile.");
    const fixture=createFixture(project.fixtures.length+1,payload.profileId);
    project.fixtures=patchFixture([...project.fixtures,fixture],fixture.id);
  },
  update_fixture(project,payload) {project.fixtures=updateFixture(project.fixtures,payload.fixtureId,payload.changes ?? {});},
  patch_fixture(project,payload) {project.fixtures=patchFixture(project.fixtures,payload.fixtureId,payload.universe,payload.startAddress);},
  create_cue(project,payload) {project.cues.push(createCue(project.fixtures,{name:payload.name,duration:payload.duration ?? 5,fade:payload.fade ?? 1,delay:payload.delay ?? 0,fadeOut:payload.fadeOut ?? 0}));},
  update_cue(project,payload) {
    if (!project.cues.some((cue)=>cue.id===payload.cueId)) throw new Error("Cue was not found.");
    const changes=payload.changes ?? {};
    if (!changes || typeof changes!=="object" || Array.isArray(changes) || !Object.keys(changes).every((key)=>["name","duration","fade","delay","fadeOut"].includes(key))) throw new Error("Unsupported cue changes.");
    project.cues=project.cues.map((cue)=>cue.id===payload.cueId ? editCue(cue,changes) : cue);
  },
  create_scene(project,payload) {project.scenes.push({id:crypto.randomUUID(),name:payload.name,materialColor:"#C21888"});},
  add_object(project,payload) {
    const index=project.scenes.findIndex((scene)=>scene.id===payload.sceneId);
    if (index<0) throw new Error("Scene was not found.");
    project.scenes[index]=addCanvasObject(project.scenes[index],payload.type,payload.fill ?? "#2196F3",{text:payload.text ?? "Text"});
  }
};
export const supportedNativeActions=Object.freeze(Object.keys(handlers));

export function commitNativeToolAction(state,call,{confirmed=false,imageAssets}={}) {
  const validation=validateToolCall(call);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  if (!Object.hasOwn(handlers,call.name)) throw new Error("This registered tool has no native executor yet.");
  if (confirmed!==true) throw new Error("Project action requires explicit confirmation.");
  const before=validateProject(state.project);if(!before.valid)throw new Error("Source project is invalid.");
  const result=commitTransaction(state,`lux:${call.name}`,(draft)=>{
    handlers[call.name](draft,structuredClone(call.payload),{imageAssets});
    const after=validateProject(draft);if(!after.valid)throw new Error(after.errors.join(" "));
  });
  return {...result,receipt:{tool:call.name,mode:"local-native-action",physicalOutput:false,historyId:result.project.history.at(-1).id}};
}
