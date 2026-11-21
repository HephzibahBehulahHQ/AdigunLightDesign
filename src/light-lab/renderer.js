import { studioCameraMatrix,cameraAxisView,cameraPitchLimit,normalizeCameraState,roomFitCameraDistance, hexVector, multiply, viewportProjection, viewportRay, viewportPointOnPlane } from "./math.js";
import { viewportPng } from "../export/viewport.js";
import { pickScenePoint,rayHitDistance,filterOccludedPoints } from "./picking.js";
import { roomDimensions } from "../domain/room.js";
import { getFixtureProfile } from "../dmx/engine.js";
import { previewQuality } from "./quality.js";
import { stageSettings } from "../domain/stage.js";

const vertexSource = `attribute vec3 p;attribute vec3 c;uniform mat4 m;varying vec3 v;void main(){gl_Position=m*vec4(p,1.0);v=c;}`;
const fragmentSource = `precision mediump float;varying vec3 v;uniform float opacity;void main(){gl_FragColor=vec4(v,opacity);}`;

function compile(gl, type, source) { const value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value); if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value)); return value; }
function quad(target, a, b, c, d, colour) { for (const point of [a,b,c,a,c,d]) target.push(...point, ...colour); }
function box(target, x, y, z, w, h, d, colour) { const X=x+w,Y=y+h,Z=z+d, shade=colour.map((value)=>value*.55),mid=colour.map((value)=>value*.78); quad(target,[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],colour);quad(target,[X,y,Z],[x,y,Z],[x,Y,Z],[X,Y,Z],shade);quad(target,[x,y,Z],[X,y,Z],[X,y,z],[x,y,z],mid);quad(target,[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z],colour);quad(target,[x,y,Z],[x,y,z],[x,Y,z],[x,Y,Z],shade);quad(target,[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z],mid); }
function garageWheel(target,x,y,z,radius,width){
  const tire=[.055,.065,.075],side=tire.map(value=>value*.72),hub=[.48,.56,.61],inner=radius*.52,segments=16;
  const point=(axial,r,angle)=>[x+axial,y+Math.cos(angle)*r,z+Math.sin(angle)*r];
  const triangle=(a,b,c,colour)=>target.push(...a,...colour,...b,...colour,...c,...colour);
  for(let index=0;index<segments;index++){
    const a=index*Math.PI*2/segments,b=(index+1)*Math.PI*2/segments;
    quad(target,point(-width/2,radius,a),point(width/2,radius,a),point(width/2,radius,b),point(-width/2,radius,b),index%2?tire:side);
    for(const axial of [-width/2,width/2]){
      const outerA=point(axial,radius,a),outerB=point(axial,radius,b),innerA=point(axial,inner,a),innerB=point(axial,inner,b),centre=[x+axial,y,z];
      quad(target,outerA,outerB,innerB,innerA,side);
      triangle(centre,innerA,innerB,index%2?hub:hub.map(value=>value*.8));
    }
  }
}
function garageFrontWheel(target,x,y,z,radius){
  const tire=[.045,.052,.061],rim=[.43,.51,.56],inner=radius*.56,segments=20,centre=[x,y,z+.008];
  const point=(r,angle)=>[x+Math.cos(angle)*r,y+Math.sin(angle)*r,z];
  const triangle=(a,b,c,colour)=>target.push(...a,...colour,...b,...colour,...c,...colour);
  for(let index=0;index<segments;index++){
    const a=index*Math.PI*2/segments,b=(index+1)*Math.PI*2/segments;
    quad(target,point(radius,a),point(radius,b),point(inner,b),point(inner,a),index%2?tire:tire.map(value=>value*.78));
    triangle(centre,point(inner,a),point(inner,b),index%2?rim:rim.map(value=>value*.8));
  }
}
function scaleGeometryPositions(data,start,end,scaleX,scaleY=scaleX,scaleZ=scaleX) {
  for(let offset=start;offset<end;offset+=6){data[offset]*=scaleX;data[offset+1]*=scaleY;data[offset+2]*=scaleZ;}
}
function sofaCushionPiping(target,x,y,z,width,depth,colour) {
  const inset=.045,line=.012,left=x+inset,right=x+width-inset,front=z+inset,back=z+depth-inset;
  quad(target,[left,y,front],[right,y,front],[right,y,front+line],[left,y,front+line],colour);
  quad(target,[left,y,back-line],[right,y,back-line],[right,y,back],[left,y,back],colour);
  quad(target,[left,y,front+line],[left+line,y,front+line],[left+line,y,back-line],[left,y,back-line],colour);
  quad(target,[right-line,y,front+line],[right,y,front+line],[right,y,back-line],[right-line,y,back-line],colour);
}
export function studioSeatCushion(x,y,z,width,depth,height,colour,columns=10,rows=8) {
  if (![x,y,z,width,depth,height].every(Number.isFinite) || width<=0 || depth<=0 || height<=0 ||
      !Number.isInteger(columns) || columns<2 || columns>32 || !Number.isInteger(rows) || rows<2 || rows>32) {
    throw new Error("Invalid studio cushion geometry.");
  }
  const data=[],sideColour=colour.map(value=>value*.78),bottomColour=colour.map(value=>value*.66);
  const top=(u,v)=>[x+u*width,y+height+.024*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),z+v*depth];
  const base=(u,v)=>[x+u*width,y,z+v*depth];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const u=column/columns,U=(column+1)/columns,v=row/rows,V=(row+1)/rows;
    quad(data,top(u,v),top(U,v),top(U,V),top(u,V),colour);
  }
  for(let column=0;column<columns;column++){
    const u=column/columns,U=(column+1)/columns;
    quad(data,base(u,0),base(U,0),top(U,0),top(u,0),sideColour);
    quad(data,base(U,1),base(u,1),top(u,1),top(U,1),sideColour);
  }
  for(let row=0;row<rows;row++){
    const v=row/rows,V=(row+1)/rows;
    quad(data,base(0,V),base(0,v),top(0,v),top(0,V),sideColour);
    quad(data,base(1,v),base(1,V),top(1,V),top(1,v),sideColour);
  }
  quad(data,base(0,0),base(1,0),base(1,1),base(0,1),bottomColour);
  return data;
}


export function studioBackCushion(x,y,z,width,height,depth,colour,columns=10,rows=8) {
  if (![x,y,z,width,height,depth].every(Number.isFinite) || width<=0 || height<=0 || depth<=0 ||
      !Number.isInteger(columns) || columns<2 || columns>32 || !Number.isInteger(rows) || rows<2 || rows>32) {
    throw new Error("Invalid studio back cushion geometry.");
  }
  const data=[],sideColour=colour.map(value=>value*.78),backColour=colour.map(value=>value*.66);
  const front=(u,v)=>[x+u*width,y+v*height,z-.022*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)];
  const back=(u,v)=>[x+u*width,y+v*height,z+depth];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const u=column/columns,U=(column+1)/columns,v=row/rows,V=(row+1)/rows;
    quad(data,front(u,v),front(U,v),front(U,V),front(u,V),colour);
  }
  for(let column=0;column<columns;column++){
    const u=column/columns,U=(column+1)/columns;
    quad(data,front(u,0),front(U,0),back(U,0),back(u,0),sideColour);
    quad(data,back(U,1),back(u,1),front(u,1),front(U,1),sideColour);
  }
  for(let row=0;row<rows;row++){
    const v=row/rows,V=(row+1)/rows;
    quad(data,back(0,V),back(0,v),front(0,v),front(0,V),sideColour);
    quad(data,front(1,v),front(1,V),back(1,V),back(1,v),sideColour);
  }
  quad(data,back(0,0),back(1,0),back(1,1),back(0,1),backColour);
  return data;
}

const channel = (value) => Math.max(0, Math.min(255, Number(value) || 0)) / 255;
export function virtualFixtureVisuals(fixtures = [],limit=12) {
  return fixtures.slice(0,limit).map((fixture,index)=>{
    const stored=fixture.properties ?? {},channels=fixture.profileId ? getFixtureProfile(fixture.profileId).modes.find((mode)=>mode.id===fixture.modeId)?.channels ?? [] : Object.keys(stored);
    const properties=Object.fromEntries(channels.map((key)=>[key,stored[key]])),white=channel(properties.white),dimmer=channel(properties.dimmer),transform=fixture.transform ?? {};
    const x=Number.isFinite(transform.x) ? transform.x : (index-1)*2.5;
    const z=Number.isFinite(transform.z) ? transform.z : .45;
    // Artistic normalized aiming, independent of manufacturer DMX calibration.
    const pan=Number.isFinite(properties.pan) ? properties.pan : 127;
    const tilt=Number.isFinite(properties.tilt) ? properties.tilt : 127;
    const rotation=(Number.isFinite(transform.rotation) ? transform.rotation%360 : 0)*Math.PI/180;
    const dx=(pan-127)/128*3,dz=1.35+(tilt-127)/128*3;
    const isLedStrip=fixture.profileId==="generic-led-strip-rgb";
    return {x,y:Number.isFinite(transform.y) ? transform.y : 3.65,z,selected:fixture.selected === true,profileId:fixture.profileId,
      ...(isLedStrip ? {range:3.5} : {targetX:x+dx*Math.cos(rotation)+dz*Math.sin(rotation),targetZ:z+dz*Math.cos(rotation)-dx*Math.sin(rotation)}),
      colour:["red","green","blue"].map((name)=>Math.min(1,(channel(properties[name])+white)*dimmer)),
      spread:.55+channel(properties.beam)*.85};
  });
}
export function beamVolume(light, segments=16) {
  const data=[],tip=[light.x,light.y-.11,light.z],center=[light.targetX ?? light.x,.03,light.targetZ ?? light.z+1.35];
  const tipColour=light.colour.map(value=>value*.38);
  const rimColour=light.colour.map(value=>value*.06);
  const centerColour=light.colour.map(value=>value*.55);
  for (let index=0;index<segments;index+=1) {
    const angle=index / segments * Math.PI * 2,next=(index + 1) / segments * Math.PI * 2;
    const a=[center[0]+Math.cos(angle)*light.spread,center[1],center[2]+Math.sin(angle)*light.spread];
    const b=[center[0]+Math.cos(next)*light.spread,center[1],center[2]+Math.sin(next)*light.spread];
    data.push(...tip,...tipColour,...a,...rimColour,...b,...rimColour);
    data.push(...center,...centerColour,...b,...rimColour,...a,...rimColour);
  }
  return data;
}
function ledStripHousing(light){
  const data=[],colour=light.colour.map(value=>Math.max(.025,value)),backing=[.035,.045,.06],x=light.x,y=light.y,z=light.z;
  // The generic one-metre linear profile is mounted vertically like the reference room bars.
  box(data,x-.014,y-.5,z-.006,.028,1,.012,backing);
  box(data,x-.011,y-.47,z-.014,.022,.94,.004,[.2,.23,.27]);
  for(let index=0;index<12;index++){
    const segmentY=y-.43+index*.078;
    box(data,x-.006,segmentY,z-.017,.012,.052,.003,colour);
  }
  return data;
}
export function fixtureHousing(light){
  if(light.profileId==="generic-led-strip-rgb")return ledStripHousing(light);
  const data=[],origin=[light.x,light.y-.11,light.z];
  const direction=[(light.targetX ?? light.x)-light.x,.03-light.y,(light.targetZ ?? light.z+1.35)-light.z];
  const length=Math.hypot(...direction),axis=direction.map(v=>v/Math.max(length,.0001));
  const reference=Math.abs(axis[1])>.95 ? [1,0,0] : [0,1,0];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const raw=cross(axis,reference),n=Math.hypot(...raw),u=raw.map(v=>v/Math.max(n,.0001)),v=cross(axis,u);
  const point=(angle,depth,radius)=>origin.map((value,i)=>value+axis[i]*depth+radius*(Math.cos(angle)*u[i]+Math.sin(angle)*v[i]));
  const center=point(0,.30,0),lens=light.colour.map(value=>Math.max(.025,value));
  for(let index=0;index<20;index++){
    const a=index*Math.PI/10,b=(index+1)*Math.PI/10,shade=.06+.025*(1+Math.cos(a));
    quad(data,point(a,0,.19),point(b,0,.19),point(b,.28,.19),point(a,.28,.19),[shade,shade,shade*1.2]);
    quad(data,point(a,.28,.19),point(b,.28,.19),point(b,.30,.145),point(a,.30,.145),[.16,.17,.20]);
    for(const p of [center,point(a,.30,.145),point(b,.30,.145)])data.push(...p,...lens);
  }
  box(data,light.x-.27,light.y-.02,light.z-.12,.54,.10,.24,[.07,.08,.10]);
  for(const x of [light.x-.27,light.x+.21])box(data,x,light.y-.24,light.z-.05,.06,.24,.10,[.10,.11,.13]);
  return data;
}
export function fixtureSelectionBounds(housing){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let offset=0;offset<housing.length;offset+=6)for(let axis=0;axis<3;axis++){
    min[axis]=Math.min(min[axis],housing[offset+axis]-.04);max[axis]=Math.max(max[axis],housing[offset+axis]+.04);
  }
  return {min,max};
}
function lightGeometry(data, light,includeBeams=true,beamSegments=16) {
  const housing=fixtureHousing(light);data.push(...housing);
  if (light.selected) {
    const colour=hexVector("#22D3EE"),{min,max}=fixtureSelectionBounds(housing),[x,y,z]=min,[w,h,d]=max.map((value,axis)=>value-min[axis]);
    for (const dy of [0,h]) for (const dz of [0,d]) box(data,x,y+dy,z+dz,w+.015,.015,.015,colour);
    for (const dx of [0,w]) for (const dz of [0,d]) box(data,x+dx,y,z+dz,.015,h+.015,.015,colour);
    for (const dx of [0,w]) for (const dy of [0,h]) box(data,x+dx,y+dy,z,.015,.015,d+.015,colour);
  }
  if (includeBeams && light.profileId!=="generic-led-strip-rgb" && light.colour.some((value)=>value>0)) data.push(...beamVolume(light,beamSegments));
}
function prepareSurfaceLighting(lights,ambience) {
  const tint=hexVector(ambience?.color ?? "#FFFFFF");
  const fill=Math.max(0,Math.min(.35,(ambience?.intensity ?? 0)*.35));
  const prepared=lights.map(light=>{
    if (!Number.isFinite(light.targetX) || !Number.isFinite(light.targetZ)) return {light};
    const x=light.targetX-light.x,y=.03-light.y,z=light.targetZ-light.z;
    const length=Math.hypot(x,y,z);
    return {light,aim:{x,y,z,length,edge:length/Math.hypot(length,light.spread)}};
  });
  return (position,baseColour,normal,normalLength)=>{
    const result=baseColour.map((value,index)=>value*(.7-fill)+tint[index]*fill);
    for (const {light,aim} of prepared) {
      const x=position[0]-light.x,y=position[1]-light.y,z=position[2]-light.z;
      const distance=Math.hypot(x,y,z);
      const below=position[1]<=light.y ? 1 : .15;
      const cone=aim ? spotlightConeCoverage((x*aim.x+y*aim.y+z*aim.z)/Math.max(.0001,distance*aim.length),aim.edge) : 1;
      const falloff=light.range ? Math.max(0,1-distance/light.range)**2 : 1;
      const incidence=normalLength>0 && distance>0
        ? Math.abs(normal[0]*-x+normal[1]*-y+normal[2]*-z)/(normalLength*distance)
        : 1;
      const strength=below*cone*incidence*falloff/(1+distance*distance*.12);
      for(let channel=0;channel<3;channel++) result[channel]+=light.colour[channel]*strength*(.48+baseColour[channel]*.65);
    }
    return result.map(value=>Math.max(0,Math.min(1,value)));
  };
}

