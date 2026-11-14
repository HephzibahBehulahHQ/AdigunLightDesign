const presets=[
{id:"living-room",names:["Living room","Wohnzimmer","Yàrá ìgbé","Sitting room"],room:{width:10,height:4,depth:8},materialColor:"#C21888",materials:{wall:"#27324A",floor:"#4A3431",ceiling:"#101726"},ambience:{color:"#FFD2A0",intensity:.22}},
{id:"library",names:["Library","Bibliothek","Ilé ìkàwé","Library"],room:{width:8,height:3.6,depth:7},materialColor:"#D4AF37",materials:{wall:"#302B35",floor:"#624533",ceiling:"#211C26"},ambience:{color:"#FFD7A1",intensity:.2}},
{id:"kitchen",names:["Kitchen","Küche","Ilé ìdáná","Kitchen"],room:{width:6,height:3,depth:5},materialColor:"#22D3EE",materials:{wall:"#89999C",floor:"#596168",ceiling:"#CBD0CD"},ambience:{color:"#FFF0D2",intensity:.16}},
{id:"bathroom",names:["Bathroom","Badezimmer","Yàrá ìwẹ̀","Bathroom"],room:{width:4.5,height:2.8,depth:4},materialColor:"#22D3EE",materials:{wall:"#627E89",floor:"#526B76",ceiling:"#9AADB0"},ambience:{color:"#D7F4FF",intensity:.18}},
{id:"toilet",names:["Toilet","Toilette","Ilé ìgbọ̀nsẹ̀","Toilet"],room:{width:2.4,height:2.7,depth:2},materialColor:"#9FC8D3",materials:{wall:"#72858B",floor:"#56656C",ceiling:"#AEB9BA"},ambience:{color:"#E5F4F5",intensity:.16}},
{id:"garage",names:["Garage","Garage","Garáàsì","Garage"],room:{width:8,height:3.4,depth:7},materialColor:"#F59E0B",materials:{wall:"#394756",floor:"#41464C",ceiling:"#262E36"},ambience:{color:"#D6E4F2",intensity:.14}},
{id:"hallway",names:["Hallway","Flur","Gbùngbùn","Hall"],room:{width:7,height:3,depth:3},materialColor:"#D4AF37",materials:{wall:"#50414A",floor:"#735445",ceiling:"#29232C"},ambience:{color:"#FFD3A0",intensity:.17}},
{id:"swimming-pool",names:["Swimming pool","Schwimmbad","Adágún omi","Swimming pool"],room:{width:12,height:4.5,depth:8},materialColor:"#22D3EE",materials:{wall:"#345D72",floor:"#21576E",ceiling:"#1E3544"},ambience:{color:"#55D7FF",intensity:.3}},
{id:"disco-party",names:["Disco / party room","Disco / Partyraum","Yàrá ayẹyẹ","Disco / party room"],room:{width:10,height:5,depth:10},materialColor:"#D946EF",materials:{wall:"#302044",floor:"#241832",ceiling:"#151323"},ambience:{color:"#E85AEF",intensity:.28}},
{id:"clubhouse",names:["Clubhouse","Clubhaus","Ilé ẹgbẹ́","Club house"],room:{width:12,height:4.2,depth:9},materialColor:"#F59E0B",materials:{wall:"#3C4850",floor:"#4D382D",ceiling:"#222C35"},ambience:{color:"#FFC56E",intensity:.23}}
];
export const roomPresets=Object.freeze(presets.map(p=>Object.freeze({...p,room:Object.freeze(p.room),materials:Object.freeze(p.materials),ambience:Object.freeze(p.ambience),names:Object.freeze(p.names)})));
const byId=new Map(roomPresets.map(p=>[p.id,p]));
export const defaultRoomType="living-room";
export function roomPreset(id=defaultRoomType){return byId.get(id)??byId.get(defaultRoomType);}
export function isRoomPresetId(id){return byId.has(id);}
export function roomPresetOptions(locale="en"){const index=({en:0,de:1,yo:2,pcm:3})[locale]??0;return roomPresets.map(p=>({id:p.id,label:p.names[index]}));}
export function createRoomScene(presetId,{id=crypto.randomUUID(),name}={}){const preset=byId.get(presetId);if(!preset)throw new Error("Choose a supported room template.");return {id,name:name?.trim()||preset.names[0],roomType:preset.id,materialColor:preset.materialColor,room:{...preset.room},materials:{...preset.materials},ambience:{...preset.ambience},canvasObjects:[]};}
export function roomAmbience(scene){return scene?.ambience ? {...scene.ambience} : {...roomPreset(scene?.roomType).ambience};}
export function roomPresetName(id,locale="en"){return roomPreset(id).names[({en:0,de:1,yo:2,pcm:3})[locale]??0];}
