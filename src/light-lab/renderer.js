import { cameraMatrix, hexVector, multiply, viewportProjection } from "./math.js";
import { viewportPng } from "../export/viewport.js";
import { pickScenePoint } from "./picking.js";
import { roomDimensions } from "../domain/room.js";
import { getFixtureProfile } from "../dmx/engine.js";

const vertexSource = `attribute vec3 p;attribute vec3 c;uniform mat4 m;varying vec3 v;void main(){gl_Position=m*vec4(p,1.0);v=c;}`;
const fragmentSource = `precision mediump float;varying vec3 v;uniform float opacity;void main(){gl_FragColor=vec4(v,opacity);}`;

function compile(gl, type, source) { const value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value); if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value)); return value; }
function quad(target, a, b, c, d, colour) { for (const point of [a,b,c,a,c,d]) target.push(...point, ...colour); }
function box(target, x, y, z, w, h, d, colour) { const X=x+w,Y=y+h,Z=z+d, shade=colour.map((value)=>value*.55),mid=colour.map((value)=>value*.78); quad(target,[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],colour);quad(target,[X,y,Z],[x,y,Z],[x,Y,Z],[X,Y,Z],shade);quad(target,[x,y,Z],[X,y,Z],[X,y,z],[x,y,z],mid);quad(target,[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z],colour);quad(target,[x,y,Z],[x,y,z],[x,Y,z],[x,Y,Z],shade);quad(target,[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z],mid); }
const channel = (value) => Math.max(0, Math.min(255, Number(value) || 0)) / 255;
export function virtualFixtureVisuals(fixtures = []) {
  return fixtures.slice(0,12).map((fixture,index)=>{
    const stored=fixture.properties ?? {},channels=fixture.profileId ? getFixtureProfile(fixture.profileId).modes.find((mode)=>mode.id===fixture.modeId)?.channels ?? [] : Object.keys(stored);
    const properties=Object.fromEntries(channels.map((key)=>[key,stored[key]])),white=channel(properties.white),dimmer=channel(properties.dimmer),transform=fixture.transform ?? {};
    const x=Number.isFinite(transform.x) ? transform.x : (index-1)*2.5;
    const z=Number.isFinite(transform.z) ? transform.z : .45;
    // Artistic normalized aiming, independent of manufacturer DMX calibration.
    const pan=Number.isFinite(properties.pan) ? properties.pan : 127;
    const tilt=Number.isFinite(properties.tilt) ? properties.tilt : 127;
    return {x,y:Number.isFinite(transform.y) ? transform.y : 3.65,z,selected:fixture.selected === true,
      targetX:x+(pan-127)/128*3,targetZ:z+1.35+(tilt-127)/128*3,
      colour:["red","green","blue"].map((name)=>Math.min(1,(channel(properties[name])+white)*dimmer)),
      spread:.55+channel(properties.beam)*.85};
  });
}
export function beamVolume(light, segments=16) {
  const data=[],tip=[light.x,light.y-.11,light.z],center=[light.targetX ?? light.x,.03,light.targetZ ?? light.z+1.35];
  for (let index=0;index<segments;index+=1) {
    const angle=index / segments * Math.PI * 2,next=(index + 1) / segments * Math.PI * 2;
    const a=[center[0]+Math.cos(angle)*light.spread,center[1],center[2]+Math.sin(angle)*light.spread];
    const b=[center[0]+Math.cos(next)*light.spread,center[1],center[2]+Math.sin(next)*light.spread];
    const shade=.12 + .16 * (1 + Math.cos(angle)) / 2;
    for (const point of [tip,a,b]) data.push(...point,...light.colour.map((value)=>value*shade));
    for (const point of [center,b,a]) data.push(...point,...light.colour.map((value)=>value*.55));
  }
  return data;
}
function lightGeometry(data, light,includeBeams=true) {
  const fixtureColour=light.colour.map((value)=>Math.max(.12,value));
  box(data,light.x-.18,light.y-.11,light.z-.18,.36,.18,.36,fixtureColour);
  if (light.selected) {
    const colour=hexVector("#22D3EE"),x=light.x-.23,y=light.y-.16,z=light.z-.23;
    for (const dy of [0,.28]) for (const dz of [0,.46]) box(data,x,y+dy,z+dz,.48,.015,.015,colour);
    for (const dx of [0,.46]) for (const dz of [0,.46]) box(data,x+dx,y,z+dz,.015,.29,.015,colour);
    for (const dx of [0,.46]) for (const dy of [0,.28]) box(data,x+dx,y+dy,z,.015,.015,.48,colour);
  }
  if (includeBeams && light.colour.some((value)=>value>0)) data.push(...beamVolume(light));
}
export function surfaceLighting(position, baseColour, lights) {
  const result=baseColour.map((value)=>value*.7);
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
    const strength=below * cone / (1 + distance * distance * .12);
    for (let channel=0;channel<3;channel+=1) result[channel]+=light.colour[channel]*strength*(.25 + baseColour[channel]*.5);
  }
  return result.map((value)=>Math.max(0,Math.min(1,value)));
}
export function surfaceGrid(origin, horizontal, vertical, colour, columns=20, rows=16) {
  const data=[];
  const point=(x,y)=>origin.map((value,axis)=>value+horizontal[axis]*x/columns+vertical[axis]*y/rows);
  for (let row=0;row<rows;row+=1) for (let column=0;column<columns;column+=1) quad(data,point(column,row),point(column+1,row),point(column+1,row+1),point(column,row+1),colour);
  return data;
}
export function studioPlant(x,z,height=2.1) {
  const data=[],pot=hexVector("#44313D"),leaf=hexVector("#235E45"),stem=hexVector("#4A6040");
  for (let segment=0;segment<16;segment++) {
    const a=segment/16*Math.PI*2,b=(segment+1)/16*Math.PI*2;
    quad(data,[x+Math.cos(a)*.2,0,z+Math.sin(a)*.2],[x+Math.cos(b)*.2,0,z+Math.sin(b)*.2],[x+Math.cos(b)*.3,.5,z+Math.sin(b)*.3],[x+Math.cos(a)*.3,.5,z+Math.sin(a)*.3],pot);
  }
  box(data,x-.025,.45,z-.025,.05,height-.45,.05,stem);
  for (let index=0;index<24;index++) {
    const angle=index*2.399963,reach=.45+(index%4)*.13,y=.75+(index/24)*(height-.6);
    const tip=[x+Math.cos(angle)*reach,y+.12,z+Math.sin(angle)*reach],root=[x,y-.12,z];
    const middle=[x+Math.cos(angle)*reach*.5,y+.25,z+Math.sin(angle)*reach*.5];
    const side=[Math.sin(angle)*.13,0,-Math.cos(angle)*.13];
    quad(data,root,middle.map((value,axis)=>value+side[axis]),tip,middle.map((value,axis)=>value-side[axis]),leaf.map((value)=>value*(.7+(index%3)*.15)));
  }
  return data;
}
export function sceneData(accent, fixtures, visibility={}, room,includeBeams=true,materials={}) {
  const data=[],floor=hexVector(materials.floor ?? "#172238"),wall=hexVector(materials.wall ?? "#27324A"),couch=hexVector("#9C4F48"),wood=hexVector("#67442F"),metal=hexVector("#151D2D");
  const {width,height,depth}=roomDimensions(room);
  data.push(...surfaceGrid([-width/2,0,-depth/2],[width,0,0],[0,0,depth],floor));
  data.push(...surfaceGrid([-width/2,0,depth/2],[width,0,0],[0,height,0],wall));
  data.push(...surfaceGrid([-width/2,0,-depth/2],[0,0,depth],[0,height,0],materials.wall ? wall : hexVector("#132746")));
  data.push(...surfaceGrid([-width/2,height,-depth/2],[width,0,0],[0,0,depth],hexVector(materials.ceiling ?? "#101726")));
  if (visibility.props!==false) {
  box(data,-2.1,.01,-.8,4.2,.02,3.5,hexVector("#665477"));
  box(data,-1.7,.25,1.4,3.4,.8,.75,couch);
  box(data,-1.45,1.05,1.55,2.9,.55,.35,couch.map((value)=>Math.min(1,value*1.2)));
  box(data,-1.9,.25,1.3,.3,1,.95,couch);
  box(data,1.6,.25,1.3,.3,1,.95,couch);
  box(data,-1,.65,-.25,2,.09,1,wood);
  for (const x of [-.85,.75]) for (const z of [-.1,.55]) box(data,x,.04,z,.07,.61,.07,metal);
  for (const x of [3.6,4.7]) box(data,x,0,2.5,.08,2.8,.45,wood);
  for (const y of [.1,.8,1.5,2.2,2.75]) box(data,3.6,y,2.5,1.18,.07,.45,wood);
  for (let index=0;index<4;index+=1) box(data,3.85+index*.16,.87,2.6,.1,.4,.22,index%2 ? accent : hexVector("#D4AF37"));
  box(data,-.8,2,3.88,1.6,.95,.08,wood);
  box(data,-.7,2.1,3.78,1.4,.75,.08,accent);
  data.push(...studioPlant(-3.65,1.8,2.4),...studioPlant(2.8,2.3,1.9));
  const chair=hexVector("#23405C");
  box(data,-3.4,.45,.1,1,.16,.85,chair);
  box(data,-3.4,.6,.8,1,.8,.14,chair);
  for (const x of [-3.4,-2.48]) for (const z of [.12,.87]) box(data,x,.03,z,.06,.44,.06,metal);
  for (const x of [-3.48,-2.42]) box(data,x,.7,.12,.08,.08,.85,metal);
  box(data,-2.65,0,1.55,.35,.06,.35,metal);
  box(data,-2.51,.06,1.69,.035,1.85,.035,metal);
  box(data,-2.62,1.83,1.58,.25,.17,.25,hexVector("#E6BA75"));
  }
  for (const y of [3.7,3.95]) box(data,-4,y,.4,8,.06,.06,metal);
  for (let x=-4;x<=4;x+=.5) box(data,x,3.7,.4,.04,.3,.06,metal);
  const lights=virtualFixtureVisuals(visibility.lighting===false ? [] : fixtures,accent);
  for (let offset=0;offset<data.length;offset+=6) {
    const colour=surfaceLighting(data.slice(offset,offset+3),data.slice(offset+3,offset+6),lights);
    for (let channel=0;channel<3;channel+=1) data[offset+3+channel]=colour[channel];
  }
  lights.forEach((light)=>lightGeometry(data,light,includeBeams));
  return new Float32Array(data);
}