export function surfaceLighting(position,baseColour,lights,normal,ambience) {
  return prepareSurfaceLighting(lights,ambience)(position,baseColour,normal,normal ? Math.hypot(...normal) : 0);
}
export function spotlightConeCoverage(cosine,edgeCosine) {
  if(!Number.isFinite(cosine)||!Number.isFinite(edgeCosine))return 0;
  const transition=Math.max(0,Math.min(1,(cosine-edgeCosine)/Math.max(.0001,1-edgeCosine)));
  return transition*transition*(3-2*transition);
}
export function surfaceGrid(origin, horizontal, vertical, colour, columns=20, rows=16) {
  const data=[];
  const point=(x,y)=>origin.map((value,axis)=>value+horizontal[axis]*x/columns+vertical[axis]*y/rows);
  for(let row=0;row<rows;row++){
    for(let column=0;column<columns;column++){
      const cellColour=typeof colour==="function" ? colour(column,row) : colour;
      quad(data,point(column,row),point(column+1,row),point(column+1,row+1),point(column,row+1),cellColour);
    }
  }
  return data;
}
const studioContactShadows=[
  {x:-3.4,z:.5,rx:.58,rz:.55,opacity:.18},
  {x:-2.51,z:1.69,rx:.36,rz:.34,opacity:.16},
  {x:-3.65,z:1.8,rx:.48,rz:.4,opacity:.23},
  {x:2.8,z:2.3,rx:.46,rz:.4,opacity:.2},
  {x:4.2,z:2.72,rx:.82,rz:.42,opacity:.2},
];
export function studioFloorShade(x,z,propsVisible=true) {
  if (!propsVisible) return 1;
  const occlusion=studioContactShadows.reduce((sum,shadow)=>sum+shadow.opacity*Math.exp(-3*((x-shadow.x)**2/shadow.rx**2+(z-shadow.z)**2/shadow.rz**2)),0);
  return Math.max(.72,1-occlusion);
}
export function studioPlant(x,z,height=2.1) {
  const data=[],pot=hexVector("#44313D"),leaf=hexVector("#235E45"),stem=hexVector("#4A6040");
  for (let segment=0;segment<16;segment++) {
    const a=segment/16*Math.PI*2,b=(segment+1)/16*Math.PI*2;
    quad(data,[x+Math.cos(a)*.2,0,z+Math.sin(a)*.2],[x+Math.cos(b)*.2,0,z+Math.sin(b)*.2],[x+Math.cos(b)*.3,.5,z+Math.sin(b)*.3],[x+Math.cos(a)*.3,.5,z+Math.sin(a)*.3],pot);
  }
  box(data,x-.025,.45,z-.025,.05,height-.45,.05,stem);
  for (let index=0;index<24;index++) {
    const angle=index*2.399963,reach=.45+(index%4)*.13,baseY=.62+(index/24)*(height-.85);
    const along=[Math.cos(angle),Math.sin(angle)],across=[-Math.sin(angle),Math.cos(angle)];
    const positions=[0,.25,.5,.75,1].map((t)=>[x+along[0]*reach*t,baseY+.12*t+.16*Math.sin(Math.PI*t),z+along[1]*reach*t]);
    const widths=[.012,.072,.12,.068,.004].map((value)=>value*(.88+(index%3)*.08));
    const shade=.76+(index%4)*.08,vein=hexVector("#6B9B5E");
    for(let segment=0;segment<4;segment++){
      const edge=(point,amount,fold)=>[point[0]+across[0]*amount,point[1]-fold,point[2]+across[1]*amount];
      const leftA=edge(positions[segment],-widths[segment],widths[segment]*.12);
      const rightA=edge(positions[segment],widths[segment],widths[segment]*.12);
      const leftB=edge(positions[segment+1],-widths[segment+1],widths[segment+1]*.12);
      const rightB=edge(positions[segment+1],widths[segment+1],widths[segment+1]*.12);
      quad(data,leftA,rightA,rightB,leftB,leaf.map((value)=>value*shade));
      const ribA=edge(positions[segment],widths[segment]*.1,-.012),ribB=edge(positions[segment+1],widths[segment+1]*.1,-.012);
      const ribC=edge(positions[segment+1],-widths[segment+1]*.1,-.012),ribD=edge(positions[segment],-widths[segment]*.1,-.012);
      quad(data,ribA,ribB,ribC,ribD,vein);
    }
  }
  return data;
}
export function studioAccentChair(x,z,colour=hexVector("#23405C")) {
  if(![x,z].every(Number.isFinite) || !Array.isArray(colour) || colour.length!==3 || !colour.every(Number.isFinite)) {
    throw new Error("Invalid studio accent chair geometry.");
  }
  const data=[],frame=colour.map(value=>value*.72),thread=colour.map(value=>value*.62),metal=hexVector("#172031");
  box(data,x-.43,.45,z+.08,.86,.15,.74,frame);
  for(const legX of [x-.39,x+.33]) for(const legZ of [z+.13,z+.72]) box(data,legX,.04,legZ,.06,.42,.06,metal);
  box(data,x-.56,.66,z+.10,.16,.20,.66,frame);
  box(data,x+.40,.66,z+.10,.16,.20,.66,frame);
  data.push(...studioSeatCushion(x-.38,.59,z+.13,.76,.60,.11,colour));
  sofaCushionPiping(data,x-.38,.714,z+.13,.76,.60,thread);
  box(data,x-.43,.69,z+.68,.86,.68,.15,frame);
  data.push(...studioBackCushion(x-.39,.77,z+.65,.78,.59,.12,colour));
  const left=x-.36,right=x+.36,bottom=.80,top=1.33,line=.012;
  quad(data,[left,bottom,z+.642],[right,bottom,z+.642],[right,bottom+line,z+.642],[left,bottom+line,z+.642],thread);
  quad(data,[left,top-line,z+.642],[right,top-line,z+.642],[right,top,z+.642],[left,top,z+.642],thread);
  for(const sideX of [left,right]) quad(data,[sideX,bottom,z+.642],[sideX+line,bottom,z+.642],[sideX+line,top,z+.642],[sideX,top,z+.642],thread);
  return data;
}
export function roundTableTop(x,y,z,radius,thickness,colour,segments=32){
  if(![x,y,z,radius,thickness].every(Number.isFinite) || radius<=0 || thickness<=0 || !Number.isInteger(segments) || segments<8 || segments>64)throw new Error("Invalid table geometry.");
  const data=[];
  for(let index=0;index<segments;index++){
    const a=index/segments*Math.PI*2,b=(index+1)/segments*Math.PI*2;
    const p=[x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],q=[x+Math.cos(b)*radius,y,z+Math.sin(b)*radius];
    const upperP=[p[0],y+thickness,p[2]],upperQ=[q[0],y+thickness,q[2]];
    quad(data,p,q,upperQ,upperP,colour);
    for(const vertex of [[x,y+thickness,z],upperP,upperQ,[x,y,z],q,p])data.push(...vertex,...colour);
  }
  return data;
}
export function acousticSlats(room,colour){
  const {width,height,depth}=roomDimensions(room),data=[],count=Math.min(48,Math.max(8,Math.round(depth/.16)));
  for(let index=0;index<count;index++)box(data,width/2-.09,0,-depth/2+index*depth/count,.075,height,Math.min(.065,depth/count*.5),colour);
  return data;
}
export function studioFloorGrain(width,depth,colour,lineCount=9,segments=32) {
  if(![width,depth].every(Number.isFinite) || width<=0 || depth<=0 ||
      !Number.isInteger(lineCount) || lineCount<1 || lineCount>32 ||
      !Number.isInteger(segments) || segments<2 || segments>64) {
    throw new Error("Invalid studio floor grain geometry.");
  }
  const data=[],grainColour=colour.map(value=>value*.78);
  for(let line=0;line<lineCount;line++){
    const baseZ=-depth/2+(line+1)/(lineCount+1)*depth,phase=line*1.73;
    const point=(index)=>{
      const t=index/segments,x=-width/2+t*width;
      const z=baseZ+.018*Math.sin(t*Math.PI*2+phase)+.006*Math.sin(t*Math.PI*10-phase);
      return [x,.002,z];
    };
    for(let segment=0;segment<segments;segment++){
      const a=point(segment),b=point(segment+1),halfWidth=.0025;
      quad(data,[a[0],a[1],a[2]-halfWidth],[b[0],b[1],b[2]-halfWidth],[b[0],b[1],b[2]+halfWidth],[a[0],a[1],a[2]+halfWidth],grainColour);
    }
  }
  return data;
}
export function studioRugBorder(x,z,width,depth,outerColour,innerColour,y=.04) {
  if(![x,z,width,depth,y].every(Number.isFinite) || width<=.5 || depth<=.5) {
    throw new Error("Invalid studio rug border geometry.");
  }
  const data=[];
  const ring=(inset,thickness,colour)=>{
    const left=x+inset,right=x+width-inset,front=z+inset,back=z+depth-inset;
    quad(data,[left,y,front],[right,y,front],[right,y,front+thickness],[left,y,front+thickness],colour);
    quad(data,[left,y,back-thickness],[right,y,back-thickness],[right,y,back],[left,y,back],colour);
    quad(data,[left,y,front+thickness],[left+thickness,y,front+thickness],[left+thickness,y,back-thickness],[left,y,back-thickness],colour);
    quad(data,[right-thickness,y,front+thickness],[right,y,front+thickness],[right,y,back-thickness],[right-thickness,y,back-thickness],colour);
  };
  ring(.04,.07,outerColour);
  ring(.135,.018,innerColour);
  return data;
}
export function studioRugPattern(x,z,width,depth,colour,columns=3,rows=5,y=.042) {
  if(![x,z,width,depth,y].every(Number.isFinite) || width<=0 || depth<=0 ||
      !Number.isInteger(columns) || columns<1 || columns>12 ||
      !Number.isInteger(rows) || rows<1 || rows>16) {
    throw new Error("Invalid studio rug pattern geometry.");
  }
  const data=[],cellWidth=width/columns,cellDepth=depth/rows;
  const diamond=(centerX,centerZ,halfWidth,halfDepth)=>{
    const points=[[centerX,centerZ-halfDepth],[centerX+halfWidth,centerZ],[centerX,centerZ+halfDepth],[centerX-halfWidth,centerZ]];
    for(let index=0;index<points.length;index++){
      const [ax,az]=points[index],[bx,bz]=points[(index+1)%points.length];
      const length=Math.hypot(bx-ax,bz-az),px=(bz-az)/length*.006,pz=-(bx-ax)/length*.006;
      quad(data,[ax-px,y,az-pz],[bx-px,y,bz-pz],[bx+px,y,bz+pz],[ax+px,y,az+pz],colour);
    }
  };
  for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
    const centerX=x+(column+.5)*cellWidth,centerZ=z+(row+.5)*cellDepth;
    diamond(centerX,centerZ,cellWidth*.28,cellDepth*.3);
    diamond(centerX,centerZ,cellWidth*.18,cellDepth*.19);
  }
  return data;
}
function studioShelfLamp(data,x,y,z){
  box(data,x-.10,y,z-.10,.20,.035,.20,hexVector("#70513C"));
  box(data,x-.018,y+.035,z-.018,.036,.14,.036,hexVector("#9A7250"));
  const lower=.15,upper=.09;
  const bottom=y+.15,top=y+.34;
  const corners=(radius,height)=>[
    [x-radius,height,z-radius],[x+radius,height,z-radius],
    [x+radius,height,z+radius],[x-radius,height,z+radius]
  ];
  const base=corners(lower,bottom),rim=corners(upper,top);
  const shades=["#FFD08A","#FFB565","#D98D47","#EDAC62"].map(hexVector);
  for(let side=0;side<4;side++){
    const next=(side+1)%4;
    quad(data,base[side],base[next],rim[next],rim[side],shades[side]);
  }
  quad(data,...rim,hexVector("#FFE0A6"));
}

