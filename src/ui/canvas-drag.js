export function bindCanvasDrag(svg,objects,{onSelect,onMove,onResize}) {
  let drag=null;
  const position=(event)=>{
    try {
      const matrix=svg.getScreenCTM();if(!matrix)return null;
      const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
      const mapped=point.matrixTransform(matrix.inverse());
      return Number.isFinite(mapped.x) && Number.isFinite(mapped.y) ? mapped : null;
    } catch {return null;}
  };
  const down=(event)=>{
    if (event.button!==0 || drag) return;
    const element=event.target.closest("[data-canvas-object]"),point=position(event);
    const object=objects.find((item)=>item.id===element?.dataset.canvasObject);
    if (!element || !object || !point || !svg.contains(element)) return;
    event.preventDefault();
    const resize=Boolean(event.target.closest("[data-canvas-resize]")) && ["rect","ellipse"].includes(object.type) && typeof onResize==="function";
    drag={element,object,point,pointerId:event.pointerId,dx:0,dy:0,resize};
    svg.setPointerCapture(event.pointerId);
  };
  const move=(event)=>{
    if (!drag || drag.pointerId!==event.pointerId) return;
    const point=position(event);if(!point)return;
    drag.dx=point.x-drag.point.x;drag.dy=point.y-drag.point.y;
    if(drag.resize){
      const o=drag.object;drag.width=Math.max(1,Math.min(10000,o.width+drag.dx));drag.height=Math.max(1,Math.min(10000,o.height+drag.dy));
      drag.element.setAttribute("transform",`translate(${o.x} ${o.y}) scale(${drag.width/o.width} ${drag.height/o.height}) translate(${-o.x} ${-o.y})`);
    }else drag.element.setAttribute("transform",`translate(${drag.dx} ${drag.dy})`);
  };
  const end=(event)=>{
    if (!drag || drag.pointerId!==event.pointerId) return;
    if (event.type==="pointerup") move(event);
    const completed=drag;drag=null;
    completed.element.removeAttribute("transform");
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (event.type!=="pointerup") return;
    if(completed.resize){if(completed.width!==undefined && (completed.width!==completed.object.width || completed.height!==completed.object.height))onResize(completed.object.id,{width:completed.width,height:completed.height});}
    else if (Math.hypot(completed.dx,completed.dy)>.5) onMove(completed.object.id,{x:completed.object.x+completed.dx,y:completed.object.y+completed.dy});
    else onSelect(completed.object.id);
  };
  svg.addEventListener("pointerdown",down);svg.addEventListener("pointermove",move);
  for (const type of ["pointerup","pointercancel","lostpointercapture"]) svg.addEventListener(type,end);
  return ()=>{
    if(drag)drag.element.removeAttribute("transform");drag=null;
    svg.removeEventListener("pointerdown",down);svg.removeEventListener("pointermove",move);
    for(const type of ["pointerup","pointercancel","lostpointercapture"])svg.removeEventListener(type,end);
  };
}
