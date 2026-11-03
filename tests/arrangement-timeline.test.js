import test from "node:test";
import assert from "node:assert/strict";
import {arrangementTimelineMarkup} from "../src/ui/arrangement-timeline.js";
test("arrangement view shows independent tracks at scheduled positions and escapes project text",()=>{
  const cues=[{id:"a",name:"<img>",duration:6,trackId:"<Key>",startTime:3},{id:"b",name:"Fill",duration:3,trackId:"Fill",startTime:0}];
  const html=arrangementTimelineMarkup(cues,"a","No cues");
  assert.equal((html.match(/class="scheduled-track"/g) ?? []).length,2);
  assert.ok(html.includes('left:10%;width:20%'));assert.ok(html.includes('left:0%;width:10%'));
  assert.ok(html.includes('&lt;Key&gt;'));assert.ok(html.includes('&lt;img&gt;'));assert.ok(!html.includes('<img>'));
  assert.match(html, /class="arrangement-playhead-rail" aria-hidden="true"><div id="arrangement-playhead"/);
  assert.ok(html.includes('aria-pressed="true"'));assert.ok(html.includes('>30s</span>'));
  assert.ok(arrangementTimelineMarkup([],null,"Nothing yet").includes("Nothing yet"));
  assert.throws(()=>arrangementTimelineMarkup([{id:"invalid",duration:-1}],null,""));
});