export function studioWallArt(data, room, frameColour) {
  const width=Math.min(1.6,room.width*.6);
  const height=width*.6;
  const bottom=Math.min(room.height*.5,room.height-height-.1);
  const rearWall=room.depth/2;
  box(data,-width/2,bottom,rearWall-.12,width,height,.08,frameColour);
  const picture=(x,y,z)=>[(x-.5)*width*.9,bottom+height*(.06+y*.88),rearWall-z];
  const stops=[{at:0,colour:hexVector("#D98C79")},{at:.54,colour:hexVector("#A9778D")},{at:1,colour:hexVector("#68738C")}];
  const skyColour=(amount)=>{
    const index=amount<=stops[1].at?0:1,lower=stops[index],upper=stops[index+1],mix=(amount-lower.at)/(upper.at-lower.at);
    return lower.colour.map((channel,axis)=>channel+(upper.colour[axis]-channel)*mix);
  };
  const bands=20;
  for(let row=0;row<bands;row++){
    const lower=row/bands,upper=(row+1)/bands,lowerColour=skyColour(lower),upperColour=skyColour(upper);
    const a=picture(0,lower,.123),b=picture(1,lower,.123),c=picture(1,upper,.123),d=picture(0,upper,.123);
    data.push(...a,...lowerColour,...b,...lowerColour,...c,...upperColour,...a,...lowerColour,...c,...upperColour,...d,...upperColour);
  }
  const ridges=[
    {colour:"#796483",z:.125,peaks:[.34,.55,.45,.74,.46,.56,.38]},
    {colour:"#3E405E",z:.127,peaks:[.21,.35,.25,.42,.31,.47,.29]},
    {colour:"#24283D",z:.129,peaks:[.12,.25,.18,.31,.22,.31,.20]}
  ];
  for(const {colour,z,peaks} of ridges){
    const rgb=hexVector(colour);
    for(let i=1;i<peaks.length;i++){
      const left=(i-1)/(peaks.length-1),right=i/(peaks.length-1);
      quad(data,picture(left,0,z),picture(right,0,z),picture(right,peaks[i],z),picture(left,peaks[i-1],z),rgb);
    }
  }
  const snow=hexVector("#F2E6D4"),snowShadow=hexVector("#D8D5E1"),triangle=(a,b,c,colour)=>data.push(...a,...colour,...b,...colour,...c,...colour);
  const peaks=ridges[0].peaks;
  for(let index=1;index<peaks.length-1;index++) if(peaks[index]>=.45){
    const u=index/(peaks.length-1),peak=peaks[index],base=peak-.14,shoulder=peak-.045;
    const leftBase=picture(u-.085,base,.126),leftShoulder=picture(u-.035,shoulder,.126),summit=picture(u,peak-.008,.126);
    const rightShoulder=picture(u+.035,shoulder,.126),rightBase=picture(u+.085,base,.126);
    triangle(leftBase,leftShoulder,summit,snow);
    triangle(leftBase,summit,rightBase,snowShadow);
    triangle(summit,rightShoulder,rightBase,snow);
  }
}

