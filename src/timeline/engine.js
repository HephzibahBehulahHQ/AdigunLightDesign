const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
export const interpolate = (from, to, progress) => from + (to - from) * clamp(progress);

export function editCue(cue, changes) {
  const options={...cue,...changes};
  if (typeof options.name !== "string" || !options.name.trim()) throw new Error("Cue name must not be empty.");
  const revised=createCue([], {...options,name:options.name.trim()});
  return {...cue,...revised,targets:structuredClone(cue.targets)};
}

export function createCue(fixtures, { id = crypto.randomUUID(), name = `Look ${Date.now()}`, duration = 5, fade = 1, delay = 0 } = {}) {
  if (![duration,fade,delay].every(Number.isFinite) || duration <= 0 || fade < 0 || delay < 0 || delay + fade > duration) throw new Error("Cue timing requires a positive duration and nonnegative delay/fade fitting within it.");
  return { id, name, duration, fade, delay, targets:fixtures.map((fixture) => ({ fixtureId:fixture.id, properties:structuredClone(fixture.properties) })), keyframes:[{ time:delay, value:"start" }, { time:delay + fade, value:"target" }] };
}

export function evaluateCue(sourceFixtures, cue, elapsedSeconds) {
  const localTime=elapsedSeconds - (cue.delay ?? 0);
  const progress = localTime < 0 ? 0 : cue.fade <= 0 ? 1 : clamp(localTime / cue.fade);
  return sourceFixtures.map((fixture) => {
    const target = cue.targets.find((entry) => entry.fixtureId === fixture.id);
    if (!target) return fixture;
    const properties = { ...fixture.properties };
    for (const [key, end] of Object.entries(target.properties)) properties[key] = Math.round(interpolate(fixture.properties[key] ?? 0, end, progress));
    return { ...fixture, properties };
  });
}

export function cueProgress(cue, elapsedSeconds) { return clamp(elapsedSeconds / Math.max(cue.duration, .001)); }

export function evaluateSequence(sourceFixtures, cues, elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds)) throw new Error("Sequence time must be finite.");
  let fixtures=structuredClone(sourceFixtures), remaining=Math.max(0,elapsedSeconds);
  for (let index=0;index<cues.length;index+=1) {
    const cue=cues[index];
    if (!Number.isFinite(cue.duration) || cue.duration <= 0) throw new Error("Sequence cues require positive durations.");
    if (remaining < cue.duration) return {fixtures:evaluateCue(fixtures,cue,remaining),cueId:cue.id,index,elapsed:remaining,complete:false};
    fixtures=evaluateCue(fixtures,cue,cue.duration);
    remaining-=cue.duration;
  }
  return {fixtures,cueId:null,index:cues.length,elapsed:0,complete:true};
}
