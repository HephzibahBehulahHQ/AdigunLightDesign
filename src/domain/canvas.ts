import { normalizeHex } from "./color-engine.ts";
interface CanvasBase {id:string;x:number;y:number;fill:string;}
export type CanvasObject=(CanvasBase & {type:"rect"|"ellipse";width:number;height:number}) | (CanvasBase & {type:"text";text:string;fontSize:number});
export interface CanvasScene {canvasObjects?:CanvasObject[];}
export type CanvasChanges=Partial<{x:number;y:number;fill:string;width:number;height:number;text:string;fontSize:number}>;
export function validCanvasObjects(objects:unknown):objects is CanvasObject[]|undefined {
  if (objects===undefined) return true;
  if (!Array.isArray(objects) || objects.length>1000) return false;
  const ids=new Set<string>();
  return objects.every((input:unknown)=>{
    const object=input as CanvasObject;
    if (!object || typeof object.id!=="string" || !object.id.trim() || ids.has(object.id) || !["rect","ellipse","text"].includes(object.type) || ![object.x,object.y].every((value)=>Number.isFinite(value) && Math.abs(value)<=10000) || typeof object.fill!=="string" || !/^#[0-9a-f]{6}$/i.test(object.fill)) return false;
    ids.add(object.id);
    return object.type!=="text" ? [object.width,object.height].every((value)=>Number.isFinite(value) && value>=1 && value<=10000) : typeof object.text==="string" && object.text.length<=2048 && Number.isFinite(object.fontSize) && object.fontSize>=1 && object.fontSize<=300;
  });
}
export function addCanvasObject<T extends CanvasScene>(scene:T,type:CanvasObject["type"],fill:unknown,{id=crypto.randomUUID(),text="Text"}:{id?:string;text?:string}={}):T&{canvasObjects:CanvasObject[]} {
  const objects=scene.canvasObjects ?? [],offset=objects.length%8*24;
  const object={id,type,fill:normalizeHex(fill),x:100+offset,y:100+offset,...(type!=="text" ? {width:200,height:120} : {text,fontSize:36})};
  const result={...structuredClone(scene),canvasObjects:[...structuredClone(objects),object]};
  if (!validCanvasObjects(result.canvasObjects)) throw new Error("Invalid canvas object.");
  return {...result,canvasObjects:result.canvasObjects};
}
export function updateCanvasObject<T extends CanvasScene>(scene:T,id:string,changes:CanvasChanges) {
  if (!scene.canvasObjects?.some((object)=>object.id===id)) throw new Error("Canvas object was not found.");
  const result=structuredClone(scene);
  const objects=result.canvasObjects!.map((object)=>object.id===id ? {...object,...changes,id:object.id,type:object.type} : object);
  if (!validCanvasObjects(objects)) throw new Error("Invalid canvas object values.");
  result.canvasObjects=objects;
  return result;
}
export function duplicateCanvasObject<T extends CanvasScene>(scene:T,id:string,newId:string=crypto.randomUUID()) {
  const result=structuredClone(scene),index=result.canvasObjects?.findIndex((object)=>object.id===id) ?? -1;
  if (index<0) throw new Error("Canvas object was not found.");
  const copy=structuredClone(result.canvasObjects![index]!);copy.id=newId;copy.x+=20;copy.y+=20;
  result.canvasObjects!.splice(index+1,0,copy);
  if (!validCanvasObjects(result.canvasObjects)) throw new Error("Invalid canvas copy.");
  return result;
}
export function moveCanvasObject<T extends CanvasScene>(scene:T,id:string,offset:number) {
  if (![-1,1].includes(offset)) throw new Error("Invalid stacking movement.");
  const result=structuredClone(scene),index=result.canvasObjects?.findIndex((object)=>object.id===id) ?? -1;
  if(index<0)throw new Error("Canvas object was not found.");
  const destination=index+offset;
  if(destination>=0 && destination<result.canvasObjects!.length) [result.canvasObjects![index],result.canvasObjects![destination]]=[result.canvasObjects![destination]!,result.canvasObjects![index]!];
  return result;
}
