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

export function hexVector(hex) {
  const cleaned = String(hex).replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(cleaned.slice(index, index + 2), 16) / 255);
}
