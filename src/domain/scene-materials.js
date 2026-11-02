import { normalizeHex } from "./color-engine.js";
export function validSceneMaterials(materials) {
  return materials===undefined || Boolean(materials && typeof materials==="object" && !Array.isArray(materials) && Object.entries(materials).every(([key,value])=>["wall","floor","ceiling"].includes(key) && typeof value==="string" && /^#[0-9a-f]{6}$/i.test(value)));
}
export function applySceneMaterial(scene,target,hex) {
  if (!["accent","wall","floor","ceiling"].includes(target)) throw new Error("Unsupported scene material target.");
  const result=structuredClone(scene),color=normalizeHex(hex);
  if (target==="accent") result.materialColor=color;
  else result.materials={...result.materials,[target]:color};
  return result;
}
