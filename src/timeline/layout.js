export function timelineLayout(cues) {
  let total=0;
  const segments=cues.map((cue)=>{
    if (!Number.isFinite(cue.duration) || cue.duration<=0) throw new Error("Invalid cue duration.");
    const segment={id:cue.id,start:total,duration:cue.duration};
    total+=cue.duration;
    return segment;
  });
  const span=Math.max(30,Math.ceil(total/5)*5);
  return {total,span,segments:segments.map((segment)=>({...segment,left:segment.start/span*100,width:segment.duration/span*100})),ticks:Array.from({length:7},(_,index)=>({time:index*span/6,left:index/6*100}))};
}
