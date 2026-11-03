import type {Cue,ChannelKeyframe} from "./types.ts";
export function validateChannelKeyframes(cue:Pick<Cue,"duration"|"targets"|"channelKeyframes">) {
  if (cue.channelKeyframes===undefined) return true;
  if (!Array.isArray(cue.targets)) return false;
  if (!Array.isArray(cue.channelKeyframes) || cue.channelKeyframes.length>4096) return false;
  const seen=new Set();
  return cue.channelKeyframes.every((frame)=>{
    const target=cue.targets?.find((entry)=>entry?.fixtureId===frame?.fixtureId);
    if (!frame || !target?.properties || typeof frame.property!=="string" || !Object.hasOwn(target.properties,frame.property) || !Number.isFinite(frame.time) || frame.time<0 || frame.time>cue.duration || !Number.isInteger(frame.value) || frame.value<0 || frame.value>255) return false;
    const key=JSON.stringify([frame.fixtureId,frame.property,frame.time]);
    if (seen.has(key)) return false;
    seen.add(key);return true;
  });
}

export function setChannelKeyframe(cue:Cue,frame:ChannelKeyframe) {
  const result=structuredClone(cue);
  result.channelKeyframes=(result.channelKeyframes ?? []).filter((item)=>!(item.fixtureId===frame.fixtureId && item.property===frame.property && item.time===frame.time));
  result.channelKeyframes.push({...frame});
  result.channelKeyframes.sort((a,b)=>a.time-b.time);
  if (!validateChannelKeyframes(result)) throw new Error("Invalid cue channel keyframe.");
  return result;
}

export function evaluateChannelKeyframes(frames:readonly ChannelKeyframe[],sourceValue:number,time:number) {
  const sorted=[...frames].sort((a,b)=>a.time-b.time);
  let previous={time:0,value:sourceValue};
  for (const frame of sorted) {
    if (time<frame.time) {
      const amount=Math.max(0,Math.min(1,(time-previous.time)/(frame.time-previous.time)));
      return Math.round(previous.value+(frame.value-previous.value)*amount);
    }
    previous=frame;
  }
  return previous.value;
}