function facetedSphere(target,x,y,z,radius,colours,segments=16,rings=8){
  const point=(latitude,longitude)=>[x+radius*Math.sin(latitude)*Math.cos(longitude),y+radius*Math.cos(latitude),z+radius*Math.sin(latitude)*Math.sin(longitude)];
  const palette=colours.map(colour=>hexVector(colour));
  for(let ring=0;ring<rings;ring++)for(let segment=0;segment<segments;segment++){
    const upper=Math.PI*ring/rings,lower=Math.PI*(ring+1)/rings,left=Math.PI*2*segment/segments,right=Math.PI*2*(segment+1)/segments;
    quad(target,point(upper,left),point(upper,right),point(lower,right),point(lower,left),palette[(ring+segment)%palette.length]);
  }
}
function roomPresetFurniture(data,type,accent){
  const timber=hexVector("#65452F"),darkWood=hexVector("#3E2D27"),metal=hexVector("#26313B"),soft=hexVector("#75899B");
  const bookColours=["#B85C50","#D4AF37","#356A80","#8B6CAA"].map(hexVector);
  if(type==="library"){
    const shelfLevels=[.42,1.02,1.62,2.22],brass=hexVector("#C7A568"),paper=hexVector("#E8D8B7");
    for(const x of [-4.25,-1.8,.65,3.1]){
      // Open timber cases with a narrow back, side stiles, a plinth and usable shelves.
      box(data,x+.04,0,3.42,1.02,2.9,.1,darkWood);
      box(data,x,0,3.02,.09,2.9,.5,timber);box(data,x+1.01,0,3.02,.09,2.9,.5,timber);
      box(data,x,.02,3.02,1.1,.38,.5,darkWood);
      for(let shelf=0;shelf<5;shelf++)box(data,x+.04,.4+shelf*.6,3.02,1.02,.065,.5,timber);
      for(let shelf=0;shelf<shelfLevels.length;shelf++)for(let book=0;book<7;book++){
        const width=.105+(book%3)*.012,height=.34+((book*3+shelf*2)%5)*.035;
        const bx=x+.1+book*.135,by=shelfLevels[shelf]+.07;
        box(data,bx,by,2.91,width,height,.2,bookColours[(book+shelf)%bookColours.length]);
        box(data,bx+.015,by+.075,2.895,width-.03,.022,.018,brass);
        if((book+shelf)%3===0)box(data,bx+.015,by+height-.065,2.895,width-.03,.018,.018,paper);
      }
    }
    // Reading table with four legs, a lit task lamp and an open book.
    box(data,-2.5,.82,-.58,2.5,.12,1.1,timber);
    for(const x of [-2.3,-.2])for(const z of [-.42,.38])box(data,x,.05,z,.09,.78,.09,metal);
    box(data,-1.75,.95,-.5,.62,.045,.48,hexVector("#7A5A40"));
    box(data,-1.7,1,-.5,.27,.025,.43,paper);box(data,-1.43,1,-.5,.27,.025,.43,hexVector("#D5C39D"));
    box(data,-.42,.86,-.25,.22,.055,.22,metal);box(data,-.34,.9,-.25,.06,.38,.06,brass);
    box(data,-.57,1.26,-.25,.52,.13,.34,hexVector("#F4D79A"));
    // Upholstered reading chair, kept clear of the table legs.
    for(const x of [1.05,1.62])for(const z of [-.63,-.18])box(data,x,.05,z,.07,.48,.07,metal);
    box(data,1.02,.5,-.65,.68,.2,.55,soft);box(data,1.04,.7,-.65,.64,.56,.11,soft);
  } else if(type==="kitchen"){
    const cabinet=hexVector("#8F9A98"),counter=hexVector("#D7D5CC"),steel=hexVector("#A9B7B8"),tile=hexVector("#B7D5D5"),glass=hexVector("#243B46");
    const baseCabinetXs=[-4,-2.25,-.5,1.25];
    // Compact L-shaped kitchen run with continuous counters and upper storage.
    box(data,-4.08,0,2.45,7.75,.14,.82,darkWood);
    for(const x of baseCabinetXs){
      box(data,x,0,2.05,1.55,.88,.58,cabinet);
      box(data,x+.025,.08,1.99,1.5,.68,.06,soft);
      box(data,x+1.24,.1,1.91,.055,.035,.035,metal);
    }
    box(data,-4.08,.92,1.98,7.75,.1,.78,counter);
    for(const x of baseCabinetXs){
      box(data,x+.025,1.1,2.35,1.5,.68,.22,soft);
      box(data,x+1.22,1.39,2.31,.055,.035,.04,metal);
    }
    for(const x of [-4,-2.25]){
      box(data,x,1.55,2.42,1.55,.82,.42,cabinet);
      for(const door of [0,1]){
        box(data,x+.06+door*.76,1.62,2.34,.7,.68,.07,soft);
        box(data,x+.67+door*.76,1.92,2.29,.045,.12,.035,metal);
      }
    }
    box(data,-4.12,0,-1.52,.78,.88,3.58,cabinet);box(data,-4.16,.92,-1.58,.9,.1,3.66,counter);
    for(const z of [-.95,-.05,.85])box(data,-3.38,.1,z,.055,.035,.035,metal);
    // Tiled backsplash with a narrow illuminated task-light rail.
    box(data,-3.9,1.03,2.57,7.38,.48,.045,tile);
    for(let x=-3.8;x<3.6;x+=.42)box(data,x,1.03,2.52,.018,.48,.025,hexVector("#8FAFB2"));
    box(data,-3.7,1.53,2.3,7,.045,.08,hexVector("#F4E3B6"));
    // Stainless inset sink, drainboard and a raised mixer tap.
    box(data,-1.52,1.035,1.87,.78,.035,.48,steel);
    box(data,-1.42,1.06,1.91,.56,.024,.34,glass);
    box(data,-.57,1.035,1.87,.34,.025,.48,steel);
    for(let groove=0;groove<4;groove++)box(data,-.53+groove*.07,1.052,1.91,.018,.012,.38,metal);
    box(data,-1.1,1.08,2.04,.045,.3,.045,steel);box(data,-.95,1.2,2.04,.32,.045,.045,steel);
    box(data,-.62,1.065,1.97,.09,.055,.06,metal);
    // Four-burner cooktop, front controls and built-in glass oven.
    box(data,.22,1.035,1.91,.86,.035,.56,metal);
    for(const x of [.42,.82])for(const z of [2.04,2.34])data.push(...roundTableTop(x,1.06,z,.105,.025,steel,16));
    box(data,.3,.12,1.98,.72,.65,.12,steel);box(data,.37,.2,1.91,.58,.48,.045,glass);
    box(data,.33,.73,1.91,.66,.07,.06,metal);for(const x of [.4,.62,.84])box(data,x,.76,1.86,.055,.055,.04,counter);
    box(data,.48,1.73,2.25,.32,.52,.16,steel);box(data,.25,2.17,2.12,.78,.12,.5,metal);
    // Tall refrigerator with separate freezer door and vertical pull handles.
    box(data,2.72,0,2.02,1.02,2.45,.72,steel);box(data,2.78,.13,1.97,.9,1.62,.045,soft);
    box(data,2.78,1.82,1.97,.9,.48,.045,cabinet);box(data,3.46,.42,1.91,.045,.56,.055,metal);box(data,3.46,1.95,1.91,.045,.26,.055,metal);
    // Prep island with drawers and two compact breakfast stools.
    box(data,-1.5,.08,-1.8,3,.86,1.22,timber);box(data,-1.6,.95,-1.88,3.2,.12,1.38,counter);
    for(const x of [-1.2,-.2,.8]){box(data,x,.2,-1.16,.72,.25,.055,darkWood);box(data,x+.3,.29,-1.22,.045,.035,.035,metal);}
    for(const x of [-1.15,.65]){
      for(const z of [-2.55,-2.12])box(data,x,.05,z,.07,.62,.07,metal);
      box(data,x-.18,.62,-2.58,.44,.12,.46,soft);box(data,x-.16,.74,-2.58,.4,.34,.08,soft);
    }
  } else if(type==="bathroom"){
    const porcelain=hexVector("#E6ECEB"),mirror=hexVector("#9EC7CD"),chrome=hexVector("#AEBFC0"),tile=hexVector("#9FC4C9"),towel=hexVector("#DCE9E7"),counter=hexVector("#D7D5CC");
    // Walk-in shower with a tiled tray, framed glass screen and wall-mounted shower set.
    box(data,-4.35,.04,.12,2.55,.13,1.95,porcelain);
    data.push(...surfaceGrid([-4.24,.18,.22],[2.32,0,0],[0,0,1.68],(column,row)=>((column+row)%3===0?tile:hexVector("#B8D5D8")),8,6));
    box(data,-4.35,.15,1.86,2.55,2.35,.1,tile);
    for(let x=-4.2;x<-1.9;x+=.38)box(data,x,.15,1.8,.018,2.35,.025,hexVector("#789FA5"));
    for(let y=.55;y<2.5;y+=.38)box(data,-4.35,y,1.8,2.55,.018,.025,hexVector("#789FA5"));
    box(data,-1.76,.18,.12,.055,1.8,1.9,mirror);box(data,-1.8,.12,.08,.1,.08,2,chrome);box(data,-1.8,1.95,.08,.1,.08,2,chrome);
    box(data,-3.48,.42,1.56,.055,1.55,.055,chrome);box(data,-3.48,1.94,1.35,.48,.08,.34,chrome);box(data,-3.48,1.88,1.32,.32,.06,.24,porcelain);
    box(data,-2.35,.72,1.62,.28,.07,.07,chrome);box(data,-2.24,.78,1.58,.055,.3,.055,chrome);
    box(data,-2.6,1.42,1.78,.72,.43,.045,hexVector("#6C878B"));
    for(const x of [-2.48,-2.12])box(data,x,1.48,1.72,.12,.32,.08,hexVector("#E6C18C"));
    box(data,-3.2,.17,.19,.42,.025,.36,metal);for(let x=-3.17;x<-2.88;x+=.07)box(data,x,.19,.2,.018,.018,.32,chrome);
    // Floating vanity with inset basin, mixer tap, framed mirror and side lights.
    box(data,-.15,.08,.7,2.28,.78,.78,darkWood);box(data,-.08,.18,.64,2.12,.58,.055,timber);
    for(const y of [.37,.66]){box(data,-.02,y,.57,1.95,.035,.045,chrome);box(data,.9,y,.54,.07,.045,.05,chrome);}
    box(data,-.26,.88,.58,2.48,.12,.98,counter);box(data,.58,1,.78,.92,.08,.61,porcelain);box(data,.72,1.04,.84,.64,.025,.45,hexVector("#A9C8CA"));
    box(data,1.02,1.08,1.17,.045,.32,.045,chrome);box(data,1.02,1.37,.98,.045,.045,.24,chrome);box(data,.65,1.04,1.18,.12,.045,.08,chrome);
    box(data,-.1,1.22,1.82,2.34,1.18,.08,mirror);
    for(const x of [-.18,2.16])box(data,x,1.17,1.74,.08,1.28,.14,chrome);
    box(data,-.25,1.17,1.73,.14,1.3,.16,hexVector("#F3E4BE"));box(data,2.15,1.17,1.73,.14,1.3,.16,hexVector("#F3E4BE"));
    // Close-coupled toilet, flush plate and a compact heated towel rail.
    box(data,2.55,.06,.4,1.18,.48,1.1,porcelain);box(data,2.6,.49,.34,1.08,.08,1.02,hexVector("#F7F8F5"));
    box(data,2.6,.56,1.28,1.06,1.1,.32,porcelain);box(data,2.72,.75,1.23,.82,.34,.06,mirror);
    box(data,2.95,1.72,1.21,.38,.12,.04,chrome);
    box(data,3.9,.08,-.8,.1,1.85,.14,chrome);box(data,4.18,.08,-.8,.1,1.85,.14,chrome);
    for(let y=.24;y<1.8;y+=.3)box(data,3.9,y,-.8,.38,.07,.14,chrome);
    box(data,3.48,1.1,-.88,.7,.82,.08,towel);box(data,-.05,.025,-1.7,2.2,.035,.9,hexVector("#B8D2D1"));
  } else if(type==="toilet"){
    const porcelain=hexVector("#F1F4F2"),ceramic=hexVector("#DCE6E5"),tile=hexVector("#9ABBC0"),chrome=hexVector("#AAB9BC"),mirror=hexVector("#9FC6CC"),warm=hexVector("#F0DEB9");
    // Wall-hung WC with a concealed service box, dual-flush plate and sculpted bowl.
    box(data,-1.7,0,2.78,2.35,2.5,.16,tile);
    for(let y=.3;y<2.55;y+=.42)box(data,-1.7,y,2.68,2.35,.025,.035,ceramic);
    box(data,-1.7,1.58,2.52,1.28,1.12,.26,ceramic);box(data,-1.7,2.13,2.37,.72,.33,.08,porcelain);
    box(data,-1.7,1.69,2.31,.42,.27,.055,chrome);box(data,-1.81,1.69,2.275,.12,.11,.025,porcelain);box(data,-1.59,1.69,2.275,.12,.11,.025,porcelain);
    box(data,-1.7,.23,1.52,1.12,.42,.72,porcelain);
    data.push(...roundTableTop(-1.7,.52,1.45,.69,.1,ceramic,32));data.push(...roundTableTop(-1.7,.615,1.45,.54,.035,porcelain,32));
    data.push(...roundTableTop(-1.7,.64,1.48,.34,.018,hexVector("#9AC7CF"),24));
    box(data,-1.7,.73,.94,1.12,.17,.12,porcelain);
    // Compact corner basin, chrome mixer, framed mirror and a soft LED edge.
    box(data,3.16,.11,2.32,1.4,.82,.78,darkWood);box(data,3.16,.55,2.26,1.42,.08,.72,timber);
    box(data,3.16,1.02,2.25,1.72,.14,.94,porcelain);box(data,3.16,1.105,2.29,1.04,.04,.58,ceramic);
    data.push(...roundTableTop(3.16,1.13,2.29,.32,.025,ceramic,24));
    box(data,3.15,1.19,2.66,.055,.31,.055,chrome);box(data,3.15,1.47,2.47,.055,.05,.38,chrome);
    box(data,3.16,2.03,2.72,1.48,1.18,.09,chrome);box(data,3.16,2.03,2.65,1.31,1.02,.045,mirror);
    box(data,2.37,2.03,2.69,.07,1.12,.1,warm);box(data,3.95,2.03,2.69,.07,1.12,.1,warm);
    // Tissue holder, spare roll, soap dispenser, towel hook and waste bin.
    box(data,-4.16,1.15,1.35,.1,.18,.48,chrome);box(data,-4.08,1.15,1.32,.22,.32,.32,porcelain);
    box(data,2.26,1.42,2.38,.14,.34,.14,chrome);box(data,2.26,1.52,2.34,.12,.15,.12,hexVector("#77AFC0"));
    box(data,4.2,1.5,.65,.16,.32,.16,chrome);box(data,4.2,1.18,.64,.44,.04,.38,warm);
    box(data,3.4,.34,-1.48,.56,.65,.54,soft);box(data,3.4,.68,-1.48,.5,.06,.48,metal);
    box(data,-4.25,0,2.72,.1,2.55,.16,metal);
  } else if(type==="garage"){
    const door=hexVector("#AAB5BE"),doorShadow=hexVector("#62717E"),cabinet=hexVector("#456477"),toolRed=hexVector("#C65C45");
    // Sectional vehicle door and its horizontal joints on the back wall.
    box(data,-4.15,.18,2.98,5.35,2.45,.1,door);
    box(data,-4.25,.12,2.91,.11,2.6,.16,metal);box(data,1.25,.12,2.91,.11,2.6,.16,metal);box(data,-4.25,2.66,2.91,5.61,.12,.16,metal);
    for(let y=.58;y<2.62;y+=.39)box(data,-4.08,y,2.86,5.18,.035,.08,doorShadow);
    for(const x of [-3.65,-2.6,-1.55,-.5,.55])box(data,x,.34,2.8,.58,.16,.035,hexVector("#D8DEE1"));
    // Wall-mounted storage, labeled bins, and a compact workbench.
    box(data,2.35,.16,2.45,.22,2.35,.5,metal);box(data,4.15,.16,2.45,.22,2.35,.5,metal);
    for(const y of [.42,1.18,1.94,2.55])box(data,2.35,y,2.42,2.02,.09,.56,timber);
    for(const x of [2.52,3.18,3.84]){box(data,x,.53,2.48,.52,.5,.44,cabinet);box(data,x,.78,2.42,.52,.045,.12,doorShadow);box(data,x,1.3,2.48,.52,.24,.44,bookColours[Math.round(x*10)%bookColours.length]);}
    for(const x of [2.55,3.25,3.95])box(data,x,2.03,2.48,.55,.42,.44,hexVector("#B48B52"));
    box(data,2.65,.88,1.48,1.68,.11,.68,timber);
    for(const x of [2.75,4.15])box(data,x,.08,1.52,.09,.8,.09,metal);
    box(data,2.72,1.08,2.06,1.55,1.05,.08,hexVector("#846B54"));
    for(const x of [2.95,3.42,3.88])box(data,x,1.32,1.98,.12,.32,.08,toolRed);
    box(data,3.02,.99,1.54,.48,.13,.38,toolRed);box(data,3.67,1.01,1.58,.3,.16,.29,metal);
    // A low-profile car body with cabin glazing, lights, mirrors and four tires.
    const body=hexVector("#536F82"),glass=hexVector("#A7C7D7"),lamp=hexVector("#F2D79A");
    box(data,-1.05,.34,-2.18,2.1,.5,2.88,body);
    box(data,-.82,.84,-1.75,1.64,.63,1.42,soft);
    box(data,-.68,1.04,-1.83,1.36,.36,.06,glass);
    box(data,-.68,1.04,-.28,1.36,.34,.06,glass);
    for(const x of [-.85,.77])box(data,x,.99,-1.46,.08,.34,.94,glass);
    for(const z of [-2.15,.48])for(const x of [-.75,.47])box(data,x,.58,z,.28,.13,.055,hexVector("#354653"));
    for(const x of [-.84,.61]){box(data,x,.58,-2.2,.22,.16,.06,lamp);garageWheel(data,x,.38,-1.62,.36,.2);garageWheel(data,x,.38,-.03,.36,.2);}
    garageFrontWheel(data,-.75,.36,-2.245,.31);garageFrontWheel(data,.75,.36,-2.245,.31);
    box(data,-.96,.48,.62,.18,.12,.08,hexVector("#C65C45"));box(data,.78,.48,.62,.18,.12,.08,hexVector("#C65C45"));
  } else if(type==="hallway"){
    const doorLeaf=hexVector("#76543F"),doorInset=hexVector("#9A7355"),runner=hexVector("#9C6D61"),brass=hexVector("#C6A46C"),linen=hexVector("#D9D2C8");
    // Recessed front door with casing, three inset panels, lever and threshold.
    box(data,-4.2,1.2,2.74,1.18,2.34,.12,doorLeaf);box(data,-4.2,1.24,2.66,.94,2.18,.055,doorInset);
    for(const y of [.55,1.32])box(data,-4.2,y,2.61,.72,.58,.035,doorLeaf);
    box(data,-4.82,1.2,2.7,.12,2.52,.18,timber);box(data,-3.58,1.2,2.7,.12,2.52,.18,timber);box(data,-4.2,2.5,2.7,1.36,.14,.18,timber);
    box(data,-4.2,.055,2.53,1.44,.08,.4,brass);box(data,-3.72,.98,2.58,.1,.1,.035,brass);box(data,-3.66,.91,2.55,.035,.16,.035,brass);
    // Narrow console, catch-all tray, lamp and framed mirror create a clear arrival point.
    box(data,-2.22,.77,2.3,2.05,.1,.52,timber);for(const x of [-3.1,-1.34])box(data,x,.05,2.34,.09,.72,.09,metal);
    box(data,-2.22,.83,2.18,1.55,.08,.045,doorInset);box(data,-2.22,.91,2.12,.78,.035,.24,brass);
    box(data,-2.87,1.12,2.22,.19,.34,.19,metal);box(data,-2.87,1.31,2.22,.3,.12,.3,linen);
    box(data,-2.22,1.78,2.58,1.12,1.42,.08,metal);box(data,-2.22,1.78,2.52,.98,1.28,.04,hexVector("#91A9AD"));
    // Coat rail with hooks, coats and a lower shoe bench with cubbies.
    box(data,.35,2.18,2.5,2.65,.09,.1,brass);
    for(const x of [-.72,-.02,.68,1.38]){box(data,x,2.07,2.48,.055,.22,.055,brass);box(data,x,1.94,2.44,.2,.05,.14,brass);}
    box(data,-.5,1.25,2.31,.48,.95,.08,hexVector("#354E63"));box(data,.48,1.2,2.31,.52,1.05,.08,hexVector("#8A564D"));
    box(data,2.55,.32,2.34,1.9,.12,.56,timber);for(const x of [1.72,2.5,3.28])box(data,x,.16,2.32,.055,.3,.5,metal);
    for(const x of [1.94,2.72])box(data,x,.08,2.31,.48,.09,.28,doorLeaf);
    // Center runner and repeated warm wall sconces give the corridor a lighting rhythm.
    box(data,.55,.035,-.45,1.38,.045,2.3,runner);for(const z of [-1.35,-.75,-.15,.45])box(data,.55,.064,z,1.02,.014,.025,linen);
    for(const z of [-.9,.4,1.7]){
      box(data,-3.26,2.22,z,.08,.4,.12,brass);box(data,-3.18,2.22,z,.12,.28,.2,hexVector("#F2D7A2"));
      box(data,3.26,2.22,z,.08,.4,.12,brass);box(data,3.18,2.22,z,.12,.28,.2,hexVector("#F2D7A2"));
    }
    // A small umbrella stand and planter finish the entry without obstructing the path.
    box(data,3.02,.28,1.72,.36,.5,.36,metal);for(const x of [2.9,3.02,3.14])box(data,x,.8,1.72,.035,.62,.035,doorLeaf);
    box(data,3.02,.65,-1.16,.72,.52,.72,doorLeaf);for(const x of [2.76,3.02,3.28])for(const z of [-1.42,-1.16,-.9])box(data,x,1.02,z,.27,.52,.27,hexVector(["#4E7559","#5D835F","#74966B"][(Math.round(x*100)+Math.round(z*100)+600)%3]));
  } else if(type==="swimming-pool"){
    const poolTile=hexVector("#4A8390"),poolShadow=hexVector("#315968"),coping=hexVector("#D1D5CE"),copingJoint=hexVector("#84949A"),waterline=hexVector("#A8DDE0");
    // A recessed basin with visible tiled inner walls and a pale stone surround.
    box(data,-4.3,.02,-2.35,8.6,.1,4.7,hexVector("#173B50"));
    box(data,-4.3,.08,-2.35,.3,.48,4.7,poolTile);box(data,4,.08,-2.35,.3,.48,4.7,poolTile);
    box(data,-4,.08,-2.35,8,.48,.3,poolTile);box(data,-4,.08,2.05,8,.48,.3,poolTile);
    // A continuous coping lip frames the water and catches the room lighting.
    for(const z of [-2.52,2.19])box(data,-4.48,.5,z,8.96,.12,.34,coping);
    for(const x of [-4.48,4.14])box(data,x,.5,-2.35,.34,.12,4.7,coping);
    for(let x=-4.1;x<4;x+=.72){box(data,x,.58,-2.535,.025,.018,.36,copingJoint);box(data,x,.58,2.175,.025,.018,.36,copingJoint);}
    for(let z=-2.05;z<2.1;z+=.72){box(data,-4.535,.58,z,.36,.018,.025,copingJoint);box(data,4.085,.58,z,.36,.018,.025,copingJoint);}
    // A fine grid lets the water show soft caustic bands under coloured fixtures.
    const waterColour=(column,row)=>{
      const u=(column+.5)/28,v=(row+.5)/20;
      const wave=Math.sin(u*9+Math.sin(v*5)*1.2)*.55+Math.sin(v*11-u*3)*.45;
      const caustic=Math.pow(Math.max(0,Math.sin(u*16+Math.sin(v*4)*2)*Math.sin(v*17-u*5)),4);
      return [.035+caustic*.045,.31+wave*.035+caustic*.1,.48+wave*.045+caustic*.13];
    };
    data.push(...surfaceGrid([-4,.37,-2.05],[8,0,0],[0,0,4.1],waterColour,28,20));
    // Shallow entry treads and a stainless ladder make the pool usable at human scale.
    for(let step=0;step<4;step++)box(data,3.05+step*.2,.15+step*.07,-.95, .22,.08,1.9,step%2?poolShadow:waterline);
    for(const z of [-.42,.42])box(data,-4.04,.2,z,.07,1.35,.07,metal);
    for(let y=.35;y<1.3;y+=.28)box(data,-4.02,y,-.42,.08,.065,.84,metal);
    // Waterline tile band on the basin walls.
    box(data,-4.01,.32,-2.02,7.98,.1,.04,waterline);box(data,-4.01,.32,1.98,7.98,.1,.04,waterline);
    for(const x of [-4,2.5]){box(data,x,.06,-3.4,1.5,.1,.8,soft);box(data,x+.12,.16,-3.3,1.25,.18,.65,hexVector("#DCE6E8"));}
  } else if(type==="disco-party"){
    const cyan=hexVector("#20C9D8"),magenta=hexVector("#D946EF"),violet=hexVector("#7450C8"),speaker=hexVector("#151B28"),silver=hexVector("#B8C2D2");
    // Flush LED dance floor tiles keep the center open and read as a club floor.
    for(let row=0;row<4;row++)for(let column=0;column<6;column++){
      const colours=[violet,cyan,magenta,hexVector("#F2B84B")];
      const tile=colours[(column+row*2)%colours.length];
      const x=-3.75+column*1.5,z=-3.15+row*1.5;
      box(data,x,.035,z,1.46,.07,1.46,tile);box(data,x+.06,.108,z+.06,1.34,.018,1.34,tile.map(value=>Math.min(1,value*1.2)));
    }
    // DJ booth, raised equipment deck, twin platters, mixer and control faders.
    box(data,-1.95,.12,2.45,3.9,.84,.75,darkWood);box(data,-2.05,.96,2.35,4.1,.14,.95,timber);
    for(const x of [-1.72,-.98,-.24,.5])box(data,x,.35,2.39,.62,.42,.06,x%2?magenta:cyan);
    for(const x of [-1.22,.25]){
      box(data,x-.34,1.12,2.08,.68,.06,.58,speaker);
      data.push(...roundTableTop(x,1.2,2.23,.2,.035,silver,24));
      data.push(...roundTableTop(x,1.225,2.23,.075,.025,speaker,20));
    }
    box(data,-.72,1.12,2.08,.84,.06,.58,metal);
    for(let index=0;index<4;index++){box(data,-.55+index*.2,1.16,1.98,.045,.025,.16,index%2?cyan:magenta);box(data,-.55+index*.2,1.16,2.2,.07,.04,.07,silver);}
    for(const x of [-4.55,3.45]){
      box(data,x,.08,2.2,1.1,2.7,.82,speaker);box(data,x+.1,.2,2.12,.9,2.4,.08,metal);
      for(const y of [.68,1.78]){
        facetedSphere(data,x+.55,y,2.015,.31,["#263449","#35445B","#202B3C"],16,8);
        facetedSphere(data,x+.55,y,2.015,.23,["#65748A","#404F64","#8A96A5"],12,6);
      }
      box(data,x+.16,2.48,2.08,.78,.055,.06,cyan);
    }
    // Faceted mirrored ball with a compact ceiling motor and support stem.
    box(data,-.2,3.55,-.45,.4,.16,.4,metal);box(data,-.07,3.38,-.32,.14,.2,.14,silver);
    facetedSphere(data,0,3.06,-.25,.43,["#E5EAF0","#69788E","#A7B5C8","#4B5970"],18,9);
    for(const x of [-3.9,3.4])box(data,x,2.45,-.15,.28,.55,.28,accent);
  } else if(type==="clubhouse"){
    const walnut=hexVector("#54382D"),barFront=hexVector("#78503A"),brass=hexVector("#D1AA66"),cream=hexVector("#E6D6B8"),green=hexVector("#456452"),glass=hexVector("#7499A5");
    // Long timber bar with inset panels, brass foot rail and a lit stone counter.
    box(data,-4.1,.08,2.8,8.2,.88,.68,barFront);box(data,-4.1,.18,2.43,8.2,.68,.08,walnut);
    for(const x of [-3.3,-1.7,-.1,1.5,3.1]){
      box(data,x,.26,2.37,1.26,.47,.045,barFront);box(data,x,.31,2.33,1.1,.35,.025,walnut);
      box(data,x,.045,2.05,1.28,.045,.045,brass);
    }
    box(data,-4.25,1,2.76,8.5,.14,.82,cream);box(data,-4.2,1.08,2.32,8.4,.035,.06,brass);
    for(const x of [-3.2,-1.6,0,1.6,3.2]){
      box(data,x,.74,1.65,.09,.68,.09,brass);box(data,x-.36,.69,1.65,.72,.13,.72,green);box(data,x-.32,1.12,1.65,.64,.48,.12,green);
    }
    // Back bar cabinetry, bottle shelves, glass rack and warm shelf lighting.
    box(data,-3.55,1.45,3.35,7.1,.12,.28,walnut);box(data,-3.55,2.22,3.35,7.1,.12,.28,walnut);
    box(data,-3.55,1.9,3.43,.12,.9,.18,barFront);box(data,3.43,1.9,3.43,.12,.9,.18,barFront);
    box(data,-3.35,1.54,3.28,6.7,.025,.04,brass);box(data,-3.35,2.31,3.28,6.7,.025,.04,brass);
    const bottleColours=["#567A65","#9E7048","#5B718C","#8B5747"].map(hexVector);
    for(const y of [1.6,2.37])for(let index=0;index<11;index++){
      const x=-3.05+index*.61,color=bottleColours[index% bottleColours.length];
      box(data,x,y,3.2,.2,.3,.16,color);box(data,x+.045,y+.3,3.23,.11,.16,.1,color);box(data,x+.06,y+.46,3.25,.08,.045,.06,brass);
      box(data,x-.05,y+.1,3.105,.3,.09,.018,cream);
    }
    for(let x=-2.9;x<2.9;x+=.42)box(data,x,2.58,3.27,.025,.31,.03,glass);
    for(const x of [-3.2,0,3.2])box(data,x,1.48,3.04,.78,.035,.08,hexVector("#F4D89A"));
    // Three round social tables with upholstered chairs and central brass details.
    for(const x of [-3,0,3]){
      data.push(...roundTableTop(x,.78,-1.1,.76,.085,timber));
      data.push(...roundTableTop(x,.83,-1.1,.16,.025,brass,24));
      for(const dx of [-.58,.58])for(const z of [-1.82,-.38]){
        box(data,x+dx,.05,z,.075,.68,.075,metal);box(data,x+dx-.25,.69,z-.22,.58,.14,.48,green);box(data,x+dx-.25,.85,z-.41,.58,.52,.1,green);
      }
    }
    // Two upholstered wall banquettes leave the middle of the room open for circulation.
    for(const z of [-2.95,-1.55]){
      box(data,-5.9,.24,z,1.55,.46,.62,green);box(data,-5.9,.68,z-.24,1.55,.72,.14,green);
      box(data,4.35,.24,z,1.55,.46,.62,green);box(data,4.35,.68,z-.24,1.55,.72,.14,green);
    }
    for(const z of [-2.95,-1.55])for(const x of [-4.1,4.1]){
      data.push(...roundTableTop(x,.74,z,.52,.07,timber));
      for(const dx of [-.35,.35])box(data,x+dx,.05,z-.52,.07,.66,.07,metal);
    }
    // Framed club crest, brass wall sconces and three shaded ceiling pendants.
    box(data,0,2.45,4.28,2.5,1.25,.08,walnut);box(data,0,2.45,4.22,2.25,1,.04,barFront);
    data.push(...roundTableTop(0,2.45,4.17,.38,.055,brass,24));
    for(const x of [-4.7,4.7])for(const y of [.95,2.15]){
      box(data,x,y,3.48,.1,.38,.12,brass);box(data,x,y,3.4,.17,.27,.2,hexVector("#F3D39A"));
    }
    for(const x of [-3.2,0,3.2]){
      box(data,x,3.35,-.15,.045,.68,.045,brass);box(data,x,2.95,-.15,.42,.18,.42,brass);
      facetedSphere(data,x,2.78,-.15,.25,["#EFD8AC","#D8B27B","#F7E8CA"],16,8);
    }
    box(data,4.65,.36,-3.5,.78,.66,.78,walnut);
    const plantColours=["#47704F","#668557","#809564"].map(hexVector);
    for(const x of [4.34,4.65,4.96])for(const z of [-3.81,-3.5,-3.19])box(data,x,.74,z,.28,.44,.28,plantColours[(Math.round(x*100)+Math.round(z*100)+800)%3]);
  } else if(type==="church"){
    const oak=hexVector("#594330"),linen=hexVector("#E9DFC9"),stone=hexVector("#B69C6E"),glass=hexVector("#647FA4");
    box(data,0,.08,3.05,2.7,.72,.92,oak);box(data,0,.84,3.1,2.35,.12,.82,linen);box(data,0,1.06,3.65,.22,1.9,.12,oak);box(data,-.42,1.72,3.66,1.05,.15,.14,oak);
    for(const side of [-1,1])for(const z of [-2.8,-1.35,.1,1.55]){const x=side*1.75;box(data,x,.32,z,2.15,.16,.64,oak);for(const dx of [-.95,.95])box(data,x+dx,.08,z,.09,.34,.09,oak);box(data,x,.64,z-.28,2.15,.48,.13,oak);}
    for(const x of [-4.15,4.15])for(const y of [.95,2.05,3.15]){box(data,x,y,3.45,.15,.7,.22,stone);box(data,x,y,3.32,.08,.52,.12,glass);}
    box(data,0,3.1,4.05,1.25,.16,.1,oak);box(data,-.08,2.4,4.05,.14,1.55,.12,oak);box(data,-.58,2.82,4.05,1.18,.14,.12,oak);
    for(const x of [-3.7,3.7])for(const z of [-2,1.2]){box(data,x,2.5,z,.12,.58,.16,stone);box(data,x,2.5,z-.12,.1,.45,.08,linen);}
  } else if(type==="electrical-workshop"){
    const worktop=hexVector("#9B7956"),cabinet=hexVector("#476170"),safety=hexVector("#F0B84C"),tool=hexVector("#B95C49");
    for(const x of [-3.5,0,3.5]){box(data,x,.9,2.55,2.55,.13,.82,worktop);for(const dx of [-1.1,1.1])box(data,x+dx,.08,2.65,.1,.85,.1,metal);box(data,x,1.9,3.45,2.55,1.35,.1,cabinet);for(let y=1.35;y<2.45;y+=.35)for(let dx=-.9;dx<=.9;dx+=.45)box(data,x+dx,y,3.34,.13,.24,.1,tool);}
    box(data,-4.05,.1,-1.8,.75,2.1,.65,cabinet);for(const y of [.55,1.25,1.95])box(data,-3.64,y,-1.78,.04,.08,.35,safety);
    for(const z of [-2.2,-.8,.6]){box(data,2.6,.8,z,.6,1.45,.55,metal);for(const y of [.35,.7,1.05,1.4])box(data,2.6,y,z-.3,.56,.035,.04,safety);}
    box(data,0,1.7,-3.35,4.5,.08,.08,safety);for(const x of [-1.8,-.9,0,.9,1.8])box(data,x,1.46,-3.35,.06,.4,.06,tool);
    for(const x of [-3,0,3]){box(data,x,2.75,1.2,.08,.42,.08,metal);box(data,x,2.96,1.2,.48,.05,.2,hexVector("#FFF0C2"));}
  } else if(type==="airplane-cabin"){
    const seat=hexVector("#385B78"),trim=hexVector("#91B7CC"),window=hexVector("#6BA5C2"),shell=hexVector("#C5D2D6");
    box(data,0,2.7,3.35,5.9,.26,.16,shell);box(data,0,2.25,3.35,5.9,.1,.12,trim);
    for(const side of [-1,1]){
      box(data,side*2.2,1.75,0,.1,2.3,9,shell);for(const z of [-3.2,-1.3,.6,2.5]){box(data,side*2.11,1.86,z,.035,.62,.78,trim);box(data,side*2.08,1.88,z,.025,.52,.64,window);}
      box(data,side*1.43,2.05,0,.85,.42,8.5,shell);box(data,side*1.43,1.82,-.2,.85,.09,8.3,trim);
      for(const z of [-3,-1.2,.6,2.4,4.2]){box(data,side*.83,.52,z,.72,.52,.72,seat);box(data,side*.83,1.03,z-.28,.72,.72,.16,seat);box(data,side*.83,1.78,z-.29,.48,.24,.08,trim);box(data,side*1.26,.08,z,.07,.45,.07,metal);}
    }
    box(data,0,1.2,-3.45,1.05,.02,8.8,hexVector("#66727A"));box(data,0,.08,4.72,4.2,.16,.14,metal);
    for(const x of [-1.4,0,1.4]){box(data,x,2.05,4.4,.08,.32,.08,metal);box(data,x,2.23,4.4,.42,.05,.18,hexVector("#FFF0C2"));}
  } else if(type==="office"||type==="classroom"){
    const desk=hexVector("#765B43"),screen=hexVector("#243C52"),chair=hexVector("#536C7D");
    const rows=type==="classroom"?3:2;
    for(let row=0;row<rows;row++)for(let col=0;col<3;col++){const x=-3.2+col*3.2,z=-2+row*2.2;box(data,x,.78,z,1.85,.12,.85,desk);for(const dx of [-.75,.75])for(const dz of [-.3,.3])box(data,x+dx,.08,z+dz,.07,.7,.07,metal);if(type==="office"){box(data,x,.91,z-.18,.68,.42,.06,screen);box(data,x,.99,z+.06,.1,.05,.1,hexVector("#CAD6D9"));}else{box(data,x,1.55,z+.34,1.85,.62,.08,chair);box(data,x,1.95,z+.4,1.9,.08,.12,chair);}}
    if(type==="classroom"){box(data,0,1.65,3.55,4.6,1.2,.12,hexVector("#344E52"));box(data,0,1.65,3.46,4.4,1.02,.04,hexVector("#8AB6A5"));}
    else{box(data,0,.08,3.25,4.8,.12,.64,desk);box(data,0,1.3,3.55,4.8,1.9,.12,screen);}
  } else if(type==="restaurant"||type==="event-hall"){
    const table=hexVector("#70513A"),fabric=hexVector("#6B4963"),gold=hexVector("#D5B879");
    for(const x of [-3,0,3])for(const z of [-2,1]){data.push(...roundTableTop(x,.82,z,.8,.08,table,24));for(const dx of [-.55,.55])for(const dz of [-.48,.48]){box(data,x+dx,.08,z+dz,.08,.72,.08,metal);box(data,x+dx-.22,.72,z+dz,.5,.13,.44,fabric);box(data,x+dx-.22,.9,z+dz-.2,.5,.42,.1,fabric);}}
    for(const x of [-3,0,3]){box(data,x,3.1,.4,.07,.68,.07,gold);box(data,x,2.66,.4,.42,.16,.42,gold);facetedSphere(data,x,2.48,.4,.25,["#FFE5B0","#E2B76D","#FFF0D2"],16,8);}
    if(type==="event-hall"){box(data,0,.18,3.6,6.5,.25,.2,fabric);box(data,0,.8,3.55,3.2,1.15,.18,gold);}
  } else if(type==="art-gallery"){
    const frame=hexVector("#4A443D");for(const x of [-3.5,-1.2,1.2,3.5]){box(data,x,2.05,3.55,1.45,1.15,.08,frame);box(data,x,2.05,3.48,1.26,.96,.035,[hexVector("#D68465"),hexVector("#547D91"),hexVector("#D1B26C"),hexVector("#78916B")][Math.abs(Math.round(x))%4]);box(data,x,2.95,3.3,.08,.35,.08,metal);box(data,x,3.13,3.3,.36,.05,.18,hexVector("#FFF2CF"));}
    box(data,0,.45,-.45,2.7,.18,1.25,hexVector("#6E7375"));
  } else if(type==="hotel-room"){
    const linen=hexVector("#DED4C5"),head=hexVector("#725C50"),wood=hexVector("#785B44");box(data,0,.45,1.25,3.5,.42,2.3,linen);box(data,0,.92,2.18,3.55,1.08,.18,head);for(const x of [-.84,.84])box(data,x,.72,.72,1.4,.16,1.05,linen);box(data,0,.05,3.15,3.9,.1,.55,wood);for(const x of [-1.8,1.8]){box(data,x,.88,1.2,.82,1.05,.82,wood);box(data,x,1.44,1.2,.62,.08,.62,hexVector("#FFF0CE"));}box(data,-3.55,1.35,2.65,1.4,2.45,.12,hexVector("#435563"));
  } else if(type==="warehouse"){
    const rack=hexVector("#4D6068");for(const x of [-3.7,0,3.7]){for(const dx of [-1,1])box(data,x+dx,.08,2.6,.12,5.2,.12,rack);for(const y of [1,2.6,4.2]){box(data,x,y,2.6,2.2,.12,.8,rack);for(let n=0;n<3;n++)box(data,x-.7+n*.7,y+.38,2.45,.58,.62,.6,[hexVector("#B96A48"),hexVector("#D4B56D"),hexVector("#607E8B")][n]);}}}
}
function buildStaticRoom(accent, visibility, room, materials, quality, stage, roomType) {
  const data=[],floor=hexVector(materials.floor ?? "#4A3431"),rearWall=hexVector(materials.wallRear ?? materials.wall ?? "#27324A"),leftWall=hexVector(materials.wallLeft ?? materials.wall ?? "#27324A"),rightWall=hexVector(materials.wallRight ?? materials.wall ?? "#27324A"),couch=hexVector("#9C4F48"),wood=hexVector("#67442F"),metal=hexVector("#151D2D");
  const {width,height,depth}=roomDimensions(room);
  const budget=previewQuality(quality);
  const propsVisible=visibility.props!==false;
  const studioPropsScaleX=Math.min(1,(width/2-.08)/4.78),studioPropsScaleZ=Math.min(1,(depth/2-.08)/2.95);
  const studioPropsScale=Math.min(studioPropsScaleX,studioPropsScaleZ,(height-.05)/2.8);
  const wetRoom=roomType==="bathroom"||roomType==="toilet";
  const roomPropsScaleX=wetRoom?studioPropsScaleX:studioPropsScale,roomPropsScaleZ=wetRoom?studioPropsScaleZ:studioPropsScale;
  const roomPropsScaleY=roomType==="toilet"?Math.min(1,(height-.05)/3.24):(roomType==="kitchen"||roomType==="bathroom")?Math.min(1,(height-.05)/2.5):studioPropsScale;
  const tileFloor=["kitchen","bathroom","toilet","swimming-pool"].includes(roomType);
  const floorBoardColour=(column,row)=>{
    if(tileFloor){
      const grout=column%4===0||row%4===0,shade=grout?.58:.9+((column*5+row*3)%6)*.018;
      return floor.map(channel=>channel*shade);
    }
    const board=Math.floor((row+(column%3))/4);
    const shade=.82+((column*7+board*3)%9)*.025;
    const x=-width/2+(column+.5)*width/budget.columns,z=-depth/2+(row+.5)*depth/budget.rows;
    return floor.map(channel=>channel*shade*studioFloorShade(x/roomPropsScaleX,z/roomPropsScaleZ,propsVisible));
  };
  data.push(...surfaceGrid([-width/2,0,-depth/2],[width,0,0],[0,0,depth],floorBoardColour,budget.columns,budget.rows));
  if(!tileFloor)data.push(...studioFloorGrain(width,depth,floor));
  const rearWallStart=data.length;
  data.push(...surfaceGrid([-width/2,0,depth/2],[width,0,0],[0,height,0],rearWall,budget.columns,budget.rows));
  const rearWallEnd=data.length;
  data.push(...surfaceGrid([-width/2,0,-depth/2],[0,0,depth],[0,height,0],materials.wallLeft||materials.wall ? leftWall : hexVector("#132746"),budget.columns,budget.rows));
  data.push(...surfaceGrid([width/2,0,depth/2],[0,0,-depth],[0,height,0],materials.wallRight||materials.wall ? rightWall : hexVector("#132746"),budget.columns,budget.rows));
  data.push(...surfaceGrid([-width/2,height,-depth/2],[width,0,0],[0,0,depth],hexVector(materials.ceiling ?? "#101726"),budget.columns,budget.rows));
  const shelfLamps=[{x:4.34,y:1.81,z:2.67},{x:4.36,y:2.51,z:2.67}];
  if (visibility.props!==false) {
  if(!["swimming-pool","bathroom","toilet","disco-party","kitchen"].includes(roomType))data.push(...acousticSlats(room,wood));
  const platform=stageSettings(stage);
  if(platform.enabled)box(data,platform.x,platform.y,platform.z,platform.width,platform.height,platform.depth,hexVector(platform.color));
  const furnitureStart=data.length;
  if ((roomType ?? "living-room")==="living-room") {
    box(data,-2.45,.01,-.95,4.9,.02,3.65,hexVector("#342647"));
    const rugColour=hexVector("#665477");
    data.push(...surfaceGrid([-2.36,.037,-.86],[4.72,0,0],[0,0,3.47],(column,row)=>{
      const x=(column+.5)/24*4.72-2.36;
      const z=(row+.5)/18*3.47-.86;
      const layoutX=x/studioPropsScaleX,layoutZ=z/studioPropsScaleZ;
      const sofaShadow=Math.exp(-((layoutX/1.65)**4+((layoutZ-1.62)/.65)**2));
      const tableShadow=Math.exp(-(((layoutX+.2)/.88)**2+((layoutZ-.25)/.76)**2));
      return rugColour.map(channel=>channel*(1-.3*sofaShadow-.24*tableShadow));
    },24,18));
    data.push(...studioRugBorder(-2.36,-.86,4.72,3.47,hexVector("#8F654C"),hexVector("#C1A073")));
    data.push(...studioRugPattern(-2.21,-.71,4.42,3.17,hexVector("#B8A17C")));
    box(data,-1.7,.25,1.4,3.4,.8,.75,couch);
    const backCushionColour=couch.map(value=>Math.min(1,value*1.2));
    for(let index=0;index<3;index++)data.push(...studioBackCushion(-1.45+index*.97,1.05,1.55,.93,.55,.35,backCushionColour));
    box(data,-1.9,.25,1.3,.3,1,.95,couch);
    box(data,1.6,.25,1.3,.3,1,.95,couch);
    data.push(...roundTableTop(-.2,.65,.25,.85,.055,metal));
    data.push(...roundTableTop(.75,.5,-.15,.45,.045,metal));
    for (const x of [-.75,.3]) for (const z of [-.15,.65]) box(data,x,.04,z,.035,.61,.035,metal);
    for (const x of [.5,.95]) for (const z of [-.35,.05]) box(data,x,.04,z,.03,.46,.03,metal);
    const cushionHighlight=couch.map(value=>Math.min(1,value*1.12));
    const cushionThread=couch.map(value=>value*.78);
    for(let index=0;index<3;index++) {
      const cushionX=-1.55+index*1.03;
      data.push(...studioSeatCushion(cushionX,.97,1.32,.95,.72,.12,cushionHighlight));
      sofaCushionPiping(data,cushionX,1.091,1.32,.95,.72,cushionThread);
    }
    box(data,-1.45,1.15,1.33,.45,.42,.18,hexVector("#E5AE66"));
    box(data,1,1.15,1.33,.45,.42,.18,accent);
    const upholsteryShadow=couch.map(channel=>channel*.64);
    box(data,-1.64,.35,1.38,3.28,.055,.04,upholsteryShadow);
    for (const x of [-1.55,1.46]) {
      for (const z of [1.45,2.03]) box(data,x,.04,z,.09,.22,.09,metal);
    }
    box(data,-.85,1.08,1.39,.48,.31,.15,hexVector("#B87761"));
    box(data,.48,1.08,1.39,.45,.31,.15,hexVector("#5E536B"));
    for (const x of [3.6,4.7]) box(data,x,0,2.5,.08,2.8,.45,wood);
    for (const y of [.1,.8,1.5,2.2,2.75]) box(data,3.6,y,2.5,1.18,.07,.45,wood);
    for (let index=0;index<4;index+=1) box(data,3.85+index*.16,.87,2.6,.1,.4,.22,index%2 ? accent : hexVector("#D4AF37"));
    for(const lamp of shelfLamps) studioShelfLamp(data,lamp.x,lamp.y-.24,lamp.z);
    data.push(...studioPlant(-3.65,1.8,2.4),...studioPlant(2.8,2.3,1.9));
    data.push(...studioAccentChair(-3.4,.05));
    box(data,-2.65,0,1.55,.35,.06,.35,metal);
    box(data,-2.51,.06,1.69,.035,1.85,.035,metal);
    box(data,-2.62,1.83,1.58,.25,.17,.25,hexVector("#E6BA75"));
  
  } else roomPresetFurniture(data,roomType,accent);
  const furnitureEnd=data.length;
  scaleGeometryPositions(data,furnitureStart,furnitureEnd,roomPropsScaleX,roomPropsScaleY,roomPropsScaleZ);
  if ((roomType ?? "living-room")==="living-room") {
    studioWallArt(data,{width,height,depth},wood);
    // Add the framed three-pane side window from the approved living-room reference.
    const frame=hexVector("#BBC9CF"),glass=hexVector("#24566B"),sill=hexVector("#60483E");
    const windowX=-width/2+.06,span=Math.min(1.8,depth*.32),windowZ=-depth*.12,bottom=Math.min(1.05,height*.3),top=Math.min(height-.6,bottom+1.6),windowHeight=top-bottom,zStart=windowZ-span/2;
    box(data,windowX,bottom,zStart,.12,windowHeight,span,frame);
    box(data,windowX+.14,bottom+.09,zStart+.09,.045,windowHeight-.18,span-.18,glass);
    for(const divider of [1/3,2/3])box(data,windowX+.19,bottom+.08,zStart+span*divider-.035,.025,windowHeight-.16,.07,frame);
    box(data,windowX+.19,bottom+windowHeight*.53-.035,zStart+.08,.025,.07,span-.16,frame);
    box(data,windowX+.02,bottom-.1,zStart-.08,.24,.1,span+.16,sill);
  }

  }
  const rigStart=data.length;
  for (const y of [3.7,3.95]) box(data,-4,y,.4,8,.06,.06,metal);
  for (let x=-4;x<=4;x+=.5) box(data,x,3.7,.4,.04,.3,.06,metal);
  const rigScale=Math.min(1,(width/2-.04)/4.02,(height-.05)/4.01,(depth/2-.04)/.46);
  scaleGeometryPositions(data,rigStart,data.length,rigScale);
  const propLights=propsVisible && visibility.lighting!==false
    ? shelfLamps.map(lamp=>({...lamp,x:lamp.x*roomPropsScaleX,y:lamp.y*roomPropsScaleY,z:lamp.z*roomPropsScaleZ,colour:[.85,.46,.16],range:.85*studioPropsScale}))
    : [];
  const normals=[];
  for(let triangle=0;triangle<data.length;triangle+=18){
    const a=data.slice(triangle,triangle+3),b=data.slice(triangle+6,triangle+9),c=data.slice(triangle+12,triangle+15);
    const ab=b.map((value,axis)=>value-a[axis]),ac=c.map((value,axis)=>value-a[axis]);
    const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    normals.push({normal,length:Math.hypot(...normal)});
  }
  return {data,normals,propLights,rearWallStart,rearWallEnd};
}

