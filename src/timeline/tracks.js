import { evaluateCue } from "./engine.js";

export function arrangeTracks(cues) {
  const tracks=new Map();
  for (const cue of cues) {
    const id=cue.trackId ?? "Main";
    if (typeof id!=="string" || !id.trim() || !Number.isFinite(cue.duration) || cue.duration<=0) throw new Error("Invalid track or cue duration.");
    if (!tracks.has(id)) tracks.set(id,[]);
    const entries=tracks.get(id);
    const start=cue.startTime ?? entries.reduce((end,entry)=>Math.max(end,entry.start+entry.cue.duration),0);
    if (!Number.isFinite(start) || start<0) throw new Error("Cue start time must be nonnegative.");
    entries.push({cue,start});
  }
  for (const entries of tracks.values()) {
    entries.sort((a,b)=>a.start-b.start);
    for (let index=1;index<entries.length;index++) if (entries[index].start<entries[index-1].start+entries[index-1].cue.duration) throw new Error("Cues on the same track cannot overlap.");
  }
  return [...tracks].map(([id,entries])=>({id,entries}));
}

export function scheduleCue(cues,cueId,trackId,startTime) {
  if (!cues.some((cue)=>cue.id===cueId)) throw new Error("Cue was not found.");
  const result=cues.map((cue)=>cue.id===cueId ? {...cue,trackId:trackId.trim(),startTime} : cue);
  arrangeTracks(result);
  return result;
}

export function arrangementDuration(cues) {
  return Math.max(0,...arrangeTracks(cues).flatMap((track)=>track.entries.map(({cue,start})=>start+cue.duration)));
}

// Tracks evaluate independently; later tracks in first-appearance order win
// only the fixture properties they have targeted by this time.
export function evaluateTracks(source,cues,time) {
  if (!Number.isFinite(time)) throw new Error("Track time must be finite.");
  let result=structuredClone(source);
  for (const track of arrangeTracks(cues)) {
    let fixtures=structuredClone(source);
    const touched=new Map();
    for (const {cue,start} of track.entries) {
      if (time<start) break;
      fixtures=evaluateCue(fixtures,cue,Math.min(time-start,cue.duration));
      for (const target of cue.targets) {
        if (!touched.has(target.fixtureId)) touched.set(target.fixtureId,new Set());
        for (const key of Object.keys(target.properties)) touched.get(target.fixtureId).add(key);
      }
    }
    result=result.map((fixture)=>{
      const keys=touched.get(fixture.id),evaluated=fixtures.find((entry)=>entry.id===fixture.id);
      if (!keys || !evaluated) return fixture;
      return {...fixture,properties:{...fixture.properties,...Object.fromEntries([...keys].map((key)=>[key,evaluated.properties[key]]))}};
    });
  }
  return result;
}
