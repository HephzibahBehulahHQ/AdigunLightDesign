import { normalizeHex } from "./color-engine.js";
export function validCanvasObjects(objects) {
  if (objects===undefined) return true;
  if (!Array.isArray(objects) || objects.length>1000) return false;
  const ids=new Set();
  return objects.every((object)=>{
    if (!object || typeof object.id!=="string" || !object.id.trim() || ids.has(object.id) || !["rect","text"].includes(object.type) || ![object.x,object.y].every((value)=>Number.isFinite(value) && Math.abs(value)<=10000) || typeof object.fill!=="string" || !/^#[0-9a-f]{6}$/i.test(object.fill)) return false;
    ids.add(object.id);
    return object.type==="rect" ? [object.width,object.height].every((value)=>Number.isFinite(value) && value>=1 && value<=10000) : typeof object.text==="string" && object.text.length<=2048 && Number.isFinite(object.fontSize) && object.fontSize>=1 && object.fontSize<=300;
  });
}
export function addCanvasObject(scene,type,fill,{id=crypto.randomUUID(),text="Text"}={}) {
  const objects=scene.canvasObjects ?? [],offset=objects.length%8*24;
  const object={id,type,fill:normalizeHex(fill),x:100+offset,y:100+offset,...(type==="rect" ? {width:200,height:120} : {text,fontSize:36})};
  const result={...structuredClone(scene),canvasObjects:[...structuredClone(objects),object]};
  if (!validCanvasObjects(result.canvasObjects)) throw new Error("Invalid canvas object.");
  return result;
}
export function updateCanvasObject(scene,id,changes) {
  if (!scene.canvasObjects?.some((object)=>object.id===id)) throw new Error("Canvas object was not found.");
  const result=structuredClone(scene);
  result.canvasObjects=result.canvasObjects.map((object)=>object.id===id ? {...object,...changes,id:object.id,type:object.type} : object);
  if (!validCanvasObjects(result.canvasObjects)) throw new Error("Invalid canvas object values.");
  return result;
}
