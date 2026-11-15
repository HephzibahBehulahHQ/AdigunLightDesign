import {createFixture,patchFixture} from "../dmx/engine.js";
import {fixturePlacementForRoom} from "./fixture-placement.js";
import {roomDimensions} from "./room.js";

export const roomLightingLooks=Object.freeze([
  {id:"warm-welcome",name:"Warm welcome",materials:{wall:"#40313C",floor:"#563C32",ceiling:"#1A1720"},materialColor:"#E7A45B",ambience:{color:"#FFD5A8",intensity:.24},rgb:[255,166,91],dimmer:220},
  {id:"bright-daylight",name:"Bright daylight",materials:{wall:"#A5B0B1",floor:"#747A75",ceiling:"#D9DFD9"},materialColor:"#F0D27A",ambience:{color:"#FFF5DE",intensity:.3},rgb:[255,232,187],dimmer:190},
  {id:"cool-focus",name:"Cool focus",materials:{wall:"#566C7B",floor:"#394A58",ceiling:"#A5B8C2"},materialColor:"#67CFE2",ambience:{color:"#C8EEFF",intensity:.22},rgb:[126,203,255],dimmer:235},
  {id:"ocean-calm",name:"Ocean calm",materials:{wall:"#315E70",floor:"#23495B",ceiling:"#739AA0"},materialColor:"#41BCD0",ambience:{color:"#76E2EB",intensity:.24},rgb:[54,191,222],dimmer:190},
  {id:"forest-evening",name:"Forest evening",materials:{wall:"#344B3D",floor:"#293D32",ceiling:"#788778"},materialColor:"#83AF78",ambience:{color:"#B9D99A",intensity:.2},rgb:[130,202,121],dimmer:180},
  {id:"golden-hour",name:"Golden hour",materials:{wall:"#72513E",floor:"#543B30",ceiling:"#B28A5D"},materialColor:"#E8A54F",ambience:{color:"#FFC06D",intensity:.28},rgb:[255,151,55],dimmer:225},
  {id:"rose-lounge",name:"Rose lounge",materials:{wall:"#684052",floor:"#49303E",ceiling:"#A1747C"},materialColor:"#E77BA9",ambience:{color:"#F7B4CC",intensity:.24},rgb:[255,93,155],dimmer:195},
  {id:"violet-club",name:"Violet club",materials:{wall:"#382C59",floor:"#241E3B",ceiling:"#62528B"},materialColor:"#9A72E8",ambience:{color:"#B69AFF",intensity:.22},rgb:[142,78,255],dimmer:235},
  {id:"cyan-modern",name:"Cyan modern",materials:{wall:"#345C66",floor:"#263E49",ceiling:"#8AB6BA"},materialColor:"#43D4DD",ambience:{color:"#8DF0EE",intensity:.23},rgb:[25,211,230],dimmer:210},
  {id:"soft-lavender",name:"Soft lavender",materials:{wall:"#62566F",floor:"#453C54",ceiling:"#B4A7BC"},materialColor:"#C2A6E8",ambience:{color:"#E6D7FF",intensity:.2},rgb:[192,142,255],dimmer:165},
  {id:"sunset-glow",name:"Sunset glow",materials:{wall:"#8B4D49",floor:"#55373C",ceiling:"#C68169"},materialColor:"#F07855",ambience:{color:"#FF9C72",intensity:.27},rgb:[255,91,57],dimmer:220},
  {id:"deep-blue-night",name:"Deep blue night",materials:{wall:"#26395D",floor:"#1D2945",ceiling:"#526A91"},materialColor:"#4C83D4",ambience:{color:"#7FA8F2",intensity:.17},rgb:[51,106,255],dimmer:155},
  {id:"amber-dining",name:"Amber dining",materials:{wall:"#66503A",floor:"#403329",ceiling:"#A7885A"},materialColor:"#E0AC48",ambience:{color:"#FFD27F",intensity:.26},rgb:[255,181,73],dimmer:175},
  {id:"mint-fresh",name:"Mint fresh",materials:{wall:"#54766E",floor:"#344F49",ceiling:"#A0C1B5"},materialColor:"#7ED8BA",ambience:{color:"#B8F2DD",intensity:.23},rgb:[93,234,184],dimmer:205},
  {id:"coral-party",name:"Coral party",materials:{wall:"#773F46",floor:"#402A39",ceiling:"#A76569"},materialColor:"#FA7D6C",ambience:{color:"#FF9A87",intensity:.24},rgb:[255,61,99],dimmer:245},
  {id:"silver-moon",name:"Silver moon",materials:{wall:"#59616D",floor:"#343B4A",ceiling:"#A8B0BA"},materialColor:"#B9C8D7",ambience:{color:"#D9E8FF",intensity:.18},rgb:[167,204,255],dimmer:145},
  {id:"magenta-stage",name:"Magenta stage",materials:{wall:"#5B315E",floor:"#30223F",ceiling:"#8A5590"},materialColor:"#E44DCC",ambience:{color:"#F584E8",intensity:.24},rgb:[255,40,211],dimmer:250},
  {id:"teal-spa",name:"Teal spa",materials:{wall:"#416E70",floor:"#2E5358",ceiling:"#8EBCB8"},materialColor:"#67C6B8",ambience:{color:"#A9EEE0",intensity:.25},rgb:[72,205,185],dimmer:170},
  {id:"candlelight",name:"Candlelight",materials:{wall:"#574139",floor:"#342B29",ceiling:"#806348"},materialColor:"#D5914C",ambience:{color:"#FFC16D",intensity:.16},rgb:[255,117,38],dimmer:125},
  {id:"high-contrast",name:"High contrast",materials:{wall:"#28313D",floor:"#101722",ceiling:"#64717C"},materialColor:"#58B7E8",ambience:{color:"#D4EFFF",intensity:.32},rgb:[213,240,255],dimmer:255}
]);

