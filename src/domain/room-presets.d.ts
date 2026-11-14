export type RoomPresetId =
  | "living-room" | "library" | "kitchen" | "bathroom" | "toilet"
  | "garage" | "hallway" | "swimming-pool" | "disco-party" | "clubhouse";
export interface RoomPreset {
  readonly id: RoomPresetId;
  readonly names: readonly [string,string,string,string];
  readonly room: Readonly<{width:number;height:number;depth:number}>;
  readonly materialColor: string;
  readonly materials: Readonly<{wall:string;floor:string;ceiling:string}>;
  readonly ambience: Readonly<{color:string;intensity:number}>;
}
export const roomPresets: readonly RoomPreset[];
export const defaultRoomType: RoomPresetId;
export function roomPreset(id?: string): RoomPreset;
export function isRoomPresetId(id: unknown): id is RoomPresetId;
export function roomPresetOptions(locale?: string): Array<{id:RoomPresetId;label:string}>;
export function createRoomScene(presetId:string,options?:{id?:string;name?:string}): {
  id:string;name:string;roomType:RoomPresetId;materialColor:string;
  room:{width:number;height:number;depth:number};materials:{wall:string;floor:string;ceiling:string};
  ambience:{color:string;intensity:number};canvasObjects:never[];
};
export function roomAmbience(scene: {roomType?:string;ambience?:{color:string;intensity:number}}): {color:string;intensity:number};
export function roomPresetName(id?:string,locale?:string): string;
