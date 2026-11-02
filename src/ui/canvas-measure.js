export function bindCanvasMeasure(svg,{onMeasure,units}){
  let origin={x:0,y:0},end={x:0,y:0},drag=null;
  const group=svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg","g");
  const line=svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg","line"),text=svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg","text");
  group.setAttribute("class","canvas-measurement");group.setAttribute("pointer-events","none");group.append(line,text);svg.append(group);
  svg.setAttribute("tabindex","0");
  const draw=()=>{
    for(const [key,value] of Object.entries({x1:origin.x,y1:origin.y,x2:end.x,y2:end.y}))line.setAttribute(key,String(value));
    const distance=Math.hypot(end.x-origin.x,end.y-origin.y);
    text.setAttribute("x",String((origin.x+end.x)/2));text.setAttribute("y",String((origin.y+end.y)/2-8));text.textContent=`${distance.toFixed(2)} ${units}`;
    onMeasure({from:{...origin},to:{...end},distance});
  };
  const position=event=>{
    try{const matrix=svg.getScreenCTM();if(!matrix)return null;const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const mapped=point.matrixTransform(matrix.inverse());return Number.isFinite(mapped.x)&&Number.isFinite(mapped.y) ? {x:mapped.x,y:mapped.y} : null;}catch{return null;}
  };
  const down=event=>{if(event.button!==0 || drag)return;const point=position(event);if(!point)return;event.preventDefault();drag={pointerId:event.pointerId,origin,end};origin=point;end=point;svg.setPointerCapture(event.pointerId);draw();};
  const move=event=>{if(!drag || event.pointerId!==drag.pointerId)return;const point=position(event);if(point){end=point;draw();}};
  const up=event=>{if(!drag || event.pointerId!==drag.pointerId)return;if(event.type==="pointerup")move(event);else{origin=drag.origin;end=drag.end;draw();}drag=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);};
  const key=event=>{
    if(event.target!==svg || !["Enter","Escape","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key) || drag)return;
    event.preventDefault();const step=event.shiftKey ? 10 : 1;
    if(event.key==="Enter")origin={...end};else if(event.key==="Escape"){origin={x:0,y:0};end={x:0,y:0};}
    else end={x:end.x+(event.key==="ArrowLeft" ? -step : event.key==="ArrowRight" ? step : 0),y:end.y+(event.key==="ArrowUp" ? -step : event.key==="ArrowDown" ? step : 0)};
    draw();
  };
  svg.addEventListener("pointerdown",down);svg.addEventListener("pointermove",move);svg.addEventListener("keydown",key);
  for(const type of ["pointerup","pointercancel","lostpointercapture"])svg.addEventListener(type,up);
  return ()=>{svg.removeEventListener("pointerdown",down);svg.removeEventListener("pointermove",move);svg.removeEventListener("keydown",key);for(const type of ["pointerup","pointercancel","lostpointercapture"])svg.removeEventListener(type,up);group.remove();};
}
