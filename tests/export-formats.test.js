import test from "node:test";
import assert from "node:assert/strict";
import { cueCsv, paletteJson, patchCsv, safeFileStem } from "../src/export/formats.js";

test("exports a portable palette without project-only fields", () => { const exported=JSON.parse(paletteJson({id:"p",name:"Studio",harmonyType:"triadic",colors:[{hex:"#FF0000"}]})); assert.deepEqual(exported,{schemaVersion:1,id:"p",name:"Studio",harmonyType:"triadic",colors:[{hex:"#FF0000"}]}); });
test("quotes fixture and cue CSV fields", () => { const patch=patchCsv([{name:'Wash "A"',profileId:"generic",modeId:"rgb-6",patchAssignment:{universe:1,startAddress:1,channelFootprint:6}}]); const cues=cueCsv([{name:"Intro, warm",duration:5,fade:1,delay:0,targets:[{}]}]); assert.match(patch,/"Wash ""A"""/); assert.match(cues,/"Intro, warm"/); });
test("creates safe downloaded filenames", () => { assert.equal(safeFileStem(" Studio Mood / 2026 "),"studio-mood-2026"); assert.equal(safeFileStem("***"),"adigun-light-design"); });
test("cue report preserves sequence order and cumulative timing after reordering", () => {
  const a={name:"A",duration:5,fade:1,delay:2,targets:[]},b={name:"B",duration:3,fade:0,targets:[]};
  const rows=cueCsv([b,a]).split("\n");
  assert.equal(rows[1],'"B","3","0","0","0","1","0","3"');
  assert.equal(rows[2],'"A","5","1","2","0","2","3","8"');
});
