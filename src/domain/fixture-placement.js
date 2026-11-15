import {roomDimensions} from "./room.js";

export function fixturePlacementForRoom(profileId,room,existingFixtures=[]){
  const {width,height,depth}=roomDimensions(room),isLedStrip=profileId==="generic-led-strip-rgb";
  const columns=Math.max(1,Math.floor(width/1.5)),rows=Math.max(1,Math.floor(depth/1.5));
  const preferred=isLedStrip ? [0,height/2,depth/2-.06] : [0,height-.35,0];
  const candidates=[];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const x=(column-(columns-1)/2)*width/columns;
    const z=isLedStrip ? depth/2-.06 : (row-(rows-1)/2)*depth/rows;
    const y=isLedStrip ? height/2 : height-.35;
    const position={x,y,z,rotation:0};
    const distance=Math.hypot(x-preferred[0],y-preferred[1],z-preferred[2]);
    candidates.push({position,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance||a.position.x-b.position.x||a.position.z-b.position.z);
  const occupied=existingFixtures.map(fixture=>fixture.transform).filter(transform=>transform&&[transform.x,transform.y,transform.z].every(Number.isFinite));
  let fallback=candidates[0]?.position,bestDistance=-1;
  for(const {position} of candidates){
    const clearance=occupied.length ? Math.min(...occupied.map(other=>Math.hypot(position.x-other.x,position.y-other.y,position.z-other.z))) : Infinity;
    if(clearance>=1)return position;
    if(clearance>bestDistance){bestDistance=clearance;fallback=position;}
  }
  if(!fallback)throw new Error("Room has no valid fixture placement.");
  return fallback;
}
