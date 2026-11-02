import test from "node:test";
import assert from "node:assert/strict";
import { createPlaybackClock } from "../src/timeline/playback-clock.js";

test("pause freezes elapsed time and resume excludes paused wall time",()=>{
  const clock=createPlaybackClock(1000);
  assert.equal(clock.elapsed(3500),2.5);
  clock.pause(4000);
  clock.pause(9000);
  assert.equal(clock.paused,true);
  assert.equal(clock.elapsed(20000),3);
  clock.resume(21000);
  clock.resume(22000);
  assert.equal(clock.elapsed(22500),4.5);
  clock.pause(23000);
  assert.equal(clock.elapsed(50000),5);
});
