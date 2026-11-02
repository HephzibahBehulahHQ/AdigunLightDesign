export function bindTimelineSeek(ruler,{span,duration,value=0,label,onSeek,onPreview=()=>{}}){
  let time=Math.max(0,Math.min(duration,value)),drag=null;
  const show=next=>{time=Math.round(Math.max(0,Math.min(duration,next))*10)/10;ruler.setAttribute("aria-valuenow",String(time));onPreview(time);};
  ruler.tabIndex=duration>0?0:-1;ruler.setAttribute("role","slider");ruler.setAttribute("aria-label",label);
  ruler.setAttribute("aria-valuemin","0");ruler.setAttribute("aria-valuemax",String(duration));ruler.setAttribute("aria-valuenow",String(time));ruler.setAttribute("aria-disabled",String(duration<=0));
  const position=event=>{const rect=ruler.getBoundingClientRect();return rect.width>0 && Number.isFinite(event.clientX)?(event.clientX-rect.left)/rect.width*span:null;};
  const move=event=>{if(!drag || event.pointerId!==drag.id)return;const next=position(event);if(next!==null)show(next);};
  const down=event=>{if(event.button!==0 || duration<=0 || drag || position(event)===null)return;event.preventDefault();time=Number(ruler.getAttribute("aria-valuenow")) || 0;drag={id:event.pointerId,before:time};ruler.dataset.seeking="true";ruler.setPointerCapture(event.pointerId);move(event);};
  const end=event=>{
    if(!drag || drag.id!==event.pointerId)return;
    if(event.type==="pointerup")move(event);const previous=drag;drag=null;delete ruler.dataset.seeking;
    if(ruler.hasPointerCapture(event.pointerId))ruler.releasePointerCapture(event.pointerId);
    if(event.type==="pointerup")onSeek(time,{keyboard:false});else show(previous.before);
  };
  const key=event=>{
    if(duration<=0 || event.altKey || event.ctrlKey || event.metaKey)return;
    time=Number(ruler.getAttribute("aria-valuenow")) || 0;
    const step=event.shiftKey?1:.1;
    const next={ArrowLeft:time-step,ArrowDown:time-step,ArrowRight:time+step,ArrowUp:time+step,Home:0,End:duration}[event.key];
    if(next===undefined)return;event.preventDefault();show(next);onSeek(time,{keyboard:true});
  };
  const handlers={pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,lostpointercapture:end,keydown:key};
  for(const [type,handler] of Object.entries(handlers))ruler.addEventListener(type,handler);
  return ()=>{delete ruler.dataset.seeking;if(drag){show(drag.before);drag=null;}for(const [type,handler] of Object.entries(handlers))ruler.removeEventListener(type,handler);};
}
