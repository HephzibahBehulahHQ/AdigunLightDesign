import test from "node:test";
import assert from "node:assert/strict";
import { designTokenJson } from "../src/export/formats.js";
test("token export preserves duplicate names and source identities without key collisions",()=>{
  const palette={name:"Studio",colors:[{id:"a",name:"__proto__",hex:"#f00"},{id:"b",name:"__proto__",hex:"#00f"}]};
  const result=JSON.parse(designTokenJson(palette));
  assert.equal(result.schemaVersion,1);
  assert.deepEqual(Object.keys(result.color),["swatch_1","swatch_2"]);
  assert.equal(result.color.swatch_1.value,"#FF0000");
  assert.equal(result.color.swatch_2.sourceId,"b");
  assert.equal(result.color.swatch_1.name,"__proto__");
  assert.throws(()=>designTokenJson({colors:[{hex:"invalid"}]}));
});
import { paletteSvg } from "../src/export/formats.js";
test("SVG export escapes names, normalizes colors and rejects unsafe color data",()=>{
  const svg=paletteSvg({name:'Studio <& "',colors:[{name:"<script>alert(1)</script>",hex:"#f00"}]});
  assert.match(svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg,/fill="#FF0000"/);
  assert.ok(!svg.includes("<script>"));
  assert.match(svg,/&lt;script&gt;/);
  assert.throws(()=>paletteSvg({colors:[]}));
  assert.throws(()=>paletteSvg({colors:[{hex:'url(javascript:alert(1))'}]}));
});
import { cueCsv, paletteJson, patchCsv, safeFileStem } from "../src/export/formats.js";

test("exports a portable palette without project-only fields", () => { const exported=JSON.parse(paletteJson({id:"p",name:"Studio",harmonyType:"triadic",colors:[{hex:"#FF0000"}]})); assert.deepEqual(exported,{schemaVersion:1,id:"p",name:"Studio",harmonyType:"triadic",colors:[{hex:"#FF0000"}]}); });
test("quotes fixture and cue CSV fields", () => { const patch=patchCsv([{name:'Wash "A"',profileId:"generic",modeId:"rgb-6",patchAssignment:{universe:1,startAddress:1,channelFootprint:6}}]); const cues=cueCsv([{name:"Intro, warm",duration:5,fade:1,delay:0,targets:[{}]}]); assert.match(patch,/"Wash ""A"""/); assert.match(cues,/"Intro, warm"/); });
test("creates safe downloaded filenames", () => { assert.equal(safeFileStem(" Studio Mood / 2026 "),"studio-mood-2026"); assert.equal(safeFileStem("***"),"adigun-light-design"); });
test("cue report preserves sequence order and cumulative timing after reordering", () => {
  const a={name:"A",duration:5,fade:1,delay:2,targets:[]},b={name:"B",duration:3,fade:0,targets:[]};
  const rows=cueCsv([b,a]).split("\n");
  assert.equal(rows[1],'"B","3","0","0","0","1","0","3","0","3","Main","0","3"');
  assert.equal(rows[2],'"A","5","1","2","0","2","3","8","0","2","Main","3","8"');
});
test("cue report distinguishes sequential timing from simultaneous tracks and includes fade-out",()=>{
  const cues=[{name:"Key",duration:8,fade:2,delay:1,fadeOut:2,trackId:'Key, "A"',startTime:4,targets:[]},{name:"Fill",duration:5,fade:1,trackId:"Fill",startTime:0,targets:[]}];
  const rows=cueCsv(cues).split("\n");
  assert.match(rows[0],/Fade-out seconds,Hold seconds,Track,Track start seconds,Track end seconds$/);
  assert.equal(rows[1],'"Key","8","2","1","0","1","0","8","2","3","Key, ""A""","4","12"');
  assert.equal(rows[2],'"Fill","5","1","0","0","2","8","13","0","4","Fill","0","5"');
});
