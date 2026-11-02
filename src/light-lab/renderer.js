import { cameraMatrix, hexVector, multiply, perspective, radians } from "./math.js";

const vertexSource = `attribute vec3 p;attribute vec3 c;uniform mat4 m;varying vec3 v;void main(){gl_Position=m*vec4(p,1.0);v=c;}`;
const fragmentSource = `precision mediump float;varying vec3 v;void main(){gl_FragColor=vec4(v,1.0);}`;

function compile(gl, type, source) { const value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value); if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value)); return value; }
function quad(target, a, b, c, d, colour) { for (const point of [a,b,c,a,c,d]) target.push(...point, ...colour); }
function box(target, x, y, z, w, h, d, colour) { const X=x+w,Y=y+h,Z=z+d, shade=colour.map((value)=>value*.55),mid=colour.map((value)=>value*.78); quad(target,[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],colour);quad(target,[X,y,Z],[x,y,Z],[x,Y,Z],[X,Y,Z],shade);quad(target,[x,y,Z],[X,y,Z],[X,y,z],[x,y,z],mid);quad(target,[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z],colour);quad(target,[x,y,Z],[x,y,z],[x,Y,z],[x,Y,Z],shade);quad(target,[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z],mid); }
const channel = (value) => Math.max(0, Math.min(255, Number(value) || 0)) / 255;
export function virtualFixtureVisuals(fixtures = [], fallback = "#C21888") { return fixtures.slice(0, 12).map((fixture, index) => { const properties=fixture.properties ?? {},white=channel(properties.white),dimmer=channel(properties.dimmer),transform=fixture.transform ?? {}; return { x:Number.isFinite(transform.x) ? transform.x : (index - 1) * 2.5, y:Number.isFinite(transform.y) ? transform.y : 3.65, z:Number.isFinite(transform.z) ? transform.z : .45, colour:["red","green","blue"].map((name)=>Math.min(1,(channel(properties[name]) + white) * dimmer)), spread:.55 + channel(properties.beam) * .85 }; }) || [{x:0,y:3.65,z:.45,colour:hexVector(fallback),spread:.9}]; }
export function beamVolume(light, segments=16) {
  const data=[],tip=[light.x,light.y-.11,light.z],center=[light.x,.03,light.z+1.35];
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
function lightGeometry(data, light) {
  const fixtureColour=light.colour.map((value)=>Math.max(.12,value));
  box(data,light.x-.18,light.y-.11,light.z-.18,.36,.18,.36,fixtureColour);
  if (light.colour.some((value)=>value>0)) data.push(...beamVolume(light));
}
export function sceneData(accent, fixtures) {
  const data=[],floor=hexVector("#172238"),wall=hexVector("#27324A"),couch=hexVector("#9C4F48"),wood=hexVector("#67442F"),metal=hexVector("#151D2D");
  quad(data,[-5,0,-4],[5,0,-4],[5,0,4],[-5,0,4],floor);
  quad(data,[-5,0,4],[5,0,4],[5,4,4],[-5,4,4],wall);
  quad(data,[-5,0,-4],[-5,0,4],[-5,4,4],[-5,4,-4],hexVector("#132746"));
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
  for (const y of [3.7,3.95]) box(data,-4,y,.4,8,.06,.06,metal);
  for (let x=-4;x<=4;x+=.5) box(data,x,3.7,.4,.04,.3,.06,metal);
  virtualFixtureVisuals(fixtures,accent).forEach((light)=>lightGeometry(data,light));
  return new Float32Array(data);
}

export function createLightLabRenderer(canvas, { accent = "#C21888", fixtures = [] } = {}) {
  const gl = canvas.getContext("webgl", { antialias:true, alpha:false });
  if (!gl) return { supported:false, destroy(){}, reset(){}, setAccent(){}, setFixtures(){} };
  const program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,"p"),colour=gl.getAttribLocation(program,"c"),matrix=gl.getUniformLocation(program,"m");let selectedAccent=accent,virtualFixtures=fixtures,yaw=-.25,pitch=.1,drag;
  function draw() { const ratio=Math.min(window.devicePixelRatio||1,2),width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),data=sceneData(hexVector(selectedAccent),virtualFixtures);if(canvas.width!==width*ratio||canvas.height!==height*ratio){canvas.width=width*ratio;canvas.height=height*ratio;}gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);gl.clearColor(.025,.045,.09,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(colour,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(colour);gl.uniformMatrix4fv(matrix,false,multiply(perspective(radians(48),width/height,.1,100),cameraMatrix({yaw,pitch})));gl.drawArrays(gl.TRIANGLES,0,data.length/6); }
  const resize=new ResizeObserver(draw),down=(event)=>{drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);},move=(event)=>{if(!drag)return;yaw+=(event.clientX-drag.x)*.009;pitch=Math.max(-.72,Math.min(.72,pitch+(event.clientY-drag.y)*.009));drag={x:event.clientX,y:event.clientY};draw();},up=()=>{drag=undefined;};resize.observe(canvas);canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);draw();
  const keydown=(event)=>{
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") yaw-=.08;
    if (event.key === "ArrowRight") yaw+=.08;
    if (event.key === "ArrowUp") pitch=Math.max(-.72,pitch-.08);
    if (event.key === "ArrowDown") pitch=Math.min(.72,pitch+.08);
    if (event.key === "Home") { yaw=-.25; pitch=.1; }
    draw();
  };
  canvas.addEventListener("keydown",keydown);
  canvas.addEventListener("pointercancel",up);
  canvas.addEventListener("lostpointercapture",up);
  return { supported:true, setAccent(value){selectedAccent=value;draw();}, setFixtures(value){virtualFixtures=value;draw();}, reset(){yaw=-.25;pitch=.1;draw();}, destroy(){resize.disconnect();canvas.removeEventListener("keydown",keydown);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);gl.deleteBuffer(buffer);gl.deleteProgram(program);} };
}
