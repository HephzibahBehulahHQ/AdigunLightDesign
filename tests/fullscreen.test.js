import test from "node:test";
import assert from "node:assert/strict";
import { canFullscreen,toggleViewportFullscreen } from "../src/ui/fullscreen.js";
test("fullscreen enters the requested viewport and exits only when it is active",async()=>{
  const calls=[],document={fullscreenEnabled:true,fullscreenElement:null,async exitFullscreen(){calls.push("exit");this.fullscreenElement=null;}};
  const element={async requestFullscreen(){calls.push("enter");document.fullscreenElement=this;}};
  assert.equal(canFullscreen(element,document),true);
  await toggleViewportFullscreen(element,document);await toggleViewportFullscreen(element,document);
  assert.deepEqual(calls,["enter","exit"]);
});
test("unsupported fullscreen and browser denials report failure",async()=>{
  assert.equal(canFullscreen({},{}),false);
  await assert.rejects(toggleViewportFullscreen({},{}),/unavailable/);
  const document={fullscreenEnabled:true,exitFullscreen(){}};
  await assert.rejects(toggleViewportFullscreen({async requestFullscreen(){throw new Error("Denied");}},document),/Denied/);
});
