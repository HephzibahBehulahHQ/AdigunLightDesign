// Compile-only contract checks. These calls must never execute.
import {rgbToHex} from "../src/domain/color-engine.ts";
import {updateCanvasObject} from "../src/domain/canvas.ts";
import {readBrowserStorage} from "../src/domain/browser-storage.ts";
import {createFixture,patchFixture} from "../src/dmx/engine.ts";
import {createCue} from "../src/timeline/engine.ts";
import {evaluateEffect} from "../src/timeline/effects.ts";
import {setChannelKeyframe} from "../src/timeline/keyframes.ts";

const fixture=createFixture();
const cue=createCue([fixture],{duration:5});
patchFixture([fixture],fixture.id,1,1);
setChannelKeyframe(cue,{fixtureId:fixture.id,property:"dimmer",time:0,value:255});
evaluateEffect([fixture],{type:"pulse",period:1});

// @ts-expect-error RGB channels must be numbers.
rgbToHex({r:"255",g:0,b:0});
// @ts-expect-error Artwork edits cannot change the discriminant.
updateCanvasObject({canvasObjects:[]},"a",{type:"text"});
// @ts-expect-error Storage adapters return strings or null, never numbers.
readBrowserStorage("project",()=>({getItem:()=>42}));
// @ts-expect-error Virtual universe is numeric.
patchFixture([fixture],fixture.id,"1",1);
// @ts-expect-error Cue durations are numeric seconds.
createCue([fixture],{duration:"5"});
// @ts-expect-error Only implemented virtual effects are accepted.
evaluateEffect([fixture],{type:"rainbow"});
// @ts-expect-error Channel keyframe values are numeric.
setChannelKeyframe(cue,{fixtureId:fixture.id,property:"dimmer",time:0,value:"255"});
