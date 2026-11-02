// Monotonic elapsed time, independent of interval frequency and renderer state.
export function createPlaybackClock(now) {
  let anchor=now, accumulated=0, paused=false;
  return {
    get paused() { return paused; },
    elapsed(time) { return accumulated+(paused ? 0 : Math.max(0,time-anchor)/1000); },
    pause(time) { if (!paused) { accumulated=this.elapsed(time); paused=true; } },
    resume(time) { if (paused) { anchor=time; paused=false; } },
    seek(seconds,time) {
      if (!Number.isFinite(seconds) || seconds<0 || !Number.isFinite(time)) throw new Error("Invalid playback position.");
      accumulated=seconds; anchor=time;
    }
  };
}

export function playbackPosition(elapsed,duration,loop=false) {
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration) || duration<=0) throw new Error("Invalid playback duration or time.");
  const time=Math.max(0,elapsed);
  return {time:loop ? time%duration : Math.min(time,duration),complete:!loop && time>=duration};
}
