export const radians = (degrees) => degrees * Math.PI / 180;

export function multiply(a, b) {
  const output = new Float32Array(16);
  for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) for (let index = 0; index < 4; index += 1) output[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
  return output;
}

export function perspective(fov, aspect, near, far) {
  const focal = 1 / Math.tan(fov / 2), depth = 1 / (near - far);
  return new Float32Array([focal / aspect,0,0,0,0,focal,0,0,0,0,(far + near) * depth,-1,0,0,2 * far * near * depth,0]);
}

export function cameraMatrix({ yaw = 0, pitch = 0, distance = 11 }) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  return new Float32Array([cy,sy * sx,-sy * cx,0,0,cx,sx,0,sy,-cy * sx,cy * cx,0,0,-.35,-distance,1]);
}

export function viewportProjection(mode,aspect,distance) {
  if (!["perspective","orthographic"].includes(mode) || !Number.isFinite(aspect) || aspect<=0 || !Number.isFinite(distance) || distance<=0) throw new Error("Invalid viewport projection.");
  if (mode==="perspective") return perspective(radians(48),aspect,.1,100);
  const halfHeight=distance*Math.tan(radians(24)),halfWidth=halfHeight*aspect;
  return new Float32Array([1/halfWidth,0,0,0,0,1/halfHeight,0,0,0,0,-2/99.9,0,0,0,-100.1/99.9,1]);
}

export function hexVector(hex) {
  const cleaned = String(hex).replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(cleaned.slice(index, index + 2), 16) / 255);
}
