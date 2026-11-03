import { normalizeHex } from "./color-engine.ts";
export type SurfaceTarget="wall"|"floor"|"ceiling";
export type SceneMaterials=Partial<Record<SurfaceTarget,string>>;
export interface MaterialScene {materialColor:string;materials?:SceneMaterials;}
export function validSceneMaterials(materials:unknown):materials is SceneMaterials|undefined {
  return materials===undefined || Boolean(materials && typeof materials==="object" && !Array.isArray(materials) && Object.entries(materials).every(([key,value])=>["wall","floor","ceiling"].includes(key) && typeof value==="string" && /^#[0-9a-f]{6}$/i.test(value)));
}
export function applySceneMaterial<T extends MaterialScene>(scene:T,target:SurfaceTarget|"accent",hex:unknown):T {
  if (!["accent","wall","floor","ceiling"].includes(target)) throw new Error("Unsupported scene material target.");
  const result=structuredClone(scene),color=normalizeHex(hex);
  if (!color) throw new Error("Invalid scene material color.");
  if (target==="accent") result.materialColor=color;
  else result.materials={...result.materials,[target]:color};
  return result;
}
