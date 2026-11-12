export interface CameraState {yaw:number;pitch:number;distance:number;}

export const radians = (degrees:number) => degrees * Math.PI / 180;

export function multiply(a:ArrayLike<number>, b:ArrayLike<number>) {
  if(a.length!==16 || b.length!==16 || ![...Array.from(a),...Array.from(b)].every(Number.isFinite))throw new Error("Invalid 4x4 matrix.");
  const output = new Float32Array(16);
  for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) for (let index = 0; index < 4; index += 1) output[column * 4 + row] = output[column * 4 + row]! + a[index * 4 + row]! * b[column * 4 + index]!;
  return output;
}

export function perspective(fov:number, aspect:number, near:number, far:number) {
  const focal = 1 / Math.tan(fov / 2), depth = 1 / (near - far);
  return new Float32Array([focal / aspect,0,0,0,0,focal,0,0,0,0,(far + near) * depth,-1,0,0,2 * far * near * depth,0]);
}

export function cameraMatrix({ yaw = 0, pitch = 0, distance = 11 }:Partial<CameraState>) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  return new Float32Array([cy,sy * sx,-sy * cx,0,0,cx,sx,0,sy,-cy * sx,cy * cx,0,0,-.35,-distance,1]);
}

// Studio documents use +Z toward the rear wall; OpenGL view depth is negative.
export function studioCameraMatrix({targetHeight=2.2,...options}:Partial<CameraState>&{targetHeight?:number}={}){
  if(!Number.isFinite(targetHeight))throw new Error("Invalid camera target height.");
  const matrix=multiply(cameraMatrix(options),new Float32Array([1,0,0,0,0,1,0,0,0,0,-1,0,0,0,0,1]));
  matrix[13]=-matrix[5]!*targetHeight;matrix[14]=matrix[14]!-matrix[6]!*targetHeight;return matrix;
}
export const cameraPitchLimit=Math.PI/2-.01;
export function normalizeCameraState(value:unknown={}){
  const finite=(key:keyof CameraState,fallback:number)=>{const raw=(value as Partial<CameraState>|null)?.[key];return typeof raw==="number" && Number.isFinite(raw) ? raw : fallback;};
  return {yaw:finite("yaw",-.08),pitch:Math.max(-cameraPitchLimit,Math.min(cameraPitchLimit,finite("pitch",.1))),distance:Math.max(4,Math.min(24,finite("distance",9.8)))};
}
export function cameraAxisView(axis:string){
  if(axis==="x")return {yaw:-Math.PI/2,pitch:0};
  if(axis==="y")return {yaw:0,pitch:cameraPitchLimit};
  if(axis==="z")return {yaw:0,pitch:0};
  throw new Error("Unsupported camera axis.");
}

export function viewportProjection(mode:string,aspect:number,distance:number) {
  if (!["perspective","orthographic"].includes(mode) || !Number.isFinite(aspect) || aspect<=0 || !Number.isFinite(distance) || distance<=0) throw new Error("Invalid viewport projection.");
  if (mode==="perspective") return perspective(radians(48),aspect,.1,100);
  const halfHeight=distance*Math.tan(radians(24)),halfWidth=halfHeight*aspect;
  return new Float32Array([1/halfWidth,0,0,0,0,1/halfHeight,0,0,0,0,-2/99.9,0,0,0,-100.1/99.9,1]);
}

function inverse4(matrix:ArrayLike<number>) {
  if(matrix.length!==16 || !Array.from(matrix).every(Number.isFinite))return null;
  const rows=Array.from({length:4},(_,row)=>[
    ...Array.from({length:4},(_,column)=>matrix[column*4+row]!),
    ...Array.from({length:4},(_,column)=>Number(row===column))
  ]);
  for(let column=0;column<4;column+=1){
    let pivot=column;
    for(let row=column+1;row<4;row+=1)if(Math.abs(rows[row]![column]!)>Math.abs(rows[pivot]![column]!))pivot=row;
    const divisor=rows[pivot]![column]!;
    if(Math.abs(divisor)<1e-10)return null;
    [rows[column],rows[pivot]]=[rows[pivot]!,rows[column]!];
    for(let index=0;index<8;index+=1)rows[column]![index]=rows[column]![index]!/divisor;
    for(let row=0;row<4;row+=1){
      if(row===column)continue;
      const factor=rows[row]![column]!;
      for(let index=0;index<8;index+=1)rows[row]![index]=rows[row]![index]!-factor*rows[column]![index]!;
    }
  }
  return new Float64Array(Array.from({length:4},(_,column)=>Array.from({length:4},(_,row)=>rows[row]![column+4]!)).flat());
}

export function viewportPointOnPlane(matrix:ArrayLike<number>,x:number,y:number,width:number,height:number,planeY:number){
  if(![x,y,width,height,planeY].every(Number.isFinite)||width<=0||height<=0)return null;
  const inverse=inverse4(matrix);if(!inverse)return null;
  const clipX=x/width*2-1,clipY=1-y/height*2;
  const unproject=(depth:number)=>{
    const point=Array.from({length:4},(_,row)=>inverse[row]!*clipX+inverse[4+row]!*clipY+inverse[8+row]!*depth+inverse[12+row]!);
    if(Math.abs(point[3]!)<1e-10)return null;
    return point.slice(0,3).map(value=>value/point[3]!);
  };
  const near=unproject(-1),far=unproject(1);if(!near||!far)return null;
  const ray=far.map((value,index)=>value-near[index]!),rayLength=Math.hypot(...ray),dy=ray[1]!;if(Math.abs(dy)<rayLength*.02)return null;
  const distance=(planeY-near[1]!)/dy;if(distance<0||distance>1)return null;
  return [near[0]!+(far[0]!-near[0]!)*distance,planeY,near[2]!+(far[2]!-near[2]!)*distance];
}

export function hexVector(hex:unknown) {
  const cleaned = String(hex).replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(cleaned.slice(index, index + 2), 16) / 255);
}