function shadeRoom({data:base,normals,propLights,rearWallStart,rearWallEnd},lights,ambience,includeBeams,beamSegments) {
  const data=base.slice();
  const surfaceLights=[...lights,...propLights];
  // Approximate the soft bounce from each fixture's floor footprint.
  const rearWallLights=lights.filter(light=>Number.isFinite(light.targetX)&&Number.isFinite(light.targetZ)).map(light=>({
    x:light.targetX,y:.65,z:light.targetZ,
    colour:light.colour.map(channel=>channel*.8),range:3.2
  }));
  const lightSurface=prepareSurfaceLighting(surfaceLights,ambience);
  const lightRearSurface=prepareSurfaceLighting([...surfaceLights,...rearWallLights],ambience);
  const staticVertexEnd=data.length;
  for(let triangle=0;triangle<staticVertexEnd;triangle+=18){
    const {normal,length}=normals[triangle/18];
    const shade=triangle>=rearWallStart && triangle<rearWallEnd ? lightRearSurface : lightSurface;
    for (const offset of [triangle,triangle+6,triangle+12]) {
      const colour=shade(data.slice(offset,offset+3),data.slice(offset+3,offset+6),normal,length);
      for(let channel=0;channel<3;channel++) data[offset+3+channel]=colour[channel];
    }
  }
  for(const light of lights) lightGeometry(data,light,includeBeams,beamSegments);
  return new Float32Array(data);
}

