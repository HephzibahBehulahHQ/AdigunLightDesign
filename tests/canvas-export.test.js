import test from "node:test";
import assert from "node:assert/strict";
import { canvasSvg } from "../src/export/canvas.js";
import { addCanvasObject } from "../src/domain/canvas.js";
test("canvas SVG exports artwork in stacking order without editor selection markup",()=>{
  const scene=addCanvasObject(addCanvasObject({},"rect","#f00",{id:"a"}),"text","#fff",{id:"b",text:"<>&"});
  const svg=canvasSvg(scene.canvasObjects,'Studio "A"');
  assert.match(svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.ok(svg.indexOf("<rect")<svg.indexOf("<text"));
  assert.ok(svg.includes("&lt;&gt;&amp;"));assert.ok(svg.includes("Studio &quot;A&quot;"));
  assert.ok(!svg.includes("data-canvas-object"));assert.ok(!svg.includes("tabindex"));
  assert.ok(!svg.includes("#22D3EE"));
  assert.equal(scene.canvasObjects[0].fill,"#FF0000");
});
test("canvas export supports blank artwork and rejects invalid object data",()=>{
  assert.match(canvasSvg([]),/<title>/);
  assert.throws(()=>canvasSvg([{id:"a",type:"text",fill:"url(unsafe)"}]));
});
