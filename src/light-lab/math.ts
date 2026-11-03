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

export function hexVector(hex:unknown) {
  const cleaned = String(hex).replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(cleaned.slice(index, index + 2), 16) / 255);
}
