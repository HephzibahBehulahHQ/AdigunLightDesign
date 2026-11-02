export function pickScenePoint(points,matrix,width,height,x,y,radius=28) {
  let selected=null,best=radius*radius,bestDepth=Infinity;
  for (const point of points) {
    const vector=[point.x,point.y,point.z,1];
    const clip=Array.from({length:4},(_,row)=>vector.reduce((sum,value,column)=>sum+matrix[column*4+row]*value,0));
    if (clip[3]<=0) continue;
    const [nx,ny,nz]=clip.slice(0,3).map((value)=>value/clip[3]);
    if (![nx,ny,nz].every(Number.isFinite) || Math.abs(nx)>1 || Math.abs(ny)>1 || Math.abs(nz)>1) continue;
    const distance=((nx+1)*width/2-x)**2+((1-ny)*height/2-y)**2;
    if (distance<best || distance===best && nz<bestDepth) {selected=point.id;best=distance;bestDepth=nz;}
  }
  return selected;
}
