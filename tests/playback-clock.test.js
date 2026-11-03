import test from "node:test";
import assert from "node:assert/strict";
import { createPlaybackClock, playbackPosition } from "../src/timeline/playback-clock.js";

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
test("seeking retains pause state and resumes from the requested position",()=>{
  const clock=createPlaybackClock(0);
  clock.seek(5,1000);
  assert.equal(clock.elapsed(2000),6);
  clock.pause(2000);clock.seek(2,3000);
  assert.equal(clock.elapsed(9000),2);
  clock.resume(10000);
  assert.equal(clock.elapsed(11000),3);
  assert.throws(()=>clock.seek(-1,0));
  assert.throws(()=>clock.seek(NaN,0));
});
test("looping wraps precisely and non-looping playback clamps at completion",()=>{
  assert.deepEqual(playbackPosition(12,5,true),{time:2,complete:false});
  assert.deepEqual(playbackPosition(5,5,true),{time:0,complete:false});
  assert.deepEqual(playbackPosition(12,5),{time:5,complete:true});
  assert.deepEqual(playbackPosition(-1,5),{time:0,complete:false});
  assert.throws(()=>playbackPosition(0,0));
});