export function sceneData(accent,fixtures,visibility={},room,includeBeams=true,materials={},quality="balanced",stage,ambience,roomType="living-room") {
  const budget=previewQuality(quality);
  const lights=virtualFixtureVisuals(visibility.lighting===false ? [] : fixtures,budget.fixtures);
  return shadeRoom(buildStaticRoom(accent,visibility,room,materials,quality,stage,roomType),lights,ambience,includeBeams,budget.beamSegments);
}

function bufferedRoom(staticRoom,lights,ambience,beamSegments) {
  const opaque=shadeRoom(staticRoom,lights,ambience,false,beamSegments);
  const beams=lights.filter(light=>light.profileId!=="generic-led-strip-rgb" && light.colour.some(value=>value>0)).flatMap(light=>beamVolume(light,beamSegments));
  const data=new Float32Array(opaque.length+beams.length);
  data.set(opaque);data.set(beams,opaque.length);
  return {data,opaqueVertices:opaque.length/6};
}

export function sceneBuffers(accent,fixtures,visibility={},room,materials={},quality="balanced",stage,ambience,roomType="living-room") {
  const budget=previewQuality(quality);
  const lights=virtualFixtureVisuals(visibility.lighting===false ? [] : fixtures,budget.fixtures);
  return bufferedRoom(buildStaticRoom(accent,visibility,room,materials,quality,stage,roomType),lights,ambience,budget.beamSegments);
}

