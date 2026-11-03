// Monotonic elapsed time, independent of interval frequency and renderer state.
export function createPlaybackClock(now: number) {
  let anchor=now, accumulated=0, paused=false;
  return {
    get paused() { return paused; },
    elapsed(time: number) { return accumulated+(paused ? 0 : Math.max(0,time-anchor)/1000); },
    pause(time: number) { if (!paused) { accumulated=this.elapsed(time); paused=true; } },
    resume(time: number) { if (paused) { anchor=time; paused=false; } },
    seek(seconds: number,time: number) {
      if (!Number.isFinite(seconds) || seconds<0 || !Number.isFinite(time)) throw new Error("Invalid playback position.");
      accumulated=seconds; anchor=time;
    }
  };
}

export function playbackPosition(elapsed: number,duration: number,loop=false) {
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration) || duration<=0) throw new Error("Invalid playback duration or time.");
  const time=Math.max(0,elapsed);
  return {time:loop ? time%duration : Math.min(time,duration),complete:!loop && time>=duration};
}
