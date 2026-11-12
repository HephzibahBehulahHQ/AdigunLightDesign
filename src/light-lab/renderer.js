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
    min[axis]=Math.min(min[axis],housing[offset+axis]-.04);max[axis]=Math.max(max[axis],housing[oëÎ»¶‰žËkºwµçt€è™¥áÑÕÉ•Ì±ÁÉ•Ù¥•ÝEÕ…±¥Ñä¡ÅÕ…±¥Ñä¤¹™¥áÑÕÉ•Ì¤¹™¥±Ñ•È ¡±¥¡Ð¤ôù±¥¡Ð¹½±½ÕÈ¹Í½µ” ¡Ù…±Õ”¤ôùÙ…±Õ”øÀ¤¤¹™±…Ñ5…À ¡±¥¡Ð¤ôù‰•…µY½±Õµ”¡±¥¡Ð¤¤ì(€½¹ÍÐ‘…Ñ„õ¹•Ü±½…ÐÌÉÉÉ…ä¡½Á…ÅÕ”¹±•¹Ñ ­‰•…µÌ¹±•¹Ñ ¤ì(€‘…Ñ„¹Í•Ð¡½Á…ÅÕ”¤í‘…Ñ„¹Í•Ð¡‰•…µÌ±½Á…ÅÕ”¹±•¹Ñ ¤ì(€É•ÑÕÉ¸í‘…Ñ„±½Á…ÅÕ•Y•ÉÑ¥•Ìé½Á…ÅÕ”¹±•¹Ñ ¼Ùôì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸É•…Ñ•1¥¡Ñ1…‰I•¹‘•É•È¡…¹Ù…Ì°ì…•¹Ð€ô€ˆÈÄàààˆ°™¥áÑÕÉ•Ì€ômt°Ù¥Í¥‰¥±¥Ñä€ôíô°É½½´°µ…Ñ•É¥…±Ìõíô°ÍÑ…”°ÅÕ…±¥Ñäô‰‰…±…¹•ˆ°ÁÉ½©•Ñ¥½¸€ô€‰Á•ÉÍÁ•Ñ¥Ù”ˆ°…µ•É„õíô°½¹M•±•Ðô ¤ôùíô±½¹QÉ…¹Í™½É´ô ¤ôùíôô€ôíô¤ì(€½¹ÍÐ°€ô…¹Ù…Ì¹•Ñ½¹Ñ•áÐ ‰Ý•‰°ˆ°ì…¹Ñ¥…±¥…ÌéÑÉÕ”°…±Á¡„é™…±Í”ô¤ì(€¥˜€ …°¤É•ÑÕÉ¸ìÍÕÁÁ½ÉÑ•é™…±Í”°‘•ÍÑÉ½ä ¥íô°É•Í•Ð ¥íô°Í•Ñ•¹Ð ¥íô°Í•Ñ¥áÑÕÉ•Ì ¥íôôì(€½¹ÍÐÁÉ½É…´õ°¹É•…Ñ•AÉ½É…´ ¤±Ù•ÉÑ•áM¡…‘•Èõ½µÁ¥±”¡°±°¹YIQa}M!H±Ù•ÉÑ•áM½ÕÉ”¤±™É…µ•¹ÑM¡…‘•Èõ½µÁ¥±”¡°±°¹I59Q}M!H±™É…µ•¹ÑM½ÕÉ”¤ì(€°¹…ÑÑ…¡M¡…‘•È¡ÁÉ½É…´±Ù•ÉÑ•áM¡…‘•È¤í°¹…ÑÑ…¡M¡…‘•È¡ÁÉ½É…´±™É…µ•¹ÑM¡…‘•È¤í°¹±¥¹­AÉ½É…´¡ÁÉ½É…´¤ì(€°¹‘•Ñ…¡M¡…‘•È¡ÁÉ½É…´±Ù•ÉÑ•áM¡…‘•È¤í°¹‘•Ñ…¡M¡…‘•È¡ÁÉ½É…´±™É…µ•¹ÑM¡…‘•È¤ì(€°¹‘•±•Ñ•M¡…‘•È¡Ù•ÉÑ•áM¡…‘•È¤í°¹‘•±•Ñ•M¡…‘•È¡™É…µ•¹ÑM¡…‘•È¤ì(€¥˜ …°¹•ÑAÉ½É…µA…É…µ•Ñ•È¡ÁÉ½É…´±°¹1%9-}MQQUL¤¤ì½¹ÍÐµ•ÍÍ…”õ°¹•ÑAÉ½É…µ%¹™½1½œ¡ÁÉ½É…´¤í°¹‘•±•Ñ•AÉ½É…´¡ÁÉ½É…´¤íÑ¡É½Ü¹•ÜÉÉ½È¡µ•ÍÍ…”¤ìô(€½¹ÍÐ‰Õ™™•Èõ°¹É•…Ñ•	Õ™™•È ¤±Á½Í¥Ñ¥½¸õ°¹•ÑÑÑÉ¥‰1½…Ñ¥½¸¡ÁÉ½É…´°‰Àˆ¤±½±½ÕÈõ°¹•ÑÑÑÉ¥‰1½…Ñ¥½¸¡ÁÉ½É…´°‰Œˆ¤±µ…ÑÉ¥àõ°¹•ÑU¹¥™½Éµ1½…Ñ¥½¸¡ÁÉ½É…´°‰´ˆ¤±½Á…¥Ñäõ°¹•ÑU¹¥™½Éµ1½…Ñ¥½¸¡ÁÉ½É…´°‰½Á…¥Ñäˆ¤í±•ÐÍ•±•Ñ•‘•¹Ðõ…•¹Ð±Ù¥ÉÑÕ…±¥áÑÕÉ•Ìõ™¥áÑÕÉ•Ì±‘É…œí±•Ðíå…Ü±Á¥Ñ ±‘¥ÍÑ…¹•ôõ¹½Éµ…±¥é•…µ•É…MÑ…Ñ”¡…µ•É„¤ì(€±•Ð•½µ•ÑÉäõ¹Õ±°±Ù¥•ÝAÉ½©•Ñ¥½¸õ¹Õ±°±Á¥­=±Õ‘•ÉÌõ¹Õ±°ì(€™Õ¹Ñ¥½¸‘É…Ü ¤ì(€€€½¹ÍÐÉ…Ñ¥¼õ5…Ñ ¹µ¥¸¡Ý¥¹‘½Ü¹‘•Ù¥•A¥á•±I…Ñ¥½ñðÄ±ÁÉ•Ù¥•ÝEÕ…±¥Ñä¡ÅÕ…±¥Ñä¤¹Á¥á•±I…Ñ¥¼¤±Ý¥‘Ñ õ5…Ñ ¹µ…à Ä±…¹Ù…Ì¹±¥•¹Ñ]¥‘Ñ ¤±¡•¥¡Ðõ5…Ñ ¹µ…à Ä±…¹Ù…Ì¹±¥•¹Ñ!•¥¡Ð¤ì(€€€°¹‰¥¹‘	Õ™™•È¡°¹IIe}	UH±‰Õ™™•È¤ì(€€€¥˜€ …•½µ•ÑÉä¤ì(€€€€€•½µ•ÑÉäõÍ•¹•	Õ™™•ÉÌ¡¡•áY•Ñ½È¡Í•±•Ñ•‘•¹Ð¤±Ù¥ÉÑÕ…±¥áÑÕÉ•Ì±Ù¥Í¥‰¥±¥Ñä±É½½´±µ…Ñ•É¥…±Ì±ÅÕ…±¥Ñä±ÍÑ…”¤ì(€€€€€°¹‰Õ™™•É…Ñ„¡°¹IIe}	UH±•½µ•ÑÉä¹‘…Ñ„±°¹MQQ%}I\¤ì(€€€ô(€€€½¹ÍÐÁ¥á•±]¥‘Ñ õ5…Ñ ¹µ…à Ä±5…Ñ ¹É½Õ¹¡Ý¥‘Ñ ©É…Ñ¥¼¤¤±Á¥á•±!•¥¡Ðõ5…Ñ ¹µ…à Ä±5…Ñ ¹É½Õ¹¡¡•¥¡Ð©É…Ñ¥¼¤¤ì(€€€¥˜¡…¹Ù…Ì¹Ý¥‘Ñ „ôõÁ¥á•±]¥‘Ñ¡ññ…¹Ù…Ì¹¡•¥¡Ð„ôõÁ¥á•±!•¥¡Ð¥í…¹Ù…Ì¹Ý¥‘Ñ õÁ¥á•±]¥‘Ñ í…¹Ù…Ì¹¡•¥¡ÐõÁ¥á•±!•¥¡Ðíô(€€€°¹Ù¥•ÝÁ½ÉÐ À°À±…¹Ù…Ì¹Ý¥‘Ñ ±…¹Ù…Ì¹¡•¥¡Ð¤í°¹•¹…‰±”¡°¹AQ!}QMP¤í°¹±•…É½±½È ¸ÀÈÔ°¸ÀÐÔ°¸Àä°Ä¤í°¹±•…È¡°¹=1=I}	UI}	%Qñ°¹AQ!}	UI}	%P¤í°¹ÕÍ•AÉ½É…´¡ÁÉ½É…´¤ì(€€€°¹Ù•ÉÑ•áÑÑÉ¥‰A½¥¹Ñ•È¡Á½Í¥Ñ¥½¸°Ì±°¹1=P±™…±Í”°ÈÐ°À¤í°¹•¹…‰±•Y•ÉÑ•áÑÑÉ¥‰ÉÉ…ä¡Á½Í¥Ñ¥½¸¤í°¹Ù•ÉÑ•áÑÑÉ¥‰A½¥¹Ñ•È¡½±½ÕÈ°Ì±°¹1=P±™…±Í”°ÈÐ°ÄÈ¤í°¹•¹…‰±•Y•ÉÑ•áÑÑÉ¥‰ÉÉ…ä¡½±½ÕÈ¤ì(€€€Ù¥•ÝAÉ½©•Ñ¥½¸õµÕ±Ñ¥Á±ä¡Ù¥•ÝÁ½ÉÑAÉ½©•Ñ¥½¸¡ÁÉ½©•Ñ¥½¸±Ý¥‘Ñ ½¡•¥¡Ð±‘¥ÍÑ…¹”¤±ÍÑÕ‘¥½…µ•É…5…ÑÉ¥à¡íå…Ü±Á¥Ñ ±‘¥ÍÑ…¹”±Ñ…É•Ñ!•¥¡ÐéÉ½½µ¥µ•¹Í¥½¹Ì¡É½½´¤¹¡•¥¡Ð¨¸ÔÕô¤¤ì(€€€°¹Õ¹¥™½Éµ5…ÑÉ¥àÑ™Ø¡µ…ÑÉ¥à±™…±Í”±Ù¥•ÝAÉ½©•Ñ¥½¸¤ì(€€€°¹‘•ÁÑ¡5…Í¬¡ÑÉÕ”¤í°¹‘¥Í…‰±”¡°¹	19¤í°¹Õ¹¥™½É´Å˜¡½Á…¥Ñä°Ä¤ì(€€€°¹‘É…ÝÉÉ…åÌ¡°¹QI%91L°À±•½µ•ÑÉä¹½Á…ÅÕ•Y•ÉÑ¥•Ì¤ì(€€€½¹ÍÐ‰•…µY•ÉÑ¥•Ìõ•½µ•ÑÉä¹‘…Ñ„¹±•¹Ñ ¼Øµ•½µ•ÑÉä¹½Á…ÅÕ•Y•ÉÑ¥•Ìì(€€€¥˜€¡‰•…µY•ÉÑ¥•Ì¤ì(€€€€€°¹•¹…‰±”¡°¹	19¤í°¹‰±•¹‘Õ¹Œ¡°¹MI}1A!±°¹=9¤í°¹‘•ÁÑ¡5…Í¬¡™…±Í”¤í°¹Õ¹¥™½É´Å˜¡½Á…¥Ñä°¸ÔÔ¤ì(€€€€€°¹‘É…ÝÉÉ…åÌ¡°¹QI%91L±•½µ•ÑÉä¹½Á…ÅÕ•Y•ÉÑ¥•Ì±‰•…µY•ÉÑ¥•Ì¤ì(€€€€€°¹‘•ÁÑ¡5…Í¬¡ÑÉÕ”¤í°¹‘¥Í…‰±”¡°¹	19¤í°¹Õ¹¥™½É´Å˜¡½Á…¥Ñä°Ä¤ì(€€€ô(€ô(€½¹ÍÐÉ•Í¥é”õ¹•ÜI•Í¥é•=‰Í•ÉÙ•È¡‘É…Ü¤ì(€½¹ÍÐ™¥áÑÕÉ•Ðô¡•Ù•¹Ð±‰½Õ¹‘Ì¤ôùì(€€€¥˜ …Ù¥•ÝAÉ½©•Ñ¥½¸ñðÙ¥Í¥‰¥±¥Ñä¹±¥¡Ñ¥¹œôôõ™…±Í”¥É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍÐ…¹‘¥‘…Ñ•ÌõÙ¥ÉÑÕ…±¥áÑÕÉ•Y¥ÍÕ…±Ì¡Ù¥ÉÑÕ…±¥áÑÕÉ•Ì±ÁÉ•Ù¥•ÝEÕ…±¥Ñä¡ÅÕ…±¥Ñä¤¹™¥áÑÕÉ•Ì¤¹µ…À ¡Á½¥¹Ð±¥¹‘•à¤ôø¡ì¸¸¹Á½¥¹Ð±¥éÙ¥ÉÑÕ…±¥áÑÕÉ•Ím¥¹‘•át¹¥‘ô¤¤ì(€€€½¹ÍÐ½±Õ‘•ÉÌõÁ¥­=±Õ‘•ÉÌ€üü€¡Á¥­=±Õ‘•ÉÌõÍ•¹•…Ñ„¡lÀ°À°Át±mt±Ù¥Í¥‰¥±¥Ñä±É½½´±™…±Í”±µ…Ñ•É¥…±Ì±ÅÕ…±¥Ñä±ÍÑ…”¤¤ì(€€€½¹ÍÐàõ•Ù•¹Ð¹±¥•¹Ñ`µ‰½Õ¹‘Ì¹±•™Ð±äõ•Ù•¹Ð¹±¥•¹Ñdµ‰½Õ¹‘Ì¹Ñ½À±É…äõÙ¥•ÝÁ½ÉÑI…ä¡Ù¥•ÝAÉ½©•Ñ¥½¸±à±ä±‰½Õ¹‘Ì¹Ý¥‘Ñ ±‰½Õ¹‘Ì¹¡•¥¡Ð¤ì(€€€¥˜¡É…ä¥ì(€€€€€±•ÐÍ•±•Ñ•õ¹Õ±°±¹•…É•ÍÐõ%¹™¥¹¥Ñäì(€€€€€™½È¡½¹ÍÐÁ½¥¹Ð½˜…¹‘¥‘…Ñ•Ì¥ì(€€€€€€€½¹ÍÐ‘¥ÍÑ…¹”õÉ…å!¥Ñ¥ÍÑ…¹”¡™¥áÑÕÉ•!½ÕÍ¥¹œ¡Á½¥¹Ð¤±É…ä¤ì(€€€€€€€¥˜¡‘¥ÍÑ…¹”ôôõ¹Õ±±ññ‘¥ÍÑ…¹”øõ¹•…É•ÍÑññÉ…å!¥Ñ¥ÍÑ…¹”¡½±Õ‘•ÉÌ±É…ä±‘¥ÍÑ…¹”´¸ÄÈ¤„ôõ¹Õ±°¥½¹Ñ¥¹Õ”ì(€€€€€€€Í•±•Ñ•õÁ½¥¹Ð¹¥í¹•…É•ÍÐõ‘¥ÍÑ…¹”ì(€€€€€ô(€€€€€¥˜¡Í•±•Ñ•„ôõ¹Õ±°¥É•ÑÕÉ¸Ù¥ÉÑÕ…±¥áÑÕÉ•Ì¹™¥¹¡™¥áÑÕÉ”ôù™¥áÑÕÉ”¹¥ôôõÍ•±•Ñ•¤€üü¹Õ±°ì(€€€ô(€€€½¹ÍÐÙ¥Í¥‰±”õ™¥±Ñ•É=±Õ‘•‘A½¥¹ÑÌ¡…¹‘¥‘…Ñ•Ì±Ù¥•ÝAÉ½©•Ñ¥½¸±‰½Õ¹‘Ì¹Ý¥‘Ñ ±‰½Õ¹‘Ì¹¡•¥¡Ð±½±Õ‘•ÉÌ¤ì(€€€½¹ÍÐ¥õÁ¥­M•¹•A½¥¹Ð¡Ù¥Í¥‰±”±Ù¥•ÝAÉ½©•Ñ¥½¸±‰½Õ¹‘Ì¹Ý¥‘Ñ ±‰½Õ¹‘Ì¹¡•¥¡Ð±à±ä¤ì(€€€É•ÑÕÉ¸Ù¥ÉÑÕ…±¥áÑÕÉ•Ì¹™¥¹¡™¥áÑÕÉ”ôù™¥áÑÕÉ”¹¥ôôõ¥¤€üü¹Õ±°ì(€ôì(€½¹ÍÐ‘½Ý¸ô¡•Ù•¹Ð¤ôùì(€€€½¹ÍÐ‰½Õ¹‘Ìõ…¹Ù…Ì¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤±Ñ…É•Ðõ•Ù•¹Ð¹Í¡¥™Ñ-•ä€ü™¥áÑÕÉ•Ð¡•Ù•¹Ð±‰½Õ¹‘Ì¤€è¹Õ±°ì(€€€½¹ÍÐÁ±…¹•MÑ…ÉÐõÑ…É•Ð€üÙ¥•ÝÁ½ÉÑA½¥¹Ñ=¹A±…¹”¡Ù¥•ÝAÉ½©•Ñ¥½¸±•Ù•¹Ð¹±¥•¹Ñ`µ‰½Õ¹‘Ì¹±•™Ð±•Ù•¹Ð¹±¥•¹Ñdµ‰½Õ¹‘Ì¹Ñ½À±‰½Õ¹‘Ì¹Ý¥‘Ñ ±‰½Õ¹‘Ì¹¡•¥¡Ð±Ñ…É•Ð¹ÑÉ…¹Í™½É´¹ä¤€è¹Õ±°ì(€€€‘É…œõíàé•Ù•¹Ð¹±¥•¹Ñ`±äé•Ù•¹Ð¹±¥•¹Ñd±ÑÉ…Ù•°èÀ±™¥áÑÕÉ•5½Ù”éÑ…É•Ð˜™Á±…¹•MÑ…ÉÐ€üí¥éÑ…É•Ð¹¥±½É¥¥¸éì¸¸¹Ñ…É•Ð¹ÑÉ…¹Í™½Éµô±ÍÑ…ÉÐéÁ±…¹•MÑ…ÉÐ±¹•áÐéì¸¸¹Ñ…É•Ð¹ÑÉ…¹Í™½Éµõô€è¹Õ±±ôì(€€€…¹Ù…Ì¹Í•ÑA½¥¹Ñ•É…ÁÑÕÉ”¡•Ù•¹Ð¹Á½¥¹Ñ•É%¤ì(€ôì(€½¹ÍÐµ½Ù”ô¡•Ù•¹Ð¤ôùì(€€€¥˜€ …‘É…œ¤É•ÑÕÉ¸ì(€€€½¹ÍÐÕÉÉ•¹Ðõ‘É…œ±‘àõ•Ù•¹Ð¹±¥•¹Ñ`µÕÉÉ•¹Ð¹à±‘äõ•Ù•¹Ð¹±¥•¹ÑdµÕÉÉ•¹Ð¹äì(€€€‘É…œõì¸¸¹ÕÉÉ•¹Ð±àé•Ù•¹Ð¹±¥•¹Ñ`±äé•Ù•¹Ð¹±¥•¹Ñd±ÑÉ…Ù•°éÕÉÉ•¹Ð¹ÑÉ…Ù•°­5…Ñ ¹¡åÁ½Ð¡‘à±‘ä¥ôì(€€€¥˜¡ÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¥ì(€€€€€½¹ÍÐ‰½Õ¹‘Ìõ…¹Ù…Ì¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤±Á±…¹”õÙ¥•ÝÁ½ÉÑA½¥¹Ñ=¹A±…¹”¡Ù¥•ÝAÉ½©•Ñ¥½¸±•Ù•¹Ð¹±¥•¹Ñ`µ‰½Õ¹‘Ì¹±•™Ð±•Ù•¹Ð¹±¥•¹Ñdµ‰½Õ¹‘Ì¹Ñ½À±‰½Õ¹‘Ì¹Ý¥‘Ñ ±‰½Õ¹‘Ì¹¡•¥¡Ð±ÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¹½É¥¥¸¹ä¤ì(€€€€€¥˜¡Á±…¹”¥ì(€€€€€€€½¹ÍÐí¥±½É¥¥¸±ÍÑ…ÉÑôõÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”±¹•áÐõì¸¸¹½É¥¥¸±àé½É¥¥¸¹à­Á±…¹•lÁtµÍÑ…ÉÑlÁt±èé½É¥¥¸¹è­Á±…¹•lÉtµÍÑ…ÉÑlÉuôì(€€€€€€€ÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¹¹•áÐõ¹•áÐì(€€€€€€€Ù¥ÉÑÕ…±¥áÑÕÉ•ÌõÙ¥ÉÑÕ…±¥áÑÕÉ•Ì¹µ…À¡™¥áÑÕÉ”ôù™¥áÑÕÉ”¹¥ôôõ¥€üì¸¸¹™¥áÑÕÉ”±ÑÉ…¹Í™½É´é¹•áÑô€è™¥áÑÕÉ”¤ì(€€€€€€€•½µ•ÑÉäõ¹Õ±°í‘É…Ü ¤ì(€€€€€ô(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€å…Ü¬õ‘à¨¸ÀÀäíÁ¥Ñ õ5…Ñ ¹µ…à µ…µ•É…A¥Ñ¡1¥µ¥Ð±5…Ñ ¹µ¥¸¡…µ•É…A¥Ñ¡1¥µ¥Ð±Á¥Ñ ­‘ä¨¸ÀÀä¤¤í‘É…Ü ¤ì(€ôì(€½¹ÍÐÕÀô¡•Ù•¹Ð¤ôùì(€€€½¹ÍÐÕÉÉ•¹Ðõ‘É…œ±±¥¬õÕÉÉ•¹Ð€˜˜•Ù•¹Ðü¹ÑåÁ”ôôô‰Á½¥¹Ñ•ÉÕÀˆ€˜˜ÕÉÉ•¹Ð¹ÑÉ…Ù•°­5…Ñ ¹¡åÁ½Ð¡•Ù•¹Ð¹±¥•¹Ñ`µÕÉÉ•¹Ð¹à±•Ù•¹Ð¹±¥•¹ÑdµÕÉÉ•¹Ð¹ä¤ðôÔì(€€€‘É…œõÕ¹‘•™¥¹•ì(€€€¥˜¡ÕÉÉ•¹Ðü¹™¥áÑÕÉ•5½Ù”¥ì(€€€€€¥˜¡•Ù•¹Ðü¹ÑåÁ”ôôô‰Á½¥¹Ñ•ÉÕÀˆ¥ì(€€€€€€€¥˜¡ÕÉÉ•¹Ð¹ÑÉ…Ù•°øÔ¥½¹QÉ…¹Í™½É´¡ÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¹¥±ÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¹¹•áÐ¤ì(€€€€€€€½¹M•±•Ð¡ÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¹¥¤ì(€€€€€õ•±Í•ì(€€€€€€€Ù¥ÉÑÕ…±¥áÑÕÉ•ÌõÙ¥ÉÑÕ…±¥áÑÕÉ•Ì¹µ…À¡™¥áÑÕÉ”ôù™¥áÑÕÉ”¹¥ôôõÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¹¥€üì¸¸¹™¥áÑÕÉ”±ÑÉ…¹Í™½É´éÕÉÉ•¹Ð¹™¥áÑÕÉ•5½Ù”¹½É¥¥¹ô€è™¥áÑÕÉ”¤ì(€€€€€€€•½µ•ÑÉäõ¹Õ±°í‘É…Ü ¤ì(€€€€€ô(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€¥˜€ …±¥¬ñðÙ¥Í¥‰¥±¥Ñä¹±¥¡Ñ¥¹œôôõ™…±Í”¤É•ÑÕÉ¸ì(€€€½¹ÍÐ‰½Õ¹‘Ìõ…¹Ù…Ì¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤ì(€€€½¹ÍÐ™¥áÑÕÉ”õ™¥áÑÕÉ•Ð¡•Ù•¹Ð±‰½Õ¹‘Ì¤ì(€€€¥˜€¡™¥áÑÕÉ”¤½¹M•±•Ð¡™¥áÑÕÉ”¹¥¤ì(€ôì(€É•Í¥é”¹½‰Í•ÉÙ”¡…¹Ù…Ì¤í…¹Ù…Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•É‘½Ý¸ˆ±‘½Ý¸¤í…¹Ù…Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•Éµ½Ù”ˆ±µ½Ù”¤í…¹Ù…Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•ÉÕÀˆ±ÕÀ¤í‘É…Ü ¤ì(€½¹ÍÐ­•å‘½Ý¸ô¡•Ù•¹Ð¤ôùì(€€€¥˜€ …l‰ÉÉ½Ý1•™Ðˆ°‰ÉÉ½ÝI¥¡Ðˆ°‰ÉÉ½ÝUÀˆ°‰ÉÉ½Ý½Ý¸ˆ°‰!½µ”ˆ°ˆ¬ˆ°ˆôˆ°ˆ´‰t¹¥¹±Õ‘•Ì¡•Ù•¹Ð¹­•ä¤¤É•ÑÕÉ¸ì(€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰ÉÉ½Ý1•™Ðˆ¤å…Ü´ô¸Ààì(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰ÉÉ½ÝI¥¡Ðˆ¤å…Ü¬ô¸Ààì(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰ÉÉ½ÝUÀˆ¤Á¥Ñ õ5…Ñ ¹µ…à µ…µ•É…A¥Ñ¡1¥µ¥Ð±Á¥Ñ ´¸Àà¤ì(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰ÉÉ½Ý½Ý¸ˆ¤Á¥Ñ õ5…Ñ ¹µ¥¸¡…µ•É…A¥Ñ¡1¥µ¥Ð±Á¥Ñ ¬¸Àà¤ì(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€ˆ¬ˆñð•Ù•¹Ð¹­•ä€ôôô€ˆôˆ¤‘¥ÍÑ…¹”õ5…Ñ ¹µ…à Ð±‘¥ÍÑ…¹”´¸Ô¤ì(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€ˆ´ˆ¤‘¥ÍÑ…¹”õ5…Ñ ¹µ¥¸ ÈÐ±‘¥ÍÑ…¹”¬¸Ô¤ì(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰!½µ”ˆ¤ì€¡íå…Ü±Á¥Ñ ±‘¥ÍÑ…¹•ôõ¹½Éµ…±¥é•…µ•É…MÑ…Ñ”¡íô¤¤ìô(€€€‘É…Ü ¤ì(€ôì(€…¹Ù…Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰­•å‘½Ý¸ˆ±­•å‘½Ý¸¤ì(€½¹ÍÐÝ¡••°ô¡•Ù•¹Ð¤ôùí•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤í‘¥ÍÑ…¹”õ5…Ñ ¹µ…à Ð±5…Ñ ¹µ¥¸ ÈÐ±‘¥ÍÑ…¹”­5…Ñ ¹Í¥¸¡•Ù•¹Ð¹‘•±Ñ…d¤¨¸Ô¤¤í‘É…Ü ¤íôì(€…¹Ù…Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰Ý¡••°ˆ±Ý¡••°±íÁ…ÍÍ¥Ù”é™…±Í•ô¤ì(€…¹Ù…Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•É…¹•°ˆ±ÕÀ¤ì(€…¹Ù…Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±½ÍÑÁ½¥¹Ñ•É…ÁÑÕÉ”ˆ±ÕÀ¤ì(€É•ÑÕÉ¸ìÍÕÁÁ½ÉÑ•éÑÉÕ”°…µ•É…MÑ…Ñ” ¥íÉ•ÑÕÉ¸íå…Ü±Á¥Ñ ±‘¥ÍÑ…¹•ôíô°…ÁÑÕÉ•A¹œ ¥íÉ•ÑÕÉ¸Ù¥•ÝÁ½ÉÑA¹œ¡…¹Ù…Ì±‘É…Ü¤íô°Í•Ñ•¹Ð¡Ù…±Õ”¥íÍ•±•Ñ•‘•¹ÐõÙ…±Õ”í•½µ•ÑÉäõ¹Õ±°í‘É…Ü ¤íô°Í•Ñ¥áÑÕÉ•Ì¡Ù…±Õ”¥í½¹ÍÐÍ•±•Ñ•‘%õÙ¥ÉÑÕ…±¥áÑÕÉ•Ì¹™¥¹¡™¥áÑÕÉ”ôù™¥áÑÕÉ”¹Í•±•Ñ•¤ü¹¥íÙ¥ÉÑÕ…±¥áÑÕÉ•ÌõÙ…±Õ”¹Í½µ”¡™¥áÑÕÉ”ôù=‰©•Ð¹¡…Í=Ý¸¡™¥áÑÕÉ”°‰Í•±•Ñ•ˆ¤¤€üÙ…±Õ”€èÙ…±Õ”¹µ…À¡™¥áÑÕÉ”ôø¡ì¸¸¹™¥áÑÕÉ”±Í•±•Ñ•é™¥áÑÕÉ”¹¥ôôõÍ•±•Ñ•‘%‘ô¤¤í•½µ•ÑÉäõ¹Õ±°í‘É…Ü ¤íô°Í•ÑY¥•Ü¡…á¥Ì¥í½¹ÍÐÙ¥•Üõ…µ•É…á¥ÍY¥•Ü¡…á¥Ì¤íå…ÜõÙ¥•Ü¹å…ÜíÁ¥Ñ õÙ¥•Ü¹Á¥Ñ í‘É…Ü ¤íô°É•Í•Ð ¥ì¡íå…Ü±Á¥Ñ ±‘¥ÍÑ…¹•ôõ¹½Éµ…±¥é•…µ•É…MÑ…Ñ”¡íô¤¤í‘É…Ü ¤íô°‘•ÍÑÉ½ä ¥íÉ•Í¥é”¹‘¥Í½¹¹•Ð ¤í…¹Ù…Ì¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰Ý¡••°ˆ±Ý¡••°¤í…¹Ù…Ì¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰­•å‘½Ý¸ˆ±­•å‘½Ý¸¤í…¹Ù…Ì¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•É…¹•°ˆ±ÕÀ¤í…¹Ù…Ì¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰±½ÍÑÁ½¥¹Ñ•É…ÁÑÕÉ”ˆ±ÕÀ¤í…¹Ù…Ì¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•É‘½Ý¸ˆ±‘½Ý¸¤í…¹Ù…Ì¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•Éµ½Ù”ˆ±µ½Ù”¤í…¹Ù…Ì¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰Á½¥¹Ñ•ÉÕÀˆ±ÕÀ¤í•½µ•ÑÉäõ¹Õ±°í°¹‘•±•Ñ•	Õ™™•È¡‰Õ™™•È¤í°¹‘•±•Ñ•AÉ½É…´¡ÁÉ½É…´¤íôôì)ô(