export function createLightLabRenderer(canvas, { accent = "#C21888", fixtures = [], visibility = {}, room, roomType="living-room", ambience, materials={}, stage, quality="balanced", projection = "perspective", camera={}, onSelect=()=>{},onTransform=()=>{}, onTourChange=()=>{} } = {}) {
  const gl = canvas.getContext("webgl", { antialias:true, alpha:false });
  if (!gl) return { supported:false, destroy(){}, reset(){}, setAccent(){}, setFixtures(){} };
  function createResources() {
    const program=gl.createProgram(),vertexShader=compile(gl,gl.VERTEX_SHADER,vertexSource),fragmentShader=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
    gl.attachShader(program,vertexShader);gl.attachShader(program,fragmentShader);gl.linkProgram(program);
    gl.detachShader(program,vertexShader);gl.detachShader(program,fragmentShader);
    gl.deleteShader(vertexShader);gl.deleteShader(fragmentShader);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) { const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(message); }
    const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,"p"),colour=gl.getAttribLocation(program,"c"),matrix=gl.getUniformLocation(program,"m"),opacity=gl.getUniformLocation(program,"opacity")
    return {program,buffer,position,colour,matrix,opacity};
  }
  let resources=createResources(),contextLost=false;
  let selectedAccent=accent,virtualFixtures=fixtures,drag;const dimensions=roomDimensions(room),fitDistance=roomFitCameraDistance(dimensions.width,dimensions.depth);let {yaw,pitch,distance}=normalizeCameraState({...camera,distance:camera?.distance ?? fitDistance});
  let staticRoom=null;
  const budget=previewQuality(quality);
  let geometry=null,viewProjection=null,pickOccluders=null,pickCacheFixtures=null,pickTargets=[];
  function draw(targetSize=null) {
    if (contextLost || gl.isContextLost()) return;
    const {program,buffer,position,colour,matrix,opacity}=resources;
    const ratio=Math.min(window.devicePixelRatio||1,previewQuality(quality).pixelRatio),width=Math.max(1,targetSize?.width ?? canvas.clientWidth),height=Math.max(1,targetSize?.height ?? canvas.clientHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    if (!geometry) {
      staticRoom??=buildStaticRoom(hexVector(selectedAccent),visibility,room,materials,quality,stage,roomType);
      const lights=virtualFixtureVisuals(visibility.lighting===false ? [] : virtualFixtures,budget.fixtures);
      geometry=bufferedRoom(staticRoom,lights,ambience,budget.beamSegments);
      gl.bufferData(gl.ARRAY_BUFFER,geometry.data,gl.STATIC_DRAW);
    }
    const pixelWidth=targetSize ? width : Math.max(1,Math.round(width*ratio)),pixelHeight=targetSize ? height : Math.max(1,Math.round(height*ratio));
    if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
    gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);gl.clearColor(.025,.045,.09,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(colour,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(colour);
    viewProjection=multiply(viewportProjection(projection,width/height,distance),studioCameraMatrix({yaw,pitch,distance,targetHeight:roomDimensions(room).height*.55}));
    gl.uniformMatrix4fv(matrix,false,viewProjection);
    gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(opacity,1);
    gl.drawArrays(gl.TRIANGLES,0,geometry.opaqueVertices);
    const beamVertices=geometry.data.length/6-geometry.opaqueVertices;
    if (beamVertices) {
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.uniform1f(opacity,.55);
      gl.drawArrays(gl.TRIANGLES,geometry.opaqueVertices,beamVertices);
      gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(opacity,1);
    }
  }
  const resize=new ResizeObserver(()=>draw());
  const fixtureAt=(event,bounds)=>{
    if(!viewProjection || visibility.lighting===false)return null;
    if(pickCacheFixtures!==virtualFixtures){
      pickCacheFixtures=virtualFixtures;
      pickTargets=virtualFixtureVisuals(virtualFixtures,previewQuality(quality).fixtures).map((point,index)=>({...point,id:virtualFixtures[index].id,housing:fixtureHousing(point)}));
    }
    const candidates=pickTargets;
    const occluders=pickOccluders ?? (pickOccluders=sceneData([0,0,0],[],visibility,room,false,materials,quality,stage,ambience,roomType));
    const x=event.clientX-bounds.left,y=event.clientY-bounds.top,ray=viewportRay(viewProjection,x,y,bounds.width,bounds.height);
    if(ray){
      let selected=null,nearest=Infinity;
      for(const point of candidates){
        const distance=rayHitDistance(point.housing,ray);
        if(distance===null||distance>=nearest||rayHitDistance(occluders,ray,distance-.12)!==null)continue;
        selected=point.id;nearest=distance;
      }
      if(selected!==null)return virtualFixtures.find(fixture=>fixture.id===selected) ?? null;
    }
    const visible=filterOccludedPoints(candidates,viewProjection,bounds.width,bounds.height,occluders);
    const id=pickScenePoint(visible,viewProjection,bounds.width,bounds.height,x,y);
    return virtualFixtures.find(fixture=>fixture.id===id) ?? null;
  };
  const down=(event)=>{
    const bounds=canvas.getBoundingClientRect(),target=event.shiftKey ? fixtureAt(event,bounds) : null;
    const planeStart=target ? viewportPointOnPlane(viewProjection,event.clientX-bounds.left,event.clientY-bounds.top,bounds.width,bounds.height,target.transform.y) : null;
    drag={x:event.clientX,y:event.clientY,travel:0,fixtureMove:target&&planeStart ? {id:target.id,origin:{...target.transform},start:planeStart,next:{...target.transform}} : null};
    canvas.setPointerCapture(event.pointerId);
  };
  const move=(event)=>{
    if (!drag) return;
    const current=drag,dx=event.clientX-current.x,dy=event.clientY-current.y;
    drag={...current,x:event.clientX,y:event.clientY,travel:current.travel+Math.hypot(dx,dy)};
    if(current.fixtureMove){
      const bounds=canvas.getBoundingClientRect(),plane=viewportPointOnPlane(viewProjection,event.clientX-bounds.left,event.clientY-bounds.top,bounds.width,bounds.height,current.fixtureMove.origin.y);
      if(plane){
        const {id,origin,start}=current.fixtureMove,next={...origin,x:origin.x+plane[0]-start[0],z:origin.z+plane[2]-start[2]};
        current.fixtureMove.next=next;
        virtualFixtures=virtualFixtures.map(fixture=>fixture.id===id ? {...fixture,transform:next} : fixture);
        geometry=null;draw();
      }
      return;
    }
    yaw+=dx*.009;pitch=Math.max(-cameraPitchLimit,Math.min(cameraPitchLimit,pitch+dy*.009));draw();
  };
  const up=(event)=>{
    const current=drag,click=current && event?.type==="pointerup" && current.travel+Math.hypot(event.clientX-current.x,event.clientY-current.y)<=5;
    drag=undefined;
    if(current?.fixtureMove){
      if(event?.type==="pointerup"){
        if(current.travel>5)onTransform(current.fixtureMove.id,current.fixtureMove.next);
        onSelect(current.fixtureMove.id);
      }else{
        virtualFixtures=virtualFixtures.map(fixture=>fixture.id===current.fixtureMove.id ? {...fixture,transform:current.fixtureMove.origin} : fixture);
        geometry=null;draw();
      }
      return;
    }
    if (!click || visibility.lighting===false) return;
    const bounds=canvas.getBoundingClientRect();
    const fixture=fixtureAt(event,bounds);
    if (fixture) onSelect(fixture.id);
  };
  let tourFrame=0;
  function stopTour(){if(tourFrame){cancelAnimationFrame(tourFrame);tourFrame=0;onTourChange(false);}}
  function toggleTour(){
    if (contextLost) return false;
    if(tourFrame){stopTour();return false;}
    const origin={yaw,pitch,distance},started=performance.now(),duration=48000;
    const animate=(time)=>{const progress=((time-started)%duration)/duration;yaw=origin.yaw+progress*Math.PI*2;pitch=Math.max(-cameraPitchLimit,Math.min(cameraPitchLimit,origin.pitch+Math.sin(progress*Math.PI*4)*.12));distance=origin.distance*(1+.025*Math.sin(progress*Math.PI*2));draw();tourFrame=requestAnimationFrame(animate);};
    tourFrame=requestAnimationFrame(animate);onTourChange(true);return true;
  }
  const contextLostListener=(event)=>{
    event.preventDefault();
    contextLost=true;
    stopTour();
    viewProjection=null;
    geometry=null;
  };
  const contextRestoredListener=()=>{
    resources=createResources();
    contextLost=false;
    draw();
  };
  canvas.addEventListener("webglcontextlost",contextLostListener);
  canvas.addEventListener("webglcontextrestored",contextRestoredListener);
  const pointerDown=(event)=>{stopTour();down(event);};
  resize.observe(canvas);canvas.addEventListener("pointerdown",pointerDown);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);draw();
  const keydown=(event)=>{
    if (event.key==="Escape" && tourFrame) {event.preventDefault();stopTour();return;}
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","+","=","-"].includes(event.key)) return;
    event.preventDefault();stopTour();
    if (event.key === "ArrowLeft") yaw-=.08;
    if (event.key === "ArrowRight") yaw+=.08;
    if (event.key === "ArrowUp") pitch=Math.max(-cameraPitchLimit,pitch-.08);
    if (event.key === "ArrowDown") pitch=Math.min(cameraPitchLimit,pitch+.08);
    if (event.key === "+" || event.key === "=") distance=Math.max(4,distance-.5);
    if (event.key === "-") distance=Math.min(24,distance+.5);
    if (event.key === "Home") { ({yaw,pitch,distance}=normalizeCameraState({distance:fitDistance})); }
    draw();
  };
  canvas.addEventListener("keydown",keydown);
  const wheel=(event)=>{event.preventDefault();stopTour();distance=Math.max(4,Math.min(24,distance+Math.sign(event.deltaY)*.5));draw();};
  canvas.addEventListener("wheel",wheel,{passive:false});
  canvas.addEventListener("pointercancel",up);
  canvas.addEventListener("lostpointercapture",up);
  return { supported:true, cameraState(){return {yaw,pitch,distance};},tourPlaying(){return Boolean(tourFrame);},toggleTour,stopTour,async capturePng(){if(contextLost || gl.isContextLost())throw new Error("The 3D preview is recovering. Try exporting again after it returns.");return viewportPng(canvas,draw,{width:1920,height:1080});}, setAccent(value){selectedAccent=value;staticRoom=null;geometry=null;draw();}, setFixtures(value){const selectedId=virtualFixtures.find(fixture=>fixture.selected)?.id;virtualFixtures=value.some(fixture=>Object.hasOwn(fixture,"selected")) ? value : value.map(fixture=>({...fixture,selected:fixture.id===selectedId}));geometry=null;draw();}, setView(axis){stopTour();const view=cameraAxisView(axis);yaw=view.yaw;pitch=view.pitch;draw();}, reset(){stopTour();({yaw,pitch,distance}=normalizeCameraState({distance:fitDistance}));draw();}, destroy(){stopTour();resize.disconnect();canvas.removeEventListener("webglcontextlost",contextLostListener);canvas.removeEventListener("webglcontextrestored",contextRestoredListener);canvas.removeEventListener("wheel",wheel);canvas.removeEventListener("keydown",keydown);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);canvas.removeEventListener("pointerdown",pointerDown);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);geometry=null;gl.deleteBuffer(resources.buffer);gl.deleteProgram(resources.program);} };
}
