import test from "node:test";
import assert from "node:assert/strict";
import { multiply, studioCameraMatrix, viewportPointOnPlane, viewportProjection } from "../src/light-lab/math.js";

function screenPoint(matrix,[x,y,z],width,height){
  const clip=[0,1,2,3].map(row=>matrix[row]*x+matrix[4+row]*y+matrix[8+row]*z+matrix[12+row]);
  return [(clip[0]/clip[3]+1)*width/2,(1-clip[1]/clip[3])*height/2];
}

test("viewport plane mapping round-trips world coordinates in both camera projections",()=>{
  const width=960,height=600,world=[1.25,3.65,-.8];
  for(const mode of ["perspective","orthographic"]){
    const matrix=multiply(viewportProjection(mode,width/height,9.8),studioCameraMatrix({yaw:-.35,pitch:.32,distance:9.8,targetHeight:2.2}));
    const [x,y]=screenPoint(matrix,world,width,height);
    const mapped=viewportPointOnPlane(matrix,x,y,width,height,world[1]);
    assert.ok(mapped);
    assert.ok(Math.abs(mapped[0]-world[0])<1e-4);
    assert.ok(Math.abs(mapped[2]-world[2])<1e-4);
  }
});

test("viewport plane mapping rejects invalid and parallel rays",()=>{
  assert.equal(viewportPointOnPlane(new Float32Array(15),1,1,100,100,0),null);
  assert.equal(viewportPointOnPlane(new Float32Array(16),50,50,100,100,0),null);
  assert.equal(viewportPointOnPlane(new Float32Array(16).fill(NaN),50,50,100,100,0),null);
});

