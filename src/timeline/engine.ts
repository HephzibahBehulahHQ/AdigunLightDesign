import type {Cue,CueOptions} from "./types.ts";
import type {Fixture} from "../dmx/engine.ts";
import { evaluateChannelKeyframes } from "./keyframes.ts";
const clamp = (value:number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
export const interpolate = (from:number, to:number, progress:number) => from + (to - from) * clamp(progress);

export function duplicateCue(cues:readonly Cue[],cueId:string,{id=crypto.randomUUID(),name}:{id?:string;name?:string}={}) {
  const index=cues.findIndex((cue)=>cue.id===cueId);
  if (index<0) throw new Error("Cue was not found.");
  if (typeof id!=="string" || !id.trim() || cues.some((cue)=>cue.id===id)) throw new Error("Cue identity must be unique.");
  const copy=structuredClone(cues[index]!);
  copy.id=id;
  if (cues.some((cue)=>cue.startTime!==undefined && (cue.trackId ?? "Main")===(copy.trackId ?? "Main"))) {
    let end=0;
    for (const cue of cues.filter((item)=>(item.trackId ?? "Main")===(copy.trackId ?? "Main"))) end=Math.max(end,(cue.startTime ?? end)+cue.duration);
    copy.startTime=end;
  }
  copy.name=name ?? `${copy.name} (copy)`;
  if (typeof copy.name!=="string" || !copy.name.trim()) throw new Error("Cue name must not be empty.");
  return [...cues.slice(0,index+1),copy,...cues.slice(index+1)];
}

export function removeCue(cues:readonly Cue[],cueId:string) {
  if (!cues.some((cue)=>cue.id===cueId)) throw new Error("Cue was not found.");
  return cues.filter((cue)=>cue.id!==cueId);
}

export function moveCue(cues:readonly Cue[], cueId:string, offset:number) {
  if (offset !== -1 && offset !== 1) throw new Error("Cue movement must be one position earlier or later.");
  const index=cues.findIndex((cue)=>cue.id===cueId);
  if (index < 0) throw new Error("Cue was not found.");
  const result=[...cues],destination=index + offset;
  if (destination < 0 || destination >= cues.length) return result;
  [result[index],result[destination]]=[result[destination]!,result[index]!];
  return result;
}

export function editCue(cue:Cue, changes:CueOptions) {
  const options={...cue,...changes};
  if (typeof options.name !== "string" || !options.name.trim()) throw new Error("Cue name must not be empty.");
  const revised=createCue([], {...options,name:options.name.trim()});
  return {...cue,...revised,targets:structuredClone(cue.targets)};
}

export function createCue(fixtures:readonly Fixture[], { id = crypto.randomUUID(), name = `Look ${Date.now()}`, duration = 5, fade = 1, delay = 0, fadeOut = 0 }:CueOptions = {}):Cue {
  if (![duration,fade,delay,fadeOut].every(Number.isFinite) || duration <= 0 || fade < 0 || delay < 0 || fadeOut<0 || delay + fade + fadeOut > duration) throw new Error("Cue timing requires a positive duration and nonnegative delay/fades fitting within it.");
  return { id, name, duration, fade, delay, fadeOut, targets:fixtures.map((fixture) => ({ fixtureId:fixture.id, properties:structuredClone(fixture.properties) })), keyframes:[{ time:delay, value:"start" }, { time:delay + fade, value:"target" },...(fadeOut ? [{time:duration-fadeOut,value:"hold-end"},{time:duration,value:"source"}] : [])] };
}

export function evaluateCue(sourceFixtures:readonly Fixture[], cue:Cue, elapsedSeconds:number) {
  const localTime=elapsedSeconds - (cue.delay ?? 0);
  const fadeOut=cue.fadeOut ?? 0;
  const progress = fadeOut>0 && elapsedSeconds>cue.duration-fadeOut ? 1-clamp((elapsedSeconds-(cue.duration-fadeOut))/fadeOut) : localTime < 0 ? 0 : cue.fade <= 0 ? 1 : clamp(localTime / cue.fade);
  return sourceFixtures.map((fixture) => {
    const target = cue.targets.find((entry) => entry.fixtureId === fixture.id);
    if (!target) return fixture;
    const properties = { ...fixture.properties };
    for (const [key, end] of Object.entries(target.properties)) properties[key] = Math.round(interpolate(fixture.properties[key] ?? 0, end, progress));
    for (const key of Object.keys(target.properties)) {
      const frames=(cue.channelKeyframes ?? []).filter((frame)=>frame.fixtureId===fixture.id && frame.property===key);
      if (frames.length) properties[key]=evaluateChannelKeyframes(frames,fixture.properties[key] ?? 0,elapsedSeconds);
    }
    return { ...fixture, properties };
  });
}

export function cueProgress(cue:Cue, elapsedSeconds:number) { return clamp(elapsedSeconds / Math.max(cue.duration, .001)); }

export function evaluateSequence(sourceFixtures:readonly Fixture[], cues:readonly Cue[], elapsedSeconds:number) {
  if (!Number.isFinite(elapsedSeconds)) throw new Error("Sequence time must be finite.");
  let fixtures=[...structuredClone(sourceFixtures)], remaining=Math.max(0,elapsedSeconds);
  for (let index=0;index<cues.length;index+=1) {
    const cue=cues[index]!;
    if (!Number.isFinite(cue.duration) || cue.duration <= 0) throw new Error("Sequence cues require positive durations.");
    if (remaining < cue.duration) return {fixtures:evaluateCue(fixtures,cue,remaining),cueId:cue.id,index,elapsed:remaining,complete:false};
    fixtures=evaluateCue(fixtures,cue,cue.duration);
    remaining-=cue.duration;
  }
  return {fixtures,cueId:null,index:cues.length,elapsed:0,complete:true};
}
