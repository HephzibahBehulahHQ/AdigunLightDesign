export interface PickPoint {readonly id:string;readonly x:number;readonly y:number;readonly z:number;}
export function pickScenePoint(points:readonly PickPoint[],matrix:ArrayLike<number>,width:number,height:number,x:number,y:number,radius=28): string|null {
  if(matrix.length!==16 || !Array.from(matrix).every(Number.isFinite) || ![width,height,x,y,radius].every(Number.isFinite) || width<=0 || height<=0 || radius<0)return null;
  let selected:string|null=null,best=radius*radius,bestDepth=Infinity;
  for(const point of points){
    const vector=[point.x,point.y,point.z,1];
    const project=(row:number)=>vector.reduce((sum,value,column)=>sum+(matrix[column*4+row] ?? NaN)*value,0);
    const w=project(3);if(w<=0 || !Number.isFinite(w))continue;
    const nx=project(0)/w,ny=project(1)/w,nz=project(2)/w;
    if(![nx,ny,nz].every(Number.isFinite) || Math.abs(nx)>1 || Math.abs(ny)>1 || Math.abs(nz)>1)continue;
    const distance=((nx+1)*width/2-x)**2+((1-ny)*height/2-y)**2;
    if(distance>radius*radius)continue;
    if(selected===null || distance<best-1e-6 || Math.abs(distance-best)<=1e-6 && nz<bestDepth){selected=point.id;best=distance;bestDepth=nz;}
  }
  return selected;
}
