import test from "node:test";
import assert from "node:assert/strict";
import {createMoodMusic,musicMoods} from "../src/audio/mood-music.js";

function fakeAudioContext(){
  const makeParam=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
  const node=()=>({gain:makeParam(),frequency:makeParam(),connect(){},start(){},stop(){}});
  return {state:"running",currentTime:0,destination:{},createGain:node,createOscillator:node,async resume(){},async close(){this.state="closed";}};
}

test("piano mood patterns are distinct and volume is bounded",()=>{
  assert.equal(musicMoods.length,5);
  assert.equal(new Set(musicMoods.map(mood=>mood.notes.join(","))).size,5);
  const music=createMoodMusic({audioContextFactory:fakeAudioContext});
  assert.equal(music.setVolume(2),1);assert.equal(music.volume(),1);
  assert.equal(music.setVolume(-1),0);
  assert.throws(()=>music.setVolume(Number.NaN),/between zero and one/);
  assert.throws(()=>music.setMood("not-a-mood"),/supported piano mood/);
});

test("music starts only on request, switches mood and stops cleanly",async()=>{
  const music=createMoodMusic({audioContextFactory:fakeAudioContext});
  assert.equal(music.isPlaying(),false);
  assert.equal(await music.start(),true);assert.equal(music.isPlaying(),true);
  assert.equal(music.setMood("night-piano"),"night-piano");
  await music.stop();assert.equal(music.isPlaying(),false);
});

