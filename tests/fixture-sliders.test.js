import test from "node:test";
import assert from "node:assert/strict";
import {bindFixtureSliders} from "../src/ui/fixture-sliders.js";
test("inspector sliders preserve exact channel values and explain normalized intensity without fabricated degrees",()=>{
  const inputs=new Map(["fixture-dimmer","fixture-beam"].map((id,index)=>[id,{id,value:index ? "128" : "184",setAttribute(name,value){this[name]=value;},after(output){this.output=output;},addEventListener(name,listener){this.listener=listener;}}]));
  bindFixtureSliders({querySelector:id=>inputs.get(id.slice(1)),ownerDocument:{createElement:()=>({})}},{channelLabel:"Apply to commit"});
  const dimmer=inputs.get("fixture-dimmer"),beam=inputs.get("fixture-beam");
  assert.equal(dimmer.output.textContent,"72 % · 184/255");assert.equal(dimmer.value,"184");assert.equal(dimmer.type,"range");
  assert.equal(beam.output.textContent,"128/255");assert.ok(!beam.output.textContent.includes("°"));
  dimmer.value="0";dimmer.listener();assert.equal(dimmer.output.textContent,"0 % · 0/255");
  dimmer.value="255";dimmer.listener();assert.equal(dimmer.output.textContent,"100 % · 255/255");assert.ok(dimmer["aria-valuetext"].includes("Apply to commit"));
  bindFixtureSliders({querySelector:()=>null},{channelLabel:"No beam profile"});
});
