import { studioCameraMatrix,cameraAxisView,cameraPitchLimit,normalizeCameraState, hexVector, multiply, viewportProjection, viewportRay, viewportPointOnPlane } from "./math.js";
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
function scaleGeometryPositions(data,start,end,scale) {
  for(let offset=start;offset<end;offset+=6){data[offset]*=scale;data[offset+1]*=scale;data[offset+2]*=scale;}
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
    return {x,y:Number.isFinite(transform.y) ? transform.y : 3.65,z,selected:fixture.selected === true,
      targetX:x+dx*Math.cos(rotation)+dz*Math.sin(rotation),targetZ:z+dz*Math.cos(rotation)-dx*Math.sin(rotation),
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
export function fixtureHousing(light){
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
  if (includeBeams && light.colour.some((value)=>value>0)) data.push(...beamVolume(light,beamSegments));
}
export function surfaceLighting(position, baseColour, lights, normal) {
  const result=baseColour.map((value)=>value*.7);
  const normalLength=normal ? Math.hypot(...normal) : 0;
  for (const light of lights) {
    const distance=Math.hypot(position[0]-light.x,position[1]-light.y,position[2]-light.z);
    const below=position[1] <= light.y ? 1 : .15;
    let cone=1;
    if (Number.isFinite(light.targetX) && Number.isFinite(light.targetZ)) {
      const direction=[light.targetX-light.x,.03-light.y,light.targetZ-light.z];
      const length=Math.hypot(...direction);
      const ray=position.map((value,index)=>value-[light.x,light.y,light.z][index]);
      const cosine=ray.reduce((sum,value,index)=>sum+value*direction[index],0)/Math.max(.0001,distance*length);
      const edge=length/Math.hypot(length,light.spread);
      cone=Math.max(0,Math.min(1,(cosine-edge)/Math.max(.0001,1-edge)));
    }
    const falloff=light.range ? Math.max(0,1-distance/light.range)**2 : 1;
    const directionToLight=[light.x-position[0],light.y-position[1],light.z-position[2]];
    const incidence=normalLength>0 && distance>0
      ? Math.abs(normal.reduce((sum,value,index)=>sum+value*directionToLight[index],0))/(normalLength*distance)
      : 1;
    const strength=below * cone * incidence * falloff / (1 + distance * distance * .12);
    for (let channel=0;channel<3;channel+=1) result[channel]+=light.colour[channel]*strength*(.48 + baseColour[channel]*.65);
  }
  return result.map((value)=>Math.max(0,Math.min(1,value)));
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

export function sceneData(accent, fixtures, visibility={}, room,includeBeams=true,materials={},quality="balanced",stage) {
  const data=[],floor=hexVector(materials.floor ?? "#4A3431"),wall=hexVector(materials.wall ?? "#27324A"),couch=hexVector("#9C4F48"),wood=hexVector("#67442F"),metal=hexVector("#151D2D");
  const {width,height,depth}=roomDimensions(room);
  const budget=previewQuality(quality);
  const propsVisible=visibility.props!==false;
  const studioPropsScale=Math.min(1,(width/2-.08)/4.78,(depth/2-.08)/2.95,(height-.05)/2.8);
  const floorBoardColour=(column,row)=>{
    const board=Math.floor((row+(column%3))/4);
    const shade=.82+((column*7+board*3)%9)*.025;
    const x=-width/2+(column+.5)*width/budget.columns,z=-depth/2+(row+.5)*depth/budget.rows;
    return floor.map(channel=>channel*shade*studioFloorShade(x/studioPropsScale,z/studioPropsScale,propsVisible));
  };
  data.push(...surfaceGrid([-width/2,0,-depth/2],[width,0,0],[0,0,depth],floorBoardColour,budget.columns,budget.rows));
  data.push(...studioFloorGrain(width,depth,floor));
  const rearWallStart=data.length;
  data.push(...surfaceGrid([-width/2,0,depth/2],[width,0,0],[0,height,0],wall,budget.columns,budget.rows));
  const rearWallEnd=data.length;
  data.push(...surfaceGrid([-width/2,0,-depth/2],[0,0,depth],[0,height,0],materials.wall ? wall : hexVector("#132746"),budget.columns,budget.rows));
  data.push(...surfaceGrid([-width/2,height,-depth/2],[width,0,0],[0,0,depth],hexVector(materials.ceiling ?? "#101726"),budget.columns,budget.rows));
  const shelfLamps=[{x:4.34,y:1.81,z:2.67},{x:4.36,y:2.51,z:2.67}];
  if (visibility.props!==false) {
  data.push(...acousticSlats(room,wood));
  const platform=stageSettings(stage);
  if(platform.enabled)box(data,platform.x,platform.y,platform.z,platform.width,platform.height,platform.depth,hexVector(platform.color));
  const furnitureStart=data.length;
  box(data,-2.45,.01,-.95,4.9,.02,3.65,hexVector("#342647"));
  const rugColour=hexVector("#665477");
  data.push(...surfaceGrid([-2.36,.037,-.86],[4.72,0,0],[0,0,3.47],(column,row)=>{
    const x=(column+.5)/24*4.72-2.36;
    const z=(row+.5)/18*3.47-.86;
    const layoutX=x/studioPropsScale,layoutZ=z/studioPropsScale;
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
  const furnitureEnd=data.length;
  scaleGeometryPositions(data,furnitureStart,furnitureEnd,studioPropsScale);
  studioWallArt(data,{width,height,depth},wood);
  }
  const rigStart=data.length;
  for (const y of [3.7,3.95]) box(data,-4,y,.4,8,.06,.06,metal);
  for (let x=-4;x<=4;x+=.5) box(data,x,3.7,.4,.04,.3,.06,metal);
  const rigScale=Math.min(1,(width/2-.04)/4.02,(height-.05)/4.01,(depth/2-.04)/.46);
  scaleGeometryPositions(data,rigStart,data.length,rigScale);
  const lights=virtualFixtureVisuals(visibility.lighting===false ? [] : fixtures,budget.fixtures);
  const surfaceLights=visibility.props!==false && visibility.lighting!==false
    ? [...lights,...shelfLamps.map(lamp=>({...lamp,x:lamp.x*studioPropsScale,y:lamp.y*studioPropsScale,z:lamp.z*studioPropsScale,colour:[.85,.46,.16],range:.85*studioPropsScale}))]
    : lights;
  // Approximate the soft bounce from each fixture's floor footprint.
  const rearWallLights=lights.map(light=>({
    x:light.targetX,y:.65,z:light.targetZ,
    colour:light.colour.map(channel=>channel*.8),range:3.2
  }));
  const rearSurfaceLights=[...surfaceLights,...rearWallLights];
  for (let triangle=0;triangle<data.length;triangle+=18) {
    const a=data.slice(triangle,triangle+3),b=data.slice(triangle+6,triangle+9),c=data.slice(triangle+12,triangle+15);
    const ab=b.map((value,axis)=>value-a[axis]),ac=c.map((value,axis)=>value-a[axis]);
    const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    const lights=triangle>=rearWallStart && triangle<rearWallEnd ? rearSurfaceLights : surfaceLights;
    for (const offset of [triangle,triangle+6,triangle+12]) {
      const colour=surfaceLighting(data.slice(offset,offset+3),data.slice(offset+3,offset+6),lights,normal);
      for (let channel=0;channel<3;channel+=1) data[offset+3+channel]=colour[channel];
    }
  }
  lights.forEach((light)=>lightGeometry(data,light,includeBeams,budget.beamSegments));
  return new Float32Array(data);
}

export function sceneBuffers(accent,fixtures,visibility={},room,materials={},quality="balanced",stage) {
  const opaque=sceneData(accent,fixtures,visibility,room,false,materials,quality,stage);
  const budget=previewQuality(quality);
  const beams=virtualFixtureVisuals(visibility.lighting===false ? [] : fixtures,budget.fixtures).filter((light)=>light.colour.some((value)=>value>0)).flatMap((light)=>beamVolume(light,budget.beamSegments));
  const data=new Float32Array(opaque.length+beams.length);
  data.set(opaque);data.set(beams,opaque.length);
  return {data,opaqueVertices:opaque.length/6};
}

export function createLightLabRenderer(canvas, { accent = "#C21888", fixtures = [], visibility = {}, room, materials={}, stage, quality="balanced", projection = "perspective", camera={}, onSelect=()=>{},onTransform=()=>{} } = {}) {
  const gl = canvas.getContext("webgl", { antialias:true, alpha:false });
  if (!gl) return { supported:false, destroy(){}, reset(){}, setAccent(){}, setFixtures(){} };
  const program=gl.createProgram(),vertexShader=compile(gl,gl.VERTEX_SHADER,vertexSource),fragmentShader=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vertexShader);gl.attachShader(program,fragmentShader);gl.linkProgram(program);
  gl.detachShader(program,vertexShader);gl.detachShader(program,fragmentShader);
  gl.deleteShader(vertexShader);gl.deleteShader(fragmentShader);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) { const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(message); }
  const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,"p"),colour=gl.getAttribLocation(program,"c"),matrix=gl.getUniformLocation(program,"m"),opacity=gl.getUniformLocation(program,"opacity");let selectedAccent=accent,virtualFixtures=fixtures,drag;let {yaw,pitch,distance}=normalizeCameraState(camera);
  let geometry=null,viewProjection=null,pickOccluders=null,pickCacheFixtures=null,pickTargets=[];
  function draw() {
    const ratio=Math.min(window.devicePixelRatio||1,previewQuality(quality).pixelRatio),width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    if (!geometry) {
      geometry=sceneBuffers(hexVector(selectedAccent),virtualFixtures,visibility,room,materials,quality,stage);
      gl.bufferData(gl.ARRAY_BUFFER,geometry.data,gl.STATIC_DRAW);
    }
    const pixelWidth=Math.max(1,Math.round(width*ratio)),pixelHeight=Math.max(1,Math.round(height*ratio));
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
  const resize=new ResizeObserver(draw);
  const fixtureAt=(event,bounds)=>{
    if(!viewProjection || visibility.lighting===false)return null;
    if(pickCacheFixtures!==virtualFixtures){
      pickCacheFixtures=virtualFixtures;
      pickTargets=virtualFixtureVisuals(virtualFixtures,previewQuality(quality).fixtures).map((point,index)=>({...point,id:virtualFixtures[index].id,housing:fixtureHousing(point)}));
    }
    const candidates=pickTargets;
    const occluders=pickOccluders ?? (pickOccluders=sceneData([0,0,0],[],visibility,room,false,materials,quality,stage));
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
  resize.observe(canvas);canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);draw();
  const keydown=(event)=>{
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","+","=","-"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") yaw-=.08;
    if (event.key === "ArrowRight") yaw+=.08;
    if (event.key === "ArrowUp") pitch=Math.max(-cameraPitchLimit,pitch-.08);
    if (event.key === "ArrowDown") pitch=Math.min(cameraPitchLimit,pitch+.08);
    if (event.key === "+" || event.key === "=") distance=Math.max(4,distance-.5);
    if (event.key === "-") distance=Math.min(24,distance+.5);
    if (event.key === "Home") { ({yaw,pitch,distance}=normalizeCameraState({})); }
    draw();
  };
  canvas.addEventListener("keydown",keydown);
  const wheel=(event)=>{event.preventDefault();distance=Math.max(4,Math.min(24,distance+Math.sign(event.deltaY)*.5));draw();};
  canvas.addEventListener("wheel",wheel,{passive:false});
  canvas.addEventListener("pointercancel",up);
  canvas.addEventListener("lostpointercapture",up);
  return { supported:true, cameraState(){return {yaw,pitch,distance};}, capturePng(){return viewportPng(canvas,draw);}, setAccent(value){selectedAccent=value;geometry=null;draw();}, setFixtures(value){const selectedId=virtualFixtures.find(fixture=>fixture.selected)?.id;virtualFixtures=value.some(fixture=>Object.hasOwn(fixture,"selected")) ? value : value.map(fixture=>({...fixture,selected:fixture.id===selectedId}));geometry=null;draw();}, setView(axis){const view=cameraAxisView(axis);yaw=view.yaw;pitch=view.pitch;draw();}, reset(){({yaw,pitch,distance}=normalizeCameraState({}));draw();}, destroy(){resize.disconnect();canvas.removeEventListener("wheel",wheel);canvas.removeEventListener("keydown",keydown);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);geometry=null;gl.deleteBuffer(buffer);gl.deleteProgram(program);} };
}
