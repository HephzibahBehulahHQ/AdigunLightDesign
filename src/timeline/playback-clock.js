// Monotonic elapsed time, independent of interval frequency and renderer state.
export function createPlaybackClock(now) {
  let anchor=now, accumulated=0, paused=false;
  return {
    get paused() { return paused; },
    elapsed(time) { return accumulated+(paused ? 0 : Math.max(0,time-anchor)/1000); },
    pause(time) { if (!paused) { accumulated=this.elapsed(time); paused=true; } },
    resume(time) { if (paused) { anchor=time; paused=false; } }
  };
}