export function sceneBuffers(accent,fixtures,visibility={},room,materials={}) {
  const opaque=sceneData(accent,fixtures,visibility,room,false,materials);
  const beams=virtualFixtureVisuals(visibility.lighting===false ? [] : fixtures).filter((light)=>light.colour.some((value)=>value>0)).flatMap((light)=>beamVolume(light));
  const data=new Float32Array(opaque.length+beams.length);
  data.set(opaque);data.set(beams,opaque.length);
  return {data,opaqueVertices:opaque.length/6};
}

export function createLightLabRenderer(canvas, { accent = "#C21888", fixtures = [], visibility = {}, room, materials={}, projection = "perspective", onSelect=()=>{} } = {}) {
  const gl = canvas.getContext("webgl", { antialias:true, alpha:false });
  if (!gl) return { supported:false, destroy(){}, reset(){}, setAccent(){}, setFixtures(){} };
  const program=gl.createProgram(),vertexShader=compile(gl,gl.VERTEX_SHADER,vertexSource),fragmentShader=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vertexShader);gl.attachShader(program,fragmentShader);gl.linkProgram(program);
  gl.detachShader(program,vertexShader);gl.detachShader(program,fragmentShader);
  gl.deleteShader(vertexShader);gl.deleteShader(fragmentShader);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) { const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(message); }
  const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,"p"),colour=gl.getAttribLocation(program,"c"),matrix=gl.getUniformLocation(program,"m"),opacity=gl.getUniformLocation(program,"opacity");let selectedAccent=accent,virtualFixtures=fixtures,yaw=-.25,pitch=.1,distance=11,drag;
  let geometry=null,viewProjection=null;
  function draw() {
    const ratio=Math.min(window.devicePixelRatio||1,2),width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    if (!geometry) {
      geometry=sceneBuffers(hexVector(selectedAccent),virtualFixtures,visibility,room,materials);
      gl.bufferData(gl.ARRAY_BUFFER,geometry.data,gl.STATIC_DRAW);
    }
    if(canvas.width!==width*ratio||canvas.height!==height*ratio){canvas.width=width*ratio;canvas.height=height*ratio;}
    gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);gl.clearColor(.025,.045,.09,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(colour,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(colour);
    viewProjection=multiply(viewportProjection(projection,width/height,distance),cameraMatrix({yaw,pitch,distance}));
    gl.uniformMatrix4fv(matrix,false,viewProjection);
    gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(opacity,1);
    gl.drawArrays(gl.TRIANGLES,0,geometry.opaqueVertices);
    const beamVertices=geometry.data.length/6-geometry.opaqueVertices;
    if (beamVertices) {
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.uniform1f(opacity,.35);
      gl.drawArrays(gl.TRIANGLES,geometry.opaqueVertices,beamVertices);
      gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(opacity,1);
    }
  }
  const resize=new ResizeObserver(draw);
  const down=(event)=>{drag={x:event.clientX,y:event.clientY,travel:0};canvas.setPointerCapture(event.pointerId);};
  const move=(event)=>{
    if (!drag) return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    drag={x:event.clientX,y:event.clientY,travel:drag.travel+Math.hypot(dx,dy)};
    yaw+=dx*.009;pitch=Math.max(-.72,Math.min(.72,pitch+dy*.009));draw();
  };
  const up=(event)=>{
    const click=drag && event?.type==="pointerup" && drag.travel+Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<=5;
    drag=undefined;
    if (!click || visibility.lighting===false) return;
    const bounds=canvas.getBoundingClientRect();
    const candidates=virtualFixtureVisuals(virtualFixtures).map((point,index)=>({...point,id:virtualFixtures[index].id}));
    const id=pickScenePoint(candidates,viewProjection,bounds.width,bounds.height,event.clientX-bounds.left,event.clientY-bounds.top);
    if (id) onSelect(id);
  };
  resize.observe(canvas);canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);draw();
  const keydown=(event)=>{
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","+","=","-"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") yaw-=.08;
    if (event.key === "ArrowRight") yaw+=.08;
    if (event.key === "ArrowUp") pitch=Math.max(-.72,pitch-.08);
    if (event.key === "ArrowDown") pitch=Math.min(.72,pitch+.08);
    if (event.key === "+" || event.key === "=") distance=Math.max(4,distance-.5);
    if (event.key === "-") distance=Math.min(24,distance+.5);
    if (event.key === "Home") { yaw=-.25; pitch=.1; distance=11; }
    draw();
  };
  canvas.addEventListener("keydown",keydown);
  const wheel=(event)=>{event.preventDefault();distance=Math.max(4,Math.min(24,distance+Math.sign(event.deltaY)*.5));draw();};
  canvas.addEventListener("wheel",wheel,{passive:false});
  canvas.addEventListener("pointercancel",up);
  canvas.addEventListener("lostpointercapture",up);
  return { supported:true, capturePng(){return viewportPng(canvas,draw);}, setAccent(value){selectedAccent=value;geometry=null;draw();}, setFixtures(value){virtualFixtures=value;geometry=null;draw();}, reset(){yaw=-.25;pitch=.1;distance=11;draw();}, destroy(){resize.disconnect();canvas.removeEventListener("wheel",wheel);canvas.removeEventListener("keydown",keydown);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);geometry=null;gl.deleteBuffer(buffer);gl.deleteProgram(program);} };
}