export function isRoomLightingLookIndex(index){return Number.isInteger(index)&&index>=0&&index<roomLightingLooks.length;}

function withLookChannels(fixture,look){
  const [red,green,blue]=look.rgb;
  const properties={...fixture.properties,dimmer:look.dimmer,red,green,blue};
  if(Object.hasOwn(properties,"strobe"))properties.strobe=0;
  return {...fixture,properties};
}

export function createRoomStarterLighting(scene,allFixtures=[],lookIndex=0){
  if(!isRoomLightingLookIndex(lookIndex))throw new Error("Choose a supported room lighting look.");
  const look=roomLightingLooks[lookIndex],{width}=roomDimensions(scene.room),washCount=width>=8?3:width>=4?2:1;
  const profiles=[...Array(washCount).fill("generic-rgb-wash"),"generic-led-strip-rgb"];
  let fixtures=[...allFixtures];
  for(const profileId of profiles){
    const created=createFixture(fixtures.length+1,profileId);
    const roomFixtures=fixtures.filter(fixture=>fixture.sceneId===scene.id);
    const placed={...created,sceneId:scene.id,transform:{...created.transform,...fixturePlacementForRoom(profileId,scene.room,roomFixtures)}};
    fixtures=patchFixture([...fixtures,withLookChannels(placed,look)],placed.id);
  }
  return applyRoomLightingLook(scene,fixtures,lookIndex);
}

export function applyRoomLightingLook(scene,allFixtures,lookIndex,legacySceneId){
  if(!isRoomLightingLookIndex(lookIndex))throw new Error("Choose a supported room lighting look.");
  const look=roomLightingLooks[lookIndex],sceneCopy=structuredClone(scene);
  sceneCopy.materials={...sceneCopy.materials,...look.materials};
  sceneCopy.materialColor=look.materialColor;
  sceneCopy.ambience={...look.ambience};
  sceneCopy.lightingLookIndex=lookIndex;
  sceneCopy.lightingLookCustomized=false;
  const fixtures=allFixtures.map(fixture=>(fixture.sceneId===scene.id||(legacySceneId===scene.id&&fixture.sceneId===undefined))?withLookChannels(fixture,look):fixture);
  return {scene:sceneCopy,fixtures};
}

