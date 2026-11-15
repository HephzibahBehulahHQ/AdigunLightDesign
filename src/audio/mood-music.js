export const musicMoods=Object.freeze([
  Object.freeze({id:"calm-piano",labelKey:"musicMoodCalm",stepSeconds:.72,notes:[261.63,392,329.63,523.25,392,329.63,293.66,440]}),
  Object.freeze({id:"focus-piano",labelKey:"musicMoodFocus",stepSeconds:.48,notes:[220,329.63,261.63,392,293.66,440,329.63,493.88]}),
  Object.freeze({id:"warm-piano",labelKey:"musicMoodWarm",stepSeconds:.64,notes:[196,293.66,246.94,392,220,329.63,261.63,349.23]}),
  Object.freeze({id:"bright-piano",labelKey:"musicMoodBright",stepSeconds:.42,notes:[261.63,329.63,392,523.25,493.88,392,329.63,440]}),
  Object.freeze({id:"night-piano",labelKey:"musicMoodNight",stepSeconds:.86,notes:[174.61,261.63,220,329.63,196,293.66,233.08,349.23]})
]);

export function createMoodMusic({audioContextFactory}={}){
  let context=null,master=null,interval=null,step=0,volume=.22,mood=musicMoods[0];
  function playNote(){
    if(!context||!master)return;
    const now=context.currentTime,frequency=mood.notes[step%mood.notes.length],duration=Math.min(.9,mood.stepSeconds*1.45),envelope=context.createGain(),tone=context.createOscillator(),harmonic=context.createOscillator(),harmonicGain=context.createGain();
    envelope.gain.setValueAtTime(.0001,now);envelope.gain.exponentialRampToValueAtTime(.19,now+.035);envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
    tone.type="triangle";tone.frequency.setValueAtTime(frequency,now);
    harmonic.type="sine";harmonic.frequency.setValueAtTime(frequency*2.01,now);harmonicGain.gain.setValueAtTime(.13,now);
    tone.connect(envelope);harmonic.connect(harmonicGain);harmonicGain.connect(envelope);envelope.connect(master);
    tone.start(now);harmonic.start(now);tone.stop(now+duration+.02);harmonic.stop(now+duration+.02);step+=1;
  }
  async function start(){
    if(interval)return true;
    const factory=audioContextFactory??(()=>{const AudioContextClass=globalThis.AudioContext??globalThis.webkitAudioContext;if(!AudioContextClass)throw new Error("Background audio is unavailable in this browser.");return new AudioContextClass();});
    try{context=factory();master=context.createGain();master.gain.value=volume;master.connect(context.destination);await context.resume();step=0;playNote();interval=setInterval(playNote,mood.stepSeconds*1000);return true;}
    catch(error){context?.close?.();context=null;master=null;interval=null;throw error;}
  }
  async function stop(){if(interval)clearInterval(interval);interval=null;const old=context;context=null;master=null;if(old&&old.state!=="closed")await old.close();}
  function setMood(id){const selected=musicMoods.find(item=>item.id===id);if(!selected)throw new Error("Choose a supported piano mood.");mood=selected;step=0;if(interval){clearInterval(interval);interval=setInterval(playNote,mood.stepSeconds*1000);playNote();}return mood.id;}
  function setVolume(value){if(!Number.isFinite(value))throw new Error("Music volume must be between zero and one.");volume=Math.max(0,Math.min(1,value));if(master)master.gain.setTargetAtTime(volume,context.currentTime,.04);return volume;}
  return {start,stop,setMood,setVolume,isPlaying:()=>Boolean(interval),mood:()=>mood.id,volume:()=>volume};
}

