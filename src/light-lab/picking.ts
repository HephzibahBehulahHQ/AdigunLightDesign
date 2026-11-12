import { viewportRay } from "./math.js";
export interface PickPoint {readonly id:string;readonly x:number;readonly y:number;readonly z:number;}
export interface ViewportRay {readonly origin:readonly [number,number,number];readonly direction:readonly [number,number,number];readonly length:number;}
export function projectScenePoint(point:PickPoint,matrix:ArrayLike<number>,width:number,height:number){
  if(matrix.length!==16 || !Array.from(matrix).every(Number.isFinite) || ![point.x,point.y,point.z,width,height].every(Number.isFinite) || width<=0 || height<=0)return null;
  const vector=[point.x,point.y,point.z,1],project=(row:number)=>vector.reduce((sum,value,column)=>sum+(matrix[column*4+row] ?? NaN)*value,0);
  const w=project(3);if(w<=0 || !Number.isFinite(w))return null;
  const nx=project(0)/w,ny=project(1)/w,nz=project(2)/w;
  if(![nx,ny,nz].every(Number.isFinite) || Math.abs(nx)>1 || Math.abs(ny)>1 || Math.abs(nz)>1)return null;
  return {x:(nx+1)*width/2,y:(1-ny)*height/2,depth:nz};
}
export function pickScenePoint(points:readonly PickPoint[],matrix:ArrayLike<number>,width:number,height:number,x:number,y:number,radius=28): string|null {
  if(![x,y,radius].every(Number.isFinite)||radius<0)return null;
  let selected:string|null=null,best=radius*radius,bestDepth=Infinity;
  for(const point of points){
    const projected=projectScenePoint(point,matrix,width,height);if(!projected)continue;
    const distance=(projected.x-x)**2+(projected.y-y)**2;
    if(distance>radius*radius)continue;
    if(selected===null || distance<best-1e-6 || Math.abs(distance-best)<=1e-6 && projected.depth<bestDepth){selected=point.id;best=distance;bestDepth=projected.depth;}
  }
  return selected;
}
export function rayHitDistance(vertices:ArrayLike<number>,ray:ViewportRay,maxDistance=ray.length):number|null {
  if(vertices.length%18!==0||![...ray.origin,...ray.direction,ray.length,maxDistance].every(Number.isFinite)||ray.length<=0||maxDistance<=0)return null;
  const dot=(a:number[],b:number[])=>a.reduce((sum,value,index)=>sum+value*b[index]!,0),cross=(a:number[],b:number[])=>[a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
  let nearest=Infinity;
  for(let offset=0;offset<vertices.length;offset+=18){
    const a=[vertices[offset]!,vertices[offset+1]!,vertices[offset+2]!],b=[vertices[offset+6]!,vertices[offset+7]!,vertices[offset+8]!],c=[vertices[offset+12]!,vertices[offset+13]!,vertices[offset+14]!];
    if(![...a,...b,...c].every(Number.isFinite))continue;
    const edge1=b.map((value,index)=>value-a[index]!),edge2=c.map((value,index)=>value-a[index]!),p=cross([...ray.direction],edge2),determinant=dot(edge1,p);
    if(Math.abs(determinant)<1e-9)continue;
    const inverse=1/determinant,s=ray.origin.map((value,index)=>value-a[index]!),u=dot(s,p)*inverse;if(u<0||u>1)continue;
    const q=cross(s,edge1),v=dot([...ray.direction],q)*inverse;if(v<0||u+v>1)continue;
    const distance=dot(edge2,q)*inverse;
    if(distance>1e-5&&distance<=maxDistance&&distance<nearest)nearest=distance;
  }
  return Number.isFinite(nearest)?nearest:null;
}
export function rayOccluded(target:readonly [number,number,number],ray:ViewportRay,vertices:ArrayLike<number>,margin=.12){
  if(![...target,...ray.origin,...ray.direction,ray.length,margin].every(Number.isFinite)||ray.length<=0||margin<0||vertices.length%18!==0)return false;
  const targetDistance=target.reduce((sum,value,index)=>sum+(value-ray.origin[index]!)*ray.direction[index]!,0);
  if(targetDistance<=margin)return false;
  return rayHitDistance(vertices,ray,targetDistance-margin)!==null;
}
export function filterOccludedPoints(points:readonly PickPoint[],matrix:ArrayLike<number>,width:number,height:number,vertices:ArrayLike<number>){
  return points.filter(point=>{
    const projected=projectScenePoint(point,matrix,width,height);if(!projected)return false;
    const ray=viewportRay(matrix,projected.x,projected.y,width,height);
    if(!ray)return false;
    return !rayOccluded([point.x,point.y,point.z],ray,vertices);
  });
}
