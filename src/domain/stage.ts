export interface StageSettings {enabled:boolean;x:number;y:number;z:number;width:number;height:number;depth:number;color:string;}

export function stageSettings(input: unknown={enabled:false,x:-3,y:0,z:-1.5,width:6,height:.15,depth:4.5,color:"#303749"}): StageSettings {
  const value=input as StageSettings;
  if (!value || typeof value!=="object" || Array.isArray(value) || typeof value.enabled!=="boolean" || ![value.x,value.y,value.z].every((number)=>Number.isFinite(number) && Math.abs(number)<=10000) || ![value.width,value.depth].every((number)=>Number.isFinite(number) && number>=.1 && number<=50) || !Number.isFinite(value.height) || value.height<.01 || value.height>5 || typeof value.color!=="string" || !/^#[0-9a-f]{6}$/i.test(value.color)) throw new Error("Invalid stage platform settings.");
  return structuredClone(value);
}
export function updateStage<T extends object>(scene:T,settings:unknown) {return {...structuredClone(scene),stage:stageSettings(settings)};}
